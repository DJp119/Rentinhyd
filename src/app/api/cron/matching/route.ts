import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateMatchingSQL, calculateMatchScore, type ScoreBreakdown } from '@/lib/matching';
import { sendMatchDigestEmail } from '@/lib/email';
import { generateToken } from '@/lib/tokens';
import { logger, logError } from '@/lib/observability';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let matchesCreated = 0;
  let digestsSent = 0;
  let errors = 0;

  try {
    // Step 1: Find approved listings and seekers
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        id, listing_type, bhk, rent, locality, geom, available_from, available_until,
        lifestyle_prefs, listing_private!inner (exact_geom, owner_id)
      `)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString());

    if (listingsError) throw listingsError;

    const { data: seekers, error: seekersError } = await supabase
      .from('seekers')
      .select(`
        id, max_budget, min_budget, bhk, listing_type, furnishing,
        move_in_earliest, move_in_latest, preferred_localities, excluded_localities,
        lifestyle_prefs
      `)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString());

    if (seekersError) throw seekersError;

    if (!listings?.length || !seekers?.length) {
      return NextResponse.json({
        success: true,
        message: 'No active listings or seekers to match',
        matchesCreated: 0,
        digestsSent: 0,
        durationMs: Date.now() - startTime,
      });
    }

    logger.info('Matching job started', { listingsCount: listings.length, seekersCount: seekers.length });

    // Step 2: Find compatible pairs and score them
    // We'll do this in batches to avoid memory issues
    const BATCH_SIZE = 100;
    type MatchInsert = {
      listing_id: string;
      seeker_id: string;
      score: number;
      score_breakdown: ScoreBreakdown;
    };
    const matches: MatchInsert[] = [];

    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const listingBatch = listings.slice(i, i + BATCH_SIZE);

      for (const listing of listingBatch) {
        const privateData = listing.listing_private as { exact_geom?: { coordinates: number[] }; owner_id: string } | { exact_geom?: { coordinates: number[] }; owner_id: string }[] | null;
        const privateObj = Array.isArray(privateData) ? privateData[0] : privateData;
        const listingCoords = privateObj?.exact_geom?.coordinates ||
          listing.geom?.coordinates || [0, 0];

        for (const seeker of seekers) {
          // Quick filter: budget compatibility
          if (listing.rent > (seeker.max_budget * 1.2) || listing.rent < (seeker.min_budget || 0) * 0.8) {
            continue;
          }

          // Quick filter: BHK compatibility
          const seekerBhk = seeker.bhk === 'any' || seeker.bhk === 'room' ? '1BHK' : seeker.bhk;
          const listingBhk = listing.bhk === '4+BHK' ? '3BHK' : listing.bhk;
          if (seeker.bhk !== 'any' && seeker.bhk !== 'room' && seekerBhk !== listingBhk) {
            continue;
          }

          // Quick filter: listing type compatibility
          if (seeker.listing_type !== 'any' && seeker.listing_type !== listing.listing_type) {
            continue;
          }

          // Quick filter: locality exclusion
          if (seeker.excluded_localities?.includes(listing.locality)) {
            continue;
          }

          // Quick filter: locality preference (if specified, must match)
          if (seeker.preferred_localities?.length && !seeker.preferred_localities.includes(listing.locality)) {
            continue;
          }

          // Calculate full score
          const scoreBreakdown = calculateMatchScore({
            listingLocality: listing.locality,
            seekerPreferredLocalities: seeker.preferred_localities || [],
            seekerExcludedLocalities: seeker.excluded_localities || [],
            listingCoords: listingCoords ? { lat: listingCoords[1], lon: listingCoords[0] } : null,
            seekerCoords: null,
            listingRent: listing.rent,
            seekerMinBudget: seeker.min_budget || null,
            seekerMaxBudget: seeker.max_budget,
            listingBhk: listing.bhk,
            listingType: listing.listing_type,
            seekerBhk: seeker.bhk,
            seekerType: seeker.listing_type,
            listingAvailableFrom: new Date(listing.available_from),
            listingAvailableUntil: listing.available_until ? new Date(listing.available_until) : null,
            seekerMoveInEarliest: new Date(seeker.move_in_earliest),
            seekerMoveInLatest: new Date(seeker.move_in_latest),
            listingLifestylePrefs: listing.lifestyle_prefs || {},
            seekerLifestylePrefs: seeker.lifestyle_prefs || {},
          });

          // Only create match if score >= 50
          if (scoreBreakdown.total >= 50) {
            matches.push({
              listing_id: listing.id,
              seeker_id: seeker.id,
              score: scoreBreakdown.total,
              score_breakdown: {
                geography: scoreBreakdown.geography,
                budget: scoreBreakdown.budget,
                bhk: scoreBreakdown.bhk,
                timing: scoreBreakdown.timing,
                lifestyle: scoreBreakdown.lifestyle,
                total: scoreBreakdown.total,
              },
            });
          }
        }
      }
    }

    logger.info('Match scoring complete', { matchesFound: matches.length });

    // Step 3: Upsert matches (avoid duplicates)
    if (matches.length > 0) {
      // Check existing matches to avoid duplicates
      const existingMatchKeys = new Set(
        matches.map(m => `${m.listing_id}-${m.seeker_id}`)
      );

      const { data: existingMatches, error: existingError } = await supabase
        .from('matches')
        .select('listing_id, seeker_id')
        .in('listing_id', [...new Set(matches.map(m => m.listing_id))])
        .in('seeker_id', [...new Set(matches.map(m => m.seeker_id))]);

      if (existingError) throw existingError;

      for (const m of existingMatches || []) {
        existingMatchKeys.add(`${m.listing_id}-${m.seeker_id}`);
      }

      const newMatches = matches.filter(m => !existingMatchKeys.has(`${m.listing_id}-${m.seeker_id}`));

      if (newMatches.length > 0) {
        const { error: insertError } = await supabase
          .from('matches')
          .insert(newMatches.map(m => ({
            listing_id: m.listing_id,
            seeker_id: m.seeker_id,
            score: m.score,
            score_breakdown: m.score_breakdown,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })));

        if (insertError) throw insertError;
        matchesCreated = newMatches.length;
      }
    }

    // Step 4: Send match digests to seekers
    // Group matches by seeker
    const matchesBySeeker = new Map<string, MatchInsert[]>();
    for (const match of matches) {
      // Only include newly created or re-scored matches
      if (!matchesBySeeker.has(match.seeker_id)) {
        matchesBySeeker.set(match.seeker_id, []);
      }
      matchesBySeeker.get(match.seeker_id)!.push(match);
    }

    // Send digest emails
    for (const [seekerId, seekerMatches] of matchesBySeeker) {
      if (seekerMatches.length === 0) continue;

      // Get seeker details for email
      const { data: seeker } = await supabase
        .from('seekers')
        .select('id, email')
        .eq('id', seekerId)
        .single();

      if (!seeker?.email) continue;

      // Get full listing details for each match
      const listingIds = seekerMatches.map(m => m.listing_id);
      const { data: fullListings } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds);

      if (!fullListings?.length) continue;

      // Format listings for email
      const digestItems = seekerMatches.map(match => {
        const listing = fullListings.find(l => l.id === match.listing_id);
        return {
          matchId: `${match.listing_id}-${match.seeker_id}`,
          listing: {
            id: listing!.id,
            listingType: listing!.listing_type,
            title: listing!.title,
            description: listing!.description,
            bhk: listing!.bhk,
            furnishing: listing!.furnishing,
            rent: listing!.rent,
            depositMonths: listing!.deposit_months,
            maintenanceIncluded: listing!.maintenance_included,
            locality: listing!.locality,
            geom: listing!.geom,
            availableFrom: listing!.available_from,
            availableUntil: listing!.available_until,
            amenities: listing!.amenities || [],
            lifestylePrefs: listing!.lifestyle_prefs || {},
            createdAt: listing!.created_at,
            viewCount: listing!.view_count || 0,
          },
          score: match.score,
          scoreBreakdown: match.score_breakdown,
          seekerProfile: {
            budgetRange: `₹${(seekerMatches[0].score_breakdown.budget)}`,
            bhk: '2BHK', // Would need seeker data
            moveInWindow: 'Within 30 days',
            lifestyleTags: [],
          },
        };
      });

       try {
        const unsubscribeToken = generateToken();
        await sendMatchDigestEmail(seeker.email, digestItems, unsubscribeToken);
        digestsSent++;
      } catch (emailError) {
        logError('matching.digest_send_failed', emailError, { seekerId });
        errors++;
      }
    }

    logger.info('Matching job completed', { matchesCreated, digestsSent, errors, durationMs: Date.now() - startTime });

    return NextResponse.json({
      success: true,
      matchesCreated,
      digestsSent,
      errors,
      durationMs: Date.now() - startTime,
    });
    } catch (error) {
    logError('matching.job_failed', error, { endpoint: '/api/cron/matching', durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Matching job failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Matching cron endpoint. Use POST with Authorization header.',
    schedule: 'Daily at 06:00 UTC'
  });
}
