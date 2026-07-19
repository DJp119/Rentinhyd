// src/lib/observability.ts
// Structured logging and metrics

import { z } from 'zod';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

// ============================================
// Logger
// ============================================

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  requestId?: string;
  userId?: string; // Hash only, never raw PII
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export function createLogger(defaultContext: LogContext = {}) {
  function log(level: LogLevel, message: string, context: LogContext = {}) {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...defaultContext, ...context },
      requestId: defaultContext.requestId as string | undefined,
      // Never log PII - only hashed identifiers
      userId: defaultContext.userIdHash as string | undefined,
    };

    // Console output (structured for log aggregation)
    const output = formatLog(entry);
    if (level === 'error' || level === 'warn') {
      console.error(output);
    } else {
      console.log(output);
    }

    // In production, also send to external logging service
    // await sendToLoggingService(entry);
  }

  return {
    debug: (message: string, context?: LogContext) => log('debug', message, context),
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext) => log('error', message, context),
    child: (context: LogContext) => createLogger({ ...defaultContext, ...context }),
  };
}

// Default logger
export const logger = createLogger({ service: 'hyderabad-rent' });

// ============================================
// Request Context Middleware
// ============================================

export async function createRequestLogger(request: Request): Promise<ReturnType<typeof createLogger>> {
  const requestId = crypto.randomUUID();
  const ipFingerprint = request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || 'unknown';

  const ipHash = await hashToken(ipFingerprint);

  return logger.child({
    requestId,
    ipHash,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
  });
}

// Hash token for PII-safe logging
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// ============================================
// Metrics
// ============================================

export interface MetricPoint {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

const metricsBuffer: MetricPoint[] = [];
const METRICS_FLUSH_INTERVAL = 10000; // 10 seconds

export function recordMetric(name: string, value: number, tags?: Record<string, string>) {
  metricsBuffer.push({
    name,
    value,
    tags,
    timestamp: Date.now(),
  });

  // Flush if buffer gets large
  if (metricsBuffer.length >= 100) {
    flushMetrics();
  }
}

// Periodic flush
if (typeof setInterval !== 'undefined') {
  setInterval(flushMetrics, METRICS_FLUSH_INTERVAL);
}

async function flushMetrics() {
  if (metricsBuffer.length === 0) return;

  const toSend = [...metricsBuffer];
  metricsBuffer.length = 0;

  // In production, send to metrics collector (StatsD, Prometheus Pushgateway, etc.)
  // For now, log as debug
  logger.debug('metrics.batch', { count: toSend.length, metrics: toSend });
}

// ============================================
// Timing Helpers
// ============================================

export function measureTime<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    const duration = Date.now() - start;
    recordMetric(name, duration, tags);
  });
}

export function measureSync<T>(name: string, fn: () => T, tags?: Record<string, string>): T {
  const start = Date.now();
  try {
    return fn();
  } finally {
    const duration = Date.now() - start;
    recordMetric(name, duration, tags);
  }
}

// ============================================
// Error Tracking (Sentry-like)
// ============================================

export function captureError(error: Error, context?: LogContext) {
  logger.error(error.message, {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  // In production: send to Sentry, Datadog, etc.
  // Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: LogLevel = 'info', context?: LogContext) {
  logger[level](message, context);
}

/**
 * Log an error with full stack trace and structured context.
 * Use in catch blocks so every error is visible in logs.
 */
export function logError(
  message: string,
  error: unknown,
  context: LogContext = {}
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(message, {
    ...context,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause instanceof Error
        ? { name: err.cause.name, message: err.cause.message }
        : err.cause,
    },
  });
}

// ============================================
// Health Checks
// ============================================

export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  version: z.string(),
  checks: z.array(z.object({
    name: z.string(),
    status: z.enum(['pass', 'warn', 'fail']),
    latencyMs: z.number().optional(),
    message: z.string().optional(),
  })),
});

export interface HealthCheck {
  name: string;
  check: () => Promise<{ name: string; status: 'pass' | 'warn' | 'fail'; latencyMs?: number; message?: string }>;
}

export const healthChecks: HealthCheck[] = [
  {
    name: 'database',
    check: async () => {
      const start = Date.now();
      try {
        const { error } = await (await import('./supabase')).supabase
          .from('identities')
          .select('id')
          .limit(1);
        if (error) throw error;
        return { name: 'database', status: 'pass' as const, latencyMs: Date.now() - start };
      } catch (e) {
        return { name: 'database', status: 'fail' as const, latencyMs: Date.now() - start, message: (e as Error).message };
      }
    },
  },
  {
    name: 'resend',
    check: async () => {
      const start = Date.now();
      try {
        // Quick API check - just verify key is valid format
        const key = process.env.RESEND_API_KEY;
        if (!key || !key.startsWith('re_')) {
          return { name: 'resend', status: 'warn' as const, latencyMs: Date.now() - start, message: 'Resend key not configured' };
        }
        return { name: 'resend', status: 'pass' as const, latencyMs: Date.now() - start };
      } catch (e) {
        return { name: 'resend', status: 'fail' as const, latencyMs: Date.now() - start, message: (e as Error).message };
      }
    },
  },
];

export async function runHealthChecks(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{ name: string; status: 'pass' | 'warn' | 'fail'; latencyMs?: number; message?: string }>;
}> {
  const results = await Promise.all(
    healthChecks.map(async hc => {
      const start = Date.now();
      try {
        return await hc.check();
      } catch (e) {
        return { name: hc.name, status: 'fail' as const, latencyMs: Date.now() - start, message: (e as Error).message };
      }
    })
  );

  const hasFail = results.some(r => r.status === 'fail');
  const hasWarn = results.some(r => r.status === 'warn');

  return {
    status: hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy',
    checks: results,
  };
}