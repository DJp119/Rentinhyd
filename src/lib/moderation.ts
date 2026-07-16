// src/lib/moderation.ts
// Admin moderation utilities

import { supabase } from './supabase';
import { logger } from './observability';
import { logAuditEvent } from './supabase';

export type ModerationAction = 'quarantine' | 'approve' | 'ban' | 'delete' | 'warn';

export interface ModerationDecision {
  id: string;
  targetType: 'rent_pin' | 'listing' | 'seeker' | 'user';
  targetId: string;
  action: ModerationAction;
  reason?: string;
  evidence?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  decidedBy: string;
  decidedAt: string;
}

// ============================================
// Moderation Actions
// ============================================

export async function quarantineListing(
  listingId: string,
  adminId: string,
  reason: string,
  evidence?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (!listing) return { success: false, error: 'Listing not found' };

  // Update listing status
  const { error: updateError } = await supabase
    .from('listings')
    .update({ status: 'quarantined' })
    .eq('id', listingId);

  if (updateError) return { success: false, error: updateError.message };

  // Record decision
  await recordModerationDecision({
    targetType: 'listing',
    targetId: listingId,
    action: 'quarantine',
    reason,
    evidence,
    previousState: { status: listing.status },
    decidedBy: adminId,
  });

  // Update report statuses
  await supabase
    .from('reports')
    .update({ status: 'resolved', reviewed_at: new Date().toISOString(), reviewed_by: adminId, moderation_action: 'quarantine' })
    .eq('target_type', 'listing')
    .eq('target_id', listingId)
    .eq('status', 'pending');

  logger.info('moderation.listing_quarantined', { listingId, adminId });
  return { success: true };
}

export async function approveListing(
  listingId: string,
  adminId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (!listing) return { success: false, error: 'Listing not found' };

  const { error } = await supabase
    .from('listings')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId })
    .eq('id', listingId);

  if (error) return { success: false, error: error.message };

  await recordModerationDecision({
    targetType: 'listing',
    targetId: listingId,
    action: 'approve',
    reason,
    previousState: { status: listing.status },
    decidedBy: adminId,
  });

  await supabase
    .from('reports')
    .update({ status: 'resolved', reviewed_at: new Date().toISOString(), reviewed_by: adminId, moderation_action: 'approve' })
    .eq('target_type', 'listing')
    .eq('target_id', listingId)
    .eq('status', 'pending');

  logger.info('moderation.listing_approved', { listingId, adminId });
  return { success: true };
}

export async function banUser(
  userId: string,
  adminId: string,
  reason: string,
  evidence?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Ban all user's listings
  await supabase
    .from('listings')
    .update({ status: 'quarantined' })
    .eq('owner_id', userId)
    .in('status', ['pending', 'approved']);

  // Ban all user's seek requests
  await supabase
    .from('seek_requests')
    .update({ status: 'expired' })
    .eq('seeker_id', userId)
    .in('status', ['pending', 'approved']);

  // Mark identity as banned
  await supabase
    .from('identities')
    .update({ abuse_score: 100, abuse_flags: [{ type: 'banned', reason, at: new Date().toISOString() }] })
    .eq('id', userId);

  await recordModerationDecision({
    targetType: 'user',
    targetId: userId,
    action: 'ban',
    reason,
    evidence,
    previousState: {},
    decidedBy: adminId,
  });

  logger.info('moderation.user_banned', { userId, adminId });
  return { success: true };
}

export async function deleteContent(
  targetType: 'rent_pin' | 'listing' | 'seeker',
  targetId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  // Soft delete by updating status

  switch (targetType) {
    case 'rent_pin':
      await supabase.from('rent_pins').update({ status: 'quarantined' }).eq('id', targetId);
      break;
    case 'listing':
      await supabase.from('listings').update({ status: 'quarantined' }).eq('id', targetId);
      break;
    case 'seeker':
      await supabase.from('seek_requests').update({ status: 'expired' }).eq('id', targetId);
      break;
  }

  await recordModerationDecision({
    targetType,
    targetId,
    action: 'delete',
    reason,
    previousState: {},
    decidedBy: adminId,
  });

  logger.info('moderation.content_deleted', { targetType, targetId, adminId });
  return { success: true };
}

export async function warnUser(
  userId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { data: identity } = await supabase
    .from('identities')
    .select('abuse_flags')
    .eq('id', userId)
    .single();

  const flags = identity?.abuse_flags || [];
  flags.push({ type: 'warning', reason, at: new Date().toISOString() });

  await supabase
    .from('identities')
    .update({ abuse_flags: flags })
    .eq('id', userId);

  await recordModerationDecision({
    targetType: 'user',
    targetId: userId,
    action: 'warn',
    reason,
    previousState: {},
    decidedBy: adminId,
  });

  logger.info('moderation.user_warned', { userId, adminId });
  return { success: true };
}

