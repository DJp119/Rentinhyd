// src/app/api/verify/route.ts
// POST /api/verify/:token - Email verification and action tokens

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyTokenSchema, verifyResponseSchema } from '@/lib/schemas';
import { logger } from '@/lib/observability';
import { hashToken, verifyToken } from '@/lib/tokens';
import { sendListingApprovedEmail, sendSeekerVerificationEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/supabase';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/verify' });

  try {
    const { token } = await params;
    const body = await request.json();
    const validation = verifyTokenSchema.safeParse({ token, ...body });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid token', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const tokenHash = await hashToken(token);

    // Try to find matching verification token in listing_private
    const { data: listingPrivate } = await supabase
      .from('listing_private')
      .select('listing_id, verification_token_hash, verification_token_expires, owner_id')
      .eq('verification_token_hash', tokenHash)
      .single();

    if (listingPrivate) {
      // Listing verification
      if (new Date(listingPrivate.verification_token_expires) < new Date()) {
        return NextResponse.json(
          { success: false, message: 'Verification token has expired' },
          { status: 400 }
        );
      }

      // Update listing status
      const { error } = await supabase
        .from('listings')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', listingPrivate.listing_id);

      if (error) throw error;

      // Clear verification token
      await supabase
        .from('listing_private')
        .update({ verification_token_hash: null, verification_token_expires: null })
        .eq('listing_id', listingPrivate.listing_id);

      // Get listing details for email
      const { data: listing } = await supabase
        .from('listings')
        .select('title, locality')
        .eq('id', listingPrivate.listing_id)
        .single();

      // Send approval email
      const { data: identity } = await supabase
        .from('identities')
        .select('email')
        .eq('id', listingPrivate.owner_id)
        .single();

      if (identity?.email && listing) {
        await sendListingApprovedEmail(identity.email, listing.title, `https://hyderabad.rent/list/${listingPrivate.listing_id}`);
      }

      await logAuditEvent({
        event_type: 'listing_verified',
        actor_type: 'user',
        target_type: 'listing',
        target_id: listingPrivate.listing_id,
        payload: { method: 'email_token' },
      });

      const response = verifyResponseSchema.parse({
        success: true,
        message: 'Listing verified and published!',
        resourceId: listingPrivate.listing_id,
        resourceType: 'listing',
      });

      return NextResponse.json(response);
    }

    // Try seeker verification (stored in email_events)
    const { data: emailEvent } = await supabase
      .from('email_events')
      .select('related_id, to_email')
      .eq('body_hash', tokenHash)
      .eq('email_type', 'verification')
      .single();

    if (emailEvent) {
      // Verify seeker
      const { error } = await supabase
        .from('seek_requests')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', emailEvent.related_id);

      if (error) throw error;

      // Mark email event as processed
      await supabase
        .from('email_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', emailEvent.related_id);

      await logAuditEvent({
        event_type: 'seeker_verified',
        actor_type: 'user',
        target_type: 'seeker',
        target_id: emailEvent.related_id,
        payload: { method: 'email_token' },
      });

      const response = verifyResponseSchema.parse({
        success: true,
        message: 'Search verified and activated!',
        resourceId: emailEvent.related_id,
        resourceType: 'seeker',
      });

      return NextResponse.json(response);
    }

    // Try identity verification
    const { data: identity } = await supabase
      .from('identities')
      .select('id, email')
      .eq('email', (
        await supabase.from('email_events').select('to_email').eq('body_hash', tokenHash).single()
      ).data?.to_email || '')
      .single();

    if (identity) {
      await supabase
        .from('identities')
        .update({ email_verified: true, email_verified_at: new Date().toISOString() })
        .eq('id', identity.id);

      await logAuditEvent({
        event_type: 'identity_verified',
        actor_type: 'user',
        actor_id: identity.id,
        target_type: 'identity',
        target_id: identity.id,
        payload: { method: 'email_token' },
      });

      const response = verifyResponseSchema.parse({
        success: true,
        message: 'Email verified successfully!',
        resourceId: identity.id,
        resourceType: 'identity',
      });

      return NextResponse.json(response);
    }

    // Token not found or invalid
    return NextResponse.json(
      { success: false, message: 'Invalid or expired verification token' },
      { status: 404 }
    );
  } catch (error) {
    requestLogger.error('verify.error', { error: (error as Error).message, durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
