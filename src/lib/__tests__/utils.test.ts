// src/lib/__tests__/utils.test.ts
// Unit tests for shared utilities

import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatRentRange,
  truncate,
  slugify,
  parseBbox,
  isValidBbox,
  haversineDistance,
  debounce,
  sleep,
  generateRequestFingerprint,
  checkHyderabadRadius,
} from '../utils';

describe('Utility Functions', () => {
  describe('formatINR', () => {
    it('formats basic amounts with ₹ symbol', () => {
      expect(formatINR(1000)).toBe('₹1,000');
      expect(formatINR(25000)).toBe('₹25,000');
      expect(formatINR(100000)).toBe('₹1,00,000');
    });

    it('formats compact notation for large amounts', () => {
      expect(formatINR(50000, { compact: true })).toBe('₹50.0K');
      expect(formatINR(150000, { compact: true })).toBe('₹1.5L');
      expect(formatINR(15000000, { compact: true })).toBe('₹1.5Cr');
    });

    it('can omit symbol', () => {
      expect(formatINR(25000, { showSymbol: false })).toBe('25,000');
    });

    it('handles zero', () => {
      expect(formatINR(0)).toBe('₹0');
    });
  });

  describe('formatRentRange', () => {
    it('formats equal min/max as single value', () => {
      expect(formatRentRange(25000, 25000)).toBe('₹25,000');
    });

    it('formats range with different min/max', () => {
      expect(formatRentRange(20000, 30000)).toBe('₹20,000 - ₹30,000');
    });
  });

  describe('truncate', () => {
    it('returns original if shorter than length', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('truncates and adds ellipsis', () => {
      expect(truncate('hello world', 8)).toBe('hello w…');
    });

    it('truncates at exact length minus one for ellipsis', () => {
      expect(truncate('hello world', 11)).toBe('hello world');
      expect(truncate('hello world', 10)).toBe('hello wor…');
    });
  });

  describe('slugify', () => {
    it('converts to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugify('HITEC City!')).toBe('hitec-city');
    });

    it('collapses multiple separators', () => {
      expect(slugify('hello   world')).toBe('hello-world');
      expect(slugify('hello___world')).toBe('hello-world');
    });

    it('trims leading/trailing separators', () => {
      expect(slugify('  hello world  ')).toBe('hello-world');
      expect(slugify('---hello---')).toBe('hello');
    });

    it('handles Financial District', () => {
      expect(slugify('Financial District')).toBe('financial-district');
    });
  });

  describe('parseBbox', () => {
    it('parses valid bbox string', () => {
      const result = parseBbox('78.3,17.4,78.5,17.6');
      expect(result).toEqual([78.3, 17.4, 78.5, 17.6]);
    });

    it('returns null for invalid format', () => {
      expect(parseBbox('invalid')).toBeNull();
      expect(parseBbox('1,2,3')).toBeNull();
      expect(parseBbox('1,2,3,4,5')).toBeNull();
    });

    it('returns null for NaN values', () => {
      expect(parseBbox('a,b,c,d')).toBeNull();
    });
  });

  describe('isValidBbox', () => {
    it('returns true for valid bbox', () => {
      expect(isValidBbox([78.3, 17.4, 78.5, 17.6])).toBe(true);
    });

    it('returns false for invalid coordinate order', () => {
      expect(isValidBbox([78.5, 17.4, 78.3, 17.6])).toBe(false); // minLon > maxLon
      expect(isValidBbox([78.3, 17.6, 78.5, 17.4])).toBe(false); // minLat > maxLat
    });

    it('returns false for out of bounds coordinates', () => {
      expect(isValidBbox([-181, 17.4, 78.5, 17.6])).toBe(false);
      expect(isValidBbox([78.3, -91, 78.5, 17.6])).toBe(false);
      expect(isValidBbox([78.3, 17.4, 181, 17.6])).toBe(false);
      expect(isValidBbox([78.3, 17.4, 78.5, 91])).toBe(false);
    });
  });

  describe('haversineDistance', () => {
    it('returns 0 for same coordinates', () => {
      expect(haversineDistance(17.44, 78.37, 17.44, 78.37)).toBe(0);
    });

    it('calculates approximate distance for known coordinates', () => {
      // Gachibowli (17.44, 78.37) to Madhapur (17.45, 78.41) ~4.4km
      const distance = haversineDistance(17.44, 78.37, 17.45, 78.41);
      expect(distance).toBeGreaterThan(2500);
      expect(distance).toBeLessThan(5000);
    });

    it('is symmetric', () => {
      const d1 = haversineDistance(17.44, 78.37, 17.45, 78.39);
      const d2 = haversineDistance(17.45, 78.39, 17.44, 78.37);
      expect(d1).toBe(d2);
    });
  });

  describe('debounce', () => {
    it('delays function execution', async () => {
      let calls = 0;
      const fn = () => { calls++; };
      const debounced = debounce(fn, 50);

      debounced();
      debounced();
      debounced();

      expect(calls).toBe(0);

      await new Promise(r => setTimeout(r, 100));
      expect(calls).toBe(1);
    });

    it('passes arguments correctly', async () => {
      let lastArgs: unknown[] = [];
      const fn = (...args: unknown[]) => { lastArgs = args; };
      const debounced = debounce(fn, 10);

      debounced('hello', 'world');
      await new Promise(r => setTimeout(r, 50));
      expect(lastArgs).toEqual(['hello', 'world']);
    });
  });

  describe('sleep', () => {
    it('resolves after specified ms', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('generateRequestFingerprint', () => {
    it('generates consistent fingerprint for same headers', async () => {
      const headers = {
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'en-US,en;q=0.9',
      };

      const fp1 = await generateRequestFingerprint(headers);
      const fp2 = await generateRequestFingerprint(headers);
      expect(fp1).toBe(fp2);
    });

    it('generates different fingerprints for different headers', async () => {
      const fp1 = await generateRequestFingerprint({ 'user-agent': 'agent-1' });
      const fp2 = await generateRequestFingerprint({ 'user-agent': 'agent-2' });
      expect(fp1).not.toBe(fp2);
    });

    it('returns 32-char hex string', async () => {
      const fp = await generateRequestFingerprint({ 'user-agent': 'test' });
      expect(fp).toHaveLength(32);
      expect(fp).toMatch(/^[0-9a-f]+$/);
    });
  });

  });