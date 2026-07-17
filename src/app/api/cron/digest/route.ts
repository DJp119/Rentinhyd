import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendDailyDigestEmail } from '@/lib/email';
import { logger } from '@/lib/observability';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let digestsSent = 0;
  let errors = 0;

  try {
    // Find seekers who have active matches and haven't received digest today
    const { data: seekers, error: seekersError } = await supabase
      .from('seekers')
      .select(`
        id, email, max_budget, min_budget, bhk, listing_type, furnishing,
        move_in_earliest, move_in_latest, preferred_localities, excluded_localities,
        lifestyle_prefs, updated_at
      `)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .is('last_digest_sent', null);

    if (seekersError) throw seekersError;

    if (!seekers?.length) {
      return NextResponse.json({
        success: true,
        message: 'No seekers need daily digest',
        digestsSent: 0,
        durationMs: Date.now() - startTime,
      });
    }

    logger.info('Daily digest job started', { seekersCount: seekers.length });

    // Process in batches
    for (const seeker of seekers) {
      try {
        // Find new pending matches for this seeker
        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            listing:listings!inner (
              id, listing_type, title, description, bhk, furnishing, rent,
              deposit_months, maintenance_included, locality, geom,
              available_from, available_until, amenities, lifestyle_prefs,
              created_at, view_count
            )
          `)
          .eq('seeker_id', seeker.id)
          .eq('status', 'pending')
          .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('score', { ascending: false })
          .limit(10);

        if (matchesError) throw matchesError;

        if (!matches?.length) {
          // Still update last_digest_sent to avoid checking again today
          await supabase
            .from('seekers')
            .update({ last_digest_sent: new Date().toISOString() })
            .eq('id', seeker.id);
          continue;
        }

        const digestItems = matches.map(match => ({
          matchId: match.id,
          listing: {
            id: match.listing.id,
            listingType: match.listing.listing_type,
            title: match.listing.title,
            description: match.listing.description,
            bhk: match.listing.bhk,
            furnishing: match.listing.furnishing,
            rent: match.listing.rent,
            depositMonths: match.listing.deposit_months,
            maintenanceIncluded: match.listing.maintenance_included,
            locality: match.listing.locality,
            geom: match.listing.geom,
            availableFrom: match.listing.available_from,
            availableUntil: match.listing.available_until,
            amenities: match.listing.amenities || [],
            lifestylePrefs: match.listing.lifestyle_prefs || {},
            createdAt: match.listing.created_at,
            viewCount: match.listing.view_count || 0,
          },
          score: match.score,
          scoreBreakdown: match.score_breakdown,
          seekerProfile: {
            budgetRange: `₹${seeker.min_budget || 0}–${seeker.max_budget}`,
            bhk: seeker.bhk,
            moveInWindow: `${new Date(seeker.move_in_earliest).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${new Date(seeker.move_in_latest).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
            lifestyleTags: Object.entries(seeker.lifestyle_prefs || {})
              .filter(([, v]) => v !== 'no_preference')
              .map(([k, v]) => `${k}:${v}`),
          },
        }));

        await sendDailyDigestEmail(seeker.email, digestItems);
        digestsSent++;

        // Update last_digest_sent
        await supabase
          .from('seekers')
          .update({ last_digest_sent: new Date().toISOString() })
          .eq('id', seeker.id);

      } catch (seekerError) {
        logger.error('Failed to send digest for seeker', { seekerId: seeker.id, error: String(seekerError) });
        errors++;
      }
    }

    logger.info('Daily digest job completed', { digestsSent, errors, durationMs: Date.now() - startTime });

    return NextResponse.json({
      success: true,
      digestsSent,
      errors,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Daily digest job failed', { error: String(error), durationMs: Date.now() - startTime });
    return NextResponse.json(
      { error: 'Daily digest job failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Daily digest cron endpoint. Use POST with Authorization header.',
    schedule: 'Daily at 08:00 UTC'
  });
}