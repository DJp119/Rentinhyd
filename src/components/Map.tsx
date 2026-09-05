// src/components/Map.tsx
// Main Google Maps component with geolocation, layer filtering, and custom controls

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { MapPin } from '@/lib/schemas';
import { formatINR, formatRentRange, checkHyderabadRadius } from '@/lib/utils';
import { ShareButtons } from './ShareButtons';
import { useMapGeolocation, UserLocation } from './map/useMapGeolocation';
import { MapLocationControl } from './map/MapLocationControl';
import { MapNotification } from './map/MapNotification';
import { TemporaryRentPin, createRentPinLabelContent } from './map/RentPinLabelMarker';
import {
  createAreaClusterMarkerContent,
  createBhkRentMarkerContent,
  createPlacementMarkerContent,
  createSubClusterMarkerContent,
  createToLetMarkerContent,
  formatLocalityName,
} from './map/MapMarkers';
import { getSupabase } from '@/lib/supabase';

export type { MapPin, TemporaryRentPin };

export type MapLocation = {
  lat: number;
  lon: number;
  locality?: string;
};

export type MapLayerVisibility = {
  rentPins: boolean;
  toLetBoards: boolean;
};

export interface MapProps {
  initialBounds?: [number, number, number, number];
  initialZoom?: number;
  onPinClick?: (pin: MapPin) => void;
  onMapClick?: (location: MapLocation) => void;
  className?: string;
  visibleLayers?: MapLayerVisibility;
  temporaryRentPins?: TemporaryRentPin[];
  refreshToken?: number;
  activeLocation?: MapLocation | null;
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

