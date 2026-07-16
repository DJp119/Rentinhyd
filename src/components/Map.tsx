// src/components/Map.tsx
// Main MapLibre GL map component

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from '@/lib/schemas';

export type { MapPin };
import { formatINR, formatRentRange } from '@/lib/utils';

interface MapProps {
  initialBounds?: [number, number, number, number];
  initialZoom?: number;
  onPinClick?: (pin: MapPin) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [78.365, 17.44];
const DEFAULT_ZOOM = 11;
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tiles.openmaptiles.org/styles/osm-bright/{z}/{x}/{y}.png';

type PinType = MapPin['type'];

export function MapComponent({
  initialBounds,
  initialZoom = DEFAULT_ZOOM,
  onPinClick,
  className = '',
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update map layers with new pins
  const updateMapLayers = (items: MapPin[]) => {
    const map = mapRef.current;
    if (!map) return;

    // Separate pins and listings
    const rentPins = items.filter(i => i.type === 'rent_pin');
    const listings = items.filter(i => i.type === 'listing');

    // Update or create rent pin layer
    updatePointLayer(map, 'rent-pins', rentPins, 'rent_pin');
    updatePointLayer(map, 'listings', listings, 'listing');
  };

  const updatePointLayer = (
    map: maplibregl.Map,
    layerId: string,
    items: MapPin[],
    type: PinType
  ) => {
    const sourceId = `${layerId}-source`;

    // Prepare GeoJSON
    const geojson = {
      type: 'FeatureCollection' as const,
      features: items.map(item => ({
        type: 'Feature' as const,
        geometry: item.geom,
        properties: {
          id: item.id,
          type: item.type,
          ...('rentMin' in item ? { rentMin: item.rentMin, rentMax: item.rentMax } : { rent: item.rent }),
          bhk: item.bhk,
          furnishing: item.furnishing,
          listingType: item.listingType,
          locality: item.locality,
          pinCount: item.pinCount,
        },
      })),
    };

    // Add/update source
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojson, cluster: false });

      // Add circle layer
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 8,
            14, 12,
            18, 16,
          ],
          'circle-color': getPinColorExpression(type),
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0D0D0D',
          'circle-opacity': 0.9,
        },
      });

      // Add label layer for clusters
      if (type === 'rent_pin') {
        map.addLayer({
          id: `${layerId}-labels`,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': ['get', 'pinCount'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#F5F5F0',
            'text-halo-color': '#0D0D0D',
            'text-halo-width': 2,
          },
          filter: ['>', ['get', 'pinCount'], 1],
        });
      }
    }
  };

  // Load pins for current viewport
  const loadPins = useCallback(async (bounds: maplibregl.LngLatBounds, zoom: number) => {
    if (!mapRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      const response = await fetch(`/api/map?bbox=${bbox}&zoom=${Math.round(zoom)}&type=all`);

      if (!response.ok) throw new Error('Failed to load map data');

      const data = await response.json();
      setPins(data.items || []);
      updateMapLayers(data.items || []);
    } catch (err) {
      setError((err as Error).message);
      console.error('Map load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [TILE_URL],
            tileSize: 256,
            attribution: '© OpenMapTiles © OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0D0D0D' },
          },
          {
            id: 'tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: DEFAULT_CENTER,
      zoom: initialZoom,
      bounds: initialBounds ? [
        [initialBounds[0], initialBounds[1]],
        [initialBounds[2], initialBounds[3]],
      ] : undefined,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    mapRef.current = map;

    // Load initial pins
    loadPins(map.getBounds(), map.getZoom());

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loadPins]);

  // Handle map move/zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let timeoutId: NodeJS.Timeout;

    const handleMoveEnd = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        loadPins(map.getBounds(), map.getZoom());
      }, 150);
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
      clearTimeout(timeoutId);
    };
  }, [loadPins]);

  // Handle click on pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onPinClick) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['rent-pins', 'listings'],
      });

      if (features.length > 0) {
        const feature = features[0];
        const pin = pins.find(p => p.id === feature.properties.id);
        if (pin) onPinClick(pin);
      }
    };

    map.on('click', handleClick);
    map.getCanvas().style.cursor = 'default';

    // Change cursor on hover
    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['rent-pins', 'listings'],
      });
      map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
    };

    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [pins, onPinClick]);

  if (error) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <p className="text-error mb-2">Failed to load map</p>
          <button
            onClick={() => mapRef.current && loadPins(mapRef.current.getBounds(), mapRef.current.getZoom())}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    >
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto mb-2"></div>
            <p className="text-textMuted text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getPinColorExpression(type: PinType) {
  if (type === 'rent_pin') {
    return [
      'interpolate',
      ['linear'],
      ['+', ['get', 'rentMin'], ['get', 'rentMax']],
      0, '#4CAF50',
      15000, '#4CAF50',
      25000, '#8BC34A',
      40000, '#FFB300',
      60000, '#FF9800',
      100000, '#EF5350',
    ] as maplibregl.DataDrivenPropertyValueSpecification<string>;
  }

  return [
    'match',
    ['get', 'listingType'],
    'whole_flat', '#E8A838',
    'room_flatmate', '#4FC3F7',
    '#E8A838',
  ] as maplibregl.DataDrivenPropertyValueSpecification<string>;
}

// Pin Bottom Sheet Component
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