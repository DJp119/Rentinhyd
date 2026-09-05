// @vitest-environment jsdom
// src/components/map/MapMarkers.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatLocalityName,
  formatBhkDisplay,
  calculateRentK,
  createAreaClusterMarkerContent,
  createBhkRentMarkerContent,
  createPlacementMarkerContent,
  createSubClusterMarkerContent,
  createToLetMarkerContent,
} from './MapMarkers';

describe('MapMarkers', () => {
  describe('formatLocalityName', () => {
    it('formats known localities properly', () => {
      expect(formatLocalityName('gachibowli')).toBe('Gachibowli');
      expect(formatLocalityName('hitec-city')).toBe('HITEC City');
      expect(formatLocalityName('financial-district')).toBe('Financial District');
      expect(formatLocalityName('madhapur')).toBe('Madhapur');
      expect(formatLocalityName('kondapur')).toBe('Kondapur');
    });

    it('formats unknown kebab/snake/space strings cleanly', () => {
      expect(formatLocalityName('chanda-nagar')).toBe('Chanda Nagar');
      expect(formatLocalityName('nanakramguda')).toBe('Nanakramguda');
      expect(formatLocalityName(undefined)).toBe('Hyderabad');
    });
  });

  describe('formatBhkDisplay', () => {
    it('normalizes BHK strings', () => {
      expect(formatBhkDisplay('2BHK')).toBe('2BHK');
      expect(formatBhkDisplay('1bhk')).toBe('1BHK');
      expect(formatBhkDisplay('3 BHK')).toBe('3BHK');
      expect(formatBhkDisplay('4+BHK')).toBe('4+BHK');
      expect(formatBhkDisplay('room')).toBe('1RK');
      expect(formatBhkDisplay(undefined)).toBe('2BHK');
    });
  });

  describe('calculateRentK', () => {
    it('calculates rent in thousands', () => {
      expect(calculateRentK(33000)).toBe(33);
      expect(calculateRentK(15000)).toBe(15);
      expect(calculateRentK(undefined, 20000, 30000)).toBe(25);
      expect(calculateRentK(undefined, 18000, 18000)).toBe(18);
    });
  });

  describe('createAreaClusterMarkerContent', () => {
    it('creates dark area cluster card with count, locality name, and tail', () => {
      const el = createAreaClusterMarkerContent({
        flatCount: 70,
        locality: 'madhapur',
      });

      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(el.className).toBe('map-area-cluster-marker');
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('data-testid')).toBe('area-cluster-marker');
      expect(el.getAttribute('data-count')).toBe('70');
      expect(el.getAttribute('data-locality')).toBe('madhapur');

      const countEl = el.querySelector('.map-area-cluster-count');
      expect(countEl?.textContent).toBe('70 flats');

      const localityEl = el.querySelector('.map-area-cluster-locality');
      expect(localityEl?.textContent).toBe('Madhapur');

      const tailEl = el.querySelector('.map-area-cluster-tail');
      expect(tailEl).not.toBeNull();
    });

    it('formats singular flat count and AVLB text when available', () => {
      const el = createAreaClusterMarkerContent({
        flatCount: 1,
        locality: 'gachibowli',
        availableCount: 10,
      });

      expect(el.querySelector('.map-area-cluster-count')?.textContent).toBe('1 flat');
      expect(el.querySelector('.map-area-cluster-locality')?.textContent).toBe('AVLB 10');
    });
  });

  describe('createBhkRentMarkerContent', () => {
    it('creates amber pill for whole flat with BHK and rent', () => {
      const el = createBhkRentMarkerContent({
        id: 'pin-123',
        bhk: '2BHK',
        rent: 33000,
        listingType: 'whole_flat',
        locality: 'gachibowli',
      });

      expect(el.className).toContain('map-bhk-rent-marker');
      expect(el.className).toContain('map-bhk-amber');
      expect(el.getAttribute('data-testid')).toBe('bhk-rent-marker');
      expect(el.getAttribute('data-pin-id')).toBe('pin-123');

      expect(el.querySelector('.map-bhk-label')?.textContent).toBe('2BHK');
      expect(el.querySelector('.map-bhk-rent')?.textContent).toBe('33K');
      expect(el.querySelector('.map-bhk-marker-tail')).not.toBeNull();
      expect(el.querySelector('.badge-avail')?.textContent).toBe('WHOLE AVBL');
    });

    it('creates blue pill for room / flatmate', () => {
      const el = createBhkRentMarkerContent({
        bhk: '1BHK',
        rentMin: 6000,
        rentMax: 6000,
        listingType: 'room_flatmate',
        locality: 'kondapur',
      });

      expect(el.className).toContain('map-bhk-blue');
      expect(el.querySelector('.map-bhk-label')?.textContent).toBe('1BHK');
      expect(el.querySelector('.map-bhk-rent')?.textContent).toBe('6K');
    });

    it('shows report badge if reported', () => {
      const el = createBhkRentMarkerContent({
        bhk: '4BHK',
        rent: 75000,
        locality: 'hitec-city',
        reportCount: 1,
      });

      expect(el.querySelector('.badge-report')?.textContent).toBe('1 report');
    });
  });

  describe('createSubClusterMarkerContent', () => {
    it('creates sub-cluster pill', () => {
      const el = createSubClusterMarkerContent(3, 'kondapur');
      expect(el.className).toBe('map-sub-cluster-marker');
      expect(el.textContent).toContain('3 flats');
      expect(el.querySelector('.map-sub-cluster-tail')).not.toBeNull();
    });
  });

  describe('createToLetMarkerContent', () => {
    it('creates to-let marker', () => {
      const el = createToLetMarkerContent('gachibowli');
      expect(el.className).toBe('map-tolet-marker');
      expect(el.textContent).toContain('TO-LET');
      expect(el.querySelector('.map-tolet-marker-tail')).not.toBeNull();
    });
  });

  describe('createPlacementMarkerContent', () => {
    it('creates placement marker with radar pulse, pill, and tail', () => {
      const el = createPlacementMarkerContent();
      expect(el.className).toBe('map-placement-marker-container');
      expect(el.getAttribute('data-testid')).toBe('active-placement-marker');
      expect(el.querySelector('.map-placement-pulse')).not.toBeNull();
      expect(el.querySelector('.map-placement-pill')?.textContent).toBe('📍 Selected Location');
      expect(el.querySelector('.map-placement-tail')).not.toBeNull();
    });

    it('creates placement marker with BHK and rent when provided', () => {
      const el = createPlacementMarkerContent('2BHK', 30);
      expect(el.querySelector('.map-placement-pill')?.textContent).toBe('📍 2BHK · 30K');
    });
  });
});
