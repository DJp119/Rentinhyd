// src/components/map/MapMarkers.ts
// DOM factories for interactive Google Maps AdvancedMarkerElements:
// 1. Area cluster cards (e.g. "70 flats / Madhapur") for city/area level
// 2. BHK & Rent pills (e.g. "2BHK · 33K", "1BHK · 6K") for zoomed-in flat level
// 3. Sub-cluster badges (e.g. "2 flats", "3 flats") for tight groupings

/**
 * Human-readable display mapping for known Hyderabad localities
 */
const KNOWN_LOCALITY_NAMES: Record<string, string> = {
  'gachibowli': 'Gachibowli',
  'madhapur': 'Madhapur',
  'kondapur': 'Kondapur',
  'hitec-city': 'HITEC City',
  'financial-district': 'Financial District',
  'manikonda': 'Manikonda',
  'narsingi': 'Narsingi',
  'hafeezpet': 'Hafeezpet',
  'jubilee-hills': 'Jubilee Hills',
  'banjara-hills': 'Banjara Hills',
  'kukatpally': 'Kukatpally',
  'miyapur': 'Miyapur',
  'gachibowli-ext': 'Gachibowli Ext',
  'ameerpet': 'Ameerpet',
  'begumpet': 'Begumpet',
  'somajiguda': 'Somajiguda',
  'panjagutta': 'Panjagutta',
};

/**
 * Format locality slug into clean title casing
 */
export function formatLocalityName(locality?: string): string {
  if (!locality) return 'Hyderabad';
  const clean = locality.toLowerCase().trim();
  if (KNOWN_LOCALITY_NAMES[clean]) {
    return KNOWN_LOCALITY_NAMES[clean];
  }
  return clean
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalizes BHK string (e.g., "1BHK", "2BHK", "3BHK", "4+BHK", "room")
 */
export function formatBhkDisplay(bhk?: string): string {
  if (!bhk) return '2BHK';
  const normalized = bhk.toUpperCase().trim();
  if (normalized.startsWith('ROOM')) return '1RK';
  if (normalized === '4+BHK') return '4+BHK';
  return normalized.replace(/\s+/g, '');
}

/**
 * Calculates the rounded average rent in thousands (K).
 * Examples: 33,000 -> 33; min 20,000 + max 30,000 -> 25
 */
export function calculateRentK(rent?: number, rentMin?: number, rentMax?: number): number {
  if (typeof rent === 'number' && !isNaN(rent) && rent > 0) {
    return Math.round(rent / 1000);
  }
  const min = typeof rentMin === 'number' && !isNaN(rentMin) ? rentMin : 0;
  const max = typeof rentMax === 'number' && !isNaN(rentMax) ? rentMax : 0;
  if (min === 0 && max === 0) return 20; // sensible default
  return Math.round((min + max) / 2 / 1000);
}

export interface AreaClusterOptions {
  flatCount: number;
  locality: string;
  availableCount?: number;
}

/**
 * Creates the dark area cluster card DOM element:
 * Line 1: "70 flats"
 * Line 2: Area Name (e.g. "Madhapur" or "AVLB 11")
 * Downward pointer tail
 */
export function createAreaClusterMarkerContent(options: AreaClusterOptions): HTMLDivElement {
  const { flatCount, locality, availableCount } = options;
  const displayName = formatLocalityName(locality);
  const countLabel = `${flatCount} flat${flatCount === 1 ? '' : 's'}`;

  const container = document.createElement('div');
  container.className = 'map-area-cluster-marker';
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute('aria-label', `${countLabel} in ${displayName}`);
  container.setAttribute('data-testid', 'area-cluster-marker');
  container.setAttribute('data-locality', locality);
  container.setAttribute('data-count', String(flatCount));

  // Top line: flat count
  const countSpan = document.createElement('div');
  countSpan.className = 'map-area-cluster-count';
  countSpan.textContent = countLabel;
  container.appendChild(countSpan);

  // Bottom line: area name or AVLB count
  const localitySpan = document.createElement('div');
  localitySpan.className = 'map-area-cluster-locality';
  if (typeof availableCount === 'number' && availableCount > 0) {
    localitySpan.textContent = `AVLB ${availableCount}`;
  } else {
    localitySpan.textContent = displayName;
  }
  container.appendChild(localitySpan);

  // Downward pointer tail
  const tail = document.createElement('span');
  tail.className = 'map-area-cluster-tail';
  tail.setAttribute('aria-hidden', 'true');
  container.appendChild(tail);

  return container;
}

export interface BhkRentPinData {
  id?: string;
  type?: string;
  bhk?: string;
  rent?: number;
  rentMin?: number;
  rentMax?: number;
  listingType?: string;
  locality?: string;
  reportCount?: number;
}

/**
 * Creates the BHK & Rent pill marker DOM element:
 * e.g. "2BHK · 33K" (Amber/Orange for whole flats, Blue for rooms)
 * with downward pointer tail and optional status tag
 */
export function createBhkRentMarkerContent(pin: BhkRentPinData): HTMLDivElement {
  const bhk = formatBhkDisplay(pin.bhk);
  const rentK = calculateRentK(pin.rent, pin.rentMin, pin.rentMax);
  const isRoom = pin.listingType === 'room_flatmate';
  const variantClass = isRoom ? 'map-bhk-blue' : 'map-bhk-amber';
  const displayLocality = formatLocalityName(pin.locality);

  const container = document.createElement('div');
  container.className = `map-bhk-rent-marker ${variantClass}`;
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute(
    'aria-label',
    `${bhk} flat in ${displayLocality}, approximately ${rentK} thousand rupees per month`
  );
  container.setAttribute('data-testid', 'bhk-rent-marker');
  if (pin.id) {
    container.setAttribute('data-pin-id', pin.id);
  }

  // Optional badge tag above marker
  if (pin.reportCount && pin.reportCount > 0) {
    const reportBadge = document.createElement('div');
    reportBadge.className = 'map-bhk-badge badge-report';
    reportBadge.textContent = `${pin.reportCount} report`;
    container.appendChild(reportBadge);
  } else if (pin.listingType === 'whole_flat') {
    const availBadge = document.createElement('div');
    availBadge.className = 'map-bhk-badge badge-avail';
    availBadge.textContent = 'WHOLE AVBL';
    container.appendChild(availBadge);
  }

  // Pill content: BHK · RentK
  const textRow = document.createElement('div');
  textRow.className = 'map-bhk-content-row';

  const bhkSpan = document.createElement('span');
  bhkSpan.className = 'map-bhk-label';
  bhkSpan.textContent = bhk;
  textRow.appendChild(bhkSpan);

  const dotSpan = document.createElement('span');
  dotSpan.className = 'map-bhk-dot';
  dotSpan.setAttribute('aria-hidden', 'true');
  dotSpan.textContent = ' · ';
  textRow.appendChild(dotSpan);

  const rentSpan = document.createElement('span');
  rentSpan.className = 'map-bhk-rent';
  rentSpan.textContent = `${rentK}K`;
  textRow.appendChild(rentSpan);

  container.appendChild(textRow);

  // Downward pointer tail
  const tail = document.createElement('span');
  tail.className = `map-bhk-marker-tail ${variantClass}-tail`;
  tail.setAttribute('aria-hidden', 'true');
  container.appendChild(tail);

  return container;
}

/**
 * Creates the small sub-cluster marker DOM element:
 * e.g. "2 flats", "3 flats"
 */
export function createSubClusterMarkerContent(count: number, locality?: string): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'map-sub-cluster-marker';
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute(
    'aria-label',
    `${count} flats${locality ? ` in ${formatLocalityName(locality)}` : ''}`
  );
  container.setAttribute('data-testid', 'sub-cluster-marker');
  container.setAttribute('data-count', String(count));

  const textSpan = document.createElement('span');
  textSpan.textContent = `${count} flats`;
  container.appendChild(textSpan);

  const tail = document.createElement('span');
  tail.className = 'map-sub-cluster-tail';
  tail.setAttribute('aria-hidden', 'true');
  container.appendChild(tail);

  return container;
}

