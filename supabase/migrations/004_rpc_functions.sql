-- 004_rpc_functions.sql
-- Hyderabad Rent MVP - Supabase RPC Functions
-- Run order: 4 (after 003_seed_data.sql)

-- ============================================
-- Rent Pins in Bbox (with clustering)
-- ============================================

CREATE OR REPLACE FUNCTION get_pins_in_bbox(
    min_lon DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lon DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    status_filter TEXT DEFAULT 'approved',
    cluster BOOLEAN DEFAULT FALSE,
    zoom_level INTEGER DEFAULT 12
)
RETURNS TABLE (
    id UUID,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    rent_min INTEGER,
    rent_max INTEGER,
    bhk TEXT,
    furnishing TEXT,
    locality TEXT,
    pin_count INTEGER
) AS $$
DECLARE
    grid_size DOUBLE PRECISION;
BEGIN
    -- Calculate grid size based on zoom for clustering
    -- At zoom 12: ~0.01 deg grid (~1km), zoom 14: ~0.0025 deg
    grid_size := CASE
        WHEN zoom_level <= 10 THEN 0.05
        WHEN zoom_level <= 12 THEN 0.02
        WHEN zoom_level <= 14 THEN 0.01
        ELSE 0.005
    END;

    IF cluster AND zoom_level <= 14 THEN
        RETURN QUERY EXECUTE format($q$
            SELECT
                md5(concat(
                    floor(ST_Y(geom::geometry) / %L) * %L,
                    '_',
                    floor(ST_X(geom::geometry) / %L) * %L
                ))::uuid as id,
                (ST_Y(ST_Centroid(ST_Collect(geom::geometry)))::double precision) as lat,
                (ST_X(ST_Centroid(ST_Collect(geom::geometry)))::double precision) as lon,
                MIN(rent_min) as rent_min,
                MAX(rent_max) as rent_max,
                MODE() WITHIN GROUP (ORDER BY bhk) as bhk,
                MODE() WITHIN GROUP (ORDER BY furnishing) as furnishing,
                MODE() WITHIN GROUP (ORDER BY locality) as locality,
                COUNT(*) as pin_count
            FROM rent_pins
            WHERE status = $1
              AND ST_X(geom::geometry) BETWEEN $2 AND $3
              AND ST_Y(geom::geometry) BETWEEN $4 AND $5
            GROUP BY
                floor(ST_Y(geom::geometry) / %L) * %L,
                floor(ST_X(geom::geometry) / %L) * %L
        $q$, grid_size, grid_size, grid_size, grid_size)
        USING status_filter, min_lon, max_lon, min_lat, max_lat;
    ELSE
        RETURN QUERY EXECUTE $q$
            SELECT
                id,
                ST_Y(geom::geometry)::double precision as lat,
                ST_X(geom::geometry)::double precision as lon,
                rent_min,
                rent_max,
                bhk,
                furnishing,
                locality,
                1 as pin_count
            FROM rent_pins
            WHERE status = $1
              AND ST_X(geom::geometry) BETWEEN $2 AND $3
              AND ST_Y(geom::geometry) BETWEEN $4 AND $5
            LIMIT 500
        $q$
        USING status_filter, min_lon, max_lon, min_lat, max_lat;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Listings in Bbox
-- ============================================

CREATE OR REPLACE FUNCTION get_listings_in_bbox(
    min_lon DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lon DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    status_filter TEXT DEFAULT 'approved',
    listing_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    listing_type TEXT,
    title TEXT,
    locality TEXT,
    lon DOUBLE PRECISION,
    lat DOUBLE PRECISION,
    rent INTEGER,
    bhk TEXT,
    furnishing TEXT
) AS $$
BEGIN
    RETURN QUERY EXECUTE format($q$
        SELECT
            id,
            listing_type,
            title,
            locality,
            ST_X(geom::geometry)::double precision as lon,
            ST_Y(geom::geometry)::double precision as lat,
            rent,
            bhk,
            furnishing
        FROM listings
        WHERE status = $1
          %s
          AND ST_X(geom::geometry) BETWEEN $2 AND $3
          AND ST_Y(geom::geometry) BETWEEN $4 AND $5
        LIMIT 200
    $q$, CASE WHEN listing_type_filter IS NOT NULL THEN 'AND listing_type = $6' ELSE '' END)
    USING
        CASE WHEN listing_type_filter IS NOT NULL THEN
            ARRAY[status_filter, min_lon, max_lon, min_lat, max_lat, listing_type_filter]
        ELSE
            ARRAY[status_filter, min_lon, max_lon, min_lat, max_lat]
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Increment Report Count
-- ============================================

