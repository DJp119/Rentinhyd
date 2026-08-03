// src/lib/__tests__/schemas.test.ts
// Unit tests for Zod schema validation

import { describe, it, expect } from 'vitest';
import {
  // Map API
  mapQuerySchema,
  mapResponseSchema,
  type MapQuery,

  // Rent Pins API
  rentPinSubmitSchema,
  rentPinResponseSchema,
  type RentPinSubmit,

  // Listings API
  listingSubmitSchema,
  listingResponseSchema,
  publicListingSchema,
  type ListingSubmit,

  // Seekers API
  seekerSubmitSchema,
  seekerResponseSchema,
  type SeekerSubmit,

  // Verification
  verifyTokenSchema,
  verifyResponseSchema,
  type VerifyToken,

  // Matches
  matchRespondSchema,
  matchResponseSchema,
  type MatchRespond,

  // Reports
  reportSubmitSchema,
  reportResponseSchema,
  type ReportSubmit,

  // Resend Webhook
  resendWebhookSchema,
  type ResendWebhook,

  // Stats
  statsQuerySchema,
  localityStatsSchema,
  cityStatsSchema,
  viewportStatsSchema,

  // Health
  healthResponseSchema,
  type HealthResponse,

  // Schemas registry
  schemas,
  validateSchema,
  toLetBoardSubmitSchema,
  toLetBoardResponseSchema,
  mapPinSchema,
  type SchemaKey,
} from '../schemas';

