// src/app/api/listings/route.ts
// POST /api/listings - Verified listing submission

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { listingSubmitSchema, listingResponseSchema } from '@/lib/schemas';
import { logger } from '@/lib/observability';
import { verifyTurnstileToken, encrypt } from '@/lib/security';
import { getLocalityFromPoint, applyPrivacyJitter, generateRequestFingerprint } from '@/lib/utils';
import { logAuditEvent } from '@/lib/supabase';
import { logError } from '@/lib/observability';
import { checkAbuseOnSubmit } from '@/lib/moderation';
import { hashEmail } from '@/lib/security';
import { generateVerificationPair, hashToken } from '@/lib/tokens';
import { sendListingVerificationEmail } from '@/lib/email';


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/listings' });

  try {
    const body = await request.json();
    const validation = listingSubmitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid submission', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify Turnstile
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || undefined;

    const turnstile = await verifyTurnstileToken(data.turnstileToken, ip);
    if (!turnstile.success) {
      return NextResponse.json(
        { error: 'Turnstile verification failed', details: turnstile.error },
        { status: 400 }
      );
    }

    // Get or create identity from email
    const contactEmail = data.contactEmail?.toLowerCase();
    let identityId: string;

    if (contactEmail) {
      let { data: identity } = await supabase
        .from('identities')
        .select('id, email_verified')
        .eq('email', contactEmail)
        .single();

      if (!identity) {
        const fingerprints = await generateRequestFingerprint(Object.fromEntries(request.headers));
        const { data: newIdentity, error } = await supabase
          .from('identities')
          .insert({ email: contactEmail, ip_fingerprint_hash: fingerprints })
          .select('id, email_verified')
          .single();
        if (error) throw error;
        identity = newIdentity;
      }

      // Require email verification for listing
      if (!identity.email_verified) {
        return NextResponse.json(
          { error: 'Email must be verified before submitting a listing. Check your inbox for a verification link.' },
          { status: 403 }
        );
      }

      identityId = identity.id;
    } else {
      return NextResponse.json(
        { error: 'Contact email is required for listings' },
        { status: 400 }
      );
    }

    // Check: no duplicate active listing for same property
    const { count: duplicateCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', identityId)
      .eq('locality', data.locality)
      .eq('rent', data.rent)
      .eq('bhk', data.bhk)
      .in('status', ['pending', 'approved']);

    if (duplicateCount && duplicateCount > 0) {
      return NextResponse.json(
        { error: 'You already have a similar active listing in this locality' },
        { status: 409 }
      );
    }

    // Abuse check
    const fingerprints = await generateRequestFingerprint(Object.fromEntries(request.headers));
    const abuseCheck = await checkAbuseOnSubmit({
      ipFingerprintHash: fingerprints,
      emailHash: contactEmail ? await hashEmail(contactEmail) : '',
      targetType: 'listing',
      content: {
        locality: data.locality,
        rent: data.rent,
        bhk: data.bhk,
        listing_type: data.listingType,
      },
    });

    if (!abuseCheck.allowed) {
      requestLogger.warn('listings.abuse_blocked', { reasons: abuseCheck.reasons, score: abuseCheck.score });
      return NextResponse.json(
        { error: 'Submission blocked', reasons: abuseCheck.reasons },
        { status: 429 }
      );
    }

    // Determine locality from coordinates
    const locality = getLocalityFromPoint(data.lon, data.lat) || data.locality;

    // Apply privacy jitter for public map
    const jittered = applyPrivacyJitter(data.lon, data.lat);

    // Generate verification token
    const { token: verificationToken, hash: verificationHash, expiresAt } = await generateVerificationPair();

    // Insert listing (pending)
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        owner_id: identityId,
        listing_type: data.listingType,
        title: data.title,
        description: data.description,
        bhk: data.bhk,
        furnishing: data.furnishing,
        rent: data.rent,
        deposit_months: data.depositMonths,
        maintenance_included: data.maintenanceIncluded,
        locality,
        geom: `POINT(${jittered[0]} ${jittered[1]})`,
        available_from: data.availableFrom,
        available_until: data.availableUntil,
        amenities: data.amenities,
        lifestyle_prefs: data.lifestylePrefs,
        status: 'pending',
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (listingError) throw listingError;

    // Encrypt private fields
    const encryptedPhone = data.contactPhone ? await encrypt(data.contactPhone) : null;
    const encryptedEmail = data.contactEmail ? await encrypt(data.contactEmail) : null;

    // Insert private data
    const { error: privateError } = await supabase
      .from('listing_private')
      .insert({
        listing_id: listing.id,
        exact_geom: `POINT(${data.lon} ${data.lat})`,
        contact_phone: encryptedPhone ? `${encryptedPhone.encrypted}:${encryptedPhone.iv}:${encryptedPhone.tag}` : null,
        contact_email: encryptedEmail ? `${encryptedEmail.encrypted}:${encryptedEmail.iv}:${encryptedEmail.tag}` : null,
        contact_method: data.contactMethod,
        contact_window_start: data.contactWindowStart,
        contact_window_end: data.contactWindowEnd,
        verification_token_hash: verificationHash,
        verification_token_expires: expiresAt.toISOString(),
      });

    if (privateError) throw privateError;

    // Send verification email
    if (contactEmail) {
      await sendListingVerificationEmail(contactEmail, verificationToken, listing.id);
    }

    // Audit log
    await logAuditEvent({
      event_type: 'listing_created',
      actor_type: 'user',
      actor_id: identityId,
      target_type: 'listing',
      target_id: listing.id,
      payload: { listing_type: data.listingType, locality, rent: data.rent, bhk: data.bhk },
      ip_fingerprint_hash: fingerprints,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    const response = listingResponseSchema.parse({
      id: listing.id,
      status: 'pending',
      message: 'Listing submitted. Please verify your email to publish it.',
    });

    requestLogger.info('listings.created', { listingId: listing.id, durationMs: Date.now() - startTime });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logError('listings.error', error, { endpoint: '/api/listings', durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
