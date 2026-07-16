// src/app/api/stats/route.ts
// GET /api/stats - Live statistics

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { statsQuerySchema, localityStatsSchema, cityStatsSchema, viewportStatsSchema } from '@/lib/schemas';
import { logger } from '@/lib/observability';
import { parseBbox, isValidBbox } from '@/lib/utils';
import { getLocalityStats, getCityStats, getViewportStats } from '@/lib/aggregates';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/stats' });

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = {
      locality: searchParams.get('locality') || undefined,
      type: searchParams.get('type') || 'city',
      bbox: searchParams.get('bbox') || undefined,
      zoom: searchParams.get('zoom') ? parseInt(searchParams.get('zoom')!) : undefined,
    };

    const validation = statsQuerySchema.safeParse(query);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { type, locality, bbox, zoom } = validation.data;

    let data: unknown;

    switch (type) {
      case 'locality': {
        if (!locality) {
          return NextResponse.json({ error: 'Locality required for type=locality' }, { status: 400 });
        }
        const stats = await getLocalityStats(locality);
        if (!stats) {
          return NextResponse.json({ error: 'Locality not found or insufficient data' }, { status: 404 });
        }
        data = localityStatsSchema.parse(stats);
        break;
      }

      case 'viewport': {
        if (!bbox || !zoom) {
          return NextResponse.json({ error: 'bbox and zoom required for type=viewport' }, { status: 400 });
        }
        const parsedBbox = parseBbox(bbox);
        if (!parsedBbox || !isValidBbox(parsedBbox)) {
          return NextResponse.json({ error: 'Invalid bbox' }, { status: 400 });
        }
        const stats = await getViewportStats(parsedBbox);
        data = viewportStatsSchema.parse(stats);
        break;
      }

      case 'city':
      default: {
        const stats = await getCityStats();
        data = cityStatsSchema.parse(stats);
        break;
      }
    }

    requestLogger.info('stats.response', { type, durationMs: Date.now() - startTime });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    requestLogger.error('stats.error', { error: (error as Error).message, durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}