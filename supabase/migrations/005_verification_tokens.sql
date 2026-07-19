-- 005_verification_tokens.sql
-- Verification Tokens Table for secure email verification
-- Run order: 5 (after 004_rpc_functions.sql)

-- ============================================
-- Verification Tokens Table
-- ============================================

CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('identity', 'listing', 'seeker')),
    resource_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- Unique index on token_hash for fast lookup and deduplication
CREATE UNIQUE INDEX verification_tokens_token_hash_key ON verification_tokens (token_hash);

-- Index for resource-based queries
CREATE INDEX verification_tokens_resource_idx ON verification_tokens (resource_type, resource_id);

-- Index for cleanup of expired tokens
CREATE INDEX verification_tokens_expires_at_idx ON verification_tokens (expires_at);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access verification tokens
CREATE POLICY "Service role full access" ON verification_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Anonymous users can insert (for creating tokens) but not read
CREATE POLICY "Anon can insert tokens" ON verification_tokens
    FOR INSERT TO anon WITH CHECK (true);

-- ============================================
-- Cleanup Function
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM verification_tokens
    WHERE expires_at < NOW()
       OR consumed_at IS NOT NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_expired_verification_tokens TO service_role;

-- ============================================
-- Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON verification_tokens TO anon, authenticated;