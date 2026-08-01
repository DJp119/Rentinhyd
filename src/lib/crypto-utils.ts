// src/lib/crypto-utils.ts
// Shared cryptographic utilities (Edge Runtime compatible)

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses Web Crypto API compatible implementation.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}