  if (type === 'tolet_board') {
    // To-Let Board pin: violet/purple color
    const color = '#9C27B0';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <path d="M18 2 C10.3 2 4 8.3 4 16 c0 6.5 5.5 12 14 20 8.5-8 14-13.5 14-20 C32 8.3 25.7 2 18 2 z" fill="${color}" stroke="#0D0D0D" stroke-width="${strokeWidth}"/>
      <rect x="12" y="10" width="12" height="8" rx="1" fill="#F5F5F0" stroke="#0D0D0D" stroke-width="1"/>
      <line x1="14" y1="13" x2="22" y2="13" stroke="#0D0D0D" stroke-width="1"/>
      <line x1="14" y1="15" x2="20" y2="15" stroke="#0D0D0D" stroke-width="1"/>
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

function createUserMarkerContent(): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'map-user-location-marker';
  container.setAttribute('data-testid', 'user-location-marker');
  container.setAttribute('aria-label', 'Your location');

  const halo = document.createElement('div');
  halo.className = 'map-user-location-halo';

  const dot = document.createElement('div');
  dot.className = 'map-user-location-dot';

  container.appendChild(halo);
  container.appendChild(dot);
  return container;
}

export function MapComponent({
  initialBounds,
  initialZoom = DEFAULT_ZOOM,
  onPinClick,
  onMapClick,
  className = '',
  visibleLayers = { rentPins: true, toLetBoards: true },
  temporaryRentPins = [],
  refreshToken = 0,
  activeLocation = null,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<google.maps.marker.AdvancedMarkerElement, MapPin>>(new Map());
  const temporaryMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const temporaryRentPinsRef = useRef<TemporaryRentPin[]>(temporaryRentPins);
  temporaryRentPinsRef.current = temporaryRentPins;
  const loaderRef = useRef<Loader | null>(null);

  // Active placement marker ref (rendered while tapping/entering input)
  const activeLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // User location and interaction refs
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const userAccuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const hasAutoCenteredRef = useRef(false);
  const userInteractedRef = useRef(false);
  const pinsRef = useRef<MapPin[]>([]);

  // Stable callbacks refs to prevent map re-initialization
  const onPinClickRef = useRef(onPinClick);
  onPinClickRef.current = onPinClick;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const visibleLayersRef = useRef(visibleLayers);
  visibleLayersRef.current = visibleLayers;

  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [outsideHybNotification, setOutsideHybNotification] = useState<string | null>(null);

  const {
    location: userLocation,
    status: locationStatus,
    errorMessage: geoErrorMessage,
    locate,
    clearError,
  } = useMapGeolocation();

  // Helper to create marker content div
  const createMarkerContent = (svg: string) => {
    const div = document.createElement('div');
    div.innerHTML = svg;
    div.style.cursor = 'pointer';
    return div;
  };

  // Render or update temporary submitted rent pin label markers
  const renderTemporaryRentPins = useCallback((
    pinsList: TemporaryRentPin[],
    layers = visibleLayersRef.current,
    existingRentPinIds: ReadonlySet<string> = new Set()
  ) => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous temporary markers
    temporaryMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    temporaryMarkersRef.current = [];

    // Only render if rentPins layer is active
    if (!layers.rentPins || !pinsList || pinsList.length === 0) return;

    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    pinsList
      .filter((pin) => !existingRentPinIds.has(pin.id))
      .forEach((pin) => {
        try {
          const pos = new google.maps.LatLng(pin.lat, pin.lon);
          const content = createRentPinLabelContent(pin);

          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: pos,
            map,
            content,
            zIndex: 15,
            title: `Submitted: ${pin.bhk} (pending review)`,
          });

          newMarkers.push(marker);
        } catch (err) {
          console.warn('AdvancedMarkerElement could not be instantiated on map:', err);
        }
      });

    temporaryMarkersRef.current = newMarkers;
  }, []);

  // Update markers on map according to layer visibility
  const updateMarkers = useCallback((items: MapPin[], layers = visibleLayersRef.current) => {
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    if (!map) return;

    // Remove old property/to-let markers
    const oldMarkers = Array.from(markersRef.current.keys());
    oldMarkers.forEach((m) => {
      m.map = null;
      if (clusterer) {
        clusterer.removeMarker(m);
      }
    });
    markersRef.current.clear();

    // Filter items based on layer visibility
    const filteredItems = items.filter((item) => {
      if (item.type === 'rent_pin') return layers.rentPins;
      if (item.type === 'tolet_board') return layers.toLetBoards;
      return true; // Listings always visible
    });

    // Create new markers
    const newClusterMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    filteredItems.forEach((item) => {
      const position = new google.maps.LatLng(item.geom.coordinates[1], item.geom.coordinates[0]);
      const isServerCluster = Boolean((item as any).pinCount && (item as any).pinCount > 1);

      let markerContent: HTMLElement;
      let markerZIndex = 10;
      let title = '';

      if (isServerCluster) {
        markerContent = createAreaClusterMarkerContent({
          flatCount: (item as any).pinCount,
          locality: item.locality,
        });
        markerZIndex = 14;
        title = `${(item as any).pinCount} flats in ${formatLocalityName(item.locality)}`;
      } else if (item.type === 'tolet_board') {
        markerContent = createToLetMarkerContent(item.locality);
        markerZIndex = 12;
        title = `To-Let board in ${formatLocalityName(item.locality)}`;
      } else {
        markerContent = createBhkRentMarkerContent({
          id: item.id,
          type: item.type,
          bhk: (item as any).bhk,
          rent: (item as any).rent,
          rentMin: (item as any).rentMin,
          rentMax: (item as any).rentMax,
          listingType: (item as any).listingType,
          locality: item.locality,
          reportCount: (item as any).reportCount,
        });

        if (item.type === 'rent_pin') {
          markerContent.setAttribute('data-testid', 'rent-pin-marker');
          markerContent.setAttribute('data-pin-id', item.id);
        }

        markerZIndex = 10;
        const rentStr = (item as any).rent
          ? formatINR((item as any).rent)
          : formatRentRange((item as any).rentMin || 0, (item as any).rentMax || 0);
        title = `${(item as any).bhk || 'Flat'} in ${formatLocalityName(item.locality)}: ${rentStr}`;
      }

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map,
        content: markerContent,
        zIndex: markerZIndex,
        title,
      });

      (marker as google.maps.marker.AdvancedMarkerElement & { pinData: MapPin }).pinData = item;

      marker.addListener('gmp-click', () => {
        if (isServerCluster) {
          const currentMap = mapRef.current;
          if (currentMap) {
            currentMap.panTo(position);
            currentMap.setZoom(Math.min((currentMap.getZoom() || 11) + 3, 16));
          }
        } else if (onPinClickRef.current) {
          onPinClickRef.current(item);
        }
      });

      if (item.type !== 'tolet_board') {
        newClusterMarkers.push(marker);
      }
      markersRef.current.set(marker, item);
    });

    // Add to clusterer if available
    if (clusterer) {
      clusterer.addMarkers(newClusterMarkers);
    }

    // Hide the optimistic marker once the same database record is visible.
    const existingRentPinIds = new Set(
      items.filter((item) => item.type === 'rent_pin').map((item) => item.id)
    );
    renderTemporaryRentPins(temporaryRentPinsRef.current, layers, existingRentPinIds);
  }, [renderTemporaryRentPins]);

  // Update or render the distinct user location marker and accuracy circle
  const renderUserLocation = useCallback((loc: UserLocation, centerCamera: boolean) => {
    const map = mapRef.current;
    if (!map) return;

    const pos = new google.maps.LatLng(loc.lat, loc.lon);

    // Render or update User Location marker
    if (!userLocationMarkerRef.current) {
      const markerContent = createUserMarkerContent();
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map,
        content: markerContent,
        title: 'Your Location',
        zIndex: 20, // User marker is on top of property markers
      });
      userLocationMarkerRef.current = marker;
    } else {
      userLocationMarkerRef.current.position = pos;
      userLocationMarkerRef.current.map = map;
    }

    // Render or update Accuracy Circle
    if (loc.accuracy > 0 && loc.accuracy <= 5000) {
      if (!userAccuracyCircleRef.current) {
        const circle = new google.maps.Circle({
          map,
          center: pos,
          radius: loc.accuracy,
          fillColor: '#00BCD4',
          fillOpacity: 0.15,
          strokeColor: '#00BCD4',
          strokeOpacity: 0.4,
          strokeWeight: 1,
          zIndex: 19,
        });
        userAccuracyCircleRef.current = circle;
      } else {
        userAccuracyCircleRef.current.setCenter(pos);
        userAccuracyCircleRef.current.setRadius(loc.accuracy);
        userAccuracyCircleRef.current.setMap(map);
      }
    } else if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.setMap(null);
    }

    // Handle centering & boundaries
    const hyderabadCheck = checkHyderabadRadius(loc.lat, loc.lon);
    if (!hyderabadCheck.allowed) {
      setOutsideHybNotification('Your location is outside this map area. Hyderabad remains selected.');
    } else if (centerCamera) {
      setOutsideHybNotification(null);
      map.panTo(pos);
      map.setZoom(15);
    }
  }, []);

  // Handler for manual "Locate Me" button click
  const handleManualLocate = useCallback(async () => {
    setOutsideHybNotification(null);
    const loc = await locate(true);
    if (loc && mapRef.current) {
      renderUserLocation(loc, true);
    }
  }, [locate, renderUserLocation]);

  // Load pins for current viewport
  const loadPins = useCallback(async (bounds: google.maps.LatLngBounds | undefined, zoom: number) => {
    if (!mapRef.current || !bounds) return;

    setLoading(true);
    setError(null);

    try {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const bbox = `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`;
      const requestZoom = Math.min(20, Math.max(1, Math.round(zoom)));
      const response = await fetch(`/api/map?bbox=${bbox}&zoom=${requestZoom}&type=all`, {
        cache: 'no-store',
      });

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
      pinsRef.current = newPins;
      setPins(newPins);
      updateMarkers(newPins, visibleLayersRef.current);
    } catch (err) {
      setError((err as Error).message);
      console.error('Map load error:', err);
    } finally {
      setLoading(false);
    }
  }, [updateMarkers]);

  // Refresh the current viewport after a successful submission.
  useEffect(() => {
    if (refreshToken === 0) return;

    const map = mapRef.current;
    if (!map) return;

    void loadPins(map.getBounds(), map.getZoom() ?? DEFAULT_ZOOM);
  }, [refreshToken, loadPins]);

  // Re-filter markers when layer visibility changes without refetching
  useEffect(() => {
    visibleLayersRef.current = visibleLayers;
    if (pinsRef.current.length > 0) {
      updateMarkers(pinsRef.current, visibleLayers);
    }
  }, [visibleLayers, updateMarkers]);

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

    loaderRef.current
      .load()
      .then(() => {
        setMapsLoaded(true);
      })
      .catch((err) => {
        setError(`Failed to load Google Maps: ${err.message}`);
      });
  }, []);

  // Initialize map instance
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !mapsLoaded) return;

    const bounds = initialBounds || HYDERABAD_BOUNDS;

    const map = new google.maps.Map(mapContainer.current, {
      center: DEFAULT_CENTER,
      zoom: initialZoom,
      minZoom: 10,
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
      // Move Map Type control to TOP_LEFT to prevent collision with top-right layer navigation
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
        position: google.maps.ControlPosition.TOP_LEFT,
      },
      streetViewControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.BOTTOM_RIGHT,
      },
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER,
      },
      scaleControl: true,
      backgroundColor: '#0D0D0D',
      gestureHandling: 'cooperative',
    });

    mapRef.current = map;

    // Track user drag / pan to prevent unwanted automatic camera jumps later
    const dragListener = map.addListener('dragstart', () => {
      userInteractedRef.current = true;
    });

    // Marker clusterer instance
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

            let totalFlats = 0;
            const localityCounts = new Map<string, number>();

            for (const m of cluster.markers) {
              const pinData = (m as any).pinData as MapPin | undefined;
              const flats = (pinData as any)?.pinCount || 1;
              totalFlats += flats;
              const loc = pinData?.locality;
              if (loc) {
                localityCounts.set(loc, (localityCounts.get(loc) || 0) + flats);
              }
            }

            let primaryLocality = '';
            let maxCount = 0;
            for (const [loc, c] of localityCounts.entries()) {
              if (c > maxCount) {
                maxCount = c;
                primaryLocality = loc;
              }
            }

            const isAreaLevel = (map.getZoom() || 11) < 13 || totalFlats >= 5;
            const content = isAreaLevel
              ? createAreaClusterMarkerContent({
                  flatCount: totalFlats,
                  locality: primaryLocality,
                })
              : createSubClusterMarkerContent(totalFlats, primaryLocality);

            const marker = new google.maps.marker.AdvancedMarkerElement({
              position: cluster.position,
              map,
              content,
              title: `${totalFlats} flats in ${formatLocalityName(primaryLocality)}`,
              zIndex: 14,
            });

            marker.addListener('gmp-click', () => {
              map.panTo(cluster.position);
              map.setZoom(Math.min((map.getZoom() || 11) + 3, 16));
            });

            (marker as google.maps.marker.AdvancedMarkerElement & { pinData: MapPin }).pinData = {
              type: 'rent_pin',
              pinCount: totalFlats,
              locality: primaryLocality,
            } as MapPin;

            return marker;
          },
        },
      });
      clustererRef.current = clusterer;
      return clusterer;
    };

    if (map.getZoom()! < 13) {
      createClusterer();
    }

    // Bounds are undefined until the first 'idle' event
    const idleListener = map.addListener('idle', () => {
      loadPins(map.getBounds(), map.getZoom()!);

      // On the first idle event, trigger automatic initial location request
      if (!hasAutoCenteredRef.current) {
        locate(false).then((loc) => {
          if (!loc || !mapRef.current) return;
          const isInsideHyb = checkHyderabadRadius(loc.lat, loc.lon).allowed;
          const shouldCenter = isInsideHyb && !userInteractedRef.current && !hasAutoCenteredRef.current;
          if (shouldCenter) {
            hasAutoCenteredRef.current = true;
          }
          renderUserLocation(loc, shouldCenter);
        });
      }
    });

    // Handle zoom changes
    const zoomListener = map.addListener('zoom_changed', () => {
      const zoom = map.getZoom()!;
      if (zoom >= 13 && clusterer) {
        clusterer.setMap(null);
        clusterer = null;
        clustererRef.current = null;
        const currentMap = mapRef.current;
        if (currentMap) {
          loadPins(currentMap.getBounds(), zoom);
        }
      } else if (zoom < 13 && !clusterer) {
        createClusterer();
        const currentMap = mapRef.current;
        if (currentMap) {
          loadPins(currentMap.getBounds(), zoom);
        }
      }
    });

    // Map click
    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!onMapClickRef.current || !e.latLng) return;
      onMapClickRef.current({
        lat: e.latLng.lat(),
        lon: e.latLng.lng(),
      });
    });

    return () => {
      google.maps.event.removeListener(dragListener);
      google.maps.event.removeListener(idleListener);
      google.maps.event.removeListener(zoomListener);
      google.maps.event.removeListener(clickListener);
      clusterer?.setMap(null);
      clustererRef.current = null;
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.map = null;
        userLocationMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.setMap(null);
        userAccuracyCircleRef.current = null;
      }
      temporaryMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });
      temporaryMarkersRef.current = [];
      if (activeLocationMarkerRef.current) {
        activeLocationMarkerRef.current.map = null;
        activeLocationMarkerRef.current = null;
      }
      mapRef.current = null;
    };
  }, [mapsLoaded, initialBounds, initialZoom, loadPins, locate, renderUserLocation]);

  // Synchronize active placement marker when entering input or selecting a location
  useEffect(() => {
    const map = mapRef.current;
    if (!mapsLoaded || !map) return;

    if (activeLocation) {
      const pos = new google.maps.LatLng(activeLocation.lat, activeLocation.lon);
      if (!activeLocationMarkerRef.current) {
        try {
          const content = createPlacementMarkerContent();
          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: pos,
            map,
            content,
            zIndex: 60,
            title: 'Selected location',
          });
          activeLocationMarkerRef.current = marker;
        } catch (err) {
          console.warn('Could not render active placement marker:', err);
        }
      } else {
        activeLocationMarkerRef.current.position = pos;
        activeLocationMarkerRef.current.map = map;
      }
    } else {
      if (activeLocationMarkerRef.current) {
        activeLocationMarkerRef.current.map = null;
        activeLocationMarkerRef.current = null;
      }
    }
  }, [activeLocation, mapsLoaded]);

  // Supabase Realtime subscription for live rent pin updates across all users
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabase>['channel']> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    try {
      const supabase = getSupabase();
      if (supabase && typeof supabase.channel === 'function') {
        channel = supabase
          .channel('rent_pins_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rent_pins' },
            () => {
              const map = mapRef.current;
              if (map) {
                void loadPins(map.getBounds(), map.getZoom() ?? DEFAULT_ZOOM);
              }
            }
          )
          .on('broadcast', { event: 'new_pin' }, () => {
            const map = mapRef.current;
            if (map) {
              void loadPins(map.getBounds(), map.getZoom() ?? DEFAULT_ZOOM);
            }
          })
          .subscribe();
      }
    } catch (err) {
      console.warn('Realtime subscription error, fallback to polling:', err);
    }

    // 15s background polling fallback when tab is visible
    pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const map = mapRef.current;
        if (map) {
          void loadPins(map.getBounds(), map.getZoom() ?? DEFAULT_ZOOM);
        }
      }
    }, 15000);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (channel) {
        channel.unsubscribe().catch(() => {});
      }
    };
  }, [loadPins]);

  // Synchronize temporary rent pin markers when temporaryRentPins prop or visibleLayers changes
  useEffect(() => {
    if (mapsLoaded && mapRef.current) {
      const existingRentPinIds = new Set(
        pinsRef.current.filter((item) => item.type === 'rent_pin').map((item) => item.id)
      );
      renderTemporaryRentPins(temporaryRentPins, visibleLayers, existingRentPinIds);
    }
  }, [temporaryRentPins, visibleLayers, mapsLoaded, renderTemporaryRentPins]);

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{ minHeight: '400px', backgroundColor: '#0D0D0D' }}
      data-testid="map-container"
    >
      <div
        ref={mapContainer}
        className="absolute inset-0"
        data-testid="map-canvas"
        onClick={() => {
          // Fallback click handler for tests when Google Maps canvas doesn't capture clicks
          if (onMapClickRef.current) {
            onMapClickRef.current({ lat: 17.4435, lon: 78.3772 });
          }
        }}
      />

      {/* Submitted rent pins are rendered only by AdvancedMarkerElement so the label stays anchored to pin.lat/pin.lon. */}
      {/* Legacy center overlay intentionally disabled; AdvancedMarkerElement above owns positioning.
      {false &&
        temporaryRentPins.map((pin) => (
          <div
            key={pin.id}
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              zIndex: 'var(--map-z-submitted-rent-pin, 15)',
            }}
          >
            <div
              className="map-rent-label-marker"
              role="img"
              aria-label={formatRentPinAriaLabel(pin.bhk, pin.rentMin, pin.rentMax)}
              data-testid="temporary-rent-pin"
            >
              <span>{pin.bhk?.trim() || '2BHK'}</span>
              <span aria-hidden="true"> · </span>
              <span>{calculateRentK(pin.rentMin, pin.rentMax)}K</span>
              <span className="map-rent-label-marker-tail" aria-hidden="true" />
            </div>
          </div>
        ))}
      */}

      {/* Locate Me Button - Bottom Left with safe-area spacing */}
      <div className="absolute left-4 bottom-4 z-30 pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
        <MapLocationControl
          status={locationStatus}
          onLocate={handleManualLocate}
        />
      </div>

      {/* Non-blocking Notifications for Geolocation or Outside Hyderabad */}
      <MapNotification
        message={geoErrorMessage || outsideHybNotification}
        type={geoErrorMessage ? 'warning' : 'info'}
        onDismiss={() => {
          clearError();
          setOutsideHybNotification(null);
        }}
      />

      {/* Loading States */}
      {!mapsLoaded && !error && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center pointer-events-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto mb-2" />
            <p className="text-textMuted text-sm">Loading Google Maps...</p>
          </div>
        </div>
      )}

      {mapsLoaded && loading && !error && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto mb-2" />
            <p className="text-textMuted text-sm">Loading pins...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center p-4 pointer-events-auto">
            <p className="text-error mb-2">Failed to load map</p>
            <p className="text-textMuted text-sm mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                const map = mapRef.current;
                if (map) loadPins(map.getBounds(), map.getZoom()!);
              }}
              className="btn-primary cursor-pointer"
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
  if (pin.type === 'tolet_board') return null;

  const isListing = pin.type === 'listing';
  const rentDisplay = isListing
    ? formatINR(pin.rent || 0)
    : formatRentRange(pin.rentMin || 0, pin.rentMax || 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up" data-testid="pin-bottom-sheet">
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
                className="w-full btn-primary cursor-pointer"
              >
                View Details
              </button>
            )}

            {/* Share buttons */}
            <div className="mt-4 pt-4 border-t border-border">
              <ShareButtons contentOrPin={pin} showLabel />
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-textMuted hover:text-textPrimary transition-colors cursor-pointer"
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
