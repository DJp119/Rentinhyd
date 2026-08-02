// src/lib/supabase.ts
// Supabase client (server-side only with service role)

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side client with service role (bypasses RLS)
function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // During `next build` there is no DB access; return a mock so the build
    // succeeds. At runtime we MUST fail-closed — never silently downgrade to
    // the anon key, because that turns service-role writes into RLS-gated
    // writes that silently no-op.
    if (isBuildPhase()) {
      return createMockClient();
    }
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required at runtime. ' +
      'Set it in your environment (do NOT use NEXT_PUBLIC_SUPABASE_ANON_KEY as a fallback).'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Client-side / edge client with anon key (respects RLS)
function getSupabaseAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // SECURITY: the anon key is the only key that may reach the browser.
  // Never fall back to the service-role key here — it bypasses all RLS.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (isBuildPhase()) {
      return createMockClient();
    }
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is required for the anon client. ' +
      'Do NOT fall back to SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(url, anonKey);
}

function isBuildPhase(): boolean {
  // `next build` runs in Node with no incoming requests. The mock client is
  // only safe during build — never at runtime. Be conservative: require an
  // explicit opt-in env so a misconfigured prod host can't accidentally serve
  // mock data.
  return process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-development-server-build' ||
    process.env.NODE_ENV === 'production' && process.env.SUPABASE_BUILD_FALLBACK === 'true';
}

function createMockClient(): SupabaseClient {
  // Create a minimal mock that returns empty results
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Mock' } })
            })
          })
        }),
        in: () => ({
          single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null })
        }),
        limit: () => Promise.resolve({ data: [], error: null })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Mock' } })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null })
      }),
    }),
    rpc: () => Promise.resolve({ data: [], error: null }),
  } as unknown as SupabaseClient;
  return mockClient;
}

// Lazy-evaluated singleton to avoid module-level throwing during build
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  if (typeof window === 'undefined') {
    _supabase = getSupabaseServiceClient();
  } else {
    _supabase = getSupabaseAnonClient();
  }
  return _supabase;
}

// Per-request USER-SCOPED client (H2 fix)
// --------------------------------------------
// Routes that mutate end-user-owned rows should use this instead of the
// module-level service-role singleton, so RLS actually gates the write.
// Pass the user's access token; the client sends it as the PostgREST JWT,
// making `request.jwt.claims` inside RLS policies resolve to this user.
//
// Until full Supabase Auth cookies land, callers may pass a synthetic JWT
// derived from a verified identity id via `identityJwt()` below — and only
// for routes that already verified the user via a signed email token. This
// keeps server-side RLS enforcement as defense-in-depth on top of route
// checks.
export async function getSupabaseForUser(accessToken: string): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (isBuildPhase()) return createMockClient();
    throw new Error('Supabase URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for the user-scoped client');
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Minimal synthetic JWT for the interim (no @supabase/ssr yet). Signs a
// payload `{ sub: identityId, role: 'authenticated' }` using HMAC-SHA256
// and SUPABASE_JWT_SECRET (the project's Supabase JWT secret). Use this
// only to gate an already-verified identity's server-side RLS — never
// accept it from a client.
export async function identityJwt(identityId: string): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET is required for identityJwt');

  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: identityId, role: 'authenticated', iat: now, exp: now + 60 };
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signingInput}.${sigB64}`;
}

// Export supabase as a getter for backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabase();
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// ============================================
// Helper functions for common queries
// ============================================

export async function getIdentityByEmail(email: string) {
  const { data, error } = await supabase
    .from('identities')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createIdentity(email: string, ipFingerprintHash?: string) {
  const { data, error } = await supabase
    .from('identities')
    .insert({
      email: email.toLowerCase(),
      ip_fingerprint_hash: ipFingerprintHash,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getListingWithPrivate(listingId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_private (*)
    `)
    .eq('id', listingId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getSeekerRequest(seekerId: string) {
  const { data, error } = await supabase
    .from('seek_requests')
    .select('*')
    .eq('id', seekerId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getMatchWithDetails(matchId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      listings (*),
      seek_requests (*)
    `)
    .eq('id', matchId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function logAuditEvent(event: {
  event_type: string;
  actor_type: 'user' | 'system' | 'admin' | 'webhook';
  actor_id?: string;
  target_type?: string;
  target_id?: string;
  payload: Record<string, unknown>;
  ip_fingerprint_hash?: string;
  user_agent?: string;
}) {
  const { error } = await supabase
    .from('audit_events')
    .insert(event);

  if (error) {
    // Log but don't throw - audit should never break main flow
    console.error('Audit log failed:', error);
  }
}

// ============================================
// RPC Wrappers for locality & privacy (replaces LOCALITY_BOUNDS in utils.ts)
// ============================================

/**
 * Get locality name from coordinates using DB function.
 * Falls back to 'gachibowli' if DB unavailable.
 */
export async function getLocalityFromPoint(lon: number, lat: number): Promise<string> {
  const { data, error } = await supabase.rpc('get_locality_from_point', {
    lon,
    lat
  });

  if (error || !data) {
    // Fallback to default
    return 'gachibowli';
  }
  return data;
}

/**
 * Apply privacy jitter using DB function.
 * Falls back to no-op if DB unavailable.
 */
export async function applyPrivacyJitter(lon: number, lat: number, maxMeters: number = 200): Promise<[number, number]> {
  const { data, error } = await supabase.rpc('apply_privacy_jitter', {
    geom: `POINT(${lon} ${lat})`,
    max_meters: maxMeters
  });

  if (error || !data) {
    // Fallback: return original coordinates
    return [lon, lat];
  }

  // Parse WKT POINT(lon lat)
  const match = data.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (match) {
    return [parseFloat(match[1]), parseFloat(match[2])];
  }
  return [lon, lat];
}