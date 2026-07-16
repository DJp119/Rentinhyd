// src/lib/matching.ts
// Deterministic matching algorithm - pure SQL-first approach

import { supabase } from './supabase';

// ============================================
// Scoring Weights (must sum to 100)
// ============================================

export const MATCH_WEIGHTS = {
  geography: 30,    // Same locality / proximity
  budget: 25,       // Budget compatibility
  bhk: 20,          // BHK/room type match
  timing: 15,       // Move-in window overlap
  lifestyle: 10,    // Lifestyle preferences
} as const;

export type ScoreBreakdown = {
  geography: number;
  budget: number;
  bhk: number;
  timing: number;
  lifestyle: number;
  total: number;
};

// ============================================
// Geography Scoring
// ============================================

/**
 * Score based on geographic proximity
 * Same locality = 100, adjacent = 70, same corridor = 40, different = 0
 */
export function scoreGeography(
  listingLocality: string,
  seekerPreferred: string[],
  seekerExcluded: string[],
  listingCoords: { lat: number; lon: number } | null,
  seekerCoords: { lat: number; lon: number } | null
): number {
  // Excluded locality = instant 0
  if (seekerExcluded.includes(listingLocality)) return 0;

  // Exact locality match
  if (seekerPreferred.includes(listingLocality)) return 100;

  // Same corridor proximity check (if coordinates available)
  if (listingCoords && seekerCoords) {
    const distanceKm = haversineDistance(
      listingCoords.lat, listingCoords.lon,
      seekerCoords.lat, seekerCoords.lon
    ) / 1000;

    if (distanceKm <= 2) return 80;       // Very close
    if (distanceKm <= 5) return 60;       // Nearby
    if (distanceKm <= 10) return 40;      // Same corridor
    if (distanceKm <= 20) return 20;      // Same city
  }

  // Corridor-based matching for seed localities
  const corridorGroups = [
    ['gachibowli', 'madhapur', 'kondapur', 'hitec-city', 'financial-district'],
    ['manikonda', 'narsingi', 'hafeezpet'],
    ['jubilee-hills', 'banjara-hills'],
    ['kukatpally', 'miyapur'],
  ];

  for (const group of corridorGroups) {
    const listingInGroup = group.includes(listingLocality);
    const seekerInGroup = seekerPreferred.some(p => group.includes(p));
    if (listingInGroup && seekerInGroup) return 70;
    if (listingInGroup && seekerInGroup) return 50;
  }

  return 10; // Different area but same city
}

// ============================================
// Budget Scoring
// ============================================

/**
 * Score based on budget compatibility
 * Listing rent within seeker range = 100
 * Listing rent <= maxBudget = proportionate
 * Listing rent > maxBudget = 0
 */
export function scoreBudget(
  listingRent: number,
  seekerMinBudget: number | null,
  seekerMaxBudget: number
): number {
  if (listingRent > seekerMaxBudget) return 0;

  if (seekerMinBudget && listingRent >= seekerMinBudget) return 100;

  // Below minimum but within max - partial score
  if (seekerMinBudget) {
    const ratio = listingRent / seekerMinBudget;
    return Math.max(20, Math.round(ratio * 80));
  }

  // No minimum specified - full score if within max
  return 100;
}

// ============================================
// BHK/Type Scoring
// ============================================

/**
 * Score based on BHK and listing type match
 */
export function scoreBhk(
  listingBhk: string,
  listingType: 'whole_flat' | 'room_flatmate',
  seekerBhk: string,
  seekerType: 'whole_flat' | 'room_flatmate'
): number {
  // Type mismatch
  if (listingType !== seekerType) {
    // Cross-type matches get reduced score
    if (listingType === 'room_flatmate' && seekerType === 'whole_flat') return 30;
    if (listingType === 'whole_flat' && seekerType === 'room_flatmate') return 20;
    return 0;
  }

  // Seeker wants 'any' BHK
  if (seekerBhk === 'any') return 90;

  // Exact BHK match
  if (listingBhk === seekerBhk) return 100;

  // Room matches
  if (listingBhk === 'room' && seekerBhk === 'room') return 100;

  // Adjacent BHK (e.g., 2BHK seeker, 3BHK listing)
  const bhkOrder = ['room', '1BHK', '2BHK', '3BHK', '4+BHK'];
  const listingIdx = bhkOrder.indexOf(listingBhk);
  const seekerIdx = bhkOrder.indexOf(seekerBhk);

  if (listingIdx >= 0 && seekerIdx >= 0) {
    const diff = Math.abs(listingIdx - seekerIdx);
    if (diff === 1) return 70;
    if (diff === 2) return 40;
  }

  return 10;
}