CREATE OR REPLACE FUNCTION increment_report_count(
    target_table TEXT,
    target_id UUID
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET report_count = report_count + 1 WHERE id = $1', target_table)
    USING target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Match Statistics
-- ============================================

CREATE OR REPLACE FUNCTION get_match_stats()
RETURNS TABLE (
    total_matches BIGINT,
    pending BIGINT,
    accepted BIGINT,
    declined BIGINT,
    introduced BIGINT,
    expired BIGINT,
    avg_score DOUBLE PRECISION,
    matches_last_7_days BIGINT,
    introductions_last_7_days BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'declined') as declined,
        COUNT(*) FILTER (WHERE status = 'introduced') as introduced,
        COUNT(*) FILTER (WHERE status = 'expired') as expired,
        AVG(score)::double precision as avg_score,
        COUNT(*) FILTER (WHERE matched_at > NOW() - INTERVAL '7 days') as matches_last_7_days,
        (SELECT COUNT(*) FROM contact_introductions WHERE status = 'completed' AND introduced_at > NOW() - INTERVAL '7 days') as introductions_last_7_days
    FROM matches;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Report Statistics
-- ============================================

CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS TABLE (
    total BIGINT,
    pending BIGINT,
    resolved BIGINT,
    by_reason JSONB,
    by_target_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        jsonb_object_agg(reason, cnt) as by_reason,
        jsonb_object_agg(target_type, cnt2) as by_target_type
    FROM (
        SELECT reason, COUNT(*) as cnt FROM reports GROUP BY reason
    ) r
    CROSS JOIN LATERAL (
        SELECT target_type, COUNT(*) as cnt2 FROM reports GROUP BY target_type
    ) t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Average Rent for Locality
-- ============================================

CREATE OR REPLACE FUNCTION get_average_rent_for_locality(
    locality TEXT
)
RETURNS TABLE (
    avg_rent DOUBLE PRECISION,
    median_rent DOUBLE PRECISION,
    sample_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        AVG(rent)::double precision,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rent)::double precision,
        COUNT(*)
    FROM listings
    WHERE status = 'approved'
      AND locality = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Count Recent Submissions by Fingerprint
-- ============================================

CREATE OR REPLACE FUNCTION count_recent_submissions_by_fingerprint(
    fingerprint TEXT,
    hours INTEGER DEFAULT 1
)
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY EXECUTE format($q$
        SELECT COUNT(*) FROM (
            SELECT created_at FROM rent_pins WHERE ip_fingerprint_hash = $1
            UNION ALL
            SELECT created_at FROM listings WHERE ip_fingerprint_hash = $1
            UNION ALL
            SELECT created_at FROM seek_requests WHERE ip_fingerprint_hash = $1
        ) s
        WHERE created_at > NOW() - ($2 || ' hours')::interval
    $q$)
    USING fingerprint, hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Count Recent Submissions by Email
-- ============================================

CREATE OR REPLACE FUNCTION count_recent_submissions_by_email(
    email_hash TEXT,
    hours INTEGER DEFAULT 1
)
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*) FROM (
        SELECT created_at FROM listings l
        JOIN identities i ON l.owner_id = i.id
        WHERE i.email = (SELECT email FROM identities WHERE email_hash = $1 LIMIT 1)
        UNION ALL
        SELECT created_at FROM seek_requests sr
        JOIN identities i ON sr.seeker_id = i.id
        WHERE i.email = (SELECT email FROM identities WHERE email_hash = $1 LIMIT 1)
    ) s
    WHERE created_at > NOW() - (hours || ' hours')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_pins_in_bbox TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_listings_in_bbox TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_report_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_match_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_report_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_average_rent_for_locality TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_recent_submissions_by_fingerprint TO service_role;
GRANT EXECUTE ON FUNCTION count_recent_submissions_by_email TO service_role;