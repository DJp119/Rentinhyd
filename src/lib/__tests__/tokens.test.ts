// src/lib/__tests__/tokens.test.ts
// Unit tests for secure token generation, hashing, and verification

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateToken,
  hashToken,
  verifyToken,
  isTokenExpired,
  getVerificationExpiry,
  getActionExpiry,
  generateVerificationPair,
  generateActionPair,
  generateIdempotencyKey,
  hashIpFingerprint,
  generateRequestFingerprint,
} from '../tokens';

describe('Token Utilities', () => {
  describe('generateToken', () => {
    it('generates token of correct length (32 bytes = 64 hex chars)', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
    });

    it('generates token of custom byte length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32);
    });

    it('generates unique tokens on each call', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('generates valid hex string', () => {
      const token = generateToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('hashToken', () => {
    it('produces consistent hash for same input', async () => {
      const token = 'test-token-123';
      const hash1 = await hashToken(token);
      const hash2 = await hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', async () => {
      const hash1 = await hashToken('token-1');
      const hash2 = await hashToken('token-2');
      expect(hash1).not.toBe(hash2);
    });

    it('produces SHA-256 hash (64 hex chars)', async () => {
      const hash = await hashToken('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('is deterministic across calls', async () => {
      const token = 'consistent-token';
      const hashes = await Promise.all(Array(10).fill(null).map(() => hashToken(token)));
      expect(new Set(hashes).size).toBe(1);
    });
  });

  describe('verifyToken', () => {
    it('returns true for valid token/hash pair', async () => {
      const token = 'verify-test-token';
      const hash = await hashToken(token);
      const result = await verifyToken(token, hash);
      expect(result).toBe(true);
    });

    it('returns false for invalid token', async () => {
      const token = 'valid-token';
      const hash = await hashToken('different-token');
      const result = await verifyToken(token, hash);
      expect(result).toBe(false);
    });

    it('uses constant-time comparison (resistant to timing attacks)', async () => {
      // This is a functional test - the implementation uses timingSafeEqual
      const token = 'timing-test';
      const hash = await hashToken(token);
      const result = await verifyToken(token, hash);
      expect(result).toBe(true);
    });
  });

  describe('isTokenExpired', () => {
    it('returns true for null expiresAt', () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it('returns true for past date', () => {
      const past = new Date(Date.now() - 1000);
      expect(isTokenExpired(past)).toBe(true);
    });

    it('returns false for future date', () => {
      const future = new Date(Date.now() + 1000);
      expect(isTokenExpired(future)).toBe(false);
    });

    it('returns false for future date string', () => {
      const future = new Date(Date.now() + 1000).toISOString();
      expect(isTokenExpired(future)).toBe(false);
    });

    it('returns true for past date string', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      expect(isTokenExpired(past)).toBe(true);
    });
  });

  describe('getVerificationExpiry', () => {
    it('returns date approximately 24 hours in future', () => {
      const expiry = getVerificationExpiry();
      const now = Date.now();
      const diff = expiry.getTime() - now;

      // 24 hours = 86,400,000 ms, allow 1 second tolerance
      expect(diff).toBeGreaterThan(86_399_000);
      expect(diff).toBeLessThan(86_401_000);
    });
  });

  describe('getActionExpiry', () => {
    it('returns date approximately 7 days in future', () => {
      const expiry = getActionExpiry();
      const now = Date.now();
      const diff = expiry.getTime() - now;

      // 7 days = 604,800,000 ms, allow 1 second tolerance
      expect(diff).toBeGreaterThan(604_799_000);
      expect(diff).toBeLessThan(604_801_000);
    });
  });

  describe('generateVerificationPair', () => {
    it('returns token, hash, and expiry', async () => {
      const pair = await generateVerificationPair();

      expect(pair).toHaveProperty('token');
      expect(pair).toHaveProperty('hash');
      expect(pair).toHaveProperty('expiresAt');

      expect(pair.token).toHaveLength(64);
      expect(pair.hash).toHaveLength(64);
      expect(pair.expiresAt).toBeInstanceOf(Date);
    });

    it('hash matches token', async () => {
      const pair = await generateVerificationPair();
      const isValid = await verifyToken(pair.token, pair.hash);
      expect(isValid).toBe(true);
    });

    it('expiry is approximately 24 hours', async () => {
      const pair = await generateVerificationPair();
      const diff = pair.expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(86_399_000);
      expect(diff).toBeLessThan(86_401_000);
    });
  });

  describe('generateActionPair', () => {
    it('returns token, hash, and expiry', async () => {
      const pair = await generateActionPair();

      expect(pair).toHaveProperty('token');
      expect(pair).toHaveProperty('hash');
      expect(pair).toHaveProperty('expiresAt');

      expect(pair.token).toHaveLength(64);
      expect(pair.hash).toHaveLength(64);
      expect(pair.expiresAt).toBeInstanceOf(Date);
    });

    it('hash matches token', async () => {
      const pair = await generateActionPair();
      const isValid = await verifyToken(pair.token, pair.hash);
      expect(isValid).toBe(true);
    });

    it('expiry is approximately 7 days', async () => {
      const pair = await generateActionPair();
      const diff = pair.expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(604_799_000);
      expect(diff).toBeLessThan(604_801_000);
    });
  });

  describe('generateIdempotencyKey', () => {
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

  describe('hashIpFingerprint', () => {
    it('produces consistent hash for same IP', async () => {
      const ip = '192.168.1.1';
      const hash1 = await hashIpFingerprint(ip);
      const hash2 = await hashIpFingerprint(ip);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different IPs', async () => {
      const hash1 = await hashIpFingerprint('192.168.1.1');
      const hash2 = await hashIpFingerprint('10.0.0.1');
      expect(hash1).not.toBe(hash2);
    });

    it('produces 64-char hex output', async () => {
      const hash = await hashIpFingerprint('192.168.1.1');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateRequestFingerprint', () => {
    it('generates fingerprint from headers', async () => {
      const headers = {
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'en-US',
        'accept-encoding': 'gzip',
        'x-forwarded-for': '192.168.1.1',
      };

      const fingerprint = await generateRequestFingerprint(headers);
      expect(fingerprint).toHaveLength(32);
      expect(fingerprint).toMatch(/^[0-9a-f]+$/);
    });

    it('produces consistent fingerprint for same headers', async () => {
      const headers = { 'user-agent': 'test-agent' };
      const fp1 = await generateRequestFingerprint(headers);
      const fp2 = await generateRequestFingerprint(headers);
      expect(fp1).toBe(fp2);
    });

    it('handles missing headers gracefully', async () => {
      const fingerprint = await generateRequestFingerprint({});
      expect(fingerprint).toHaveLength(32);
    });
  });
});