// src/lib/webhooks.ts
// Resend inbound webhook handler with signature verification (Edge Runtime compatible)

import { Resend } from 'resend';
import { supabase, logAuditEvent } from './supabase';
import { generateIdempotencyKey, hashToken } from './tokens';
import { sendListingRentedEmail, sendListingApprovedEmail } from './email';
import { timingSafeEqual } from './crypto-utils';

// ============================================
// Configuration
// ============================================

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET!;
const SUPPORTED_COMMANDS = ['rented', 'still available', 'withdraw'] as const;
type SupportedCommand = typeof SUPPORTED_COMMANDS[number];

// ============================================
// Signature Verification (Edge compatible using Web Crypto API)
// ============================================

/**
 * Verify Resend webhook signature
 * See: https://resend.com/docs/dashboard/webhooks/securing-webhooks
 */
export async function verifyResendSignature(
  payload: string | Buffer,
  signature: string,
  secret: string = RESEND_WEBHOOK_SECRET
): Promise<boolean> {
  if (!signature || !secret) return false;

  // Resend uses: "t=<timestamp>,s=<signature>"
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts['t'];
  const receivedSig = parts['s'];

  if (!timestamp || !receivedSig) return false;

  // Check timestamp freshness (5 min tolerance)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  // Compute expected signature using Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`${timestamp}.${payload}`);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = new Uint8Array(signatureBuffer);
  const expectedSig = Array.from(signatureArray, b => b.toString(16).padStart(2, '0')).join('');

  return timingSafeEqual(expectedSig, receivedSig);
}

// ============================================
// Command Parsing
// ============================================

function parseCommand(text: string): SupportedCommand | 'ambiguous' {
  const normalized = text.toLowerCase().trim();

  // Exact matches
  for (const cmd of SUPPORTED_COMMANDS) {
    if (normalized === cmd || normalized.startsWith(cmd + ' ') || normalized.endsWith(' ' + cmd)) {
      return cmd;
    }
  }

  // Pattern-based matching for common variations
  if (/\b(rented|let|leased)\b/.test(normalized)) return 'rented';
  if (/\b(still available|available|open)\b/.test(normalized)) return 'still available';
  if (/\b(withdraw|cancel|remove)\b/.test(normalized)) return 'withdraw';

  return 'ambiguous';
}

// ============================================
// Webhook Handler
// ============================================

export interface WebhookResult {
  success: boolean;
  processed?: boolean;
  action?: string;
  error?: string;
}

export async function handleResendWebhook(
  payload: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    headers: Record<string, string>;
    attachments?: Array<{ filename: string; content_type: string; size: number }>;
    received_at: string;
  },
  rawPayload: string,
  signature: string
): Promise<WebhookResult> {
  // 1. Verify signature
  if (!await verifyResendSignature(rawPayload, signature)) {
    const failedIdempotencyKey = await generateIdempotencyKey('resend', payload.email_id);
    await logEmailEvent({
      direction: 'inbound',
      resendId: payload.email_id,
      toEmail: payload.to.join(','),
      fromEmail: payload.from,
      subject: payload.subject,
      bodyHash: await hashToken(payload.text || payload.html || ''),
      emailType: 'unknown',
      status: 'failed',
      errorMessage: 'Invalid signature',
      idempotencyKey: failedIdempotencyKey,
    });
    return { success: false, error: 'Invalid signature' };
  }

  // 2. Check idempotency
  const idempotencyKey = await generateIdempotencyKey('resend', payload.email_id);
  const { data: existing } = await supabase
    .from('email_events')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existing) {
    return { success: true, processed: false, action: 'duplicate' };
  }

  // 3. Parse command from email body
  const bodyText = payload.text || stripHtml(payload.html || '');
  const command = parseCommand(bodyText);

  // 4. Log email event
  const emailEvent = await logEmailEvent({
    direction: 'inbound',
    resendId: payload.email_id,
    toEmail: payload.to.join(','),
    fromEmail: payload.from,
    subject: payload.subject,
    bodyHash: await hashToken(payload.text || payload.html || ''),
    emailType: 'command',
    commandParsed: command,
    status: 'processed',
    idempotencyKey,
  });

  if (!emailEvent) {
    return { success: false, error: 'Failed to log email event' };
  }

  // 5. Process command if unambiguous
  if (command !== 'ambiguous') {
    const result = await processCommand(command, payload.from, payload.to[0], bodyText, emailEvent.id);
    return { success: true, processed: true, action: result };
  }

  // 6. Queue for admin review
  await queueForReview(emailEvent.id, bodyText, payload.from);
  return { success: true, processed: false, action: 'queued_for_review' };
}

// ============================================
// Command Processing
// ============================================