// ============================================
// Decision Recording
// ============================================

interface RecordModerationParams {
  targetType: string;
  targetId: string;
  action: ModerationAction;
  reason?: string;
  evidence?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  decidedBy: string;
}

async function recordModerationDecision(params: RecordModerationParams) {
  await supabase
    .from('moderation_decisions')
    .insert({
      ...params,
      decided_at: new Date().toISOString(),
    });

  await logAuditEvent({
    event_type: 'moderation_decision',
    actor_type: 'admin',
    actor_id: params.decidedBy,
    target_type: params.targetType,
    target_id: params.targetId,
    payload: {
      action: params.action,
      reason: params.reason,
      evidence: params.evidence,
    },
  });
}

// ============================================
// Report Handling
// ============================================

export interface ReportWithDetails {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  reporterFingerprintHash: string;
  status: string;
  createdAt: string;
  targetPreview?: Record<string, unknown>;
}

export async function getPendingReports(limit = 50, offset = 0): Promise<ReportWithDetails[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Enrich with target previews
  const enriched = await Promise.all((data || []).map(async (report) => {
    let targetPreview = {};
    try {
      if (report.target_type === 'listing') {
        const { data: listing } = await supabase
          .from('listings')
          .select('id, title, locality, status, rent')
          .eq('id', report.target_id)
          .single();
        targetPreview = listing || {};
      } else if (report.target_type === 'rent_pin') {
        const { data: pin } = await supabase
          .from('rent_pins')
          .select('id, locality, rent_min, rent_max, status')
          .eq('id', report.target_id)
          .single();
        targetPreview = pin || {};
      }
    } catch {
      // Ignore enrichment errors
    }

    return {
      ...report,
      targetPreview,
    } as ReportWithDetails;
  }));

  return enriched;
}

export async function getReportCountByStatus(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('reports')
    .select('status')
    .then(({ data, error }) => ({ data, error }));

  if (error || !data) return {};

  return data.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ============================================
// Abuse Detection
// ============================================

interface AbuseCheckResult {
  allowed: boolean;
  reasons: string[];
  score: number;
}

export async function checkAbuseOnSubmit(params: {
  ipFingerprintHash: string;
  emailHash: string;
  targetType: 'rent_pin' | 'listing' | 'seeker';
  content?: Record<string, unknown>;
}): Promise<AbuseCheckResult> {
  const reasons: string[] = [];
  let score = 0;

  // 1. Rate limit by IP fingerprint (last hour)
  const { count: ipSubmissions } = await supabase
    .rpc('count_recent_submissions_by_fingerprint', {
      fingerprint: params.ipFingerprintHash,
      hours: 1,
    });

  if (ipSubmissions && ipSubmissions > 5) {
    reasons.push('Rate limit exceeded for violations');
    score += 30;
  }

  // 2. Rate limit by email (last hour)
  const { count: emailSubmissions } = await supabase
    .rpc('count_recent_submissions_by_email', {
      email_hash: params.emailHash,
      hours: 1,
    });

  if (emailSubmissions && emailSubmissions > 3) {
    reasons.push('Email rate limit exceeded');
    score += 20;
  }

  // 3. Duplicate detection
  if (params.content) {
    const isDuplicate = await checkDuplicateContent(params.targetType, params.content);
    if (isDuplicate) {
      reasons.push('Potential duplicate content');
      score += 25;
    }
  }

  // 4. Outlier rent range
  if (params.targetType === 'rent_pin' && params.content) {
    const { rent_min, rent_max } = params.content as { rent_min: number; rent_max: number };
    const { data: avgRent } = await supabase
      .rpc('get_average_rent_for_locality', {
        locality: params.content.locality as string,
      });

    if (avgRent && (rent_min > avgRent * 3 || rent_max < avgRent * 0.3)) {
      reasons.push('Rent outlier for locality');
      score += 15;
    }
  }

  // 5. Bot/velocity scoring (would integrate with Turnstile score)
  // Placeholder for additional checks

  return {
    allowed: score < 50,
    reasons,
    score,
  };
}

async function checkDuplicateContent(
  targetType: string,
  content: Record<string, unknown>
): Promise<boolean> {
  // Simplified duplicate check - in production use more sophisticated similarity
  if (targetType === 'rent_pin') {
    const { count } = await supabase
      .from('rent_pins')
      .select('*', { count: 'exact', head: true })
      .eq('locality', content.locality)
      .eq('rent_min', content.rent_min)
      .eq('rent_max', content.rent_max)
      .eq('bhk', content.bhk)
      .eq('furnishing', content.furnishing)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return (count || 0) > 0;
  }

  return false;
}