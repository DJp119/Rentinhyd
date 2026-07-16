// src/lib/utils.ts
// Shared utilities

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format INR currency
export function formatINR(amount: number, options: { compact?: boolean; showSymbol?: boolean } = {}): string {
  const { compact = false, showSymbol = true } = options;

  if (compact) {
    if (amount >= 10000000) { // 1 crore
      return `${showSymbol ? '₹' : ''}${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (amount >= 100000) { // 1 lakh
      return `${showSymbol ? '₹' : ''}${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `${showSymbol ? '₹' : ''}${(amount / 1000).toFixed(1)}K`;
    }
  }

  return `${showSymbol ? '₹' : ''}${amount.toLocaleString('en-IN')}`;
}

// Format rent range
export function formatRentRange(min: number, max: number): string {
  if (min === max) return formatINR(min);
  return `${formatINR(min)} - ${formatINR(max)}`;
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length - 1).trimEnd() + '…';
}

// Generate slug from text
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Parse bbox string "minLon,minLat,maxLon,maxLat"
export function parseBbox(bbox: string): [number, number, number, number] | null {
  const parts = bbox.split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return parts as [number, number, number, number];
}

// Validate bbox
export function isValidBbox(bbox: [number, number, number, number]): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return minLon < maxLon && minLat < maxLat &&
    minLon >= -180 && maxLon <= 180 &&
    minLat >= -90 && maxLat <= 90;
}

// Calculate distance between two points (Haversine)
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // meters
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a request fingerprint for abuse detection
 * Uses headers to create a deterministic hash
 */
export async function generateRequestFingerprint(headers: Record<string, string>): Promise<string> {
  const relevantHeaders = [
    'user-agent',
    'accept-language',
    'accept-encoding',
    'accept',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
  ];

  const parts = relevantHeaders
    .map(h => headers[h.toLowerCase()] || '')
    .filter(Boolean);

  const fingerprintString = parts.join('|');

  // Use Web Crypto API for consistent hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Retry with backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(baseDelay * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError!;
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// ============================================
// Locality & Privacy Utilities
// ============================================

const LOCALITY_BOUNDS: Record<string, { minLon: number; minLat: number; maxLon: number; maxLat: number }> = {
  gachibowli: { minLon: 78.32, minLat: 17.42, maxLon: 78.38, maxLat: 17.46 },
  madhapur: { minLon: 78.36, minLat: 17.43, maxLon: 78.41, maxLat: 17.47 },
  kondapur: { minLon: 78.33, minLat: 17.40, maxLon: 78.38, maxLat: 17.44 },
  'hitec-city': { minLon: 78.37, minLat: 17.43, maxLon: 78.42, maxLat: 17.47 },
  'financial-district': { minLon: 78.30, minLat: 17.38, maxLon: 78.36, maxLat: 17.42 },
  manikonda: { minLon: 78.28, minLat: 17.35, maxLon: 78.33, maxLat: 17.40 },
  narsingi: { minLon: 78.25, minLat: 17.33, maxLon: 78.31, maxLat: 17.38 },
  hafeezpet: { minLon: 78.40, minLat: 17.48, maxLon: 78.45, maxLat: 17.52 },
};

export function getLocalityFromPoint(lon: number, lat: number): string {
  for (const [locality, bounds] of Object.entries(LOCALITY_BOUNDS)) {
    if (lon >= bounds.minLon && lon <= bounds.maxLon &&
        lat >= bounds.minLat && lat <= bounds.maxLat) {
      return locality;
    }
  }
  // Default to nearest major locality
  return 'gachibowli';
}

/**
 * Apply deterministic privacy jitter to coordinates
 * Uses coordinate hash to generate consistent ~100-200m offset
 */
export function applyPrivacyJitter(lon: number, lat: number): [number, number] {
  // Create deterministic hash from coordinates
  const coordString = `${lon.toFixed(6)},${lat.toFixed(6)}`;
  let hash = 0;
  for (let i = 0; i < coordString.length; i++) {
    hash = ((hash << 5) - hash) + coordString.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate offset ~100-200m (0.001-0.002 degrees at Hyderabad latitude)
  // Use hash to determine angle and distance
  const angle = (hash % 360) * Math.PI / 180;
  const distance = 0.001 + (Math.abs(hash) % 1000) / 1000000; // 0.001-0.002 degrees

  const jitterLon = lon + distance * Math.cos(angle);
  const jitterLat = lat + distance * Math.sin(angle);

  return [jitterLon, jitterLat];
}