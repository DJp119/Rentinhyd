-- 003_seed_data.sql
-- Hyderabad Rent MVP - Seed Data (Localities, Metro, Defaults)
-- Run order: 3 (after 002_rls_policies.sql)

-- ============================================
-- Seed localities with GeoJSON boundaries and centroids
-- ============================================

-- Create localities reference table for validation and UI
CREATE TABLE IF NOT EXISTS localities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    -- Approximate centroid for map centering
    centroid geography(Point, 4326) NOT NULL,
    -- Bounding box for viewport queries
    bbox geometry(Polygon, 4326),
    -- Metro station proximity
    nearest_metro_station TEXT,
    metro_distance_meters INTEGER,
    -- Display order
    sort_order INTEGER DEFAULT 0,
    is_seed_locality BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE localities ENABLE ROW LEVEL SECURITY;
CREATE POLICY localities_public_read ON localities FOR SELECT USING (TRUE);

-- Seed 8 initial localities (Gachibowli–Madhapur–Kondapur–Financial District corridor)
INSERT INTO localities (name, display_name, centroid, bbox, nearest_metro_station, metro_distance_meters, sort_order, is_seed_locality) VALUES
-- Gachibowli
('gachibowli', 'Gachibowli',
    ST_SetSRID(ST_MakePoint(78.3483, 17.4399), 4326)::geography,
    ST_MakeEnvelope(78.32, 17.42, 78.38, 17.46, 4326),
    'Gachibowli', 500, 1, TRUE),

-- Madhapur
('madhapur', 'Madhapur',
    ST_SetSRID(ST_MakePoint(78.3808, 17.4499), 4326)::geography,
    ST_MakeEnvelope(78.35, 17.43, 78.41, 17.47, 4326),
    'Madhapur', 300, 2, TRUE),

-- Kondapur
('kondapur', 'Kondapur',
    ST_SetSRID(ST_MakePoint(78.3536, 17.4617), 4326)::geography,
    ST_MakeEnvelope(78.33, 17.44, 78.38, 17.48, 4326),
    'Kondapur', 400, 3, TRUE),

-- HITEC City
('hitec-city', 'HITEC City',
    ST_SetSRID(ST_MakePoint(78.3783, 17.4435), 4326)::geography,
    ST_MakeEnvelope(78.35, 17.42, 78.40, 17.46, 4326),
    'HITEC City', 200, 4, TRUE),

-- Financial District
('financial-district', 'Financial District',
    ST_SetSRID(ST_MakePoint(78.3387, 17.4250), 4326)::geography,
    ST_MakeEnvelope(78.31, 17.40, 78.37, 17.45, 4326),
    'Financial District', 600, 5, TRUE),

-- Manikonda
('manikonda', 'Manikonda',
    ST_SetSRID(ST_MakePoint(78.3650, 17.4050), 4326)::geography,
    ST_MakeEnvelope(78.34, 17.38, 78.39, 17.43, 4326),
    'Raikheda', 800, 6, TRUE),

-- Narsingi
('narsingi', 'Narsingi',
    ST_SetSRID(ST_MakePoint(78.3150, 17.4100), 4326)::geography,
    ST_MakeEnvelope(78.29, 17.39, 78.34, 17.43, 4326),
    'Narsingi', 1000, 7, TRUE),

-- Hafeezpet
('hafeezpet', 'Hafeezpet',
    ST_SetSRID(ST_MakePoint(78.3700, 17.4800), 4326)::geography,
    ST_MakeEnvelope(78.34, 17.46, 78.39, 17.50, 4326),
    'Hafeezpet', 500, 8, TRUE)

ON CONFLICT (name) DO NOTHING;

