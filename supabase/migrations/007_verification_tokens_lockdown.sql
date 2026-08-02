-- 007_verification_tokens_lockdown.sql
-- Security: verification_tokens must only be writable by the service role.
-- Drops the open anon INSERT policy added in 005_verification_tokens.sql
-- that let any anonymous caller mint token rows pointing at arbitrary
-- resource_id values (token-spam / resource-enumeration vector).
--
-- Run order: 7 (after 006_aggregate_views.sql)

-- Drop the open anon insert policy if it still exists.
DROP POLICY IF EXISTS "Anon can insert tokens" ON verification_tokens;

-- Revoke any direct INSERT/UPDATE grant from anon/authenticated; route all
-- writes through the service role (which bypasses RLS) or the cleanup RPC.
REVOKE INSERT, UPDATE ON verification_tokens FROM anon, authenticated;

-- Keep SELECT denied to anon/authenticated (the service-role "full access"
-- policy already gates this); tighten the previous service-role policy to
-- require service_role explicitly so we are not relying on RUS grants.
DROP POLICY IF EXISTS "Service role full access" ON verification_tokens;
CREATE POLICY "Service role full access" ON verification_tokens
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- No SELECT for anon/authenticated: tokens are server-side only.
REVOKE SELECT ON verification_tokens FROM anon, authenticated;

-- Maintained grants: only service_role may write. anon/authenticated get
-- nothing.
GRANT SELECT ON verification_tokens TO service_role;
