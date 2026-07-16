// src/app/api/health/route.ts
// GET /api/health - Health check endpoint

import { NextResponse } from 'next/server';
import { runHealthChecks, healthResponseSchema } from '@/lib/observability';

export const runtime = 'edge';

export async function GET() {
  const health = await runHealthChecks();

  const response = healthResponseSchema.parse({
    status: health.status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: health.checks,
  });

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}