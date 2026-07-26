// src/app/api/webhooks/resend/route.ts
// POST /api/webhooks/resend - Resend inbound email webhook

import { NextRequest, NextResponse } from 'next/server';
import { resendWebhookSchema } from '@/lib/schemas';
import { handleResendWebhook } from '@/lib/webhooks';
import { logger, logError } from '@/lib/observability';


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

<<<<<<< Updated upstream
    // Return 200 only for successful processing
    // Return 401 for invalid signature, 500 for internal errors
    if (!result.success && result.error === 'invalid_signature') {
      return NextResponse.json({
        success: result.success,
        processed: result.processed,
        action: result.action,
        error: result.error,
      }, { status: 401 });
    }

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      action: result.action,
    });
  } catch (error) {
    logError('webhook.error', error, { endpoint: '/api/webhooks/resend', durationMs: Date.now() - startTime });
    // Return 500 for actual errors so Resend can retry
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
=======
    // Return appropriate status codes
    if (!result.success) {
      // Invalid signature or other auth failures
      return NextResponse.json(result, { status: 401 });
    }

    // Success (including duplicate/queued for review)
    return NextResponse.json(result);
  } catch (error) {
    requestLogger.error('webhook.error', { error: (error as Error).message, durationMs: Date.now() - startTime });
    // Return 500 for unexpected server errors (Resend will retry)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
>>>>>>> Stashed changes
  }
}
