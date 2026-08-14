// @vitest-environment jsdom
// src/components/map/RentPinLabelMarker.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateRentK,
  formatRentPinLabel,
  formatRentPinAriaLabel,
  createRentPinLabelContent,
  TemporaryRentPin,
} from './RentPinLabelMarker';

describe('RentPinLabelMarker', () => {
  describe('calculateRentK', () => {
    it('calculates rounded average rent in thousands', () => {
      expect(calculateRentK(20000, 30000)).toBe(25);
      expect(calculateRentK(18000, 18000)).toBe(18);
      expect(calculateRentK(25000, 35000)).toBe(30);
      expect(calculateRentK(15500, 16500)).toBe(16);
    });

    it('handles zero or missing/NaN values safely', () => {
      expect(calculateRentK(0, 0)).toBe(0);
      expect(calculateRentK(undefined, undefined)).toBe(0);
      expect(calculateRentK(NaN, 20000)).toBe(10);
    });
  });

  describe('formatRentPinLabel', () => {
    it('formats 2BHK 20k-30k to 2BHK · 25K', () => {
      expect(formatRentPinLabel('2BHK', 20000, 30000)).toBe('2BHK · 25K');
    });

    it('formats 1BHK equal bounds correctly', () => {
      expect(formatRentPinLabel('1BHK', 18000, 18000)).toBe('1BHK · 18K');
    });

    it('falls back gracefully when bhk is omitted', () => {
      expect(formatRentPinLabel(undefined, 20000, 30000)).toBe('2BHK · 25K');
    });
  });

  describe('formatRentPinAriaLabel', () => {
    it('produces descriptive screen reader text', () => {
      const aria = formatRentPinAriaLabel('2BHK', 20000, 30000);
      expect(aria).toBe(
        'Your submitted 2BHK rent pin, approximately 25 thousand rupees per month, pending review'
      );
    });
  });

  describe('createRentPinLabelContent DOM factory', () => {
    const mockPin: TemporaryRentPin = {
      id: 'test-temp-pin-1',
      lat: 17.4435,
      lon: 78.3772,
      bhk: '2BHK',
      rentMin: 20000,
      rentMax: 30000,
    };

    it('creates container with proper role, testid, and accessibility label', () => {
      const el = createRentPinLabelContent(mockPin);

      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(el.className).toBe('map-rent-label-marker');
      expect(el.getAttribute('role')).toBe('img');
      expect(el.getAttribute('data-testid')).toBe('temporary-rent-pin');
      expect(el.getAttribute('aria-label')).toContain('Your submitted 2BHK rent pin');
      expect(el.getAttribute('aria-label')).toContain('25 thousand rupees');
    });

    it('contains text content matching layout and rentK', () => {
      const el = createRentPinLabelContent(mockPin);

      expect(el.textContent).toContain('2BHK');
      expect(el.textContent).toContain('25K');
    });

    it('contains the downward tail element', () => {
      const el = createRentPinLabelContent(mockPin);
      const tail = el.querySelector('.map-rent-label-marker-tail');

      expect(tail).not.toBeNull();
      expect(tail?.getAttribute('aria-hidden')).toBe('true');
    });

    it('uses textContent to prevent HTML/XSS injection', () => {
      const xssPin: TemporaryRentPin = {
        id: 'xss-pin',
        lat: 17.44,
        lon: 78.37,
        bhk: '<script>alert(1)</script>',
        rentMin: 10000,
        rentMax: 10000,
      };

      const el = createRentPinLabelContent(xssPin);
      expect(el.querySelector('script')).toBeNull();
      expect(el.innerHTML).not.toContain('<script>alert(1)</script>');
    });
  });
});
