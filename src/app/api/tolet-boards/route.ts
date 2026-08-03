// src/app/api/tolet-boards/route.ts
// POST /api/tolet-boards - Submit a To-Let board with photo and phone

import { NextRequest, NextResponse } from 'next/server';
import { supabase, logAuditEvent, applyPrivacyJitter, getLocalityFromPoint } from '@/lib/supabase';
import { toLetBoardSubmitSchema, toLetBoardResponseSchema } from '@/lib/schemas';
import { logger, logError } from '@/lib/observability';
import { verifyTurnstileToken, encrypt } from '@/lib/security';
import { generateRequestFingerprint, checkHyderabadRadius } from '@/lib/utils';
import { checkAbuseOnSubmit } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/tolet-boards' });

  try {
    const formData = await request.formData();

    const photo = formData.get('photo') as File | null;
    const phone = (formData.get('phone') as string || '').trim();
    const localityInput = (formData.get('locality') as string || '').trim();
    const lat = Number(formData.get('lat'));
    const lon = Number(formData.get('lon'));
    const consent = formData.get('consent') === 'true' || formData.get('consent') === 'on';
    const turnstileToken = (formData.get('turnstileToken') as string || '').trim();

    // Validate photo
    if (!photo || !(photo instanceof File)) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 });
    }

    const validMimetypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimetypes.includes(photo.type)) {
      return NextResponse.json({ error: 'Photo must be JPEG, PNG, or WebP' }, { status: 400 });
    }

    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Photo size must be 5 MB or less' }, { status: 400 });
    }

    // Validate schema
    const validation = toLetBoardSubmitSchema.safeParse({
      lat,
      lon,
      phone,
      locality: localityInput,
      imageMetadata: {
        name: photo.name,
        size: photo.size,
        type: photo.type,
      },
      turnstileToken: turnstileToken || 'mock-turnstile-token',
      consent,
    });

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

    // Check radius
    const radiusCheck = checkHyderabadRadius(data.lat, data.lon);
    if (!radiusCheck.allowed) {
      requestLogger.warn('tolet_boards.outside_hyderabad', { lat: data.lat, lon: data.lon });
      return NextResponse.json({ error: radiusCheck.message }, { status: 400 });
    }

    // Generate fingerprint for abuse tracking
    const fingerprints = await generateRequestFingerprint(Object.fromEntries(request.headers));

    // Abuse check
    const abuseCheck = await checkAbuseOnSubmit({
      ipFingerprintHash: fingerprints,
      emailHash: '',
      targetType: 'tolet_board',
      content: {
        locality: data.locality,
        phone: data.phone,
      },
    });

    if (!abuseCheck.allowed) {
      requestLogger.warn('tolet_boards.abuse_blocked', { reasons: abuseCheck.reasons, score: abuseCheck.score });
      return NextResponse.json(
        { error: 'Submission blocked', reasons: abuseCheck.reasons },
        { status: 429 }
      );
    }

    // Privacy jitter
    const jittered = await applyPrivacyJitter(data.lon, data.lat);
    const jitteredGeom = { lat: jittered[1], lon: jittered[0] };

    // Locality
    const locality = (await getLocalityFromPoint(data.lon, data.lat)) || data.locality;

    // Encrypt phone number
    const encryptedPhoneObj = await encrypt(data.phone);
    const phoneEncrypted = `${encryptedPhoneObj.encrypted}:${encryptedPhoneObj.iv}:${encryptedPhoneObj.tag}`;

    // Upload photo to private storage bucket
    const ext = photo.name.split('.').pop() || 'jpg';
    const imagePath = `${crypto.randomUUID()}.${ext}`;
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('tolet-boards')
      .upload(imagePath, buffer, {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      requestLogger.error('tolet_boards.storage_upload_failed', { error: uploadError.message });
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    // Insert database record
    const { data: board, error: dbError } = await supabase
      .from('tolet_boards')
      .insert({
        geom: `POINT(${jitteredGeom.lon} ${jitteredGeom.lat})`,
        locality,
        image_path: imagePath,
        phone_encrypted: phoneEncrypted,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ip_fingerprint_hash: fingerprints,
      })
      .select('id, status')
      .single();

    if (dbError) {
      requestLogger.error('tolet_boards.db_insert_failed', { error: dbError.message });
      // Cleanup uploaded file on DB insertion failure
      await supabase.storage.from('tolet-boards').remove([imagePath]);
      throw dbError;
    }

    // Audit log
    await logAuditEvent({
      event_type: 'tolet_board_created',
      actor_type: 'user',
      target_type: 'tolet_board',
      target_id: board.id,
      payload: { locality, image_path: imagePath },
      ip_fingerprint_hash: fingerprints,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    const response = toLetBoardResponseSchema.parse({
      id: board.id,
      status: board.status,
      message: 'To-Let board submitted for moderation.',
    });

    requestLogger.info('tolet_boards.created', { boardId: board.id, durationMs: Date.now() - startTime });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logError('tolet_boards.error', error, { endpoint: '/api/tolet-boards', durationMs: Date.now() - startTime });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
