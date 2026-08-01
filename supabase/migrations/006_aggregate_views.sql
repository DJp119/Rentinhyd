-- 006_aggregate_views.sql
-- Public aggregate views for city stats and locality stats
-- Run order: 6 (after 005_verification_tokens.sql)

-- ============================================
-- City-wide Statistics View (camelCase to match TS interfaces)
-- ============================================

DROP VIEW IF EXISTS public_city_stats;

CREATE VIEW public_city_stats AS
SELECT
    (SELECT COUNT(*) FROM rent_pins WHERE status = 'approved') as "totalRentPins",
    (SELECT COUNT(*) FROM listings WHERE status = 'approved') as "totalListings",
    (SELECT COUNT(*) FROM seek_requests WHERE status = 'approved') as "totalSeekers",
    (SELECT COUNT(*) FROM matches WHERE status IN ('accepted', 'introduced')) as "totalMatches";

GRANT SELECT ON public_city_stats TO anon, authenticated;

-- ============================================
-- Locality Statistics View (camelCase to match TS interfaces)
-- ============================================

DROP VIEW IF EXISTS public_locality_stats;

CREATE VIEW public_locality_stats AS
WITH stats AS (
    SELECT
        l.locality,
        COUNT(*) as "totalListings",
        COUNT(*) FILTER (WHERE l.listing_type = 'whole_flat') as "wholeFlatCount",
        COUNT(*) FILTER (WHERE l.listing_type = 'room_flatmate') as "roomCount",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY l.rent)::numeric as "medianRent",
        MIN(l.rent) as "minRent",
        MAX(l.rent) as "maxRent",
        ROUND(AVG(l.rent))::numeric as "avgRent",
        COUNT(DISTINCT l.bhk) as "bhkVariety",
        COUNT(*) as "sampleSize",
        MAX(l.updated_at) as "lastUpdated",
        jsonb_agg(DISTINCT jsonb_build_object('name', a, 'count', amenity_count)) FILTER (WHERE amenity_count IS NOT NULL) as "commonAmenities"
    FROM listings l
    CROSS JOIN LATERAL (
        SELECT jsonb_array_elements_text(l.amenities) as a
    ) am
    CROSS JOIN LATERAL (
        SELECT COUNT(*) as amenity_count FROM jsonb_array_elements_text(l.amenities) ae WHERE ae.value = am.a
    ) ac
    WHERE l.status = 'approved'
    GROUP BY l.locality
)
SELECT
    locality,
    "totalListings",
    "wholeFlatCount",
    "roomCount",
    "medianRent",
    "minRent",
    "maxRent",
    "avgRent",
    "bhkVariety",
    "sampleSize",
    "lastUpdated"::text,
    COALESCE("commonAmenities", '[]'::jsonb) as "commonAmenities"
FROM stats;

GRANT SELECT ON public_locality_stats TO anon, authenticated;

-- ============================================
-- Index on listings for locality stats performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_listings_locality_status_rent ON listings(locality, status, rent);
CREATE INDEX IF NOT EXISTS idx_listings_locality_status_type ON listings(locality, status, listing_type);