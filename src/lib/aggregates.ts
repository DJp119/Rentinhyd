// src/lib/aggregates.ts
// Pre-aggregated statistics for performance

import { supabase } from './supabase';

// ============================================
// Locality Statistics
// ============================================

export interface LocalityStats {
  locality: string;
  totalListings: number;
  wholeFlatCount: number;
  roomCount: number;
  medianRent: number;
  minRent: number;
  maxRent: number;
  avgRent: number;
  bhkVariety: number;
  sampleSize: number;
  lastUpdated: string;
  commonAmenities: Array<{ name: string; count: number }>;
  metroProximity?: {
    nearestStation: string;
    distanceMeters: number;
    line: string;
  };
}

function computeLocalityStats(locality: string, listings: Array<{
  locality: string;
  listing_type: string;
  rent: number;
  bhk: string;
  amenities: string[];
  updated_at: string;
}>): LocalityStats {
  const rents = listings.map(l => l.rent).sort((a, b) => a - b);
  const wholeFlats = listings.filter(l => l.listing_type === 'whole_flat');
  const rooms = listings.filter(l => l.listing_type === 'room_flatmate');
  const bhkSet = new Set(listings.map(l => l.bhk));

  // Amenity frequency
  const amenityCounts = new Map<string, number>();
  for (const listing of listings) {
    for (const amenity of listing.amenities) {
      amenityCounts.set(amenity, (amenityCounts.get(amenity) || 0) + 1);
    }
  }

  const commonAmenities = Array.from(amenityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    locality,
    totalListings: listings.length,
    wholeFlatCount: wholeFlats.length,
    roomCount: rooms.length,
    medianRent: rents[Math.floor(rents.length / 2)] || 0,
    minRent: rents[0] || 0,
    maxRent: rents[rents.length - 1] || 0,
    avgRent: Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) || 0,
    bhkVariety: bhkSet.size,
    sampleSize: listings.length,
    lastUpdated: new Date(Math.max(...listings.map(l => new Date(l.updated_at).getTime()))).toISOString(),
    commonAmenities,
  };
}

/**
 * Get locality stats (from cache or compute on demand)
 */
export async function getLocalityStats(locality: string): Promise<LocalityStats | null> {
  const { data, error } = await supabase
    .from('public_locality_stats')
    .select('*')
    .eq('locality', locality)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('aggregates.get_locality_stats_failed', { error: error.message });
    return null;
  }

  return data as LocalityStats;
}

/**
 * Get all locality stats
 */
export async function getAllLocalityStats(): Promise<LocalityStats[]> {
  const { data, error } = await supabase
    .from('public_locality_stats')
    .select('*')
    .order('total_listings', { ascending: false });

  if (error) {
    console.error('aggregates.get_all_locality_stats_failed', { error: error.message });
    return [];
  }

  return data as LocalityStats[];
}

// ============================================
// City-wide Statistics
// ============================================

export interface CityStats {
  totalRentPins: number;
  totalListings: number;
  totalSeekers: number;
  totalMatches: number;
}

export async function getCityStats(): Promise<CityStats> {
  const { data, error } = await supabase
    .from('public_city_stats')
    .select('*')
    .single();

  if (error) {
    console.error('aggregates.get_city_stats_failed', { error: error.message });
    return { totalRentPins: 0, totalListings: 0, totalSeekers: 0, totalMatches: 0 };
  }

  return data as CityStats;
}

// ============================================
// Viewport Statistics (for map)
// ============================================

export interface ViewportStats {
  pinsByBhk: Record<string, number>;
  pinsByRentBand: Record<string, number>;
  listingsByType: Record<string, number>;
  totalInViewport: number;
}

const RENT_BANDS = [
  { min: 0, max: 15000, label: 'Under ₹15K' },
  { min: 15000, max: 25000, label: '₹15K-25K' },
  { min: 25000, max: 40000, label: '₹25K-40K' },
  { min: 40000, max: 60000, label: '₹40K-60K' },
  { min: 60000, max: 100000, label: '₹60K-1L' },
  { min: 100000, max: Infinity, label: 'Above ₹1L' },
];

export async function getViewportStats(bbox: [number, number, number, number]): Promise<ViewportStats> {
  const [minLon, minLat, maxLon, maxLat] = bbox;

  // Query rent pins in viewport
  const { data: pins, error: pinsError } = await supabase
    .rpc('get_pins_in_bbox', {
      min_lon: minLon,
      min_lat: minLat,
      max_lon: maxLon,
      max_lat: maxLat,
      status_filter: 'approved',
    });

  // Query listings in viewport
  const { data: listings, error: listingsError } = await supabase
    .rpc('get_listings_in_bbox', {
      min_lon: minLon,
      min_lat: minLat,
      max_lon: maxLon,
      max_lat: maxLat,
      status_filter: 'approved',
    });

  if (pinsError || listingsError) {
    console.error('aggregates.viewport_stats_failed', { pinsError: pinsError?.message, listingsError: listingsError?.message });
    return { pinsByBhk: {}, pinsByRentBand: {}, listingsByType: {}, totalInViewport: 0 };
  }

  // Aggregate pins
  const pinsByBhk: Record<string, number> = {};
  const pinsByRentBand: Record<string, number> = {};

  for (const pin of pins || []) {
    pinsByBhk[pin.bhk] = (pinsByBhk[pin.bhk] || 0) + 1;

    const avgRent = (pin.rent_min + pin.rent_max) / 2;
    for (const band of RENT_BANDS) {
      if (avgRent >= band.min && avgRent < band.max) {
        pinsByRentBand[band.label] = (pinsByRentBand[band.label] || 0) + 1;
        break;
      }
    }
  }

  // Aggregate listings
  const listingsByType: Record<string, number> = {};
  for (const listing of listings || []) {
    listingsByType[listing.listing_type] = (listingsByType[listing.listing_type] || 0) + 1;
  }

  return {
    pinsByBhk,
    pinsByRentBand,
    listingsByType,
    totalInViewport: (pins?.length || 0) + (listings?.length || 0),
  };
}

// ============================================
// Match Statistics (for admin)
// ============================================

export interface MatchStats {
  totalMatches: number;
  pending: number;
  accepted: number;
  declined: number;
  introduced: number;
  expired: number;
  avgScore: number;
  matchesLast7Days: number;
  introductionsLast7Days: number;
}

export async function getMatchStats(): Promise<MatchStats> {
  const { data, error } = await supabase
    .rpc('get_match_stats');

  if (error) {
    console.error('aggregates.get_match_stats_failed', { error: error.message });
    return {
      totalMatches: 0, pending: 0, accepted: 0, declined: 0,
      introduced: 0, expired: 0, avgScore: 0,
      matchesLast7Days: 0, introductionsLast7Days: 0,
    };
  }

  return data[0] as MatchStats;
}

// ============================================
// Report Statistics
// ============================================

export interface ReportStats {
  total: number;
  pending: number;
  resolved: number;
  byReason: Record<string, number>;
  byTargetType: Record<string, number>;
}

export async function getReportStats(): Promise<ReportStats> {
  const { data, error } = await supabase
    .rpc('get_report_stats');

  if (error) {
    console.error('aggregates.get_report_stats_failed', { error: error.message });
    return { total: 0, pending: 0, resolved: 0, byReason: {}, byTargetType: {} };
  }

  return data[0] as ReportStats;
}