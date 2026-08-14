// @vitest-environment node
// Regression tests for fresh map data and public rent-pin status filtering.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockSupabase = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/observability', () => ({
  logError: vi.fn(),
  logger: {
    child: vi.fn(() => ({
      error: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

const { GET } = await import('../route');

function createRequest() {
  return new NextRequest(
    'http://localhost:3000/api/map?bbox=78.30,17.35,78.45,17.55&zoom=15&type=all'
  );
}

describe('GET /api/map', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.rpc.mockImplementation((functionName: string) => {
      if (functionName === 'get_pins_in_bbox') {
        return Promise.resolve({
          data: [
            {
              id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              lat: 17.44,
              lon: 78.365,
              rent_min: 20000,
              rent_max: 30000,
              bhk: '2BHK',
              furnishing: 'semi_furnished',
              locality: 'gachibowli',
              pin_count: 1,
            },
            {
              id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
              lat: 17.45,
              lon: 78.375,
              rent_min: 18000,
              rent_max: 25000,
              bhk: '1BHK',
              furnishing: 'fully_furnished',
              locality: 'madhapur',
              pin_count: 1,
            },
          ],
          error: null,
        });
      }

      if (functionName === 'get_listings_in_bbox') {
        return Promise.resolve({
          data: [
            {
              id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
              lat: 17.46,
              lon: 78.38,
              rent: 30000,
              bhk: '2BHK',
              furnishing: 'semi_furnished',
              listing_type: 'whole_flat',
              locality: 'kondapur',
            },
          ],
          error: null,
        });
      }

      return Promise.resolve({
        data: [
          {
            id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
            longitude: 78.39,
            latitude: 17.47,
            locality: 'hitech-city',
          },
        ],
        error: null,
      });
    });
  });

  it('requests pending and approved rent pins and returns all map layers', async () => {
    const response = await GET(createRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_pins_in_bbox', expect.objectContaining({
      status_filter: 'approved,pending',
    }));
    expect(json.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', type: 'rent_pin' }),
      expect.objectContaining({ id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', type: 'rent_pin' }),
      expect.objectContaining({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', type: 'listing' }),
      expect.objectContaining({ id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', type: 'tolet_board' }),
    ]));
  });

  it('never exposes exact private coordinates and disables stale caching', async () => {
    const response = await GET(createRequest());
    const json = await response.json();

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(json.items.every((item: unknown) => !('exact_geom' in (item as object)))).toBe(true);
  });
});
