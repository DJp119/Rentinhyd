// src/app/api/rent-pins/route.test.ts
// Regression tests for rent-pins API route

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set required env vars for lazy-initialized modules
process.env.RESEND_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_APP_URL = 'https://rentinhyderabad.in';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';

// Mock dependencies BEFORE importing the route
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    };
  },
}));

// Mock Supabase client
let rpcCallQueue: Array<{ data?: unknown; error?: unknown; count?: number }> = [];
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
    single: vi.fn(() => {
      if (currentTable === 'rent_pins') {
        return Promise.resolve({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', status: 'pending' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    rpc: vi.fn(() => chain),
    then: vi.fn((resolve) => {
      resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    }),
  };
  return chain;
};

const mockChain = createMockChain();

const mockSupabase = {
  from: vi.fn((table: string) => {
    currentTable = table;
    return mockChain;
  }),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  getLocalityFromPoint: vi.fn().mockResolvedValue('gachibowli'),
  applyPrivacyJitter: vi.fn().mockResolvedValue([78.365, 17.44]),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@/lib/security', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true }),
  hashEmail: vi.fn().mockResolvedValue('hashed-email'),
}));

vi.mock('@/lib/utils', () => ({
  generateRequestFingerprint: vi.fn().mockResolvedValue('test-fingerprint-hash'),
  checkHyderabadRadius: vi.fn().mockReturnValue({ allowed: true }),
}));

vi.mock('@/lib/moderation', () => ({
  checkAbuseOnSubmit: vi.fn().mockResolvedValue({ allowed: true, score: 0, reasons: [] }),
}));

vi.mock('@/lib/observability', () => ({
  logError: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@/lib/tokens', () => ({
  generateVerificationPair: vi.fn().mockResolvedValue({
    token: 'test-token',
    hash: 'test-hash',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }),
}));

vi.mock('@/lib/email', () => ({
  sendSeekerVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendListingVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
const { rentPinSubmitSchema, rentPinResponseSchema } = await import('@/lib/schemas');
const { POST } = await import('../route');

describe('POST /api/rent-pins', () => {
  let requestLoggerError: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    rpcCallQueue = [];

    // Reset Supabase rpc to use queue
    mockSupabase.rpc.mockImplementation(() => {
      const nextResult = rpcCallQueue.shift() || { data: null, error: null };
      const chain = createMockChain();
      chain.then.mockImplementation((resolve) => {
        resolve(nextResult);
        return Promise.resolve(nextResult);
      });
      return chain;
    });

    // Capture logger calls
    const { logger } = await import('@/lib/observability');
    requestLoggerError = logger.error as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.resetModules();
  });

  function createRequest(body: object, headers: Record<string, string> = {}) {
    return new Request('http://localhost:3000/api/rent-pins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  function setupSuccessfulMocks() {
    rpcCallQueue = [
      { data: [{ count: 0 }], error: null }, // count_recent_submissions_by_fingerprint
      { data: [{ count: 0 }], error: null }, // count_recent_submissions_by_email
      { data: [{ avg_rent: 25000, median_rent: 24000, sample_size: 10 }], error: null }, // get_average_rent_for_locality
    ];

    mockChain.single.mockResolvedValue({
      data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', status: 'pending' },
      error: null,
    });
  }

  describe('Validation', () => {
    it('returns 400 for invalid payload (missing required fields)', async () => {
      const req = createRequest({});
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid submission');
      expect(json.details).toBeDefined();
    });

    it('returns 400 for invalid coordinates (outside Hyderabad bounds)', async () => {
      const req = createRequest({
        lat: 0,
        lon: 0,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid submission');
    });

    it('returns 400 when rentMin > rentMax', async () => {
      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 35000,
        rentMax: 25000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid submission');
    });
  });

  describe('Turnstile verification', () => {
    it('returns 400 when Turnstile verification fails', async () => {
      const { verifyTurnstileToken } = await import('@/lib/security');
      vi.mocked(verifyTurnstileToken).mockResolvedValueOnce({
        success: false,
        error: 'Invalid token',
      });

      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'invalid-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Turnstile verification failed');
      expect(json.details).toBe('Invalid token');
    });
  });

  describe('Abuse detection', () => {
    it('returns 429 when abuse check blocks submission', async () => {
      const { checkAbuseOnSubmit } = await import('@/lib/moderation');
      vi.mocked(checkAbuseOnSubmit).mockResolvedValueOnce({
        allowed: false,
        score: 60,
        reasons: ['Rate limit exceeded for violations', 'Rent outlier for locality'],
      });

      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(429);
      expect(json.error).toBe('Submission blocked');
      expect(json.reasons).toContain('Rate limit exceeded for violations');
    });
  });

  describe('Successful submission', () => {
    beforeEach(() => {
      setupSuccessfulMocks();
    });

    it('returns 201 for valid payload with fingerprint field', async () => {
      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(json.status).toBe('pending');
      expect(json.message).toBe('Rent pin submitted and is now visible on the map.');
    });

    it('saves ip_fingerprint_hash on the rent_pins row', async () => {
      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      await POST(req);

      expect(mockSupabase.from).toHaveBeenCalledWith('rent_pins');
      expect(mockChain.insert).toHaveBeenCalled();
      const insertCall = mockChain.insert.mock.calls[0][0];
      expect(insertCall).toHaveProperty('ip_fingerprint_hash');
      expect(insertCall.ip_fingerprint_hash).toBe('test-fingerprint-hash');
    });

    it('response matches rentPinResponseSchema', async () => {
      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      const parseResult = rentPinResponseSchema.safeParse(json);
      expect(parseResult.success).toBe(true);
    });

    it('applies privacy jitter to coordinates', async () => {
      const { applyPrivacyJitter } = await import('@/lib/supabase');
      vi.mocked(applyPrivacyJitter).mockResolvedValueOnce([78.366, 17.441]);

      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      await POST(req);

      expect(applyPrivacyJitter).toHaveBeenCalledWith(78.365, 17.44);
      const insertCall = mockChain.insert.mock.calls[0][0];
      expect(insertCall.geom).toBe('POINT(78.366 17.441)');
    });
  });

  describe('Database error handling', () => {
    beforeEach(() => {
      setupSuccessfulMocks();
    });

    it('logs database error with code, message, details, hint', async () => {
      const pgError = {
        code: '42703',
        message: 'column rent_pins.ip_fingerprint_hash does not exist',
        details: 'Column does not exist in table',
        hint: 'Perhaps you meant to reference another column',
      };

      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: pgError,
      });

      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Unable to save your rent pin right now.');

      // Verify detailed logging
      expect(requestLoggerError).toHaveBeenCalledWith(
        'rent_pins.insert_failed',
        expect.objectContaining({
          code: '42703',
          message: expect.stringContaining('column rent_pins.ip_fingerprint_hash does not exist'),
          details: 'Column does not exist in table',
          hint: 'Perhaps you meant to reference another column',
        })
      );
    });

    it('does not expose raw database details in client response', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: '42703', message: 'internal pg error', details: 'secret', hint: 'secret hint' },
      });

      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(json.error).toBe('Unable to save your rent pin right now.');
      expect(json.code).toBeUndefined();
      expect(json.details).toBeUndefined();
      expect(json.hint).toBeUndefined();
    });
  });

  describe('Audit logging', () => {
    it('does not fail submission if audit logging fails', async () => {
      setupSuccessfulMocks();

      const { logAuditEvent } = await import('@/lib/supabase');
      vi.mocked(logAuditEvent).mockRejectedValueOnce(new Error('Audit log failed'));

      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.id).toBeDefined();
      expect(json.status).toBe('pending');
    });
  });

  describe('Hyderabad radius check', () => {
    it('returns 400 for coordinates outside Hyderabad radius', async () => {
      const { checkHyderabadRadius } = await import('@/lib/utils');
      vi.mocked(checkHyderabadRadius).mockReturnValueOnce({
        allowed: false,
        message: 'This pin is more than 150 km from Hyderabad. rentinhyderabad is currently focused on the Hyderabad metro area only.',
        distanceKm: 150,
      });

      const req = createRequest({
        lat: 17.44,
        lon: 78.365,
        rentMin: 20000,
        rentMax: 30000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
        locality: 'gachibowli',
        turnstileToken: 'mock-turnstile-token',
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('from Hyderabad');
    });
  });
});
