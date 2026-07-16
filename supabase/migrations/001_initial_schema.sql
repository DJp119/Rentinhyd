-- 001_initial_schema.sql
-- Hyderabad Rent MVP - Initial Database Schema
-- Run order: 1

-- Enable PostGIS for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Enum Types
-- ============================================

CREATE TYPE listing_status AS ENUM ('pending', 'approved', 'quarantined', 'expired', 'rented');
CREATE TYPE listing_type AS ENUM ('whole_flat', 'room_flatmate');
CREATE TYPE furnishing_status AS ENUM ('unfurnished', 'semi_furnished', 'fully_furnished');
CREATE TYPE seeker_status AS ENUM ('pending', 'approved', 'matched', 'expired');
CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'introduced');
CREATE TYPE introduction_status AS ENUM ('pending', 'completed', 'withdrawn');
CREATE TYPE report_reason AS ENUM ('fake', 'broker', 'scam', 'inappropriate', 'other');
CREATE TYPE moderation_action AS ENUM ('quarantine', 'approve', 'ban', 'delete', 'warn');
CREATE TYPE verification_method AS ENUM ('email', 'phone');

-- ============================================
-- identities table - verified email identities
-- ============================================

CREATE TABLE identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    -- Abuse tracking
    abuse_score INTEGER NOT NULL DEFAULT 0,
    abuse_flags JSONB NOT NULL DEFAULT '[]',
    -- Salted IP fingerprint for rate limiting (not raw IP)
    ip_fingerprint_hash TEXT,
    -- Consent
    terms_accepted_at TIMESTAMPTZ,
    privacy_accepted_at TIMESTAMPTZ,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_identities_email ON identities(email);
CREATE INDEX idx_identities_verified ON identities(email_verified) WHERE email_verified = TRUE;

-- ============================================
-- rent_pins table - anonymous rent price pins on map
-- ============================================

CREATE TABLE rent_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Public approximate location (jittered ~100-200m)
    geom geography(Point, 4326) NOT NULL,
    -- Exact coordinates (private, encrypted)
    exact_geom geography(Point, 4326),
    -- Rent info
    rent_min INTEGER NOT NULL, -- in INR
    rent_max INTEGER NOT NULL,
    bhk TEXT NOT NULL, -- '1BHK', '2BHK', '3BHK', '4+BHK'
    furnishing furnishing_status NOT NULL,
    locality TEXT NOT NULL,
    -- Metadata
    submitted_by UUID REFERENCES identities(id) ON DELETE SET NULL,
    status listing_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES identities(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Abuse/moderation
    report_count INTEGER NOT NULL DEFAULT 0,
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_of UUID REFERENCES rent_pins(id) ON DELETE SET NULL
);

-- GiST index for spatial queries
CREATE INDEX idx_rent_pins_geom ON rent_pins USING GIST (geom);
CREATE INDEX idx_rent_pins_status ON rent_pins(status);
CREATE INDEX idx_rent_pins_locality ON rent_pins(locality);
CREATE INDEX idx_rent_pins_expires ON rent_pins(expires_at);

-- ============================================
-- listings table - verified whole flat and room listings
-- ============================================

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Owner identity (verified email required)
    owner_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    -- Type
    listing_type listing_type NOT NULL,
    -- Public details
    title TEXT NOT NULL,
    description TEXT,
    bhk TEXT NOT NULL,
    furnishing furnishing_status NOT NULL,
    rent INTEGER NOT NULL, -- monthly rent in INR
    deposit_months INTEGER DEFAULT 0,
    maintenance_included BOOLEAN DEFAULT FALSE,
    -- Location (public approximate)
    locality TEXT NOT NULL,
    geom geography(Point, 4326) NOT NULL, -- jittered
    -- Availability
    available_from DATE NOT NULL,
    available_until DATE,
    -- Amenities (JSON array)
    amenities JSONB NOT NULL DEFAULT '[]',
    -- Lifestyle preferences (for flatmate matching)
    lifestyle_prefs JSONB NOT NULL DEFAULT '{}', -- food, smoking, work_from_home, etc.
    -- Status
    status listing_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES identities(id) ON DELETE SET NULL,
    rented_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Abuse/moderation
    report_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_listings_geom ON listings USING GIST (geom);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_owner ON listings(owner_id);
