// src/components/map/RentPinLabelMarker.ts
// Optimistic blue confirmation label marker for submitted rent pins

export type TemporaryRentPin = {
  id: string;
  lat: number;
  lon: number;
  bhk: string;
  rentMin: number;
  rentMax: number;
};

/**
 * Calculates the rounded average rent in thousands (K).
 * Example: min 20,000 + max 30,000 -> 25
 */
export function calculateRentK(rentMin?: number, rentMax?: number): number {
  const min = typeof rentMin === 'number' && !isNaN(rentMin) ? rentMin : 0;
  const max = typeof rentMax === 'number' && !isNaN(rentMax) ? rentMax : 0;
  if (min === 0 && max === 0) return 0;
  return Math.round((min + max) / 2 / 1000);
}

/**
 * Formats the compact display label (e.g. "2BHK · 25K")
 */
export function formatRentPinLabel(bhk?: string, rentMin?: number, rentMax?: number): string {
  const layout = bhk?.trim() || '2BHK';
  const rentK = calculateRentK(rentMin, rentMax);
  return `${layout} · ${rentK}K`;
}

/**
 * Generates an accessible description for screen readers
 */
export function formatRentPinAriaLabel(bhk?: string, rentMin?: number, rentMax?: number): string {
  const layout = bhk?.trim() || '2BHK';
  const rentK = calculateRentK(rentMin, rentMax);
  return `Your submitted ${layout} rent pin, approximately ${rentK} thousand rupees per month, pending review`;
}

/**
 * DOM factory creating the compact blue map label with a downward tail.
 * Uses safe DOM manipulation (textContent) instead of raw HTML strings.
 */
export function createRentPinLabelContent(pin: TemporaryRentPin): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'map-rent-label-marker';
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', formatRentPinAriaLabel(pin.bhk, pin.rentMin, pin.rentMax));
  container.setAttribute('data-testid', 'temporary-rent-pin');

  const layout = pin.bhk?.trim() || '2BHK';
  const rentK = calculateRentK(pin.rentMin, pin.rentMax);

  // BHK span
  const bhkSpan = document.createElement('span');
  bhkSpan.textContent = layout;
  container.appendChild(bhkSpan);

  // Dot separator
  const dotSpan = document.createElement('span');
  dotSpan.setAttribute('aria-hidden', 'true');
  dotSpan.textContent = ' · ';
  container.appendChild(dotSpan);

  // Rent K span
  const rentSpan = document.createElement('span');
  rentSpan.textContent = `${rentK}K`;
  container.appendChild(rentSpan);

  // Downward pointer tail
  const tailSpan = document.createElement('span');
  tailSpan.className = 'map-rent-label-marker-tail';
  tailSpan.setAttribute('aria-hidden', 'true');
  container.appendChild(tailSpan);

  return container;
}
