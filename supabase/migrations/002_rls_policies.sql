-- 002_rls_policies.sql
-- Hyderabad Rent MVP - Row Level Security Policies
-- Run order: 2 (after 001_initial_schema.sql)

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE seek_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_introductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper functions for RLS policies
-- ============================================

-- Get current user identity from JWT claims
CREATE OR REPLACE FUNCTION current_identity_id()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin';
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user owns the resource
CREATE OR REPLACE FUNCTION is_owner(resource_owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_identity_id() = resource_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- identities policies
-- ============================================

-- Users can read their own identity
CREATE POLICY identities_select_own ON identities
    FOR SELECT USING (id = current_identity_id());

-- Users can update their own identity (limited fields)
CREATE POLICY identities_update_own ON identities
    FOR UPDATE USING (id = current_identity_id())
    WITH CHECK (id = current_identity_id());

-- Service role (server) can do anything - handled by bypassing RLS
-- No policies needed for service role

-- ============================================
-- rent_pins policies
-- ============================================

-- Public: read approved pins (anonymized, jittered coords only)
CREATE POLICY rent_pins_public_read ON rent_pins
    FOR SELECT USING (status = 'approved');

-- Owner (submitter): read own pins including pending
CREATE POLICY rent_pins_owner_read ON rent_pins
    FOR SELECT USING (submitted_by = current_identity_id());

-- Owner: insert new pins
CREATE POLICY rent_pins_insert ON rent_pins
    FOR INSERT WITH CHECK (submitted_by = current_identity_id());

-- Owner: update own pending pins
CREATE POLICY rent_pins_owner_update ON rent_pins
    FOR UPDATE USING (submitted_by = current_identity_id() AND status = 'pending')
    WITH CHECK (submitted_by = current_identity_id());

-- Admins: full access
CREATE POLICY rent_pins_admin_all ON rent_pins
    FOR ALL USING (is_admin());

-- ============================================
-- listings policies
-- ============================================

-- Public: read approved listings
CREATE POLICY listings_public_read ON listings
    FOR SELECT USING (status = 'approved');

-- Owner: read own listings (all statuses)
CREATE POLICY listings_owner_read ON listings
    FOR SELECT USING (owner_id = current_identity_id());

-- Owner: insert new listing
CREATE POLICY listings_insert ON listings
    FOR INSERT WITH CHECK (owner_id = current_identity_id());

-- Owner: update own pending/approved listings
CREATE POLICY listings_owner_update ON listings
    FOR UPDATE USING (owner_id = current_identity_id() AND status IN ('pending', 'approved'))
    WITH CHECK (owner_id = current_identity_id());

-- Admins: full access
CREATE POLICY listings_admin_all ON listings
    FOR ALL USING (is_admin());

-- ============================================
-- listing_private policies - NO PUBLIC ACCESS
-- ============================================

-- Owner: read own private data
CREATE POLICY listing_private_owner_read ON listing_private
    FOR SELECT USING (
        listing_id IN (SELECT id FROM listings WHERE owner_id = current_identity_id())
    );

-- Owner: insert private data when creating listing
CREATE POLICY listing_private_insert ON listing_private
    FOR INSERT WITH CHECK (
        listing_id IN (SELECT id FROM listings WHERE owner_id = current_identity_id())
    );

-- Owner: update own private data
CREATE POLICY listing_private_owner_update ON listing_private
    FOR UPDATE USING (
        listing_id IN (SELECT id FROM listings WHERE owner_id = current_identity_id())
    )
    WITH CHECK (
        listing_id IN (SELECT id FROM listings WHERE owner_id = current_identity_id())
    );

-- Admins: full access
CREATE POLICY listing_private_admin_all ON listing_private
    FOR ALL USING (is_admin());

-- ============================================
-- seek_requests policies
-- ============================================

-- Seeker: read own requests
CREATE POLICY seek_requests_owner_read ON seek_requests
    FOR SELECT USING (seeker_id = current_identity_id());

-- Seeker: insert own request
CREATE POLICY seek_requests_insert ON seek_requests
    FOR INSERT WITH CHECK (seeker_id = current_identity_id());

-- Seeker: update own pending/approved requests
CREATE POLICY seek_requests_owner_update ON seek_requests
    FOR UPDATE USING (seeker_id = current_identity_id() AND status IN ('pending', 'approved'))
    WITH CHECK (seeker_id = current_identity_id());

-- Matching job (service role): read approved seekers for matching
-- (service role bypasses RLS)

-- Admins: full access
CREATE POLICY seek_requests_admin_all ON seek_requests
    FOR ALL USING (is_admin());

-- ============================================
-- matches policies
-- ============================================

-- Listing owner: read matches for their listings
CREATE POLICY matches_listing_owner_read ON matches
    FOR SELECT USING (
        listing_id IN (SELECT id FROM listings WHERE owner_id = current_identity_id())
    );

-- Seeker: read matches for their requests
CREATE POLICY matches_seeker_read ON matches
    FOR SELECT USING (
        seeker_id IN (SELECT id FROM seek_requests WHERE seeker_id = current_identity_id())
    );

-- System (matching job): insert matches
-- (service role bypasses RLS)

-- Admins: full access
CREATE POLICY matches_admin_all ON matches
    FOR ALL USING (is_admin());

-- ============================================
-- contact_introductions policies
-- ============================================

-- Match participants: read their introduction
CREATE POLICY contact_intro_participant_read ON contact_introductions
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM matches m
            JOIN listings l ON m.listing_id = l.id
            WHERE l.owner_id = current_identity_id()
            UNION
            SELECT m.id FROM matches m
            JOIN seek_requests s ON m.seeker_id = s.id
            WHERE s.seeker_id = current_identity_id()
        )
    );

