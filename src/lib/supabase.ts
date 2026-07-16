// src/lib/supabase.ts
// Supabase client (server-side only with service role)

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side client with service role (bypasses RLS)
function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Return mock client for build-time
    return createMockClient();
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Return mock client for build-time
    return createMockClient();
  }

  return createClient(url, anonKey);
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
      rpc: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Mock' } }),
    })
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