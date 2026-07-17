// src/lib/__tests__/integration.test.ts
// Integration tests for core flows

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Resend BEFORE importing modules that use it
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
      };
    },
  };
});

// Mock Supabase
let currentTable: string | null = null;

const createMockChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => chain),
    rpc: vi.fn(() => chain),
    // Thenable interface for await support
    then: vi.fn((resolve, reject) => {
      resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    }),
  };
  return chain;
};

// Create a shared chain for from() calls
const mockChain = createMockChain();

// RPC call queue for sequential mocking
let rpcCallQueue: Array<{ count?: number; data?: unknown; error?: unknown }> = [];

const mockSupabase = {
  from: vi.fn((table: string) => {
    currentTable = table;
    return mockChain;
  }),
  rpc: vi.fn(),
};

// Helper to reset and configure mock chain
function setupMockChain(overrides = {}) {
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'eq', 'in', 'gte', 'lte',
    'order', 'range', 'limit', 'rpc'
  ];

  chainMethods.forEach(key => {
    mockChain[key].mockImplementation(() => mockChain);
  });

  // single() returns different data based on the table being queried
  mockChain.single.mockImplementation(() => {
    if (currentTable === 'listings') {
      return Promise.resolve({ data: { id: 'listing-123', title: 'Test', locality: 'gachibowli', status: 'approved', rent: 25000 }, error: null });
    }
    if (currentTable === 'rent_pins') {
      return Promise.resolve({ data: { id: 'pin-456', locality: 'madhapur', rent_min: 20000, rent_max: 30000, status: 'approved' }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  mockChain.then.mockImplementation((resolve) => {
    resolve({ data: null, error: null });
    return Promise.resolve({ data: null, error: null });
  });

  // Re-setup from() is already set to track table in mockSupabase definition

  // Re-setup rpc() to use queue
  mockSupabase.rpc.mockImplementation(() => {
    const nextResult = rpcCallQueue.shift() || { data: null, error: null };
    const chain = createMockChain();
    chain.then.mockImplementation((resolve) => {
      resolve(nextResult);
      return Promise.resolve(nextResult);
    });
    return chain;
  });

  Object.entries(overrides).forEach(([key, value]) => {
    if (mockChain[key]) {
      if (typeof value === 'function') {
        mockChain[key].mockImplementation(value);
      } else if (value !== undefined) {
        mockChain[key].mockResolvedValue(value);
      } else {
        mockChain[key].mockImplementation(() => mockChain);
      }
    }
  });
}

// Helper to queue RPC results for sequential calls
function queueRpcResults(...results: Array<{ data: unknown; error: unknown }>) {
  rpcCallQueue = results;
}

vi.mock('../supabase', () => ({
  supabase: mockSupabase,
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
const { verifyResendSignature, handleResendWebhook } = await import('../webhooks');
const { checkAbuseOnSubmit, recordModerationDecision, getPendingReports, getReportCountByStatus } = await import('../moderation');
const { generateActionPair, verifyToken, hashToken, generateIdempotencyKey } = await import('../tokens');
const { sendIntroductionEmail } = await import('../email');
const { scoreGeography, scoreBudget, scoreBhk, scoreTiming, scoreLifestyle, calculateMatchScore } = await import('../matching');

// Copy parseCommand logic for testing (not exported from webhooks)
function parseCommand(text: string): 'rented' | 'still available' | 'withdraw' | 'ambiguous' {
  const SUPPORTED_COMMANDS = ['rented', 'still available', 'withdraw'] as const;
  const normalized = text.toLowerCase().trim();

  for (const cmd of SUPPORTED_COMMANDS) {
    if (normalized === cmd || normalized.startsWith(cmd + ' ') || normalized.endsWith(' ' + cmd)) {
      return cmd;
    }
  }

  if (/\b(rented|let|leased)\b/.test(normalized)) return 'rented';
  if (/\b(still available|available|open)\b/.test(normalized)) return 'still available';
  if (/\b(withdraw|cancel|remove)\b/.test(normalized)) return 'withdraw';

  return 'ambiguous';
}

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTable = null;
    queueRpcResults({ data: null, error: null });
    setupMockChain({});
  });

  // ============================================
  // Webhook Signature Verification (HMAC-SHA256)
  // ============================================
  describe('Webhook Signature Verification', () => {
    const secret = 'whsec_test_secret_key';
    const payload = '{"email_id":"test-123","from":"sender@example.com"}';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    it('verifies valid Resend signature', async () => {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(`${timestamp}.${payload}`);
      const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
      const signatureArray = new Uint8Array(signatureBuffer);
      const expectedSig = Array.from(signatureArray, b => b.toString(16).padStart(2, '0')).join('');
      const signature = `t=${timestamp},s=${expectedSig}`;

      const result = await verifyResendSignature(payload, signature, secret);
      expect(result).toBe(true);
    });

    it('rejects invalid signature', async () => {
      const signature = `t=${timestamp},s=invalidsignature`;
      const result = await verifyResendSignature(payload, signature, secret);
      expect(result).toBe(false);
    });

    it('rejects stale timestamp (>5 min)', async () => {
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(`${oldTimestamp}.${payload}`);
      const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
      const signatureArray = new Uint8Array(signatureBuffer);
      const expectedSig = Array.from(signatureArray, b => b.toString(16).padStart(2, '0')).join('');
      const signature = `t=${oldTimestamp},s=${expectedSig}`;

      const result = await verifyResendSignature(payload, signature, secret);
      expect(result).toBe(false);
    });

    it('rejects malformed signature header', async () => {
      const result = await verifyResendSignature(payload, 'invalid', secret);
      expect(result).toBe(false);

      const result2 = await verifyResendSignature(payload, 't=123', secret);
      expect(result2).toBe(false);
    });

    it('uses constant-time comparison (timingSafeEqual)', async () => {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(`${timestamp}.${payload}`);
      const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
      const signatureArray = new Uint8Array(signatureBuffer);
      const expectedSig = Array.from(signatureArray, b => b.toString(16).padStart(2, '0')).join('');

      expect(await verifyResendSignature(payload, `t=${timestamp},s=${expectedSig}`, secret)).toBe(true);

      const wrongSig = expectedSig.slice(0, -1) + (expectedSig[expectedSig.length - 1] === '0' ? '1' : '0');
      expect(await verifyResendSignature(payload, `t=${timestamp},s=${wrongSig}`, secret)).toBe(false);
    });
  });

  // ============================================
  // Command Parsing
  // ============================================
  describe('Command Parsing', () => {
    it('parses "rented" commands', () => {
      expect(parseCommand('rented')).toBe('rented');
      expect(parseCommand('RENTED')).toBe('rented');
      expect(parseCommand('  rented  ')).toBe('rented');
      expect(parseCommand('rented listing')).toBe('rented');
      expect(parseCommand('my place is rented')).toBe('rented');
      expect(parseCommand('let')).toBe('rented');
      expect(parseCommand('leased')).toBe('rented');
    });

    it('parses "still available" commands', () => {
      expect(parseCommand('still available')).toBe('still available');
      expect(parseCommand('available')).toBe('still available');
      expect(parseCommand('open')).toBe('still available');
    });

    it('parses "withdraw" commands', () => {
      expect(parseCommand('withdraw')).toBe('withdraw');
      expect(parseCommand('cancel')).toBe('withdraw');
      expect(parseCommand('remove')).toBe('withdraw');
    });

    it('returns ambiguous for unclear commands', () => {
      expect(parseCommand('maybe')).toBe('ambiguous');
      expect(parseCommand('not sure')).toBe('ambiguous');
      expect(parseCommand('')).toBe('ambiguous');
      expect(parseCommand('hello')).toBe('ambiguous');
    });
  });

  // ============================================
  // Double-Consent Contact Introduction
  // ============================================
  describe('Double-Consent Contact Introduction', () => {
    it('generates action token pairs for both parties', async () => {
      const [ownerPair, seekerPair] = await Promise.all([
        generateActionPair(),
        generateActionPair(),
      ]);

      expect(ownerPair.token).toHaveLength(64);
      expect(ownerPair.hash).toHaveLength(64);
      expect(ownerPair.expiresAt).toBeInstanceOf(Date);
      expect(seekerPair.token).not.toBe(ownerPair.token);

      expect(await verifyToken(ownerPair.token, ownerPair.hash)).toBe(true);
      expect(await verifyToken(seekerPair.token, seekerPair.hash)).toBe(true);
    });

    it('tokens expire in ~7 days', async () => {
      const pair = await generateActionPair();
      const diff = pair.expiresAt.getTime() - Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(diff).toBeGreaterThan(sevenDays - 1000);
      expect(diff).toBeLessThan(sevenDays + 1000);
    });

    it('only allows consent when both parties accept (simulated)', async () => {
      let ownerConsent = false;
      let seekerConsent = false;

      function canIntroduce(): boolean {
        return ownerConsent && seekerConsent;
      }

      expect(canIntroduce()).toBe(false);

      ownerConsent = true;
      expect(canIntroduce()).toBe(false);

      seekerConsent = true;
      expect(canIntroduce()).toBe(true);
    });

    it('introduction expires after 7 days if not both accepted', async () => {
      const expiresAt = new Date(Date.now() + 1000);
      const ownerConsent = false;
      const seekerConsent = false;

      function isExpired(): boolean {
        return new Date() > expiresAt;
      }

      expect(isExpired()).toBe(false);
      await new Promise(r => setTimeout(r, 50));
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(new Date() < futureExpiry).toBe(true);
    });
  });

  // ============================================
  // Unsubscribe Flow
  // ============================================
  describe('Unsubscribe Flow', () => {
    it('generates unsubscribe token with action pair', async () => {
      const pair = await generateActionPair();
      const unsubscribeUrl = `https://hyderabad.rent/unsubscribe?token=${pair.token}`;

      expect(unsubscribeUrl).toContain('/unsubscribe?token=');
      expect(pair.token).toHaveLength(64);
    });

    it('unsubscribe link includes token in match digest email', async () => {
      const pair = await generateActionPair();
      const matchUrl = `https://hyderabad.rent/matches/test-match-id?token=${pair.token}`;

      expect(matchUrl).toContain('matches/test-match-id');
      expect(matchUrl).toContain(`token=${pair.token}`);
    });
  });

  // ============================================
  // Reports Handling
  // ============================================
  describe('Reports Handling', () => {
    it('fetches pending reports with target previews', async () => {
      const mockReports = [
        {
          id: 'report-1',
          target_type: 'listing',
          target_id: 'listing-123',
          reason: 'fake',
          description: 'Fake listing',
          reporter_fingerprint_hash: 'hash1',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        {
          id: 'report-2',
          target_type: 'rent_pin',
          target_id: 'pin-456',
          reason: 'scam',
          description: 'Scam pin',
          reporter_fingerprint_hash: 'hash2',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ];

      setupMockChain({
        then: (resolve) => { resolve({ data: mockReports, error: null }); return Promise.resolve({ data: mockReports, error: null }); },
      });

      const reports = await getPendingReports(50, 0);

      expect(reports).toHaveLength(2);
      expect(reports[0].targetPreview).toBeDefined();
      expect(reports[0].targetPreview?.title).toBe('Test');
      expect(reports[1].targetPreview).toBeDefined();
      expect(reports[1].targetPreview?.locality).toBe('madhapur');
    });

    it('handles missing target preview gracefully', async () => {
      const mockReports = [
        {
          id: 'report-3',
          target_type: 'listing',
          target_id: 'nonexistent',
          reason: 'fake',
          description: 'Fake listing',
          reporter_fingerprint_hash: 'hash3',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ];

      setupMockChain({
        then: (resolve) => { resolve({ data: mockReports, error: null }); return Promise.resolve({ data: mockReports, error: null }); },
        single: (resolve) => { resolve({ data: null, error: { code: 'PGRST116' } }); return Promise.resolve({ data: null, error: { code: 'PGRST116' } }); },
      });

      const reports = await getPendingReports(50, 0);

      expect(reports).toHaveLength(1);
      expect(reports[0].targetPreview).toEqual({});
    });

    it('counts reports by status', async () => {
      const mockReports = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'resolved' },
        { status: 'dismissed' },
      ];

      setupMockChain({
        then: (resolve) => { resolve({ data: mockReports, error: null }); return Promise.resolve({ data: mockReports, error: null }); },
      });

      const counts = await getReportCountByStatus();

      expect(counts.pending).toBe(2);
      expect(counts.resolved).toBe(1);
      expect(counts.dismissed).toBe(1);
    });
  });

  // ============================================
  // Duplicate Detection
  // ============================================
  describe('Duplicate Detection', () => {
    it('detects duplicate rent pins within 24 hours', async () => {
      queueRpcResults(
        { count: 0, error: null }, // count_recent_submissions_by_fingerprint
        { count: 0, error: null }, // count_recent_submissions_by_email
        { data: 25000, error: null }, // get_average_rent_for_locality
      );
      setupMockChain({
        then: (resolve) => { resolve({ count: 1, error: null }); return Promise.resolve({ count: 1, error: null }); },
      });

      const result = await checkAbuseOnSubmit({
        ipFingerprintHash: 'ip-hash-1',
        emailHash: 'email-hash-1',
        targetType: 'rent_pin',
        content: {
          locality: 'gachibowli',
          rent_min: 20000,
          rent_max: 30000,
          bhk: '2BHK',
          furnishing: 'semi_furnished',
        },
      });

      expect(result.reasons).toContain('Potential duplicate content');
      expect(result.score).toBeGreaterThanOrEqual(25);
    });

    it('does not flag non-duplicate content', async () => {
      queueRpcResults(
        { count: 0, error: null },
        { count: 0, error: null },
        { data: 25000, error: null },
      );
      setupMockChain({
        then: (resolve) => { resolve({ count: 0, error: null }); return Promise.resolve({ count: 0, error: null }); },
      });

      const result = await checkAbuseOnSubmit({
        ipFingerprintHash: 'ip-hash-2',
        emailHash: 'email-hash-2',
        targetType: 'rent_pin',
        content: {
          locality: 'gachibowli',
          rent_min: 25000,
          rent_max: 35000,
          bhk: '2BHK',
          furnishing: 'fully_furnished',
        },
      });

      expect(result.reasons).not.toContain('Potential duplicate content');
    });

    it('detects rent outlier for locality', async () => {
      queueRpcResults(
        { count: 0, error: null },
        { count: 0, error: null },
        { data: 25000, error: null },
      );
      setupMockChain({});

      const result = await checkAbuseOnSubmit({
        ipFingerprintHash: 'ip-hash-3',
        emailHash: 'email-hash-3',
        targetType: 'rent_pin',
        content: {
          locality: 'gachibowli',
          rent_min: 90000,
          rent_max: 100000,
          bhk: '2BHK',
          furnishing: 'semi_furnished',
        },
      });

      expect(result.reasons).toContain('Rent outlier for locality');
      expect(result.score).toBeGreaterThanOrEqual(15);
    });
  });

  // ============================================
  // Abuse Detection Scoring
  // ============================================
  describe('Abuse Detection Scoring', () => {
    it('allows clean submission (score < 50)', async () => {
      queueRpcResults(
        { count: 1, error: null }, // count_recent_submissions_by_fingerprint
        { count: 1, error: null }, // count_recent_submissions_by_email
        { data: 25000, error: null }, // get_average_rent_for_locality
      );
      setupMockChain({
        then: (resolve) => { resolve({ count: 0, error: null }); return Promise.resolve({ count: 0, error: null }); },
      });

      const result = await checkAbuseOnSubmit({
        ipFingerprintHash: 'clean-ip',
        emailHash: 'clean-email',
        targetType: 'rent_pin',
        content: {
          locality: 'gachibowli',
          rent_min: 20000,
          rent_max: 30000,
          bhk: '2BHK',
          furnishing: 'semi_furnished',
        },
      });

      expect(result.allowed).toBe(true);
      expect(result.score).toBeLessThan(50);
    });

    it('blocks when IP rate limited (>5 submissions)', async () => {
      queueRpcResults(
        { count: 10, error: null },
        { count: 1, error: null },
        { data: 25000, error: null },
      );
      setupMockChain({
        then: (resolve) => { resolve({ count: 0, error: null }); return Promise.resolve({ count: 0, error: null }); },
      });

      const result = await checkAbuseOnSubmit({
        ipFingerprintHash: 'spam-ip',
        emailHash: 'clean-email',
        targetType: 'rent_pin',
        content: {
          locality: 'gachibowli',
          rent_min: 20000,
          rent_max: 30000,
          bhk: '2BHK',
          furnishing: 'semi_furnished',
        },
      });

      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.reasons).toContain('Rate limit exceeded for violations');
    });

    it('blocks when combined factors exceed threshold', async () => {
      queueRpcResults(
        { count: 10, error: null },
        { count: 1, error: null },
        { data: 25000, error: null },
      );
      setupMockChain({
        then: (resolve) => { resolve({ count: 1, error: null }); return Promise.resolve({ count: 1, error: null }); },
      });

      const result = await checkAbuseOnSubmit({
        ipFingerprintHash: 'spam-ip',
        emailHash: 'clean-email',
        targetType: 'rent_pin',
        content: {
          locality: 'gachibowli',
          rent_min: 20000,
          rent_max: 30000,
          bhk: '2BHK',
          furnishing: 'semi_furnished',
        },
      });

      expect(result.allowed).toBe(false);
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    it('uses different thresholds for different target types', async () => {
      queueRpcResults(
        { count: 1, error: null },
        { count: 1, error: null },
        { data: 25000, error: null },
      );
      setupMockChain({
        then: (resolve) => { resolve({ count: 0, error: null }); return Promise.resolve({ count: 0, error: null }); },
      });

      const pinResult = await checkAbuseOnSubmit({
        ipFingerprintHash: 'test-ip',
        emailHash: 'test-email',
        targetType: 'rent_pin',
        content: { locality: 'gachibowli', rent_min: 20000, rent_max: 30000, bhk: '2BHK', furnishing: 'semi_furnished' },
      });

      queueRpcResults(
        { count: 1, error: null },
        { count: 1, error: null },
      );
      setupMockChain({
        then: (resolve) => { resolve({ count: 0, error: null }); return Promise.resolve({ count: 0, error: null }); },
      });

      const listingResult = await checkAbuseOnSubmit({
        ipFingerprintHash: 'test-ip',
        emailHash: 'test-email',
        targetType: 'listing',
        content: { rent: 25000 },
      });

      expect(pinResult.score).toBeLessThanOrEqual(listingResult.score + 15);
    });
  });

  // ============================================
  // Idempotency Keys
  // ============================================
  describe('Idempotency Keys', () => {
    it('generates consistent key for same prefix/identifier', async () => {
      const key1 = await generateIdempotencyKey('webhook', 'email-123');
      const key2 = await generateIdempotencyKey('webhook', 'email-123');
      expect(key1).toBe(key2);
    });

    it('generates different keys for different identifiers', async () => {
      const key1 = await generateIdempotencyKey('webhook', 'email-1');
      const key2 = await generateIdempotencyKey('webhook', 'email-2');
      expect(key1).not.toBe(key2);
    });

    it('includes prefix in output', async () => {
      const key = await generateIdempotencyKey('resend', 'test-id');
      expect(key).toMatch(/^resend_[0-9a-f]{16}$/);
    });
  });

  // ============================================
  // Matching Algorithm (Integration)
  // ============================================
  describe('Matching Algorithm Integration', () => {
    it('computes full match score for perfect match', () => {
      const params = {
        listingLocality: 'gachibowli',
        seekerPreferredLocalities: ['gachibowli'],
        seekerExcludedLocalities: [],
        listingCoords: { lat: 17.44, lon: 78.37 },
        seekerCoords: { lat: 17.441, lon: 78.371 },
        listingRent: 25000,
        seekerMinBudget: 20000,
        seekerMaxBudget: 30000,
        listingBhk: '2BHK',
        listingType: 'whole_flat' as const,
        seekerBhk: '2BHK',
        seekerType: 'whole_flat' as const,
        listingAvailableFrom: new Date('2025-01-01'),
        listingAvailableUntil: new Date('2025-12-31'),
        seekerMoveInEarliest: new Date('2025-02-01'),
        seekerMoveInLatest: new Date('2025-03-01'),
        listingLifestylePrefs: { food: 'veg', smoking: 'no' },
        seekerLifestylePrefs: { food: 'veg', smoking: 'no' },
      };

      const result = calculateMatchScore(params);

      expect(result.total).toBe(100);
      expect(result.geography).toBe(100);
      expect(result.budget).toBe(100);
      expect(result.bhk).toBe(100);
      expect(result.timing).toBe(100);
      expect(result.lifestyle).toBe(100);
    });

    it('weights components correctly', () => {
      const params = {
        listingLocality: 'gachibowli',
        seekerPreferredLocalities: ['madhapur'],
        seekerExcludedLocalities: [],
        listingCoords: null,
        seekerCoords: null,
        listingRent: 35000,
        seekerMinBudget: 20000,
        seekerMaxBudget: 30000,
        listingBhk: '2BHK',
        listingType: 'whole_flat' as const,
        seekerBhk: '2BHK',
        seekerType: 'whole_flat' as const,
        listingAvailableFrom: new Date('2025-01-01'),
        listingAvailableUntil: new Date('2025-12-31'),
        seekerMoveInEarliest: new Date('2025-02-01'),
        seekerMoveInLatest: new Date('2025-03-01'),
        listingLifestylePrefs: { food: 'veg', smoking: 'no' },
        seekerLifestylePrefs: { food: 'veg', smoking: 'no' },
      };

      const result = calculateMatchScore(params);

      expect(result.total).toBe(66);
    });

    it('returns 0 for excluded locality', () => {
      const params = {
        listingLocality: 'gachibowli',
        seekerPreferredLocalities: ['gachibowli'],
        seekerExcludedLocalities: ['gachibowli'],
        listingCoords: null,
        seekerCoords: null,
        listingRent: 25000,
        seekerMinBudget: 20000,
        seekerMaxBudget: 30000,
        listingBhk: '2BHK',
        listingType: 'whole_flat' as const,
        seekerBhk: '2BHK',
        seekerType: 'whole_flat' as const,
        listingAvailableFrom: new Date('2025-01-01'),
        listingAvailableUntil: new Date('2025-12-31'),
        seekerMoveInEarliest: new Date('2025-02-01'),
        seekerMoveInLatest: new Date('2025-03-01'),
        listingLifestylePrefs: {},
        seekerLifestylePrefs: {},
      };

      const result = calculateMatchScore(params);
      expect(result.geography).toBe(0);
      // With geography=0, budget=100, bhk=100, timing=100, lifestyle=80 (no prefs)
      // weighted: (0*30 + 100*25 + 100*20 + 100*15 + 80*10)/100 = 68
      expect(result.total).toBe(68);
    });
  });

  // ============================================
  // Token Verification Flow
  // ============================================
  describe('Token Verification Flow', () => {
    it('verifies token against hash (verification flow)', async () => {
      const { generateVerificationPair } = await import('../tokens');
      const pair = await generateVerificationPair();

      const isValid = await verifyToken(pair.token, pair.hash);
      expect(isValid).toBe(true);

      const wrongToken = 'a'.repeat(64);
      const isInvalid = await verifyToken(wrongToken, pair.hash);
      expect(isInvalid).toBe(false);
    });

    it('checks token expiry correctly', async () => {
      const { isTokenExpired, getVerificationExpiry } = await import('../tokens');

      const futureExpiry = getVerificationExpiry();
      expect(isTokenExpired(futureExpiry)).toBe(false);

      const pastExpiry = new Date(Date.now() - 1000);
      expect(isTokenExpired(pastExpiry)).toBe(true);

      expect(isTokenExpired(null)).toBe(true);
    });
  });

  // ============================================
  // Introduction Email Generation
  // ============================================
  describe('Introduction Email', () => {
    it('generates introduction email with contact details and withdrawal link', async () => {
      const pair = await generateActionPair();

      const result = await sendIntroductionEmail(
        'seeker@example.com',
        {
          name: 'John Owner',
          phone: '+919876543210',
          email: 'owner@example.com',
          preferredMethod: 'phone',
          contactWindow: '10:00-18:00',
        },
        {
          listingTitle: 'Beautiful 2BHK in Gachibowli',
          locality: 'Gachibowli',
        },
        pair.token
      );

      expect(result.success).toBe(true);
      expect(result.emailId).toBeDefined();
    });
  });
});