// src/components/map/MapLocationControl.tsx
// Bottom-left Locate Me control for Google Maps

'use client';

import { LocateFixed, Loader2 } from 'lucide-react';
import { LocationStatus } from './useMapGeolocation';

export type MapLocationControlProps = {
  status: LocationStatus;
  onLocate: () => void;
  className?: string;
};

export function MapLocationControl({
  status,
  onLocate,
  className = '',
}: MapLocationControlProps) {
  const isLoading = status === 'requesting';

  return (
    <button
      type="button"
      onClick={onLocate}
      aria-label="Locate Me"
      aria-busy={isLoading}
      data-testid="locate-me-button"
      className={`map-control-surface flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 hover:bg-backgroundHover/90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
      style={{
        zIndex: 'var(--z-map-controls, 30)',
      }}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 text-accent animate-spin" aria-hidden="true" />
      ) : (
        <LocateFixed
          className={`w-4 h-4 transition-colors ${
            status === 'located' ? 'text-accent' : 'text-current'
          }`}
          aria-hidden="true"
        />
      )}
      <span className="select-none font-medium">
        {isLoading ? 'Locating...' : 'Locate Me'}
      </span>
    </button>
  );
}
