// src/components/map/useMapGeolocation.ts
// Shared map location types and browser geolocation hook

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type UserLocation = {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
};

export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'located'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export const LOCATION_MESSAGES: Record<Exclude<LocationStatus, 'idle' | 'requesting' | 'located'>, string> = {
  unsupported: 'This browser does not support location.',
  denied: 'Location access is off. Allow it in browser settings to use Locate Me.',
  unavailable: 'Your location is temporarily unavailable. You can keep browsing the map.',
  timeout: 'Location took too long. Try Locate Me again.',
};

export interface UseMapGeolocationOptions {
  autoRequest?: boolean;
}

export function useMapGeolocation(_options?: UseMapGeolocationOptions) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRequestingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const locate = useCallback((isManual = true): Promise<UserLocation | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator?.geolocation) {
        if (isMountedRef.current) {
          setStatus('unsupported');
          setErrorMessage(LOCATION_MESSAGES.unsupported);
        }
        resolve(null);
        return;
      }

      if (isRequestingRef.current) {
        // Prevent concurrent requests
        resolve(null);
        return;
      }

      isRequestingRef.current = true;
      if (isMountedRef.current) {
        setStatus('requesting');
        setErrorMessage(null);
      }

      const positionOptions: PositionOptions = isManual
        ? {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10_000,
          }
        : {
            enableHighAccuracy: true,
            maximumAge: 60_000,
            timeout: 10_000,
          };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          isRequestingRef.current = false;
          const userLoc: UserLocation = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp || Date.now(),
          };

          if (isMountedRef.current) {
            setLocation(userLoc);
            setStatus('located');
            setErrorMessage(null);
          }
          resolve(userLoc);
        },
        (err) => {
          isRequestingRef.current = false;
          let newStatus: LocationStatus = 'unavailable';
          let msg = LOCATION_MESSAGES.unavailable;

          if (err.code === 1 /* PERMISSION_DENIED */) {
            newStatus = 'denied';
            msg = LOCATION_MESSAGES.denied;
          } else if (err.code === 2 /* POSITION_UNAVAILABLE */) {
            newStatus = 'unavailable';
            msg = LOCATION_MESSAGES.unavailable;
          } else if (err.code === 3 /* TIMEOUT */) {
            newStatus = 'timeout';
            msg = LOCATION_MESSAGES.timeout;
          }

          if (isMountedRef.current) {
            setStatus(newStatus);
            setErrorMessage(msg);
          }
          resolve(null);
        },
        positionOptions
      );
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    location,
    status,
    errorMessage,
    locate,
    clearError,
  };
}
