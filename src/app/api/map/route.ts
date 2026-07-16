// src/app/api/map/route.ts
// GET /api/map?bbox=&zoom= - Returns approved, privacy-jittered map items

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapQuerySchema, mapResponseSchema, type MapQuery } from '@/lib/schemas';
import { logger } from '@/lib/observability';
import { parseBbox, isValidBbox } from '@/lib/utils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestLogger = logger.child({ endpoint: '/api/map' });

  try {
    // Parse and validate query params
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      bbox: searchParams.get('bbox'),
      zoom: searchParams.get('zoom') ? parseInt(searchParams.get('zoom')!) : undefined,
      type: searchParams.get('type') || 'all',
      minRent: searchParams.get('minRent') ? parseInt(searchParams.get('minRent')!) : undefined,
      maxRent: searchParams.get('maxRent') ? parseInt(searchParams.get('maxRent')!) : undefined,
      bhk: searchParams.get('bhk') ? parseInt(searchParams.get('bhk')!) : undefined,
      furnishing: searchParams.get('furnishing') || undefined,
    };

    const validation = mapQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const query: MapQuery = validation.data;
    const bbox = parseBbox(query.bbox);

    if (!bbox || !isValidBbox(bbox)) {
      return NextResponse.json(
        { error: 'Invalid bbox format. Use: minLon,minLat,maxLon,maxLat' },
        { status: 400 }
      );
    }

    const [minLon, minLat, maxLon, maxLat] = bbox;
    const zoom = query.zoom;

    // Determine clustering based on zoom
    // Low zoom (<13) = cluster, high zoom = individual pins
    const shouldCluster = zoom < 13;

    // Query rent pins (anonymous)
    const { data: pins, error: pinsError } = await supabase
      .rpc('get_pins_in_bbox', {
        min_lon: minLon,
        min_lat: minLat,
        max_lon: maxLon,
        max_lat: maxLat,
        status_filter: 'approved',
        cluster: shouldCluster,
        zoom_level: zoom,
      });

    if (pinsError) {
      requestLogger.error('map.pins_query_failed', { error: pinsError.message });
      throw pinsError;
    }

    // Query listings (approved only)
    const { data: listings, error: listingsError } = await supabase
      .rpc('get_listings_in_bbox', {
        min_lon: minLon,
        min_lat: minLat,
        max_lon: maxLon,
        max_lat: maxLat,
        status_filter: 'approved',
        listing_type: query.type === 'pins' ? null : undefined,
      });

    if (listingsError) {
      requestLogger.error('map.listings_query_failed', { error: listingsError.message });
      throw listingsError;
    }

    // Apply filters
    let filteredPins = pins || [];
    let filteredListings = listings || [];

    if (query.minRent !== undefined || query.maxRent !== undefined) {
      const min = query.minRent || 0;
      const max = query.maxRent || Infinity;

      filteredPins = filteredPins.filter((p: { rent_min: number; rent_max: number }) => {
        const avgRent = (p.rent_min + p.rent_max) / 2;
        return avgRent >= min && avgRent <= max;
      });

      filteredListings = filteredListings.filter((l: { rent: number }) => l.rent >= min && l.rent <= max);
    }

    if (query.bhk) {
      // Convert BHK string enum ('1BHK', '2BHK', etc.) to number
      const bhkNum = parseInt(query.bhk.replace('BHK', '').replace('+', ''), 10);
      if (!isNaN(bhkNum)) {
        filteredPins = filteredPins.filter((p: { bhk: number }) => p.bhk === bhkNum);
        filteredListings = filteredListings.filter((l: { bhk: number }) => l.bhk === bhkNum);
      }
    }

    if (query.furnishing) {
      filteredPins = filteredPins.filter((p: { furnishing: string }) => p.furnishing === query.furnishing);
      filteredListings = filteredListings.filter((l: { furnishing: string }) => l.furnishing === query.furnishing);
    }

    // Transform to unified response format
    const items = [
      ...(filteredPins.map((p: { id: string; lon: number; lat: number; rent_min: number; rent_max: number; bhk: string; furnishing: string; locality: string; pin_count?: number }) => ({
        id: p.id,
        type: 'rent_pin' as const,
        geom: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
        rentMin: p.rent_min,
        rentMax: p.rent_max,
        bhk: p.bhk,
        furnishing: p.furnishing,
        locality: p.locality,
        pinCount: p.pin_count || 1,
      }))),
      ...(filteredListings.map((l: { id: string; lon: number; lat: number; rent: number; bhk: string; furnishing: string; listing_type: string; locality: string }) => ({
        id: l.id,
        type: 'listing' as const,
        geom: { type: 'Point' as const, coordinates: [l.lon, l.lat] },
        rent: l.rent,
        bhk: l.bhk,
        furnishing: l.furnishing,
        listingType: l.listing_type,
        locality: l.locality,
      }))),
    ];

    const response = {
      items,
      total: items.length,
      viewport: {
        bbox,
        zoom,
      },
    };

    // Validate response
    const validatedResponse = mapResponseSchema.parse(response);

    requestLogger.info('map.response', {
      durationMs: Date.now() - startTime,
      itemCount: items.length,
      pinsCount: filteredPins.length,
      listingsCount: filteredListings.length,
    });

    return NextResponse.json(validatedResponse, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    requestLogger.error('map.error', { error: (error as Error).message, durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}