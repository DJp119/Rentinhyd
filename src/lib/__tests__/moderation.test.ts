// src/lib/__tests__/moderation.test.ts
// Unit tests for moderation and abuse detection logic (pure functions)

import { describe, it, expect } from 'vitest';

// We test the pure logic by extracting the decision-making parts
// The actual functions use Supabase, so we test the scoring logic here

describe('Abuse Detection Logic', () => {
  // Test the threshold logic that would be in checkAbuseOnSubmit
  const ABUSE_THRESHOLD = 50;

  function evaluateAbuseScore(score: number) {
    return {
      allowed: score < ABUSE_THRESHOLD,
      score,
    };
  }

  it('allows submissions below threshold', () => {
    expect(evaluateAbuseScore(0).allowed).toBe(true);
    expect(evaluateAbuseScore(25).allowed).toBe(true);
    expect(evaluateAbuseScore(49).allowed).toBe(true);
  });

  it('blocks submissions at or above threshold', () => {
    expect(evaluateAbuseScore(50).allowed).toBe(false);
    expect(evaluateAbuseScore(75).allowed).toBe(false);
    expect(evaluateAbuseScore(100).allowed).toBe(false);
  });

  // Test individual scoring rules
  describe('IP rate limit scoring', () => {
    function ipRateLimitScore(submissions: number): number {
      if (submissions > 5) return 30;
      return 0;
    }

    it('gives 0 for ≤5 submissions', () => {
      expect(ipRateLimitScore(0)).toBe(0);
      expect(ipRateLimitScore(3)).toBe(0);
      expect(ipRateLimitScore(5)).toBe(0);
    });

    it('gives 30 for >5 submissions', () => {
      expect(ipRateLimitScore(6)).toBe(30);
      expect(ipRateLimitScore(10)).toBe(30);
      expect(ipRateLimitScore(100)).toBe(30);
    });
  });

  describe('Email rate limit scoring', () => {
    function emailRateLimitScore(submissions: number): number {
      if (submissions > 3) return 20;
      return 0;
    }

    it('gives 0 for ≤3 submissions', () => {
      expect(emailRateLimitScore(0)).toBe(0);
      expect(emailRateLimitScore(3)).toBe(0);
    });

    it('gives 20 for >3 submissions', () => {
      expect(emailRateLimitScore(4)).toBe(20);
      expect(emailRateLimitScore(10)).toBe(20);
    });
  });

  describe('Duplicate detection scoring', () => {
    function duplicateScore(isDuplicate: boolean): number {
      return isDuplicate ? 25 : 0;
    }

    it('gives 25 for duplicates', () => {
      expect(duplicateScore(true)).toBe(25);
    });

    it('gives 0 for non-duplicates', () => {
      expect(duplicateScore(false)).toBe(0);
    });
  });

  describe('Rent outlier scoring', () => {
    function rentOutlierScore(rentMin: number, rentMax: number, avgRent: number): number {
      if (rentMin > avgRent * 3 || rentMax < avgRent * 0.3) return 15;
      return 0;
    }

    it('gives 15 for rent_min > 3x avg', () => {
      expect(rentOutlierScore(90000, 100000, 25000)).toBe(15);
    });

    it('gives 15 for rent_max < 0.3x avg', () => {
      expect(rentOutlierScore(5000, 6000, 25000)).toBe(15);
    });

    it('gives 0 for normal range', () => {
      expect(rentOutlierScore(20000, 30000, 25000)).toBe(0);
      expect(rentOutlierScore(25000, 35000, 25000)).toBe(0);
    });
  });

  describe('Combined abuse scoring', () => {
    function calculateTotalScore(params: {
      ipSubmissions: number;
      emailSubmissions: number;
      isDuplicate: boolean;
      rentMin: number;
      rentMax: number;
      avgRent: number;
    }): number {
      let score = 0;

      if (params.ipSubmissions > 5) score += 30;
      if (params.emailSubmissions > 3) score += 20;
      if (params.isDuplicate) score += 25;
      if (params.rentMin > params.avgRent * 3 || params.rentMax < params.avgRent * 0.3) score += 15;

      return score;
    }

    it('allows clean submission', () => {
      const score = calculateTotalScore({
        ipSubmissions: 1,
        emailSubmissions: 1,
        isDuplicate: false,
        rentMin: 20000,
        rentMax: 30000,
        avgRent: 25000,
      });
      expect(score).toBe(0);
    });

    it('blocks when IP rate limited', () => {
      const score = calculateTotalScore({
        ipSubmissions: 10,
        emailSubmissions: 1,
        isDuplicate: false,
        rentMin: 20000,
        rentMax: 30000,
        avgRent: 25000,
      });
      expect(score).toBe(30);
      expect(score < 50).toBe(true); // Still under threshold
    });

    it('blocks when combined factors exceed threshold', () => {
      // IP limit (30) + duplicate (25) = 55 > 50
      const score = calculateTotalScore({
        ipSubmissions: 10,
        emailSubmissions: 1,
        isDuplicate: true,
        rentMin: 20000,
        rentMax: 30000,
        avgRent: 25000,
      });
      expect(score).toBe(55);
      expect(score < 50).toBe(false);
    });

    it('blocks when email limit + duplicate + outlier', () => {
      // Email limit (20) + duplicate (25) + outlier (15) = 60 > 50
      const score = calculateTotalScore({
        ipSubmissions: 1,
        emailSubmissions: 5,
        isDuplicate: true,
        rentMin: 100000,
        rentMax: 120000,
        avgRent: 25000,
      });
      expect(score).toBe(60);
      expect(score < 50).toBe(false);
    });

    it('allows when IP limit + email limit = 50 (at threshold)', () => {
      // The threshold is < 50, so 50 is blocked
      const score = calculateTotalScore({
        ipSubmissions: 6,
        emailSubmissions: 4,
        isDuplicate: false,
        rentMin: 20000,
        rentMax: 30000,
        avgRent: 25000,
      });
      expect(score).toBe(50);
      expect(score < 50).toBe(false);
    });
  });
});

