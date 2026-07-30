// src/lib/tokens.ts
// Secure token generation, hashing, and verification (Edge Runtime compatible)

import { timingSafeEqual } from './crypto-utils';
import { generateRequestFingerprint } from './utils';

// ============================================
// Token configuration
// ============================================

const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_HOURS = 24;
const ACTION_TOKEN_EXPIRY_DAYS = 7;

/**
 * Generate a cryptographically secure random token (Edge compatible)
 */
export function generateToken(bytes = TOKEN_BYTES): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a token for storage using SHA-256 (Edge compatible)
 * Never store raw tokens in database
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a token against its hash using constant-time comparison (Edge compatible)
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  return timingSafeEqual(tokenHash, hash);
}

/**
 * Check if a token hash is expired
 */
export function isTokenExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date();
}

/**
 * Generate expiry timestamp for verification tokens (24 hours)
 */
export function getVerificationExpiry(): Date {
  return new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
}

/**
 * Generate expiry timestamp for action tokens (7 days)
 */
export function getActionExpiry(): Date {
  return new Date(Date.now() + ACTION_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Generate a verification token pair (raw for user, hash for storage)
 */
export async function generateVerificationPair(): Promise<{
  token: string;
  hash: string;
  expiresAt: Date;
}> {
  const token = generateToken();
  return {
    token,
    hash: await hashToken(token),
    expiresAt: getVerificationExpiry(),
  };
}

/**
 * Generate an action token pair (raw for user, hash for storage)
 */
export async function generateActionPair(): Promise<{
  token: string;
  hash: string;
  expiresAt: Date;
}> {
  const token = generateToken();
  return {
    token,
    hash: await hashToken(token),
    expiresAt: getActionExpiry(),
  };
}

/**
 * Generate IDempotency key for webhook deduplication (Edge compatible)
 */
export async function generateIdempotencyKey(prefix: string, identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${prefix}:${identifier}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hash = Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hash.slice(0, 16)}`;
}