describe('Zod Schema Validation', () => {
  describe('mapQuerySchema', () => {
    it('validates valid bbox query', () => {
      const input = {
        bbox: '78.3,17.4,78.5,17.6',
        zoom: 13,
        type: 'all' as const,
        minRent: 10000,
        maxRent: 50000,
        bhk: '2BHK',
        furnishing: 'semi_furnished',
      };

      const result = mapQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bbox).toBe('78.3,17.4,78.5,17.6');
        expect(result.data.zoom).toBe(13);
      }
    });

    it('requires zoom parameter', () => {
      const result = mapQuerySchema.safeParse({ bbox: '78.3,17.4,78.5,17.6' });
      expect(result.success).toBe(false);
    });

    it('defaults type to "all" when provided', () => {
      const result = mapQuerySchema.safeParse({ bbox: '78.3,17.4,78.5,17.6', zoom: 13 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('all');
      }
    });

    it('rejects invalid bbox format', () => {
      const result = mapQuerySchema.safeParse({ bbox: 'invalid', zoom: 13 });
      expect(result.success).toBe(false);
    });

    it('rejects invalid type', () => {
      const result = mapQuerySchema.safeParse({
        bbox: '78.3,17.4,78.5,17.6',
        zoom: 13,
        type: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative rent values', () => {
      const result = mapQuerySchema.safeParse({
        bbox: '78.3,17.4,78.5,17.6',
        zoom: 13,
        minRent: -1000,
      });
      expect(result.success).toBe(false);
    });

    it('validates tolet_board map pin item', () => {
      const result = mapPinSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'tolet_board',
        geom: { type: 'Point', coordinates: [78.37, 17.44] },
        locality: 'gachibowli',
      });
      expect(result.success).toBe(true);
    });

    it('rejects malformed tolet_board map pin item', () => {
      const result = mapPinSchema.safeParse({
        id: 'invalid-uuid',
        type: 'tolet_board',
        geom: { type: 'Point', coordinates: [78.37, 17.44] },
        locality: 'gachibowli',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('rentPinSubmitSchema', () => {
    const validPin = {
      locality: 'gachibowli',
      lat: 17.44,
      lon: 78.37,
      rentMin: 20000,
      rentMax: 30000,
      bhk: '2BHK',
      furnishing: 'semi_furnished',
      turnstileToken: 'valid-token',
    };

    it('validates valid rent pin', () => {
      const result = rentPinSubmitSchema.safeParse(validPin);
      expect(result.success).toBe(true);
    });

    it('rejects invalid locality', () => {
      const result = rentPinSubmitSchema.safeParse({ ...validPin, locality: 'invalid!' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid coordinates', () => {
      expect(rentPinSubmitSchema.safeParse({ ...validPin, lat: 100 }).success).toBe(false);
      expect(rentPinSubmitSchema.safeParse({ ...validPin, lon: -200 }).success).toBe(false);
    });

    it('rejects rentMin > rentMax', () => {
      const result = rentPinSubmitSchema.safeParse({ ...validPin, rentMin: 30000, rentMax: 20000 });
      expect(result.success).toBe(false);
    });

    it('rejects invalid BHK', () => {
      const result = rentPinSubmitSchema.safeParse({ ...validPin, bhk: '5BHK' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid furnishing', () => {
      const result = rentPinSubmitSchema.safeParse({ ...validPin, furnishing: 'luxury' });
      expect(result.success).toBe(false);
    });

    it('rejects missing turnstileToken', () => {
      const { turnstileToken, ...rest } = validPin;
      const result = rentPinSubmitSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('listingSubmitSchema', () => {
    const validListing = {
      listingType: 'whole_flat' as const,
      title: 'Beautiful 2BHK in Gachibowli',
      description: 'Spacious apartment with great amenities and metro access.',
      bhk: '2BHK',
      furnishing: 'semi_furnished' as const,
      rent: 25000,
      depositMonths: 2,
      maintenanceIncluded: false,
      locality: 'gachibowli',
      lon: 78.37,
      lat: 17.44,
      availableFrom: '2025-02-01',
      availableUntil: '2025-08-01',
      amenities: ['wifi', 'ac', 'parking'],
      lifestylePrefs: {
        food: 'no_preference',
        smoking: 'no_preference',
        drinking: 'no_preference',
        workFromHome: true,
        pets: 'no_preference',
        gender: 'no_preference',
      },
      contactPhone: '+919876543210',
      contactEmail: 'owner@example.com',
      contactMethod: 'email' as const,
      contactWindowStart: '10:00',
      contactWindowEnd: '18:00',
      turnstileToken: 'valid-token',
    };

    it('validates valid listing', () => {
      const result = listingSubmitSchema.safeParse(validListing);
      expect(result.success).toBe(true);
    });

    it('rejects invalid listingType', () => {
      const result = listingSubmitSchema.safeParse({ ...validListing, listingType: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('rejects title too short', () => {
      const result = listingSubmitSchema.safeParse({ ...validListing, title: 'Short' });
      expect(result.success).toBe(false);
    });

    it('rejects title too long', () => {
      const result = listingSubmitSchema.safeParse({ ...validListing, title: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('rejects description too short when provided', () => {
      const result = listingSubmitSchema.safeParse({ ...validListing, description: 'short' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid rent', () => {
      expect(listingSubmitSchema.safeParse({ ...validListing, rent: 0 }).success).toBe(false);
      expect(listingSubmitSchema.safeParse({ ...validListing, rent: -1000 }).success).toBe(false);
    });

    it('rejects invalid deposit months', () => {
      expect(listingSubmitSchema.safeParse({ ...validListing, depositMonths: -1 }).success).toBe(false);
      expect(listingSubmitSchema.safeParse({ ...validListing, depositMonths: 25 }).success).toBe(false);
    });

    it('rejects invalid date format', () => {
      const result = listingSubmitSchema.safeParse({ ...validListing, availableFrom: '01-02-2025' });
      expect(result.success).toBe(false);
    });

    it('rejects availableUntil before availableFrom', () => {
      const result = listingSubmitSchema.safeParse({
        ...validListing,
        availableFrom: '2025-05-01',
        availableUntil: '2025-04-01',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid contactWindow order', () => {
      const result = listingSubmitSchema.safeParse({
        ...validListing,
        contactWindowStart: '18:00',
        contactWindowEnd: '10:00',
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid contactWindow order', () => {
      const result = listingSubmitSchema.safeParse({
        ...validListing,
        contactWindowStart: '10:00',
        contactWindowEnd: '18:00',
      });
      expect(result.success).toBe(true);
    });

    it('defaults depositMonths to 2', () => {
      const { depositMonths, ...rest } = validListing;
      const result = listingSubmitSchema.safeParse(rest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.depositMonths).toBe(2);
      }
    });

    it('defaults maintenanceIncluded to false', () => {
      const { maintenanceIncluded, ...rest } = validListing;
      const result = listingSubmitSchema.safeParse(rest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maintenanceIncluded).toBe(false);
      }
    });

    it('defaults contactMethod to email', () => {
      const { contactMethod, ...rest } = validListing;
      const result = listingSubmitSchema.safeParse(rest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contactMethod).toBe('email');
      }
    });
  });

  describe('seekerSubmitSchema', () => {
    const validSeeker = {
      email: 'seeker@example.com',
      maxBudget: 30000,
      minBudget: 15000,
      bhk: '2BHK',
      listingType: 'whole_flat' as const,
      furnishing: 'semi_furnished' as const,
      moveInEarliest: '2025-02-01',
      moveInLatest: '2025-03-15',
      preferredLocalities: ['gachibowli', 'madhapur'],
      excludedLocalities: ['kukatpally'],
      lifestylePrefs: {
        food: 'no_preference',
        smoking: 'no_preference',
        drinking: 'no_preference',
        workFromHome: true,
        pets: 'no_preference',
        gender: 'no_preference',
      },
      turnstileToken: 'valid-token',
    };

    it('validates valid seeker', () => {
      const result = seekerSubmitSchema.safeParse(validSeeker);
      expect(result.success).toBe(true);
    });

    it('rejects minBudget > maxBudget', () => {
      const result = seekerSubmitSchema.safeParse({ ...validSeeker, minBudget: 40000 });
      expect(result.success).toBe(false);
    });

    it('rejects moveInEarliest > moveInLatest', () => {
      const result = seekerSubmitSchema.safeParse({
        ...validSeeker,
        moveInEarliest: '2025-03-15',
        moveInLatest: '2025-02-01',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty maxBudget', () => {
      const { maxBudget, ...rest } = validSeeker;
      const result = seekerSubmitSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('accepts without minBudget', () => {
      const { minBudget, ...rest } = validSeeker;
      const result = seekerSubmitSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });

    it('rejects too many preferred localities', () => {
      const result = seekerSubmitSchema.safeParse({
        ...validSeeker,
        preferredLocalities: Array(11).fill('gachibowli'),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verifyTokenSchema', () => {
    it('validates valid token', () => {
      const result = verifyTokenSchema.safeParse({ token: 'a'.repeat(32) });
      expect(result.success).toBe(true);
    });

    it('rejects token too short', () => {
      const result = verifyTokenSchema.safeParse({ token: 'short' });
      expect(result.success).toBe(false);
    });

    it('rejects token too long', () => {
      const result = verifyTokenSchema.safeParse({ token: 'a'.repeat(129) });
      expect(result.success).toBe(false);
    });
  });

  describe('matchRespondSchema', () => {
    it('validates accept action', () => {
      const result = matchRespondSchema.safeParse({
        token: 'a'.repeat(32),
        action: 'accept' as const,
      });
      expect(result.success).toBe(true);
    });

    it('validates decline action', () => {
      const result = matchRespondSchema.safeParse({
        token: 'a'.repeat(32),
        action: 'decline' as const,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid action', () => {
      const result = matchRespondSchema.safeParse({
        token: 'a'.repeat(32),
        action: 'maybe',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reportSubmitSchema', () => {
    const validReport = {
      targetType: 'listing' as const,
      targetId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'fake' as const,
      description: 'This listing appears to be fake based on photos.',
      evidence: { screenshotUrl: 'https://example.com/screenshot.png' },
      turnstileToken: 'valid-token',
    };

    it('validates valid report', () => {
      const result = reportSubmitSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it('rejects invalid targetType', () => {
      const result = reportSubmitSchema.safeParse({ ...validReport, targetType: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid UUID', () => {
      const result = reportSubmitSchema.safeParse({ ...validReport, targetId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid reason', () => {
      const result = reportSubmitSchema.safeParse({ ...validReport, reason: 'spam' as any });
      expect(result.success).toBe(false);
    });

    it('rejects description too short', () => {
      const result = reportSubmitSchema.safeParse({ ...validReport, description: 'short' });
      expect(result.success).toBe(false);
    });

    it('rejects description too long', () => {
      const result = reportSubmitSchema.safeParse({ ...validReport, description: 'a'.repeat(2001) });
      expect(result.success).toBe(false);
    });

    it('accepts optional description', () => {
      const { description, ...rest } = validReport;
      const result = reportSubmitSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });

    it('validates tolet_board report targetType', () => {
      const result = reportSubmitSchema.safeParse({
        ...validReport,
        targetType: 'tolet_board',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('resendWebhookSchema', () => {
    const validWebhook = {
      type: 'email.received' as const,
      data: {
        email_id: 'email-123',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
        headers: { 'content-type': 'text/plain' },
        received_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    it('validates valid webhook', () => {
      const result = resendWebhookSchema.safeParse(validWebhook);
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = resendWebhookSchema.safeParse({
        ...validWebhook,
        type: 'email.sent' as any,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = resendWebhookSchema.safeParse({
        ...validWebhook,
        data: { ...validWebhook.data, from: 'invalid-email' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('statsQuerySchema', () => {
    it('validates valid stats query', () => {
      const result = statsQuerySchema.safeParse({
        locality: 'gachibowli',
        type: 'locality',
        bbox: '78.3,17.4,78.5,17.6',
        zoom: 14,
      });
      expect(result.success).toBe(true);
    });

    it('defaults type to city', () => {
      const result = statsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('city');
      }
    });
  });

  describe('healthResponseSchema', () => {
    const validHealth = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: [
        { name: 'database', status: 'pass' as const, latencyMs: 50 },
        { name: 'resend', status: 'warn' as const, latencyMs: 100, message: 'Rate limited' },
      ],
    };

    it('validates valid health response', () => {
      const result = healthResponseSchema.safeParse(validHealth);
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = healthResponseSchema.safeParse({
        ...validHealth,
        status: 'unknown' as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('schemas registry', () => {
    it('contains all expected schemas', () => {
      const expectedKeys: SchemaKey[] = [
        'mapQuery',
        'rentPinSubmit',
        'listingSubmit',
        'seekerSubmit',
        'verifyToken',
        'matchRespond',
        'reportSubmit',
        'resendWebhook',
        'statsQuery',
      ];

      for (const key of expectedKeys) {
        expect(key in schemas).toBe(true);
      }
    });

    it('validateSchema works for all schemas', () => {
      const validInputs: Record<SchemaKey, unknown> = {
        mapQuery: { bbox: '78.3,17.4,78.5,17.6', zoom: 13 },
        rentPinSubmit: {
          locality: 'gachibowli',
          lat: 17.44,
          lon: 78.37,
          rentMin: 20000,
          rentMax: 30000,
          bhk: '2BHK',
          furnishing: 'semi_furnished',
          turnstileToken: 'token',
        },
        listingSubmit: {
          listingType: 'whole_flat',
          title: 'Valid Listing Title',
          bhk: '2BHK',
          furnishing: 'semi_furnished',
          rent: 25000,
          locality: 'gachibowli',
          lon: 78.37,
          lat: 17.44,
          availableFrom: '2025-02-01',
          turnstileToken: 'token',
        },
        seekerSubmit: {
          email: 'test@example.com',
          maxBudget: 30000,
          bhk: '2BHK',
          listingType: 'whole_flat',
          moveInEarliest: '2025-02-01',
          moveInLatest: '2025-03-01',
          turnstileToken: 'token',
        },
        verifyToken: { token: 'a'.repeat(32) },
        matchRespond: { token: 'a'.repeat(32), action: 'accept' as const },
        reportSubmit: {
          targetType: 'listing',
          targetId: '123e4567-e89b-12d3-a456-426614174000',
          reason: 'fake',
          turnstileToken: 'token',
        },
        resendWebhook: {
          type: 'email.received',
          data: {
            email_id: '123',
            from: 'a@b.com',
            to: ['c@d.com'],
            subject: 'Test',
            text: 'Test',
            headers: {},
            received_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        },
        statsQuery: { type: 'city' },
      };

      for (const key of Object.keys(validInputs) as SchemaKey[]) {
        expect(() => validateSchema(key, validInputs[key])).not.toThrow();
      }
    });
  });

  describe('toLetBoardSubmitSchema', () => {
    const validBoard = {
      lat: 17.44,
      lon: 78.37,
      phone: '9876543210',
      locality: 'gachibowli',
      imageMetadata: {
        name: 'board.jpg',
        size: 2 * 1024 * 1024,
        type: 'image/jpeg',
      },
      turnstileToken: 'valid-token',
      consent: true,
    };

    it('validates valid To-Let submission', () => {
      const result = toLetBoardSubmitSchema.safeParse(validBoard);
      expect(result.success).toBe(true);
    });

    it('rejects invalid phone number', () => {
      const result = toLetBoardSubmitSchema.safeParse({ ...validBoard, phone: '12345' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid coordinates', () => {
      const result = toLetBoardSubmitSchema.safeParse({ ...validBoard, lat: 10.0 });
      expect(result.success).toBe(false);
    });

    it('rejects invalid file metadata (too large)', () => {
      const result = toLetBoardSubmitSchema.safeParse({
        ...validBoard,
        imageMetadata: { ...validBoard.imageMetadata, size: 6 * 1024 * 1024 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unconfirmed consent', () => {
      const result = toLetBoardSubmitSchema.safeParse({ ...validBoard, consent: false });
      expect(result.success).toBe(false);
    });
  });
});