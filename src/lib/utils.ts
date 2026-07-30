// src/lib/utils.ts
// Shared utilities

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Escape HTML special characters to prevent XSS
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
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

// Hyderabad center coordinates
export const HYDERABAD_CENTER = { lat: 17.44, lng: 78.365 };
export const HYDERABAD_MAX_RADIUS_KM = 100; // 100km radius

/**
 * Check if a point is within Hyderabad service area
 * Returns { allowed: boolean, distanceKm: number, message?: string }
 */
export function checkHyderabadRadius(lat: number, lon: number): { allowed: boolean; distanceKm: number; message?: string } {
  const distanceM = haversineDistance(lat, lon, HYDERABAD_CENTER.lat, HYDERABAD_CENTER.lng);
  const distanceKm = distanceM / 1000;

  if (distanceKm > HYDERABAD_MAX_RADIUS_KM) {
    return {
      allowed: false,
      distanceKm,
      message: `This pin is more than ${Math.round(distanceKm)} km from Hyderabad. rentinhyderabad is currently focused on the Hyderabad metro area only.`
    };
  }

  return { allowed: true, distanceKm };
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

// ============================================
// Share Utilities
// ============================================

export interface ShareContent {
  title: string;
  text?: string;
  url: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hyderabad.rent';

/**
 * Generate WhatsApp share URL
 */
export function getWhatsAppUrl(content: ShareContent): string {
  const message = `${content.title}${content.text ? `\n\n${content.text}` : ''}\n\n${content.url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Copy to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Generate share URLs for different content types
 */
export function generatePinShareUrl(pinId: string): string {
  return `${APP_URL}/pin/${pinId}`;
}

export function generateListingShareUrl(listingId: string): string {
  return `${APP_URL}/list/${listingId}`;
}

export function generateSeekerShareUrl(seekerId: string): string {
  return `${APP_URL}/seek/${seekerId}`;
}

/**
 * Generate share content for a pin
 */
export function getPinShareContent(pin: {
  id: string;
  type: 'rent_pin' | 'listing';
  locality: string;
  bhk: string;
  furnishing: string;
  rent?: number;
  rentMin?: number;
  rentMax?: number;
  listingType?: string;
}): ShareContent {
  const url = pin.type === 'listing'
    ? generateListingShareUrl(pin.id)
    : generatePinShareUrl(pin.id);

  const rentDisplay = pin.rent
    ? formatINR(pin.rent)
    : formatRentRange(pin.rentMin || 0, pin.rentMax || 0);

  const typeLabel = pin.type === 'listing'
    ? (pin.listingType === 'whole_flat' ? 'Whole Flat' : 'Room/Flatmate')
    : 'Rent Pin';

  return {
    title: `${typeLabel}: ${pin.bhk} ${pin.furnishing.replace('_', ' ')} in ${pin.locality}`,
    text: `₹${rentDisplay}/month`,
    url,
  };
}

// ============================================
// Locality & Privacy Utilities - NOW USING DB RPC
// ============================================

// LOCALITY_BOUNDS, getLocalityFromPoint, and applyPrivacyJitter moved to Supabase RPC functions:
// get_locality_from_point(lon, lat)
// apply_privacy_jitter(geom, max_meters)