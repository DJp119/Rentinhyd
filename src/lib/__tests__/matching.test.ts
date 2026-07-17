// src/lib/__tests__/matching.test.ts
// Unit tests for deterministic matching algorithm

import { describe, it, expect } from 'vitest';
import {
  scoreGeography,
  scoreBudget,
  scoreBhk,
  scoreTiming,
  scoreLifestyle,
  calculateMatchScore,
  MATCH_WEIGHTS,
} from '../matching';

describe('Matching Algorithm', () => {
  describe('scoreGeography', () => {
    it('returns 0 for excluded locality', () => {
      expect(scoreGeography('gachibowli', [], ['gachibowli'], null, null)).toBe(0);
    });

    it('returns 100 for exact preferred locality match', () => {
      expect(scoreGeography('gachibowli', ['gachibowli', 'madhapur'], [], null, null)).toBe(100);
    });

    it('returns 70 for same corridor match', () => {
      expect(scoreGeography('madhapur', ['gachibowli'], [], null, null)).toBe(70);
    });

    it('returns 80 for very close coordinates (≤2km)', () => {
      const listingCoords = { lat: 17.44, lon: 78.37 };
      const seekerCoords = { lat: 17.441, lon: 78.371 }; // ~150m away
      expect(scoreGeography('unknown', [], [], listingCoords, seekerCoords)).toBe(80);
    });

    it('returns 60 for nearby coordinates (≤5km)', () => {
      const listingCoords = { lat: 17.44, lon: 78.37 };
      const seekerCoords = { lat: 17.435, lon: 78.39 }; // ~3.5km away
      expect(scoreGeography('unknown', [], [], listingCoords, seekerCoords)).toBe(60);
    });

    it('returns 40 for same corridor coordinates (≤10km)', () => {
      const listingCoords = { lat: 17.44, lon: 78.37 };
      const seekerCoords = { lat: 17.49, lon: 78.43 }; // ~7km away
      expect(scoreGeography('unknown', [], [], listingCoords, seekerCoords)).toBe(40);
    });

    it('returns 20 for same city coordinates (≤20km)', () => {
      const listingCoords = { lat: 17.44, lon: 78.37 };
      const seekerCoords = { lat: 17.52, lon: 78.50 }; // ~15km away
      expect(scoreGeography('unknown', [], [], listingCoords, seekerCoords)).toBe(20);
    });

    it('returns 10 for different area but same city fallback', () => {
      expect(scoreGeography('jubilee-hills', ['gachibowli'], [], null, null)).toBe(10);
    });
  });

  describe('scoreBudget', () => {
    it('returns 0 when listing rent exceeds max budget', () => {
      expect(scoreBudget(50000, 20000, 40000)).toBe(0);
    });

    it('returns 100 when listing rent within seeker range', () => {
      expect(scoreBudget(25000, 20000, 40000)).toBe(100);
    });

    it('returns 100 when listing rent at max budget', () => {
      expect(scoreBudget(40000, 20000, 40000)).toBe(100);
    });

    it('returns 100 when listing rent at min budget', () => {
      expect(scoreBudget(20000, 20000, 40000)).toBe(100);
    });

    it('returns partial score when below min budget but within max', () => {
      // 15000 / 20000 = 0.75 * 80 = 60, min 20
      expect(scoreBudget(15000, 20000, 40000)).toBe(60);
    });

    it('returns minimum 20 for very low rent when min budget specified', () => {
      expect(scoreBudget(5000, 20000, 40000)).toBe(20);
    });

    it('returns 100 when no min budget specified and within max', () => {
      expect(scoreBudget(25000, null, 40000)).toBe(100);
    });

    it('returns 0 when no min budget but exceeds max', () => {
      expect(scoreBudget(50000, null, 40000)).toBe(0);
    });
  });

  describe('scoreBhk', () => {
    it('returns 100 for exact BHK and type match', () => {
      expect(scoreBhk('2BHK', 'whole_flat', '2BHK', 'whole_flat')).toBe(100);
    });

    it('returns 30 for room listing when seeker wants whole flat', () => {
      expect(scoreBhk('room', 'room_flatmate', '2BHK', 'whole_flat')).toBe(30);
    });

    it('returns 20 for whole flat listing when seeker wants room', () => {
      expect(scoreBhk('2BHK', 'whole_flat', 'room', 'room_flatmate')).toBe(20);
    });

    it('returns 90 when seeker wants any BHK', () => {
      expect(scoreBhk('2BHK', 'whole_flat', 'any', 'whole_flat')).toBe(90);
    });

    it('returns 70 for adjacent BHK (e.g., 2BHK vs 3BHK)', () => {
      expect(scoreBhk('3BHK', 'whole_flat', '2BHK', 'whole_flat')).toBe(70);
    });

    it('returns 40 for BHK diff of 2', () => {
      expect(scoreBhk('4+BHK', 'whole_flat', '2BHK', 'whole_flat')).toBe(40);
    });

    it('returns 100 for room-room match', () => {
      expect(scoreBhk('room', 'room_flatmate', 'room', 'room_flatmate')).toBe(100);
    });

    it('returns 10 for incompatible types not specially handled', () => {
      expect(scoreBhk('1BHK', 'whole_flat', '4+BHK', 'whole_flat')).toBe(10);
    });
  });

  describe('scoreTiming', () => {
    it('returns 0 for no overlap', () => {
      const listingStart = new Date('2025-01-01');
      const listingEnd = new Date('2025-02-01');
      const seekerStart = new Date('2025-03-01');
      const seekerEnd = new Date('2025-04-01');
      expect(scoreTiming(listingStart, listingEnd, seekerStart, seekerEnd)).toBe(0);
    });

    it('returns 100 for full overlap (≥80% of seeker window)', () => {
      const listingStart = new Date('2025-01-01');
      const listingEnd = new Date('2025-12-31');
      const seekerStart = new Date('2025-02-01');
      const seekerEnd = new Date('2025-03-01');
      expect(scoreTiming(listingStart, listingEnd, seekerStart, seekerEnd)).toBe(100);
    });

    it('returns 80 for ≥50% overlap', () => {
      const listingStart = new Date('2025-01-15');
      const listingEnd = new Date('2025-03-15');
      const seekerStart = new Date('2025-01-01');
      const seekerEnd = new Date('2025-04-01');
      // 60 days overlap / 90 days seeker window = 66%
      expect(scoreTiming(listingStart, listingEnd, seekerStart, seekerEnd)).toBe(80);
    });

    it('returns 60 for ≥25% overlap', () => {
      const listingStart = new Date('2025-02-01');
      const listingEnd = new Date('2025-03-01');
      const seekerStart = new Date('2025-01-01');
      const seekerEnd = new Date('2025-04-01');
      // 28 days overlap / 90 days seeker window = 31%
      expect(scoreTiming(listingStart, listingEnd, seekerStart, seekerEnd)).toBe(60);
    });

    it('returns 40 for minimal overlap', () => {
      const listingStart = new Date('2025-02-15');
      const listingEnd = new Date('2025-02-20');
      const seekerStart = new Date('2025-01-01');
      const seekerEnd = new Date('2025-04-01');
      // 5 days overlap / 90 days seeker window = 5.5%
      expect(scoreTiming(listingStart, listingEnd, seekerStart, seekerEnd)).toBe(40);
    });

    it('handles null listingAvailableUntil correctly', () => {
      const listingStart = new Date('2025-01-01');
      const seekerStart = new Date('2025-02-01');
      const seekerEnd = new Date('2025-03-01');
      expect(scoreTiming(listingStart, null, seekerStart, seekerEnd)).toBe(100);
    });
  });

  describe('scoreLifestyle', () => {
    it('returns 80 when no preferences specified', () => {
      expect(scoreLifestyle({}, {})).toBe(80);
    });

    it('returns 100 for exact match on all preferences', () => {
      const prefs = { food: 'veg', smoking: 'no', drinking: 'no', pets: 'no' };
      expect(scoreLifestyle(prefs, prefs)).toBe(100);
    });

    it('returns 100 when one party has no_preference', () => {
      const listingPrefs = { food: 'veg', smoking: 'no' };
      const seekerPrefs = { food: 'no_preference', smoking: 'no' };
      expect(scoreLifestyle(listingPrefs, seekerPrefs)).toBe(100);
    });

    it('handles food compatibility (veg vs non_veg = incompatible)', () => {
      const listingPrefs = { food: 'veg' };
      const seekerPrefs = { food: 'non_veg' };
      // food weight = 3, incompatible = 0, total = 3 => 0%
      expect(scoreLifestyle(listingPrefs, seekerPrefs)).toBe(0);
    });

    it('handles smoking compatibility (occasionally is flexible)', () => {
      const listingPrefs = { smoking: 'no' };
      const seekerPrefs = { smoking: 'occasionally' };
      // smoking weight = 3, compatible = 3 => 100%
      expect(scoreLifestyle(listingPrefs, seekerPrefs)).toBe(100);
    });

    it('handles gender compatibility (any is flexible)', () => {
      const listingPrefs = { gender: 'male' };
      const seekerPrefs = { gender: 'any' };
      expect(scoreLifestyle(listingPrefs, seekerPrefs)).toBe(100);
    });

    it('calculates weighted average correctly', () => {
      // food: 3, smoking: 3, drinking: 2, wfh: 1, pets: 1, gender: 2 = 12 total
      // match on food (veg/veg), smoking (no/no), gender (any/male)
      // weights: food=3, smoking=3, gender=2 = 8/12 = 67%
      const listingPrefs = { food: 'veg', smoking: 'no', drinking: 'no', workFromHome: false, pets: 'no', gender: 'any' };
      const seekerPrefs = { food: 'veg', smoking: 'no', drinking: 'yes', workFromHome: true, pets: 'yes', gender: 'male' };
      expect(scoreLifestyle(listingPrefs, seekerPrefs)).toBe(67);
    });
  });

  describe('calculateMatchScore', () => {
    it('computes weighted total correctly', () => {
      const params = {
        listingLocality: 'gachibowli',
        seekerPreferredLocalities: ['gachibowli'],
        seekerExcludedLocalities: [],
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
        listingLifestylePrefs: { food: 'veg', smoking: 'no' },
        seekerLifestylePrefs: { food: 'veg', smoking: 'no' },
      };

      const result = calculateMatchScore(params);

      // geography=100, budget=100, bhk=100, timing=100, lifestyle=100
      // weighted: (100*30 + 100*25 + 100*20 + 100*15 + 100*10)/100 = 100
      expect(result.total).toBe(100);
      expect(result.geography).toBe(100);
      expect(result.budget).toBe(100);
      expect(result.bhk).toBe(100);
      expect(result.timing).toBe(100);
      expect(result.lifestyle).toBe(100);
    });

    it('weights components correctly with partial scores', () => {
      const params = {
        listingLocality: 'gachibowli',
        seekerPreferredLocalities: ['madhapur'], // same corridor = 70
        seekerExcludedLocalities: [],
        listingCoords: null,
        seekerCoords: null,
        listingRent: 35000,
        seekerMinBudget: 20000,
        seekerMaxBudget: 30000, // budget = 0 (exceeds max)
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

      // geography=70, budget=0, bhk=100, timing=100, lifestyle=100
      // weighted: (70*30 + 0*25 + 100*20 + 100*15 + 100*10)/100 = 21 + 0 + 20 + 15 + 10 = 66
      expect(result.total).toBe(66);
      expect(result.geography).toBe(70);
      expect(result.budget).toBe(0);
      expect(result.bhk).toBe(100);
      expect(result.timing).toBe(100);
      expect(result.lifestyle).toBe(100);
    });
  });

  describe('MATCH_WEIGHTS', () => {
    it('sums to 100', () => {
      const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });

    it('has correct individual weights', () => {
      expect(MATCH_WEIGHTS.geography).toBe(30);
      expect(MATCH_WEIGHTS.budget).toBe(25);
      expect(MATCH_WEIGHTS.bhk).toBe(20);
      expect(MATCH_WEIGHTS.timing).toBe(15);
      expect(MATCH_WEIGHTS.lifestyle).toBe(10);
    });
  });
});