/**
 * Creates the To-Let board pin DOM element
 */
export function createToLetMarkerContent(locality?: string): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'map-tolet-marker';
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute(
    'aria-label',
    `To-Let board in ${formatLocalityName(locality)}`
  );
  container.setAttribute('data-testid', 'tolet-board-marker');

  const textSpan = document.createElement('span');
  textSpan.textContent = 'TO-LET';
  container.appendChild(textSpan);

  const tail = document.createElement('span');
  tail.className = 'map-tolet-marker-tail';
  tail.setAttribute('aria-hidden', 'true');
  container.appendChild(tail);

  return container;
}

/**
 * Creates the active placement marker DOM element while entering input:
 * Animated pulsing radar halo + vibrant orange placement pill with pointer tail
 */
export function createPlacementMarkerContent(bhk?: string, rentK?: number): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'map-placement-marker-container';
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', 'Selected pin location');
  container.setAttribute('data-testid', 'active-placement-marker');

  // Pulsing radar ring
  const pulse = document.createElement('div');
  pulse.className = 'map-placement-pulse';
  pulse.setAttribute('aria-hidden', 'true');
  container.appendChild(pulse);

  // Pin pill
  const pill = document.createElement('div');
  pill.className = 'map-placement-pill';
  pill.textContent = bhk && rentK ? `📍 ${bhk} · ${rentK}K` : '📍 Selected Location';
  container.appendChild(pill);

  // Downward pointer tail
  const tail = document.createElement('span');
  tail.className = 'map-placement-tail';
  tail.setAttribute('aria-hidden', 'true');
  container.appendChild(tail);

  return container;
}

