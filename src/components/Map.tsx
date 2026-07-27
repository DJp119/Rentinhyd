// src/components/Map.tsx
// Main Google Maps component

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { MapPin } from '@/lib/schemas';
import { formatINR, formatRentRange } from '@/lib/utils';
import { ShareButtons } from './ShareButtons';

export type { MapPin };

interface MapProps {
  initialBounds?: [number, number, number, number];
  initialZoom?: number;
  onPinClick?: (pin: MapPin) => void;
  className?: string;
}

// Hyderabad city bounds (approximate)
const HYDERABAD_BOUNDS: [number, number, number, number] = [77.8, 17.0, 78.8, 17.8];
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 17.44, lng: 78.365 };
const DEFAULT_ZOOM = 11;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

type PinType = MapPin['type'];

function createPinSVG(type: PinType, rent?: number, rentMin?: number, rentMax?: number, listingType?: string, pinCount?: number): string {
  const size = 36;
  const strokeWidth = 2.5;

  if (type === 'rent_pin' && pinCount && pinCount > 1) {
    // Cluster marker
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="18" cy="18" r="16" fill="#4CAF50" stroke="#0D0D0D" stroke-width="${strokeWidth}"/>
      <text x="18" y="22" text-anchor="middle" fill="#F5F5F0" font-size="11" font-weight="bold" font-family="system-ui, sans-serif">${pinCount > 99 ? '99+' : pinCount}</text>
    </svg>`;
  }

  if (type === 'rent_pin') {
    // Rent pin: color by rent (green to red)
    const avgRent = rentMin && rentMax ? (rentMin + rentMax) / 2 : (rent || 20000);
    const hue = Math.max(0, Math.min(120, 120 - (avgRent - 10000) / 500)); // 120=green, 0=red
    const color = `hsl(${hue}, 70%, 45%)`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <path d="M18 2 C10.3 2 4 8.3 4 16 c0 6.5 5.5 12 14 20 8.5-8 14-13.5 14-20 C32 8.3 25.7 2 18 2 z" fill="${color}" stroke="#0D0D0D" stroke-width="${strokeWidth}"/>
      <circle cx="18" cy="16" r="5" fill="#0D0D0D"/>
    </svg>`;
  }

  // Listing: gold for whole_flat, blue for room_flatmate
  const color = listingType === 'whole_flat' ? '#E8A838' : '#4FC3F7';
  const icon = listingType === 'whole_flat'
    ? 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'
    : 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <path d="${icon}" fill="${color}" stroke="#0D0D0D" stroke-width="1.5" transform="scale(1.3) translate(-2, -2)"/>
  </svg>`;
}

export function MapComponent({
  initialBounds,
  initialZoom = DEFAULT_ZOOM,
  onPinClick,
  className = '',
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<google.maps.marker.AdvancedMarkerElement, MapPin>>(new Map());
  const loaderRef = useRef<Loader | null>(null);

  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Initialize Google Maps loader
  useEffect(() => {
    if (!API_KEY) {
      setError('Google Maps API key not configured');
      return;
    }

    loaderRef.current = new Loader({
      apiKey: API_KEY,
      version: 'weekly',
      libraries: ['marker'],
    });

    loaderRef.current.load().then(() => {
      setMapsLoaded(true);
    }).catch((err) => {
      setError(`Failed to load Google Maps: ${err.message}`);
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !mapsLoaded) return;

    const bounds = initialBounds || HYDERABAD_BOUNDS;

    const map = new google.maps.Map(mapContainer.current, {
      center: DEFAULT_CENTER,
      zoom: initialZoom,
      minZoom: 10,
      // AdvancedMarkerElement requires a mapId; inline `styles` are ignored when one is set,
      // so dark styling must be configured on the Map ID in Google Cloud console
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
      restriction: {
        latLngBounds: {
          north: bounds[3],
          south: bounds[1],
          east: bounds[2],
          west: bounds[0],
        },
        strictBounds: true,
      },
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER,
      },
      scaleControl: true,
      backgroundColor: '#0D0D0D',
      gestureHandling: 'cooperative',
    });

    mapRef.current = map;

    // Marker clusterer instance (created lazily based on zoom)
    let clusterer: MarkerClusterer | null = null;

    const createClusterer = () => {
      if (clusterer) clusterer.setMap(null);
      clusterer = new MarkerClusterer({
        map,
        markers: [],
        renderer: {
          render: (cluster) => {
            const count = cluster.markers.length;
            if (count === 1) {
              return cluster.markers[0];
            }

            const svg = createPinSVG('rent_pin', undefined, undefined, undefined, undefined, count);
            const marker = new google.maps.marker.AdvancedMarkerElement({
              position: cluster.position,
              map,
              content: createMarkerContent(svg),
              title: `${count} rent pins`,
            });
            (marker as google.maps.marker.AdvancedMarkerElement & { pinData: MapPin }).pinData = { type: 'rent_pin', pinCount: count } as MapPin;
            return marker;
          },
        },
      });
      clustererRef.current = clusterer;
      return clusterer;
    };

    // Initial clusterer if zoom < 13
    if (map.getZoom()! < 13) {
      createClusterer();
    }

    // Bounds are undefined until the first 'idle' event, which also handles the initial load
    const idleListener = map.addListener('idle', () => {
      loadPins(map.getBounds(), map.getZoom()!);
    });

    // Handle zoom changes - enable/disable clustering
    const zoomListener = map.addListener('zoom_changed', () => {
      const zoom = map.getZoom()!;
      if (zoom >= 13 && clusterer) {
        // Disable clustering at high zoom - remove clusterer, show individual markers
        clusterer.setMap(null);
        clusterer = null;
        clustererRef.current = null;
        // Re-render all markers individually
        const mapRef2 = mapRef.current;
        if (mapRef2) {
          loadPins(mapRef2.getBounds(), zoom);
        }
      } else if (zoom < 13 && !clusterer) {
        // Enable clustering at low zoom
        createClusterer();
        const mapRef2 = mapRef.current;
        if (mapRef2) {
          loadPins(mapRef2.getBounds(), zoom);
        }
      }
    });

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!onPinClick) return;
    });

    return () => {
      google.maps.event.removeListener(idleListener);
      google.maps.event.removeListener(zoomListener);
      google.maps.event.removeListener(clickListener);
      clusterer?.setMap(null);
      clustererRef.current = null;
      mapRef.current = null;
    };
  }, [mapsLoaded, onPinClick]);

  // Load pins for current viewport
  const loadPins = useCallback(async (bounds: google.maps.LatLngBounds | undefined, zoom: number) => {
    if (!mapRef.current || !bounds) return;

    setLoading(true);
    setError(null);

    try {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const bbox = `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`;
      const response = await fetch(`/api/map?bbox=${bbox}&zoom=${Math.round(zoom)}&type=all`);

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body?.error ? `: ${body.error}` : ` (HTTP ${response.status})`;
        } catch {
          detail = ` (HTTP ${response.status})`;
        }
        throw new Error(`Failed to load map data${detail}`);
      }

      const data = await response.json();
      const newPins = data.items || [];
      setPins(newPins);
      updateMarkers(newPins);
    } catch (err) {
      setError((err as Error).message);
      console.error('Map load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update markers on map
  const updateMarkers = useCallback((items: MapPin[]) => {
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    if (!map) return;

    // Remove old markers
    const oldMarkers = Array.from(markersRef.current.keys());
    if (clusterer) {
      oldMarkers.forEach(m => clusterer.removeMarker(m));
    } else {
      oldMarkers.forEach(m => { m.map = null; });
    }
    markersRef.current.clear();

    // Create new markers
    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    items.forEach(item => {
      const position = new google.maps.LatLng(item.geom.coordinates[1], item.geom.coordinates[0]);
      const svg = createPinSVG(
        item.type,
        item.rent,
        item.rentMin,
        item.rentMax,
        item.listingType,
        item.pinCount
      );

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map,
        content: createMarkerContent(svg),
        title: item.type === 'rent_pin'
          ? `Rent: ${formatRentRange(item.rentMin || 0, item.rentMax || 0)}`
          : `Listing: ${formatINR(item.rent || 0)}`,
      });

      (marker as google.maps.marker.AdvancedMarkerElement & { pinData: MapPin }).pinData = item;

      marker.addListener('click', () => {
        if (onPinClick) {
          onPinClick(item);
        }
      });

      newMarkers.push(marker);
      markersRef.current.set(marker, item);
    });

    // Add to clusterer if available
    if (clusterer) {
      clusterer.addMarkers(newMarkers);
    }
  }, [onPinClick]);

  // Helper to create marker content div
  const createMarkerContent = (svg: string) => {
    const div = document.createElement('div');
    div.innerHTML = svg;
    div.style.cursor = 'pointer';
    return div;
  };

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{ minHeight: '400px', backgroundColor: '#0D0D0D' }}
    >
      <div ref={mapContainer} className="absolute inset-0" />
      {!mapsLoaded && !error && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto mb-2"></div>
            <p className="text-textMuted text-sm">Loading Google Maps...</p>
          </div>
        </div>
      )}
      {mapsLoaded && loading && !error && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto mb-2"></div>
            <p className="text-textMuted text-sm">Loading pins...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="text-center p-4">
            <p className="text-error mb-2">Failed to load map</p>
            <p className="text-textMuted text-sm mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                const map = mapRef.current;
                if (map) loadPins(map.getBounds(), map.getZoom()!);
              }}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Pin Bottom Sheet Component (unchanged)
interface PinBottomSheetProps {
  pin: MapPin | null;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export function PinBottomSheet({ pin, onClose, onAction }: PinBottomSheetProps) {
  if (!pin) return null;

  const isListing = pin.type === 'listing';
  const rentDisplay = isListing
    ? formatINR(pin.rent || 0)
    : formatRentRange(pin.rentMin || 0, pin.rentMax || 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="bg-backgroundElevated border-t border-border rounded-t-xl p-4 md:p-6 max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-border mx-auto rounded-full mb-4" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                isListing
                  ? (pin.listingType === 'whole_flat' ? 'bg-accent/20 text-accent' : 'bg-info/20 text-info')
                  : 'bg-accent/20 text-accent'
              }`}>
                {isListing ? (pin.listingType === 'whole_flat' ? 'Whole Flat' : 'Room/Flatmate') : 'Rent Pin'}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted/20 text-textMuted">
                {pin.bhk}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted/20 text-textMuted">
                {pin.furnishing.replace('_', ' ')}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-textPrimary mb-1">
              {isListing ? 'Listing' : 'Rent Pin'}
            </h3>

            <p className="text-2xl font-bold text-accent mb-2">{rentDisplay}/month</p>

            <div className="flex items-center gap-4 text-sm text-textSecondary mb-4">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {pin.locality}
              </span>
              {isListing && pin.listingType && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 22v-8.325" /></svg>
                  {pin.listingType === 'whole_flat' ? 'Whole Flat' : 'Room'}
                </span>
              )}
            </div>

            {isListing && (
              <button
                onClick={() => onAction?.('view')}
                className="w-full btn-primary"
              >
                View Details
              </button>
            )}

            {/* Share buttons */}
            <div className="mt-4 pt-4 border-t border-border">
              <ShareButtons pin={pin} showLabel />
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-textMuted hover:text-textPrimary transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}