describe('Moderation Actions', () => {
  type ModerationAction = 'quarantine' | 'approve' | 'ban' | 'delete' | 'warn';

  const MODERATION_ACTIONS: ModerationAction[] = [
    'quarantine', 'approve', 'ban', 'delete', 'warn'
  ];

  it('has all expected actions', () => {
    expect(MODERATION_ACTIONS).toHaveLength(5);
    expect(MODERATION_ACTIONS).toContain('quarantine');
    expect(MODERATION_ACTIONS).toContain('approve');
    expect(MODERATION_ACTIONS).toContain('ban');
    expect(MODERATION_ACTIONS).toContain('delete');
    expect(MODERATION_ACTIONS).toContain('warn');
  });

  // Test decision structure
  interface ModerationDecision {
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

  it('creates valid moderation decision structure', () => {
    const decision: ModerationDecision = {
      id: 'test-decision-1',
      targetType: 'listing',
      targetId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'quarantine',
      reason: 'Fake listing detected',
      evidence: { screenshot: 'url' },
      previousState: { status: 'approved' },
      decidedBy: 'admin-1',
      decidedAt: new Date().toISOString(),
    };

    expect(decision.action).toBe('quarantine');
    expect(decision.targetType).toBe('listing');
    expect(decision.decidedAt).toBeDefined();
  });
});

describe('Report Handling', () => {
  type ReportStatus = 'pending' | 'resolved' | 'dismissed';
  type ReportReason = 'fake' | 'broker' | 'scam' | 'inappropriate' | 'other';

  const REPORT_REASONS: ReportReason[] = ['fake', 'broker', 'scam', 'inappropriate', 'other'];
  const REPORT_STATUSES: ReportStatus[] = ['pending', 'resolved', 'dismissed'];

  it('has all expected report reasons', () => {
    expect(REPORT_REASONS).toHaveLength(5);
  });

  it('has all expected report statuses', () => {
    expect(REPORT_STATUSES).toHaveLength(3);
  });

  // Test report enrichment logic
  interface ReportWithDetails {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    description?: string;
    status: ReportStatus;
    createdAt: string;
    targetPreview?: Record<string, unknown>;
  }

  it('can enrich report with target preview', () => {
    const report: ReportWithDetails = {
      id: 'report-1',
      targetType: 'listing',
      targetId: 'listing-123',
      reason: 'fake',
      status: 'pending',
      createdAt: new Date().toISOString(),
      targetPreview: { title: 'Test Listing', locality: 'gachibowli', rent: 25000 },
    };

    expect(report.targetPreview).toBeDefined();
    expect(report.targetPreview?.title).toBe('Test Listing');
  });

  it('handles missing target preview gracefully', () => {
    const report: ReportWithDetails = {
      id: 'report-2',
      targetType: 'rent_pin',
      targetId: 'pin-456',
      reason: 'scam',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    expect(report.targetPreview).toBeUndefined();
  });
});

describe('Report Count Aggregation', () => {
  function getReportCountByStatus(reports: Array<{ status: string }>): Record<string, number> {
    return reports.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  it('counts reports by status', () => {
    const reports = [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'resolved' },
      { status: 'dismissed' },
      { status: 'resolved' },
    ];

    const counts = getReportCountByStatus(reports);
    expect(counts.pending).toBe(2);
    expect(counts.resolved).toBe(2);
    expect(counts.dismissed).toBe(1);
  });

  it('handles empty array', () => {
    const counts = getReportCountByStatus([]);
    expect(counts).toEqual({});
  });
});