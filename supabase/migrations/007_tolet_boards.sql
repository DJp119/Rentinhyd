-- 007_tolet_boards.sql
-- Create tolet_boards table, indexes, RPC, bucket and security policies

-- Create tolet_boards table
CREATE TABLE IF NOT EXISTS tolet_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geom geography(Point, 4326) NOT NULL,
    locality TEXT NOT NULL,
    image_path TEXT NOT NULL,
    phone_encrypted TEXT NOT NULL,
    status listing_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES identities(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    report_count INTEGER NOT NULL DEFAULT 0,
    ip_fingerprint_hash TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE tolet_boards ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS tolet_boards_geom_gist ON tolet_boards USING GiST(geom);
CREATE INDEX IF NOT EXISTS tolet_boards_status_idx ON tolet_boards(status);
CREATE INDEX IF NOT EXISTS tolet_boards_expires_at_idx ON tolet_boards(expires_at);

-- Create tolet-boards storage bucket (private, only service role can upload/delete)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tolet-boards', 'tolet-boards', false)
ON CONFLICT (id) DO NOTHING;

-- RPC to get approved To-Let boards in BBox
CREATE OR REPLACE FUNCTION get_tolet_boards_in_bbox(
    min_lon DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lon DOUBLE PRECISION,
    max_lat DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    longitude DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    locality TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        ST_X(t.geom::geometry)::double precision as longitude,
        ST_Y(t.geom::geometry)::double precision as latitude,
        t.locality
    FROM tolet_boards t
    WHERE t.status = 'approved'
      AND t.expires_at > NOW()
      AND ST_X(t.geom::geometry) BETWEEN min_lon AND max_lon
      AND ST_Y(t.geom::geometry) BETWEEN min_lat AND max_lat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for RPC
GRANT EXECUTE ON FUNCTION get_tolet_boards_in_bbox TO anon, authenticated;

-- Policies for tolet_boards table
CREATE POLICY tolet_boards_admin_all ON tolet_boards
    FOR ALL USING (is_admin());

-- Redefine cleanup_expired_records to include tolet_boards expiry
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void AS $$
BEGIN
    -- Expire old rent pins
    UPDATE rent_pins SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW();
    UPDATE rent_pins SET status = 'expired' WHERE status = 'approved' AND expires_at < NOW();

    -- Expire old listings
    UPDATE listings SET status = 'expired' WHERE status IN ('pending', 'approved') AND expires_at < NOW();

    -- Expire old seek requests
    UPDATE seek_requests SET status = 'expired' WHERE status IN ('pending', 'approved') AND expires_at < NOW();

    -- Expire old matches
    UPDATE matches SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW();

    -- Expire old contact introductions
    UPDATE contact_introductions
    SET status = 'expired'
    WHERE status = 'pending' AND token_expires_at < NOW();

    -- Expire old To-Let boards
    UPDATE tolet_boards SET status = 'expired' WHERE status IN ('pending', 'approved') AND expires_at < NOW();

    -- Delete raw inbound email content older than 30 days (unless tied to unresolved report)
    UPDATE email_events
    SET body_encrypted = NULL
    WHERE direction = 'inbound'
    AND created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
        SELECT 1 FROM reports r
        WHERE r.target_type = 'email' AND r.target_id = email_events.id AND r.status = 'pending'
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tolet_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tolet_boards_updated_at
    BEFORE UPDATE ON tolet_boards
    FOR EACH ROW
    EXECUTE FUNCTION update_tolet_boards_updated_at();
