// src/app/api/report/route.ts
// POST /api/report - Abuse reporting

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { reportSubmitSchema, reportResponseSchema } from '@/lib/schemas';
import { logger } from '@/lib/observability';
import { verifyTurnstileToken, hashEmail } from '@/lib/security';
import { generateRequestFingerprint } from '@/lib/utils';
import { logAuditEvent } from '@/lib/supabase';


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/report' });

  try {
    const body = await request.json();
    const validation = reportSubmitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid report', details: validation.error.flatten() },
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

    // Generate fingerprints
    const fingerprints = await generateRequestFingerprint(Object.fromEntries(request.headers));
    const emailHash = ''; // Optional: could add email for verified users

    // Check report rate limit by fingerprint
    const { count: recentReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_fingerprint_hash', fingerprints)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentReports && recentReports >= 5) {
      return NextResponse.json(
        { error: 'Report rate limit exceeded. Please wait before submitting more reports.' },
        { status: 429 }
      );
    }

    // Insert report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        target_type: data.targetType,
        target_id: data.targetId,
        reporter_fingerprint_hash: fingerprints,
        reporter_email_hash: emailHash || null,
        reason: data.reason,
        description: data.description,
        evidence: data.evidence,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;

    // Increment report count on target
    const targetTable = data.targetType === 'rent_pin' ? 'rent_pins'
      : data.targetType === 'listing' ? 'listings'
      : data.targetType === 'seeker' ? 'seek_requests'
      : 'matches';

    await supabase.rpc('increment_report_count', {
      target_table: targetTable,
      target_id: data.targetId,
    });

    // Audit log
    await logAuditEvent({
      event_type: 'report_submitted',
      actor_type: 'user',
      target_type: data.targetType,
      target_id: data.targetId,
      payload: { reason: data.reason, report_id: report.id },
      ip_fingerprint_hash: fingerprints,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    const response = reportResponseSchema.parse({
      id: report.id,
      status: 'pending',
      message: 'Report submitted. Our team will review it.',
    });

    requestLogger.info('report.created', { reportId: report.id, targetType: data.targetType, durationMs: Date.now() - startTime });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    requestLogger.error('report.error', { error: (error as Error).message, durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
