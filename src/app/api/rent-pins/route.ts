// src/app/api/rent-pins/route.ts
// POST /api/rent-pins - Anonymous rent pin submission with Turnstile

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rentPinSubmitSchema, rentPinResponseSchema } from '@/lib/schemas';
import { logger } from '@/lib/observability';
import { verifyTurnstileToken } from '@/lib/security';
import { applyPrivacyJitter, getLocalityFromPoint, generateRequestFingerprint } from '@/lib/utils';
import { logAuditEvent } from '@/lib/supabase';
import { checkAbuseOnSubmit } from '@/lib/moderation';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/rent-pins' });

  try {
    // Parse and validate body
    const body = await request.json();
    const validation = rentPinSubmitSchema.safeParse(body);
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

    // Generate fingerprints for abuse tracking
    const fingerprints = await generateRequestFingerprint(Object.fromEntries(request.headers));
    const emailHash = ''; // No email for anonymous pins

    // Abuse check
    const abuseCheck = await checkAbuseOnSubmit({
      ipFingerprintHash: fingerprints,
      emailHash,
      targetType: 'rent_pin',
      content: {
        locality: data.locality,
        rent_min: data.rentMin,
        rent_max: data.rentMax,
        bhk: data.bhk,
        furnishing: data.furnishing,
      },
    });

    if (!abuseCheck.allowed) {
      requestLogger.warn('rent_pins.abuse_blocked', { reasons: abuseCheck.reasons, score: abuseCheck.score });
      return NextResponse.json(
        { error: 'Submission blocked', reasons: abuseCheck.reasons },
        { status: 429 }
      );
    }

    // Apply privacy jitter to coordinates
    const jittered = applyPrivacyJitter(data.lon, data.lat);
    const jitteredGeom = { lat: jittered[1], lon: jittered[0] };

    // Determine locality from coordinates (if not provided or mismatch)
    const locality = getLocalityFromPoint(data.lon, data.lat) || data.locality;

    // Insert rent pin
    const { data: pin, error } = await supabase
      .from('rent_pins')
      .insert({
        geom: `POINT(${jitteredGeom.lon} ${jitteredGeom.lat})`,
        exact_geom: `POINT(${data.lon} ${data.lat})`,
        rent_min: data.rentMin,
        rent_max: data.rentMax,
        bhk: data.bhk,
        furnishing: data.furnishing,
        locality,
        status: 'pending',
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        ip_fingerprint_hash: fingerprints,
      })
      .select('id, status')
      .single();

    if (error) {
      requestLogger.error('rent_pins.insert_failed', { error: error.message });
      throw error;
    }

    // Audit log
    await logAuditEvent({
      event_type: 'rent_pin_created',
      actor_type: 'user',
      target_type: 'rent_pin',
      target_id: pin.id,
      payload: { locality, rent_min: data.rentMin, rent_max: data.rentMax, bhk: data.bhk },
      ip_fingerprint_hash: fingerprints,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    const response = rentPinResponseSchema.parse({
      id: pin.id,
      status: pin.status,
      message: 'Rent pin submitted for review. It will appear on the map once approved.',
    });

    requestLogger.info('rent_pins.created', { pinId: pin.id, durationMs: Date.now() - startTime });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    requestLogger.error('rent_pins.error', { error: (error as Error).message, durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}