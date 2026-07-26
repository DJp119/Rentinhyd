// src/lib/security.ts
// Security utilities: CSP, headers, encryption, validation (Edge Runtime compatible)

// ============================================
// Content Security Policy
// ============================================

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://challenges.cloudflare.com',
    'https://static.cloudflareinsights.com',
    'https://maps.googleapis.com',
    'https://*.googleapis.com',
    'https://*.google.com',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src': ["'self'", 'data:', 'https:', 'blob:', 'https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.ggpht.com'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://api.resend.com',
    'https://challenges.cloudflare.com',
    'https://static.cloudflareinsights.com',
    'https://cloudflareinsights.com',
    'https://maps.googleapis.com',
    'https://*.googleapis.com',
    'https://*.google.com',
  ],
  'worker-src': ["'self'", 'blob:'],
  'frame-src': ["'self'", 'https://challenges.cloudflare.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
} as const;

export function buildCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// ============================================
// Security Headers Middleware
// ============================================

export function getSecurityHeaders(): Record<string, string> {
  const csp = buildCSPHeader();

  return {
    'Content-Security-Policy': csp,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

// ============================================
// CORS Configuration
// ============================================

export const CORS_CONFIG = {
  // Only allow our domain and localhost for development
  origin: [
    'https://rentinhyderabad.in',
    'https://www.rentinhyderabad.in',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400,
};

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = CORS_CONFIG.origin.includes(origin || '')
    ? origin
    : CORS_CONFIG.origin[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '',
    'Access-Control-Allow-Methods': CORS_CONFIG.methods.join(', '),
    'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders.join(', '),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': CORS_CONFIG.maxAge.toString(),
  };
}

// ============================================
// Encryption (for PII fields) - Web Crypto API
// ============================================

// In production, use a proper key management system (KMS, Vault, etc.)
// This is a simplified implementation for demonstration
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is required (64-char hex)');
  }
  if (keyHex.length !== 64 || !/^[0-9a-f]+$/i.test(keyHex)) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  const keyData = new Uint8Array(32);
  for (let i = 0; i < 64; i += 2) {
    keyData[i / 2] = parseInt(keyHex.substr(i, 2), 16);
  }

  return crypto.subtle.importKey(
    'raw',
    keyData as BufferSource,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(text: string): Promise<{ encrypted: string; iv: string; tag: string }> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(text);
  const aad = new TextEncoder().encode('hyderabad-rent');

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, additionalData: aad, tagLength: TAG_LENGTH * 8 },
    key,
    encodedText
  );

  const encryptedBytes = new Uint8Array(encrypted);
  // The encrypted data includes the auth tag at the end
  const tag = encryptedBytes.slice(-TAG_LENGTH);
  const ciphertext = encryptedBytes.slice(0, -TAG_LENGTH);

  return {
    encrypted: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    tag: btoa(String.fromCharCode(...tag)),
  };
}

export async function decrypt(encrypted: string, iv: string, tag: string): Promise<string> {
  const key = await getEncryptionKey();

  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const tagBytes = Uint8Array.from(atob(tag), c => c.charCodeAt(0));
  const aad = new TextEncoder().encode('hyderabad-rent');

  // Combine ciphertext and tag for Web Crypto API
  const ciphertextWithTag = new Uint8Array(encryptedBytes.length + tagBytes.length);
  ciphertextWithTag.set(encryptedBytes);
  ciphertextWithTag.set(tagBytes, encryptedBytes.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBytes, additionalData: aad, tagLength: TAG_LENGTH * 8 },
    key,
    ciphertextWithTag
  );

  return new TextDecoder().decode(decrypted);
}

// ============================================
// Input Validation & Sanitization
// ============================================

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeForLog(input: string): string {
  // Remove potential PII patterns
  return input
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/(\+91|91)?[6-9]\d{9}/g, '[PHONE]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    .replace(/\b\d{12}\b/g, '[AADHAAR]');
}

// ============================================
// Rate Limiting Helpers
// ============================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export const RATE_LIMITS = {
  api: { windowMs: 60000, maxRequests: 60, keyPrefix: 'api' },
  verification: { windowMs: 3600000, maxRequests: 5, keyPrefix: 'verify' },
  submission: { windowMs: 3600000, maxRequests: 10, keyPrefix: 'submit' },
  webhook: { windowMs: 60000, maxRequests: 100, keyPrefix: 'webhook' },
  report: { windowMs: 3600000, maxRequests: 5, keyPrefix: 'report' },
} as const satisfies Record<string, RateLimitConfig>;

// ============================================
// Turnstile Verification
// ============================================

export async function verifyTurnstileToken(
  token: string,
  ip?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // Only allow bypass if explicitly enabled via env var (never NODE_ENV)
    if (process.env.TURNSTILE_BYPASS_DEV === 'true') {
      return { success: true };
    }
    return { success: false, error: 'Turnstile not configured' };
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result['error-codes']?.join(', ') || 'Verification failed' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// Hash utilities - Web Crypto API
// ============================================

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}