CREATE INDEX idx_listings_locality ON listings(locality);
CREATE INDEX idx_listings_type ON listings(listing_type);
CREATE INDEX idx_listings_rent ON listings(rent);
CREATE INDEX idx_listings_available_from ON listings(available_from);

-- ============================================
-- listing_private table - PII separated from public listings
-- ============================================

CREATE TABLE listing_private (
    listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    -- Exact coordinates (encrypted)
    exact_geom geography(Point, 4326) NOT NULL,
    -- Contact info (encrypted at rest)
    contact_phone TEXT, -- encrypted
    contact_email TEXT, -- encrypted
    contact_method TEXT NOT NULL DEFAULT 'email', -- 'email', 'phone', 'both'
    -- Verification
    verification_token_hash TEXT, -- hashed one-time token
    verification_token_expires TIMESTAMPTZ,
    verification_method verification_method NOT NULL DEFAULT 'email',
    -- Owner's preferred contact times
    contact_window_start TIME, -- e.g., '09:00'
    contact_window_end TIME,   -- e.g., '21:00'
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- seek_requests table - renter/flatmate seeker requests
-- ============================================

CREATE TABLE seek_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seeker_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    -- Requirements
    max_budget INTEGER NOT NULL,
    min_budget INTEGER,
    bhk TEXT NOT NULL, -- '1BHK', '2BHK', 'room', 'any'
    listing_type listing_type NOT NULL,
    furnishing furnishing_status,
    -- Timing
    move_in_earliest DATE NOT NULL,
    move_in_latest DATE NOT NULL,
    -- Location preferences
    preferred_localities TEXT[] NOT NULL DEFAULT '{}',
    excluded_localities TEXT[] NOT NULL DEFAULT '{}',
    -- Lifestyle
    lifestyle_prefs JSONB NOT NULL DEFAULT '{}',
    -- Status
    status seeker_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES identities(id) ON DELETE SET NULL,
    matched_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seek_requests_status ON seek_requests(status);
CREATE INDEX idx_seek_requests_seeker ON seek_requests(seeker_id);
CREATE INDEX idx_seek_requests_budget ON seek_requests(max_budget);
CREATE INDEX idx_seek_requests_move_in ON seek_requests(move_in_earliest, move_in_latest);

-- ============================================
-- matches table - deterministic match results
-- ============================================

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- The two parties
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    seeker_id UUID NOT NULL REFERENCES seek_requests(id) ON DELETE CASCADE,
    -- Deterministic score components (for auditability)
    score INTEGER NOT NULL, -- 0-100
    geography_score INTEGER NOT NULL DEFAULT 0,
    budget_score INTEGER NOT NULL DEFAULT 0,
    bhk_score INTEGER NOT NULL DEFAULT 0,
    timing_score INTEGER NOT NULL DEFAULT 0,
    lifestyle_score INTEGER NOT NULL DEFAULT 0,
    -- Match metadata
    status match_status NOT NULL DEFAULT 'pending',
    matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    -- Daily digest tracking
    digest_sent_at TIMESTAMPTZ,
    digest_id UUID, -- groups matches sent in same digest
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one match per listing-seeker pair
    UNIQUE (listing_id, seeker_id)
);

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_listing ON matches(listing_id);
CREATE INDEX idx_matches_seeker ON matches(seeker_id);
CREATE INDEX idx_matches_expires ON matches(expires_at);
CREATE INDEX idx_matches_digest ON matches(digest_id);

-- ============================================
-- contact_introductions table - double-consent contact reveal
-- ============================================