// ============================================
// Timing Scoring
// ============================================

/**
 * Score based on move-in window overlap
 */
export function scoreTiming(
  listingAvailableFrom: Date,
  listingAvailableUntil: Date | null,
  seekerMoveInEarliest: Date,
  seekerMoveInLatest: Date
): number {
  const listingStart = listingAvailableFrom.getTime();
  const listingEnd = listingAvailableUntil?.getTime() || Date.now() + 365 * 24 * 60 * 60 * 1000;
  const seekerStart = seekerMoveInEarliest.getTime();
  const seekerEnd = seekerMoveInLatest.getTime();

  // No overlap
  if (listingEnd < seekerStart || listingStart > seekerEnd) return 0;

  // Calculate overlap
  const overlapStart = Math.max(listingStart, seekerStart);
  const overlapEnd = Math.min(listingEnd, seekerEnd);
  const overlapDays = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);

  const listingWindowDays = (listingEnd - listingStart) / (1000 * 60 * 60 * 24);
  const seekerWindowDays = (seekerEnd - seekerStart) / (1000 * 60 * 60 * 24);

  // Full overlap
  if (overlapDays >= seekerWindowDays * 0.8) return 100;
  if (overlapDays >= seekerWindowDays * 0.5) return 80;
  if (overlapDays >= seekerWindowDays * 0.25) return 60;
  if (overlapDays > 0) return 40;

  return 10;
}

// ============================================
// Lifestyle Scoring
// ============================================

/**
 * Score based on lifestyle preference compatibility
 */
export function scoreLifestyle(
  listingPrefs: Record<string, unknown>,
  seekerPrefs: Record<string, unknown>
): number {
  const weights = {
    food: 3,
    smoking: 3,
    drinking: 2,
    workFromHome: 1,
    pets: 1,
    gender: 2,
  } as const;

  let totalWeightSum = 0;
  let matchedWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const listingVal = listingPrefs[key];
    const seekerVal = seekerPrefs[key];

    // Skip if either doesn't have preference
    if (listingVal === undefined || seekerVal === undefined) continue;

    totalWeightSum += weight;

    // Check compatibility
    if (isLifestyleCompatible(key, listingVal, seekerVal)) {
      matchedWeight += weight;
    }
  }

  if (totalWeightSum === 0) return 80; // Neutral if no prefs specified

  return Math.round((matchedWeight / totalWeightSum) * 100);
}

function isLifestyleCompatible(key: string, listingVal: unknown, seekerVal: unknown): boolean {
  // Both 'no_preference' = compatible
  if (listingVal === 'no_preference' || seekerVal === 'no_preference') return true;

  // Exact match
  if (listingVal === seekerVal) return true;

  // Specific compatibility rules
  switch (key) {
    case 'food':
      // veg/non_veg only incompatible if strict
      return !(listingVal === 'veg' && seekerVal === 'non_veg') &&
             !(listingVal === 'non_veg' && seekerVal === 'veg');
    case 'smoking':
    case 'drinking':
      return listingVal === seekerVal || listingVal === 'occasionally' || seekerVal === 'occasionally';
    case 'pets':
      return listingVal === seekerVal || listingVal === 'no_preference' || seekerVal === 'no_preference';
    case 'gender':
      return listingVal === 'any' || seekerVal === 'any' || listingVal === seekerVal;
    default:
      return String(listingVal) === String(seekerVal);
  }
}

// ============================================
// Combined Scoring
// ============================================

/**
 * Calculate total match score with breakdown
 */
