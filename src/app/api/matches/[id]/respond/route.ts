// src/app/api/matches/[id]/respond/route.ts
// POST /api/matches/:id/respond - Double-consent match response

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { matchRespondSchema, matchResponseSchema } from '@/lib/schemas';
import { logger } from '@/lib/observability';
import { hashToken } from '@/lib/tokens';
import { sendIntroductionEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/supabase';
import { generateActionPair } from '@/lib/tokens';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/matches/respond' });

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = matchRespondSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { token, action } = validation.data;
    const tokenHash = hashToken(token);

    // Find contact introduction
    const { data: intro, error: introError } = await supabase
      .from('contact_introductions')
      .select(`
        *,
        matches (
          id,
          listing_id,
          seeker_id,
          listings (owner_id, title, locality),
          seek_requests (seeker_id)
        )
      `)
      .eq('id', id)
      .single();

    if (introError || !intro) {
      return NextResponse.json(
        { success: false, message: 'Introduction not found' },
        { status: 404 }
      );
    }

    // Check if token matches either party
    const isOwner = intro.listing_owner_token_hash === tokenHash;
    const isSeeker = intro.seeker_token_hash === tokenHash;

    if (!isOwner && !isSeeker) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 403 }
      );
    }

    // Check expiry
    if (new Date(intro.token_expires_at) < new Date()) {
      await supabase
        .from('contact_introductions')
        .update({ status: 'expired' })
        .eq('id', id);

      return NextResponse.json(
        { success: false, message: 'Response window has expired' },
        { status: 400 }
      );
    }

    // Check if already responded
    if (isOwner && intro.listing_owner_consent) {
      return NextResponse.json(
        { success: false, message: 'You have already responded' },
        { status: 409 }
      );
    }
    if (isSeeker && intro.seeker_consent) {
      return NextResponse.json(
        { success: false, message: 'You have already responded' },
        { status: 409 }
      );
    }

    // Update consent
    const updateData: Record<string, unknown> = {};
    if (isOwner) {
      updateData.listing_owner_consent = action === 'accept';
      updateData.listing_owner_consent_at = new Date().toISOString();
    } else {
      updateData.seeker_consent = action === 'accept';
      updateData.seeker_consent_at = new Date().toISOString();
    }

    if (action === 'decline') {
      updateData.status = 'declined';
    }

    const { error: updateError } = await supabase
      .from('contact_introductions')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // Update match status
    await supabase
      .from('matches')
      .update({ status: action === 'accept' ? 'accepted' : 'declined' })
      .eq('id', intro.matches.id);

    // If both accepted, create introduction
    let introductionSent = false;
    if (
      (isOwner && intro.seeker_consent && action === 'accept') ||
      (isSeeker && intro.listing_owner_consent && action === 'accept')
    ) {
      // Both accepted - send introduction emails
      const { data: listingPrivate } = await supabase
        .from('listing_private')
        .select('contact_phone, contact_email, contact_method, contact_window_start, contact_window_end')
        .eq('listing_id', intro.matches.listing_id)
        .single();

      const { data: seekerIdentity } = await supabase
        .from('identities')
        .select('email')
        .eq('id', intro.matches.seek_requests.seeker_id)
        .single();

      const { data: ownerIdentity } = await supabase
        .from('identities')
        .select('email')
        .eq('id', intro.matches.listings.owner_id)
        .single();

      // Generate withdrawal tokens for both parties
      const ownerWithdrawal = await generateActionPair();
      const seekerWithdrawal = await generateActionPair();

      await supabase
        .from('contact_introductions')
        .update({
          status: 'completed',
          introduced_at: new Date().toISOString(),
          introduction_email_sent: true,
          withdrawn_by: null,
        })
        .eq('id', id);

      // Send introduction to listing owner (with seeker's contact)
      if (seekerIdentity?.email) {
        await sendIntroductionEmail(
          ownerIdentity?.email || '',
          {
            name: 'Seeker', // Anonymized
            email: seekerIdentity.email, // Seeker provides contact
            preferredMethod: 'email',
          },
          {
            listingTitle: intro.matches.listings.title,
            locality: intro.matches.listings.locality,
          },
          ownerWithdrawal.token
        );
      }

      // Send introduction to seeker (with listing owner's contact)
      if (ownerIdentity?.email && listingPrivate) {
        await sendIntroductionEmail(
          seekerIdentity?.email || '',
          {
            name: 'Owner',
            phone: listingPrivate.contact_phone, // Would decrypt
            email: listingPrivate.contact_email, // Would decrypt
            preferredMethod: listingPrivate.contact_method,
            contactWindow: listingPrivate.contact_window_start && listingPrivate.contact_window_end
              ? `${listingPrivate.contact_window_start}-${listingPrivate.contact_window_end}`
              : undefined,
          },
          {
            listingTitle: intro.matches.listings.title,
            locality: intro.matches.listings.locality,
          },
          seekerWithdrawal.token
        );
      }

      introductionSent = true;

      await logAuditEvent({
        event_type: 'contact_introduced',
        actor_type: 'system',
        target_type: 'match',
        target_id: intro.matches.id,
        payload: { listing_id: intro.matches.listing_id, seeker_id: intro.matches.seeker_id },
      });
    }

    const response = matchResponseSchema.parse({
      success: true,
      message: introductionSent ? 'Both parties accepted. Contact details have been shared via email.' : 'Response recorded.',
      matchStatus: introductionSent ? 'introduced' : (action === 'accept' ? 'accepted' : 'declined'),
      introductionId: introductionSent ? id : undefined,
    });

    requestLogger.info('matches.responded', { matchId: intro.matches.id, action, introductionSent, durationMs: Date.now() - startTime });

    return NextResponse.json(response);
  } catch (error) {
    requestLogger.error('matches.respond.error', { error: (error as Error).message, durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