CREATE TABLE contact_introductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    -- Consent tracking
    listing_owner_consent BOOLEAN NOT NULL DEFAULT FALSE,
    listing_owner_consent_at TIMESTAMPTZ,
    listing_owner_token_hash TEXT, -- hashed action token
    seeker_consent BOOLEAN NOT NULL DEFAULT FALSE,
    seeker_consent_at TIMESTAMPTZ,
    seeker_token_hash TEXT, -- hashed action token
    -- Outcome
    status introduction_status NOT NULL DEFAULT 'pending',
    introduced_at TIMESTAMPTZ,
    introduction_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    introduction_email_id TEXT, -- Resend email ID
    -- Withdrawal
    withdrawn_by UUID REFERENCES identities(id) ON DELETE SET NULL,
    withdrawn_at TIMESTAMPTZ,
    -- Tokens expire after 7 days
    token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (match_id)
);

-- ============================================
-- reports table - abuse reports
-- ============================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- What is being reported
    target_type TEXT NOT NULL, -- 'rent_pin', 'listing', 'seeker', 'match'
    target_id UUID NOT NULL,
    -- Reporter (anonymous, but rate-limited via Turnstile + IP fingerprint)
    reporter_fingerprint_hash TEXT NOT NULL,
    reporter_email_hash TEXT, -- optional, hashed
    -- Details
    reason report_reason NOT NULL,
    description TEXT,
    evidence JSONB,
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES identities(id) ON DELETE SET NULL,
    moderation_action moderation_action,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_fingerprint_hash);

-- ============================================
-- moderation_decisions table - append-only audit trail
-- ============================================

CREATE TABLE moderation_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    action moderation_action NOT NULL,
    reason TEXT,
    evidence JSONB,
    decided_by UUID REFERENCES identities(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- For audit: previous state snapshot
    previous_state JSONB
);

CREATE INDEX idx_moderation_target ON moderation_decisions(target_type, target_id);

-- ============================================
-- email_events table - inbound/outbound email tracking
-- ============================================

CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Direction
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    -- Resend IDs
    resend_id TEXT UNIQUE,
    -- Recipients
    to_email TEXT NOT NULL,
    from_email TEXT,
    -- Content (encrypted for inbound, optional for outbound)
    subject TEXT,
    body_hash TEXT, -- hash of body for idempotency
    body_encrypted TEXT, -- encrypted full body (inbound only, deleted after 30 days unless report)
    -- Classification
    email_type TEXT NOT NULL, -- 'verification', 'digest', 'introduction', 'command', 'notification'
    command_parsed TEXT, -- 'rented', 'still_available', 'withdraw', 'ambiguous'
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'bounced', 'failed', 'processed'
    error_message TEXT,
    -- Tracking
    related_type TEXT, -- 'match', 'listing', 'seeker', 'identity'
    related_id UUID,
    -- Idempotency
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_email_events_idempotency ON email_events(idempotency_key);
CREATE INDEX idx_email_events_related ON email_events(related_type, related_id);
CREATE INDEX idx_email_events_direction ON email_events(direction);
CREATE INDEX idx_email_events_status ON email_events(status);

-- ============================================
-- job_runs table - scheduled job tracking
-- ============================================

CREATE TABLE job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL, -- 'daily_match', 'cleanup_expired', 'aggregate_stats'
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    items_processed INTEGER DEFAULT 0,
    items_succeeded INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_job_runs_name ON job_runs(job_name);
CREATE INDEX idx_job_runs_status ON job_runs(status);

-- ============================================
-- audit_events table - immutable append-only audit log
-- ============================================

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL, -- 'user', 'system', 'admin', 'webhook'
    actor_id UUID,
    target_type TEXT,
    target_id UUID,
    payload JSONB NOT NULL,
    ip_fingerprint_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable: no UPDATE/DELETE policies
CREATE INDEX idx_audit_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_actor ON audit_events(actor_type, actor_id);
CREATE INDEX idx_audit_target ON audit_events(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_events(created_at);

-- ============================================
-- Updated timestamp trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON identities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rent_pins_updated_at BEFORE UPDATE ON rent_pins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_private_updated_at BEFORE UPDATE ON listing_private FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seek_requests_updated_at BEFORE UPDATE ON seek_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_introductions_updated_at BEFORE UPDATE ON contact_introductions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Cleanup function for expired records
-- ============================================

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