// Parse a per-listing action token out of the inbound email body. Outbound
// emails embed `#token=<hex>#` in the body; recipients reply to that email, so
// the token appears in the quoted reply. Without this scoping, anyone who can
// spoof the From header for a verified identity could mass-rent/withdraw every
// listing owned by that identity (see H3 in the security audit).
async function parseListingToken(bodyText: string): Promise<{ listingId: string } | null> {
  const match = bodyText.match(/#token=([0-9a-f]{8,256})#/i);
  if (!match) return null;
  const token = match[1];
  const { hashToken } = await import('./tokens');
  const tokenHash = await hashToken(token);
  const { data: lp } = await supabase
    .from('listing_private')
    .select('listing_id')
    .eq('verification_token_hash', tokenHash)
    .maybeSingle();
  return lp?.listing_id ? { listingId: lp.listing_id } : null;
}

async function processCommand(
  command: SupportedCommand,
  fromEmail: string,
  toEmail: string,
  bodyText: string,
  emailEventId: string
): Promise<string> {
  // Find related listing/seeker by email
  const { data: identity } = await supabase
    .from('identities')
    .select('id')
    .eq('email', fromEmail.toLowerCase())
    .eq('email_verified', true)
    .single();

  if (!identity) {
    return 'no_verified_identity';
  }

  // SECURITY: listing-scoped commands REQUIRE a per-listing action token in the
  // body. If the reply doesn't carry one, we refuse rather than guessing which
  // listing the user meant (this used to pick listings[0] for the whole owner).
  const scoped = await parseListingToken(bodyText);

  switch (command) {
    case 'rented':
      if (!scoped) return 'no_listing_token';
      return await handleRentedCommand(identity.id, scoped.listingId, toEmail);
    case 'still available':
      if (!scoped) return 'no_listing_token';
      return await handleStillAvailableCommand(identity.id, scoped.listingId, toEmail);
    case 'withdraw':
      // withdraw is identity-scoped (revokes own seek requests), not listing-scoped
      return await handleWithdrawCommand(identity.id, toEmail);
    default:
      return 'unknown_command';
  }
}

async function handleRentedCommand(identityId: string, listingId: string, toEmail: string): Promise<string> {
  // Verify this listing is owned by the verified identity before mutating.
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, owner_id, status')
    .eq('id', listingId)
    .eq('owner_id', identityId)
    .maybeSingle();

  if (!listing) {
    return 'listing_not_owned_or_not_found';
  }
  if (listing.status !== 'approved') {
    return 'listing_not_approved';
  }

  await supabase
    .from('listings')
    .update({ status: 'rented', rented_at: new Date().toISOString() })
    .eq('id', listing.id);

  // Send confirmation
  await sendListingRentedEmail(toEmail, listing.title);

  await logAuditEvent({
    event_type: 'listing_rented_via_email',
    actor_type: 'user',
    actor_id: identityId,
    target_type: 'listing',
    target_id: listing.id,
    payload: { command: 'rented', email: toEmail },
  });

  return 'listing_marked_rented';
}

async function handleStillAvailableCommand(identityId: string, listingId: string, toEmail: string): Promise<string> {
  // Refresh the specific listing's expiry — only if the caller owns it.
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, owner_id, status')
    .eq('id', listingId)
    .eq('owner_id', identityId)
    .maybeSingle();

  if (!listing) {
    return 'listing_not_owned_or_not_found';
  }
  if (listing.status !== 'approved') {
    return 'listing_not_approved';
  }

  await supabase
    .from('listings')
    .update({ expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() })
    .eq('id', listing.id);

  await logAuditEvent({
    event_type: 'listing_refreshed_via_email',
    actor_type: 'user',
    actor_id: identityId,
    target_type: 'listing',
    target_id: listing.id,
    payload: { command: 'still_available' },
  });

  return 'listing_refreshed';
}

async function handleWithdrawCommand(identityId: string, toEmail: string): Promise<string> {
  // Withdraw all active seek requests
  const { data: seekers } = await supabase
    .from('seek_requests')
    .select('id')
    .eq('seeker_id', identityId)
    .in('status', ['pending', 'approved']);

  if (!seekers || seekers.length === 0) {
    return 'no_active_searches';
  }

  await supabase
    .from('seek_requests')
    .update({ status: 'expired' })
    .in('id', seekers.map(s => s.id));

  await logAuditEvent({
    event_type: 'seeker_withdrawn_via_email',
    actor_type: 'user',
    actor_id: identityId,
    target_type: 'seeker',
    payload: { command: 'withdraw', count: seekers.length },
  });

  return 'searches_withdrawn';
}

// ============================================
// Helpers
// ============================================

async function logEmailEvent(event: {
  direction: 'inbound' | 'outbound';
  resendId: string;
  toEmail: string;
  fromEmail?: string;
  subject: string;
  bodyHash: string;
  bodyEncrypted?: string;
  emailType: string;
  commandParsed?: string;
  status: string;
  errorMessage?: string;
  relatedType?: string;
  relatedId?: string;
  idempotencyKey: string;
}) {
  const { data, error } = await supabase
    .from('email_events')
    .insert(event)
    .select()
    .single();

  if (error) {
    console.error('Failed to log email event:', error);
    return null;
  }
  return data;
}

async function queueForReview(emailEventId: string, bodyText: string, fromEmail: string) {
  await supabase
    .from('audit_events')
    .insert({
      event_type: 'email_queued_for_review',
      actor_type: 'system',
      target_type: 'email_event',
      target_id: emailEventId,
      payload: { from: fromEmail, body_preview: bodyText.slice(0, 500) },
    });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}