-- Additional localities (non-seed, for future expansion)
INSERT INTO localities (name, display_name, centroid, nearest_metro_station, sort_order, is_seed_locality) VALUES
('jubilee-hills', 'Jubilee Hills', ST_SetSRID(ST_MakePoint(78.4083, 17.4325), 4326)::geography, 'Jubilee Hills Check Post', 9, FALSE),
('banjara-hills', 'Banjara Hills', ST_SetSRID(ST_MakePoint(78.4200, 17.4180), 4326)::geography, 'Banjara Hills', 10, FALSE),
('kukatpally', 'Kukatpally', ST_SetSRID(ST_MakePoint(78.4400, 17.4900), 4326)::geography, 'KPHB Colony', 11, FALSE),
('miyapur', 'Miyapur', ST_SetSRID(ST_MakePoint(78.3500, 17.5000), 4326)::geography, 'Miyapur', 12, FALSE),
('gachibowli-ext', 'Gachibowli Extension', ST_SetSRID(ST_MakePoint(78.3200, 17.4150), 4326)::geography, 'Financial District', 13, FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Seed metro lines as GeoJSON (for map overlay)
-- ============================================

CREATE TABLE IF NOT EXISTS metro_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- Hex color for map display
    geom geometry(LineString, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE metro_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY metro_lines_public_read ON metro_lines FOR SELECT USING (TRUE);

-- Hyderabad Metro corridors (approximate)
-- Red Line: Miyapur ↔ LB Nagar
INSERT INTO metro_lines (name, color, geom) VALUES
('Red Line', '#E53935',
    ST_GeomFromText('LINESTRING(
        78.3500 17.5000,  -- Miyapur
        78.3550 17.4950,  -- JNTU College
        78.3650 17.4850,  -- KPHB Colony
        78.3750 17.4750,  -- Kukatpally
        78.3850 17.4650,  -- Balanagar
        78.3900 17.4550,  -- Moosapet
        78.3950 17.4450,  -- Bharat Nagar
        78.4000 17.4350,  -- Erragadda
        78.4083 17.4325,  -- Jubilee Hills Check Post
        78.4150 17.4250,  -- Peddamma Temple
        78.4200 17.4180,  -- Banjara Hills
        78.4250 17.4100,  -- Ameerpet
        78.4300 17.4000,  -- Punjagutta
        78.4350 17.3900,  -- Irrum Manzil
        78.4400 17.3800,  -- Khairatabad
        78.4450 17.3700,  -- Lakdi-ka-pul
        78.4500 17.3600,  -- Assembly
        78.4550 17.3500,  -- Nampally
        78.4600 17.3400,  -- Gandhi Bhavan
        78.4650 17.3300,  -- Osmania Medical College
        78.4700 17.3200,  -- MG Bus Station
        78.4750 17.3100,  -- Sultan Bazar
        78.4800 17.3000,  -- Malakpet
        78.4850 17.2900,  -- New Market
        78.4900 17.2800,  -- Musarambagh
        78.4950 17.2700,  -- Dilsukhnagar
        78.5000 17.2600,  -- Chaitanyapuri
        78.5050 17.2500,  -- Victoria Memorial
        78.5100 17.2400   -- LB Nagar
    )', 4326)),

-- Blue Line: Nagole ↔ Raidurg
('Blue Line', '#1E88E5',
    ST_GeomFromText('LINESTRING(
        78.5500 17.3400,  -- Nagole
        78.5400 17.3500,  -- Uppal
        78.5300 17.3600,  -- Survey of India
        78.5200 17.3700,  -- Habsiguda
        78.5100 17.3800,  -- Tarnaka
        78.5000 17.3900,  -- Mettuguda
        78.4900 17.4000,  -- Secunderabad East
        78.4800 17.4100,  -- Paradise
        78.4700 17.4200,  -- Parade Ground
        78.4600 17.4300,  -- Secunderabad West
        78.4500 17.4400,  -- Gandhi Hospital
        78.4400 17.4500,  -- Musheerabad
        78.4300 17.4550,  -- RTC X Roads
        78.4250 17.4600,  -- Chikkadpally
        78.4200 17.4650,  -- Narayanaguda
        78.4150 17.4700,  -- Sultan Bazar
        78.4250 17.4100,  -- Ameerpet (interchange)
        78.4150 17.4200,  -- S R Nagar
        78.4050 17.4300,  -- ESI Hospital
        78.3950 17.4400,  -- Bharat Nagar
        78.3850 17.4500,  -- Erragadda
        78.3800 17.4450,  -- Moosapet
        78.3750 17.4400,  -- Dr. B R Ambedkar Balanagar
        78.3700 17.4350,  -- Kukatpally
        78.3650 17.4300,  -- KPHB Colony
        78.3550 17.4250,  -- JNTU College
        78.3450 17.4200,  -- Gachibowli
        78.3350 17.4150,  -- Financial District
        78.3250 17.4100   -- Raidurg
    )', 4326)),

-- Green Line: JBS Parade Ground ↔ MGBS (partial - planned/under construction)
('Green Line', '#43A047',
    ST_GeomFromText('LINESTRING(
        78.4700 17.4200,  -- Parade Ground
        78.4650 17.4100,  -- Secunderabad
        78.4600 17.4000,  -- M G Road
        78.4550 17.3900,  -- Sultan Bazar
        78.4700 17.3200   -- MG Bus Station
    )', 4326))

ON CONFLICT DO NOTHING;

-- ============================================
-- Seed metro stations
-- ============================================

CREATE TABLE IF NOT EXISTS metro_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID REFERENCES metro_lines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    geom geography(Point, 4326) NOT NULL,
    locality TEXT,
    is_interchange BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE metro_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY metro_stations_public_read ON metro_stations FOR SELECT USING (TRUE);

-- Key stations for seed localities
INSERT INTO metro_stations (line_id, name, geom, locality, is_interchange) VALUES
-- Red Line stations near seed localities
((SELECT id FROM metro_lines WHERE name = 'Red Line'), 'Gachibowli', ST_SetSRID(ST_MakePoint(78.3483, 17.4399), 4326)::geography, 'gachibowli', FALSE),
((SELECT id FROM metro_lines WHERE name = 'Red Line'), 'HITEC City', ST_SetSRID(ST_MakePoint(78.3783, 17.4435), 4326)::geography, 'hitec-city', FALSE),
((SELECT id FROM metro_lines WHERE name = 'Red Line'), 'Madhapur', ST_SetSRID(ST_MakePoint(78.3808, 17.4499), 4326)::geography, 'madhapur', FALSE),
((SELECT id FROM metro_lines WHERE name = 'Red Line'), 'Kondapur', ST_SetSRID(ST_MakePoint(78.3536, 17.4617), 4326)::geography, 'kondapur', FALSE),
((SELECT id FROM metro_lines WHERE name = 'Red Line'), 'Financial District', ST_SetSRID(ST_MakePoint(78.3387, 17.4250), 4326)::geography, 'financial-district', FALSE),
((SELECT id FROM metro_lines WHERE name = 'Red Line'), 'Raidurg', ST_SetSRID(ST_MakePoint(78.3200, 17.4100), 4326)::geography, 'financial-district', TRUE),
((SELECT id FROM metro_lines WHERE name = 'Red Line'), 'Ameerpet', ST_SetSRID(ST_MakePoint(78.4250, 17.4100), 4326)::geography, 'ameerpet', TRUE),

-- Blue Line stations
((SELECT id FROM metro_lines WHERE name = 'Blue Line'), 'Gachibowli', ST_SetSRID(ST_MakePoint(78.3483, 17.4399), 4326)::geography, 'gachibowli', TRUE),
((SELECT id FROM metro_lines WHERE name = 'Blue Line'), 'HITEC City', ST_SetSRID(ST_MakePoint(78.3783, 17.4435), 4326)::geography, 'hitec-city', TRUE),
((SELECT id FROM metro_lines WHERE name = 'Blue Line'), 'Madhapur', ST_SetSRID(ST_MakePoint(78.3808, 17.4499), 4326)::geography, 'madhapur', FALSE),
((SELECT id FROM metro_lines WHERE name = 'Blue Line'), 'Kondapur', ST_SetSRID(ST_MakePoint(78.3536, 17.4617), 4326)::geography, 'kondapur', FALSE),
((SELECT id FROM metro_lines WHERE name = 'Blue Line'), 'Financial District', ST_SetSRID(ST_MakePoint(78.3387, 17.4250), 4326)::geography, 'financial-district', FALSE),
((SELECT id FROM metro_lines WHERE name = 'Blue Line'), 'Raidurg', ST_SetSRID(ST_MakePoint(78.3200, 17.4100), 4326)::geography, 'financial-district', TRUE),
((SELECT id FROM metro_lines WHERE name = 'Blue Line'), 'Ameerpet', ST_SetSRID(ST_MakePoint(78.4250, 17.4100), 4326)::geography, 'ameerpet', TRUE)

ON CONFLICT DO NOTHING;

-- ============================================
-- Create function to get locality from coordinates
-- ============================================

CREATE OR REPLACE FUNCTION get_locality_from_point(lon DOUBLE PRECISION, lat DOUBLE PRECISION)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT l.name INTO result
    FROM localities l
    WHERE ST_Contains(l.bbox, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
    ORDER BY l.sort_order
    LIMIT 1;

    IF result IS NULL THEN
        -- Fallback: find nearest locality centroid
        SELECT l.name INTO result
        FROM localities l
        ORDER BY l.centroid <-> ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
        LIMIT 1;
    END IF;

    RETURN COALESCE(result, 'unknown');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

-- ============================================
-- Create function to apply privacy jitter (~100-200m)
-- ============================================

CREATE OR REPLACE FUNCTION apply_privacy_jitter(geom geography(Point), max_meters INTEGER DEFAULT 200)
RETURNS geography(Point) AS $$
DECLARE
    angle DOUBLE PRECISION;
    distance DOUBLE PRECISION;
    lon DOUBLE PRECISION;
    lat DOUBLE PRECISION;
BEGIN
    -- Use a deterministic hash of the coordinates for consistent jitter
    -- This ensures the same point always gets the same jitter
    SELECT ST_X(geom::geometry), ST_Y(geom::geometry) INTO lon, lat;

    -- Deterministic pseudo-random based on coordinate hash
    angle := (abs(hashtext(lon::text || ',' || lat::text)) % 360) * pi() / 180.0;
    distance := (abs(hashtext(lon::text || ',' || lat::text || 'dist')) % max_meters)::DOUBLE PRECISION;

    -- Apply offset (approximate: 1 deg ≈ 111km)
    lon := lon + (distance * cos(angle)) / 111000.0 / cos(lat * pi() / 180.0);
    lat := lat + (distance * sin(angle)) / 111000.0;

    RETURN ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

-- ============================================
-- Grant permissions for anon/authenticated roles
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;