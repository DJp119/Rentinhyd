// src/lib/tokens.ts
// Secure token generation, hashing, and verification (Edge Runtime compatible)

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
 * Constant-time string comparison (Edge compatible)
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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

/**
 * Hash IP address for abuse tracking (with salt from env) (Edge compatible)
 */
export async function hashIpFingerprint(ip: string): Promise<string> {
  const salt = process.env.IP_FINGERPRINT_SALT || 'default-salt-change-in-production';
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${ip}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a fingerprint from request headers for rate limiting (Edge compatible)
 */
export async function generateRequestFingerprint(
  headers: Record<string, string | string[] | undefined>
): Promise<string> {
  const ip = (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || headers['x-real-ip'] as string
    || 'unknown';

  const userAgent = headers['user-agent'] as string || 'unknown';
  const acceptLanguage = headers['accept-language'] as string || '';

  // Create a stable fingerprint without storing raw IP
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ip}:${userAgent}:${acceptLanguage}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}