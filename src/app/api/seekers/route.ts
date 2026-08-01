// src/app/api/seekers/route.ts
// POST /api/seekers - Seeker request submission

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { seekerSubmitSchema, seekerResponseSchema } from '@/lib/schemas';
import { logger } from '@/lib/observability';
import { verifyTurnstileToken } from '@/lib/security';
import { generateRequestFingerprint } from '@/lib/utils';
import { logAuditEvent } from '@/lib/supabase';
import { logError } from '@/lib/observability';
import { checkAbuseOnSubmit } from '@/lib/moderation';
import { hashEmail } from '@/lib/security';
import { generateVerificationPair } from '@/lib/tokens';
import { sendSeekerVerificationEmail } from '@/lib/email';


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/seekers' });

  try {
    const body = await request.json();
    const validation = seekerSubmitSchema.safeParse(body);
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

    // Get or create identity from the validated email in the request body.
    const email = data.email;
    const emailLower = email.toLowerCase();

    // Check: only one active seeker per verified email
    const { data: existingSeeker } = await supabase
      .from('seek_requests')
      .select('id, status')
      .eq('seeker_id', (
        await supabase.from('identities').select('id').eq('email', emailLower).single()
      ).data?.id)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingSeeker) {
      return NextResponse.json(
        { error: 'You already have an active search. Please wait for it to expire or withdraw it first.' },
        { status: 409 }
      );
    }

    // Get or create identity
    let { data: identity } = await supabase
      .from('identities')
      .select('id, email_verified')
      .eq('email', emailLower)
      .single();

    if (!identity) {
      const fingerprints = await generateRequestFingerprint(Object.fromEntries(request.headers));
      const { data: newIdentity, error } = await supabase
        .from('identities')
        .insert({ email: emailLower, ip_fingerprint_hash: fingerprints })
        .select('id, email_verified')
        .single();
      if (error || !newIdentity) throw error || new Error('Failed to create identity');
      identity = newIdentity;
    }

    if (!identity?.email_verified) {
      return NextResponse.json(
        { error: 'Email must be verified before submitting a search' },
        { status: 403 }
      );
    }

    // Abuse check
    const fingerprints = await generateRequestFingerprint(Object.fromEntries(request.headers));
    const abuseCheck = await checkAbuseOnSubmit({
      ipFingerprintHash: fingerprints,
      emailHash: await hashEmail(emailLower),
      targetType: 'seeker',
      content: {
        max_budget: data.maxBudget,
        bhk: data.bhk,
        preferred_localities: data.preferredLocalities,
      },
    });

    if (!abuseCheck.allowed) {
      requestLogger.warn('seekers.abuse_blocked', { reasons: abuseCheck.reasons, score: abuseCheck.score });
      return NextResponse.json(
        { error: 'Submission blocked', reasons: abuseCheck.reasons },
        { status: 429 }
      );
    }

    // Generate verification token
    const { token: verificationToken, hash: verificationHash, expiresAt } = await generateVerificationPair();

    // Insert seeker request
    const { data: seeker, error } = await supabase
      .from('seek_requests')
      .insert({
        seeker_id: identity.id,
        max_budget: data.maxBudget,
        min_budget: data.minBudget,
        bhk: data.bhk,
        listing_type: data.listingType,
        furnishing: data.furnishing,
        move_in_earliest: data.moveInEarliest,
        move_in_latest: data.moveInLatest,
        preferred_localities: data.preferredLocalities,
        excluded_localities: data.excludedLocalities,
        lifestyle_prefs: data.lifestylePrefs,
        status: 'pending',
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    // Store verification token in verification_tokens table
    const { error: tokenError } = await supabase
      .from('verification_tokens')
      .insert({
        token_hash: verificationHash,
        resource_type: 'seeker',
        resource_id: seeker.id,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      requestLogger.error('seekers.verification_token_insert_failed', { error: tokenError });
      throw tokenError;
    }

    // Send verification email
    await sendSeekerVerificationEmail(emailLower, verificationToken, seeker.id);

    // Audit log
    await logAuditEvent({
      event_type: 'seeker_created',
      actor_type: 'user',
      actor_id: identity.id,
      target_type: 'seeker',
      target_id: seeker.id,
      payload: { max_budget: data.maxBudget, bhk: data.bhk, localities: data.preferredLocalities },
      ip_fingerprint_hash: fingerprints,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    const response = seekerResponseSchema.parse({
      id: seeker.id,
      status: 'pending',
      message: 'Search submitted. Please verify your email to activate it.',
    });

    requestLogger.info('seekers.created', { seekerId: seeker.id, durationMs: Date.now() - startTime });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logError('seekers.error', error, { endpoint: '/api/seekers', durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