-- Participants: update consent (respond to match)
CREATE POLICY contact_intro_participant_update ON contact_introductions
    FOR UPDATE USING (
        match_id IN (
            SELECT m.id FROM matches m
            JOIN listings l ON m.listing_id = l.id
            WHERE l.owner_id = current_identity_id()
            UNION
            SELECT m.id FROM matches m
            JOIN seek_requests s ON m.seeker_id = s.id
            WHERE s.seeker_id = current_identity_id()
        )
    )
    WITH CHECK (
        match_id IN (
            SELECT m.id FROM matches m
            JOIN listings l ON m.listing_id = l.id
            WHERE l.owner_id = current_identity_id()
            UNION
            SELECT m.id FROM matches m
            JOIN seek_requests s ON m.seeker_id = s.id
            WHERE s.seeker_id = current_identity_id()
        )
    );

-- System: insert introductions when match created
-- (service role bypasses RLS)

-- Admins: full access
CREATE POLICY contact_intro_admin_all ON contact_introductions
    FOR ALL USING (is_admin());

-- ============================================
-- reports policies
-- ============================================

-- Anyone: insert reports (rate-limited at API level)
CREATE POLICY reports_insert ON reports
    FOR INSERT WITH CHECK (TRUE);

-- Reporter: read own reports
CREATE POLICY reports_reporter_read ON reports
    FOR SELECT USING (reporter_fingerprint_hash = current_setting('request.jwt.claims', true)::jsonb ->> 'fingerprint');

-- Admins: full access
CREATE POLICY reports_admin_all ON reports
    FOR ALL USING (is_admin());

-- ============================================
-- moderation_decisions policies - ADMIN ONLY
-- ============================================

CREATE POLICY moderation_admin_all ON moderation_decisions
    FOR ALL USING (is_admin());

-- ============================================
-- email_events policies - SYSTEM/ADMIN ONLY
-- ============================================

CREATE POLICY email_events_system_all ON email_events
    FOR ALL USING (FALSE); -- No direct user access, service role bypasses RLS

-- ============================================
-- job_runs policies - SYSTEM/ADMIN ONLY
-- ============================================

CREATE POLICY job_runs_admin_all ON job_runs
    FOR ALL USING (is_admin());

-- ============================================
-- audit_events policies - IMMUTABLE, ADMIN READ ONLY
-- ============================================

CREATE POLICY audit_events_admin_read ON audit_events
    FOR SELECT USING (is_admin());

-- No INSERT/UPDATE/DELETE policies - append-only via service role

-- ============================================
-- Public views (no RLS - they're views)
-- ============================================

-- Approved rent pins for public map (anonymized, jittered coords)
CREATE OR REPLACE VIEW public_rent_pins AS
SELECT
    id,
    geom,
    rent_min,
    rent_max,
    bhk,
    furnishing,
    locality,
    created_at
FROM rent_pins
WHERE status = 'approved';

-- Approved listings for public browsing
CREATE OR REPLACE VIEW public_listings AS
SELECT
    l.id,
    l.listing_type,
    l.title,
    l.description,
    l.bhk,
    l.furnishing,
    l.rent,
    l.deposit_months,
    l.maintenance_included,
    l.locality,
    l.geom,
    l.available_from,
    l.available_until,
    l.amenities,
    l.lifestyle_prefs,
    l.created_at,
    l.view_count
FROM listings l
WHERE l.status = 'approved';

-- Locality aggregates (pre-computed)
CREATE OR REPLACE VIEW public_locality_stats AS
SELECT
    locality,
    COUNT(*) AS total_listings,
    COUNT(*) FILTER (WHERE listing_type = 'whole_flat') AS whole_flat_count,
    COUNT(*) FILTER (WHERE listing_type = 'room_flatmate') AS room_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rent) AS median_rent,
    MIN(rent) AS min_rent,
    MAX(rent) AS max_rent,
    AVG(rent)::INTEGER AS avg_rent,
    COUNT(DISTINCT bhk) AS bhk_variety,
    MAX(updated_at) AS last_updated
FROM listings
WHERE status = 'approved'
GROUP BY locality
HAVING COUNT(*) >= 5; -- Only show localities with sufficient data

-- City-wide counters
CREATE OR REPLACE VIEW public_city_stats AS
SELECT
    (SELECT COUNT(*) FROM rent_pins WHERE status = 'approved') AS total_rent_pins,
    (SELECT COUNT(*) FROM listings WHERE status = 'approved') AS total_listings,
    (SELECT COUNT(*) FROM seek_requests WHERE status = 'approved') AS total_seekers,
    (SELECT COUNT(*) FROM matches WHERE status IN ('accepted', 'introduced')) AS total_matches;

GRANT SELECT ON public_rent_pins TO anon, authenticated;
GRANT SELECT ON public_listings TO anon, authenticated;
GRANT SELECT ON public_locality_stats TO anon, authenticated;
GRANT SELECT ON public_city_stats TO anon, authenticated;