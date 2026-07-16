// src/app/api/webhooks/resend/route.ts
// POST /api/webhooks/resend - Resend inbound email webhook

import { NextRequest, NextResponse } from 'next/server';
import { resendWebhookSchema } from '@/lib/schemas';
import { handleResendWebhook } from '@/lib/webhooks';
import { logger } from '@/lib/observability';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/webhooks/resend' });

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('resend-signature') || '';

    // Parse JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Validate schema
    const validation = resendWebhookSchema.safeParse(parsedBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Handle webhook
    const payload = validation.data.data;
    // Cast headers to Record<string, string> for type compatibility
    const typedPayload = {
      ...payload,
      headers: payload.headers as Record<string, string>,
    };
    const result = await handleResendWebhook(typedPayload, rawBody, signature);

    requestLogger.info('webhook.processed', {
      success: result.success,
      action: result.action,
      durationMs: Date.now() - startTime,
    });

    // Always return 200 to prevent retries for our processing errors
    // Resend will retry on non-2xx
    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      action: result.action,
    });
  } catch (error) {
    requestLogger.error('webhook.error', { error: (error as Error).message, durationMs: Date.now() - startTime });
    // Return 200 to avoid retries for unexpected errors
    return NextResponse.json({ error: 'Internal error' }, { status: 200 });
  }
}