export function calculateMatchScore(params: {
  listingLocality: string;
  seekerPreferredLocalities: string[];
  seekerExcludedLocalities: string[];
  listingCoords: { lat: number; lon: number } | null;
  seekerCoords: { lat: number; lon: number } | null;
  listingRent: number;
  seekerMinBudget: number | null;
  seekerMaxBudget: number;
  listingBhk: string;
  listingType: 'whole_flat' | 'room_flatmate';
  seekerBhk: string;
  seekerType: 'whole_flat' | 'room_flatmate';
  listingAvailableFrom: Date;
  listingAvailableUntil: Date | null;
  seekerMoveInEarliest: Date;
  seekerMoveInLatest: Date;
  listingLifestylePrefs: Record<string, unknown>;
  seekerLifestylePrefs: Record<string, unknown>;
}): ScoreBreakdown {
  const geography = scoreGeography(
    params.listingLocality,
    params.seekerPreferredLocalities,
    params.seekerExcludedLocalities,
    params.listingCoords,
    params.seekerCoords
  );

  const budget = scoreBudget(
    params.listingRent,
    params.seekerMinBudget,
    params.seekerMaxBudget
  );

  const bhk = scoreBhk(
    params.listingBhk,
    params.listingType,
    params.seekerBhk,
    params.seekerType
  );

  const timing = scoreTiming(
    params.listingAvailableFrom,
    params.listingAvailableUntil,
    params.seekerMoveInEarliest,
    params.seekerMoveInLatest
  );

  const lifestyle = scoreLifestyle(
    params.listingLifestylePrefs,
    params.seekerLifestylePrefs
  );

  // Weighted total
  const total = Math.round(
    (geography * MATCH_WEIGHTS.geography +
     budget * MATCH_WEIGHTS.budget +
     bhk * MATCH_WEIGHTS.bhk +
     timing * MATCH_WEIGHTS.timing +
     lifestyle * MATCH_WEIGHTS.lifestyle) / 100
  );

  return { geography, budget, bhk, timing, lifestyle, total };
}

// ============================================
// Matching Query (for SQL)
// ============================================

/**
 * Generate SQL for finding compatible matches
 * This can be run directly in Supabase
 */
export function generateMatchingSQL(): string {
  return `
-- Daily matching job
-- Finds compatible listing-seeker pairs and creates match records

WITH approved_listings AS (
  SELECT
    l.id as listing_id,
    l.listing_type,
    l.bhk,
    l.rent,
    l.locality,
    l.geom,
    l.available_from,
    l.available_until,
    l.lifestyle_prefs,
    lp.exact_geom
  FROM listings l
  JOIN listing_private lp ON l.id = lp.listing_id
  WHERE l.status = 'approved'
    AND l.expires_at > NOW()
),
approved_seekers AS (
  SELECT
    s.id as seeker_id,
    s.max_budget,
    s.min_budget,
    s.bhk,
    s.listing_type,
    s.preferred_localities,
    s.excluded_localities,
    s.move_in_earliest,
    s.move_in_latest,
    s.lifestyle_prefs
  FROM seek_requests s
  WHERE s.status = 'approved'
    AND s.expires_at > NOW()
),
candidate_pairs AS (
  SELECT
    l.listing_id,
    s.seeker_id,
    l.locality as listing_locality,
    s.preferred_localities,
    s.excluded_localities,
    l.rent as listing_rent,
    s.max_budget,
    s.min_budget,
    l.bhk as listing_bhk,
    l.listing_type,
    s.bhk as seeker_bhk,
    s.listing_type as seeker_type,
    l.available_from,
    l.available_until,
    s.move_in_earliest,
    s.move_in_latest,
    l.lifestyle_prefs as listing_lifestyle,
    s.lifestyle_prefs as seeker_lifestyle,
    ST_Y(l.exact_geom::geometry) as listing_lat,
    ST_X(l.exact_geom::geometry) as listing_lon,
    -- Seeker coords would need to be stored or derived from preferred localities
    NULL::double precision as seeker_lat,
    NULL::double precision as seeker_lon
  FROM approved_listings l
  CROSS JOIN approved_seekers s
  -- Basic filters to reduce candidate set
  WHERE l.rent <= s.max_budget
    AND NOT (s.excluded_localities @> ARRAY[l.locality])
    AND (s.preferred_localities = '{}' OR s.preferred_localities @> ARRAY[l.locality])
    AND l.available_from <= s.move_in_latest
    AND COALESCE(l.available_until, '2099-12-31'::date) >= s.move_in_earliest
),
scored_pairs AS (
  SELECT
    *,
    -- Would apply scoring functions here
    -- For now, compute in application layer
    0 as score
  FROM candidate_pairs
)
INSERT INTO matches (listing_id, seeker_id, score, geography_score, budget_score, bhk_score, timing_score, lifestyle_score, status, expires_at)
SELECT
  listing_id,
  seeker_id,
  score,
  geography_score,
  budget_score,
  bhk_score,
  timing_score,
  lifestyle_score,
  'pending',
  NOW() + INTERVAL '7 days'
FROM scored_pairs sp
WHERE sp.score >= 40  -- Minimum threshold
  AND NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.listing_id = sp.listing_id
      AND m.seeker_id = sp.seeker_id
      AND m.status != 'expired'
  )
ON CONFLICT (listing_id, seeker_id) DO NOTHING;
  `;
}

// ============================================
// Haversine (re-export for matching)
// ============================================

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}