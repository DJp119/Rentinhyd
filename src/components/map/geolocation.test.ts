// @vitest-environment jsdom
// src/components/map/geolocation.test.ts
// Unit tests for pure geolocation status/error handling and hook behaviors

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapGeolocation, LOCATION_MESSAGES } from './useMapGeolocation';

describe('useMapGeolocation', () => {
  const originalGeolocation = global.navigator.geolocation;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
      writable: true,
    });
  });

  it('handles unsupported browser environment gracefully', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useMapGeolocation());

    let locationResult;
    await act(async () => {
      locationResult = await result.current.locate();
    });

    expect(locationResult).toBeNull();
    expect(result.current.status).toBe('unsupported');
    expect(result.current.errorMessage).toBe(LOCATION_MESSAGES.unsupported);
  });

  it('successfully retrieves and maps position coordinates', async () => {
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 17.4435,
        longitude: 78.3772,
        accuracy: 25,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 1720000000000,
    };

    const getCurrentPositionMock = vi.fn().mockImplementation((success) => {
      success(mockPosition);
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useMapGeolocation());

    let loc;
    await act(async () => {
      loc = await result.current.locate();
    });

    expect(loc).toEqual({
      lat: 17.4435,
      lon: 78.3772,
      accuracy: 25,
      timestamp: 1720000000000,
    });
    expect(result.current.status).toBe('located');
    expect(result.current.location).toEqual(loc);
    expect(result.current.errorMessage).toBeNull();
    expect(getCurrentPositionMock).toHaveBeenCalledTimes(1);
  });

  it('maps PERMISSION_DENIED (code 1) to denied status', async () => {
    const mockError: GeolocationPositionError = {
      code: 1,
      message: 'User denied Geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    const getCurrentPositionMock = vi.fn().mockImplementation((_, error) => {
      error(mockError);
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useMapGeolocation());

    await act(async () => {
      await result.current.locate();
    });

    expect(result.current.status).toBe('denied');
    expect(result.current.errorMessage).toBe(LOCATION_MESSAGES.denied);
    expect(result.current.location).toBeNull();
  });

  it('maps POSITION_UNAVAILABLE (code 2) to unavailable status', async () => {
    const mockError: GeolocationPositionError = {
      code: 2,
      message: 'Position unavailable',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    const getCurrentPositionMock = vi.fn().mockImplementation((_, error) => {
      error(mockError);
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useMapGeolocation());

    await act(async () => {
      await result.current.locate();
    });

    expect(result.current.status).toBe('unavailable');
    expect(result.current.errorMessage).toBe(LOCATION_MESSAGES.unavailable);
  });

  it('maps TIMEOUT (code 3) to timeout status', async () => {
    const mockError: GeolocationPositionError = {
      code: 3,
      message: 'Timeout expired',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    const getCurrentPositionMock = vi.fn().mockImplementation((_, error) => {
      error(mockError);
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useMapGeolocation());

    await act(async () => {
      await result.current.locate();
    });

    expect(result.current.status).toBe('timeout');
    expect(result.current.errorMessage).toBe(LOCATION_MESSAGES.timeout);
  });

  it('allows user retry after error and successfully acquires position', async () => {
    let callCount = 0;
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 17.385,
        longitude: 78.4867,
        accuracy: 15,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 1720000005000,
    };

    const getCurrentPositionMock = vi.fn().mockImplementation((success, error) => {
      callCount++;
      if (callCount === 1) {
        error({ code: 3, message: 'Timeout' });
      } else {
        success(mockPosition);
      }
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useMapGeolocation());

    // First attempt -> timeout
    await act(async () => {
      await result.current.locate();
    });
    expect(result.current.status).toBe('timeout');

    // Second attempt -> success
    await act(async () => {
      await result.current.locate();
    });
    expect(result.current.status).toBe('located');
    expect(result.current.location?.lat).toBe(17.385);
  });

  it('prevents concurrent simultaneous requests', async () => {
    let pendingCallback: ((pos: GeolocationPosition) => void) | null = null;

    const getCurrentPositionMock = vi.fn().mockImplementation((success) => {
      pendingCallback = success;
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useMapGeolocation());

    // Trigger first locate
    act(() => {
      result.current.locate();
    });

    // Trigger second locate while first is in-flight
    act(() => {
      result.current.locate();
    });

    // Should only have called getCurrentPosition once
    expect(getCurrentPositionMock).toHaveBeenCalledTimes(1);

    // Resolve the in-flight request
    act(() => {
      if (pendingCallback) {
        pendingCallback({
          coords: {
            latitude: 17.4,
            longitude: 78.4,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
      }
    });

    expect(result.current.status).toBe('located');
  });
});
