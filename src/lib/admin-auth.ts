// src/lib/admin-auth.ts
// Signed-cookie admin session (Edge-compatible). HMAC-SHA256 over the
// admin identity id + expiry, keyed by ADMIN_SESSION_SECRET.
//
// Why not Supabase Auth: the codebase has no @supabase/ssr cookies wired
// in. This is the minimal, fail-closed guard that stops the C1/C3 PII
// leak today. When full Supabase Auth is added later, swap
// `verifyAdminSessionCookie` to read the user JWT + is_admin() RPC and
// delete the login route.

import { timingSafeEqual } from './crypto-utils';

const COOKIE_NAME = 'rh_admin_sess';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const ALG = { name: 'HMAC', hash: 'SHA-256' } as const;

function b64encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

async function hmac(secret: string, message: string): Promise<string> {
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');
  }
  const keyData = utf8(secret);
  const key = await crypto.subtle.importKey('raw', keyData.buffer as ArrayBuffer, ALG, false, ['sign']);
  const sig = await crypto.subtle.sign(ALG, key, utf8(message).buffer as ArrayBuffer);
  return b64encode(new Uint8Array(sig));
}

export interface AdminSession {
  adminId: string;
  expiresAt: number; // epoch ms
}

export async function createAdminSessionCookie(adminId: string): Promise<{ name: string; value: string; maxAge: number }> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is required to mint admin sessions');

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${adminId}.${expiresAt}`;
  const sig = await hmac(secret, payload);
  const value = `${payload}.${sig}`;
  return { name: COOKIE_NAME, value, maxAge: SESSION_TTL_MS / 1000 };
}

export async function verifyAdminSessionCookie(value: string | null | undefined): Promise<AdminSession | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null; // fail-closed
  if (!value) return null;

  const parts = value.split('.');
  // adminId may itself contain dots if we switch to non-uuid ids; for now UUIDs are dot-free.
  if (parts.length < 3) return null;
  const sig = parts[parts.length - 1];
  const expiresAtStr = parts[parts.length - 2];
  const adminId = parts.slice(0, -2).join('.');
  if (!adminId || !expiresAtStr) return null;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const expectedSig = await hmac(secret, `${adminId}.${expiresAtStr}`);
  if (!timingSafeEqual(expectedSig, sig)) return null;

  return { adminId, expiresAt };
}

export function adminCookieName(): string {
  return COOKIE_NAME;
}