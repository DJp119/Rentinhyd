# Implementation Plan: hyderabad.rent MVP

## Overview

Build a mobile-first, no-account rental marketplace for verified flats and flatmate rooms in Hyderabad. Launch city-wide with initial focus on Gachibowli–Madhapur–Kondapur–Financial District corridor. Core flow: anonymous rent pins → verified listings → seeker requests → deterministic matching → double-consent contact reveal.

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js App Router + Cloudflare Workers | Type-safe modular monolith, inexpensive at launch, explicit service boundaries |
| Supabase Postgres + PostGIS + RLS | Geographic queries, row-level security for PII, managed service |
| Resend for email (inbound + outbound) | Webhook-based, verifiable, replay/retry support, no Gmail MCP |
| MapLibre GL + replaceable tile provider | Vendor-neutral, customizable, no Google Maps costs |
| No user accounts | Email verification + signed action tokens as sole identity |
| Deterministic SQL matching first | Transparent, auditable, no LLM required for V1 |

## Task List

### Phase 0: Foundation (Repository, Infrastructure, Database)

#### Task 1: Initialize Git Repository and Save Plan
- [ ] Initialize git repo in `D:\Vibe Coded\Rentinhyd`
- [ ] Save PLAN.md as `docs/hyderabad-rent-mvp-plan.md`
- [ ] Create initial commit

**Dependencies:** None
**Files:** `.git/`, `docs/hyderabad-rent-mvp-plan.md`
**Size:** XS

#### Task 2: Configure Cloudflare, Supabase, Resend Projects
- [ ] Register/configure `hyderabad.rent` domain
- [ ] Set up Cloudflare Workers project with KV/D1/R2 as needed
- [ ] Create Supabase project with PostGIS enabled
- [ ] Create Resend account, configure domain, set up inbound email webhook
- [ ] Configure Search Console property
- [ ] Set up domain email records (MX, SPF, DKIM, DMARC)
- [ ] Configure backups and secrets management

**Dependencies:** Task 1
**Files:** Cloudflare/Supabase/Resend dashboards, DNS records
**Size:** M

#### Task 3: Database Schema and Migrations
- [ ] Create `identities` table with email verification flow
- [ ] Create `listings` + `listing_private` tables (RLS-protected)
- [ ] Create `seek_requests` table
- [ ] Create `rent_pins` table with PostGIS geography(Point,4326)
- [ ] Create `matches` table with deterministic scoring columns
- [ ] Create `contact_introductions` table for double-consent flow
- [ ] Create `reports`, `moderation_decisions`, `email_events`, `job_runs`, `audit_events` tables
- [ ] Create public read-only views that cannot join to PII
- [ ] Add GiST indexes on geography columns
- [ ] Seed locality/metro GeoJSON (8 seed localities + metro lines)

**Dependencies:** Task 2
**Files:** `supabase/migrations/*.sql`
**Size:** L

#### Task 4: RLS Policies and Security Configuration
- [ ] Enable RLS on all tables
- [ ] Write policies: public map reads (anonymous pins only), verified listings read, private data blocked
- [ ] Service-role access only in server code
- [ ] Encrypted private fields (phone, exact coords, message bodies)
- [ ] CSP/HSTS/security headers middleware
- [ ] Restricted CORS configuration

**Dependencies:** Task 3
**Files:** `supabase/migrations/rls-policies.sql`, `src/lib/security.ts`
**Size:** M

#### Task 5: Design System and API Contracts
- [ ] Create design tokens (colors, spacing, typography) — dark, practical Hyderabad visual system
- [ ] Define API contracts (Zod schemas) for all endpoints:
  - `GET /api/map?bbox=&zoom=`
  - `POST /api/rent-pins`, `POST /api/listings`, `POST /api/seekers`
  - `POST /api/verify/:token`, `POST /api/matches/:id/respond`, `POST /api/report`
  - `POST /api/webhooks/resend`
- [ ] Set up CI pipeline (lint, typecheck, test, build)

**Dependencies:** Task 1
**Files:** `src/design-tokens.ts`, `src/lib/schemas/`, `.github/workflows/ci.yml`
**Size:** M

---

### Checkpoint: Foundation Complete
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Database migrations run cleanly
- [ ] RLS policies verified (PII not accessible via public views)
- [ ] CI pipeline green

---

### Phase 1: Launchable MVP (Core User Flows)

#### Task 6: Map Browsing and Rent Pins
- [ ] MapLibre GL integration with tile provider (abstraction for swap)
- [ ] `GET /api/map?bbox=&zoom=` — returns approved, privacy-jittered pins
- [ ] `POST /api/rent-pins` — anonymous pin submission with Turnstile
- [ ] Bottom sheet for pin details (locality, rent band, BHK, furnishing)
- [ ] Map clustering at low zoom, individual pins at high zoom
- [ ] Geocoding for reverse lookup of locality from coordinates

**Dependencies:** Task 3, Task 5
**Files:** `src/app/map/`, `src/components/Map.tsx`, `src/app/api/map/route.ts`, `src/app/api/rent-pins/route.ts`
**Size:** L

#### Task 7: Verified Listing Submission (Whole Flat + Room/Flatmate)
- [ ] `POST /api/listings` with email verification gate
- [ ] Two-step flow: submit → email verification token → approve
- [ ] Form validation: budget, BHK, furnishing, availability, amenities, lifestyle
- [ ] Listing status: `pending` → `approved` → `quarantined/expired/rented`
- [ ] Admin review queue for moderation

**Dependencies:** Task 3, Task 4, Task 5
**Files:** `src/app/list/`, `src/app/api/listings/route.ts`, `src/components/ListingForm.tsx`
**Size:** L

#### Task 8: Seeker Request Submission
- [ ] `POST /api/seekers` with email verification
- [ ] One active seeker per verified email
- [ ] Form: budget, BHK/room type, move-in window, lifestyle constraints
- [ ] Status tracking: `pending` → `approved` → `matched` → `expired`

**Dependencies:** Task 3, Task 4, Task 5
**Files:** `src/app/seek/`, `src/app/api/seekers/route.ts`, `src/components/SeekerForm.tsx`
**Size:** M

#### Task 9: Email Verification and Action Tokens
- [ ] `POST /api/verify/:token` — one-time, hashed tokens
- [ ] Resend integration for outbound verification emails
- [ ] Token expiry (24h), rate limiting, replay protection
- [ ] Unsubscribe/withdrawal links in every email

**Dependencies:** Task 2, Task 5
**Files:** `src/app/api/verify/route.ts`, `src/lib/email.ts`, `src/lib/tokens.ts`
**Size:** M

#### Task 10: Deterministic Matching Job
- [ ] SQL-based matching: same geography, compatible budget, BHK/room type, move-in window, lifestyle
- [ ] Deterministic ranking (score + tiebreakers)
- [ ] One daily digest per person (not per candidate)
- [ ] Supabase Cron / pg_cron for scheduled execution
- [ ] Creates `matches` records, sends digest emails via Resend

**Dependencies:** Task 3, Task 7, Task 8, Task 9
**Files:** `supabase/functions/matching-job.ts`, `src/lib/matching.ts`
**Size:** L

#### Task 11: Double-Consent Contact Introduction
- [ ] `POST /api/matches/:id/respond` — accept/decline with one-time token
- [ ] When both accept within 7 days: send introduction email with chosen contact method
- [ ] Withdrawal link in every matching message
- [ ] `contact_introductions` audit trail

**Dependencies:** Task 9, Task 10
**Files:** `src/app/api/matches/[id]/respond/route.ts`, `src/lib/introductions.ts`
**Size:** M

#### Task 12: Reporting and Moderation
- [ ] `POST /api/report` with Turnstile + rate limits
- [ ] Report reasons: fake, broker, scam, inappropriate, other
- [ ] Admin moderation console (`/admin`) with Supabase Auth
- [ ] Moderation actions: quarantine, approve, ban, delete
- [ ] `moderation_decisions` and `audit_events` append-only

**Dependencies:** Task 4, Task 5
**Files:** `src/app/api/report/route.ts`, `src/app/admin/`, `src/lib/moderation.ts`
**Size:** M

#### Task 13: Resend Inbound Webhook Handler
- [ ] `POST /api/webhooks/resend` — verify Resend signatures
- [ ] Idempotency keys to prevent duplicate processing
- [ ] Parse inbound commands: "rented", "still available", "withdraw"
- [ ] Queue ambiguous language for admin review
- [ ] Email events logged to `email_events` table

**Dependencies:** Task 2, Task 5
**Files:** `src/app/api/webhooks/resend/route.ts`, `src/lib/webhooks.ts`
**Size:** M

#### Task 14: Live Stats and Aggregates
- [ ] Real-time locality stats: median rent, count, sample size, last updated
- [ ] Map viewport aggregates (count by BHK, rent bands)
- [ ] City-wide counters (pins, listings, seekers, matches)
- [ ] Pre-aggregated for performance, refreshed on mutation

**Dependencies:** Task 3, Task 6
**Files:** `src/app/api/stats/route.ts`, `src/lib/aggregates.ts`
**Size:** M

#### Task 15: SEO Pages (City + Locality)
- [ ] Canonical city pages: `/flats-for-rent-in-hyderabad`, `/flatmates-in-hyderabad`, `/rent-map`
- [ ] Locality page template: `/rent/[locality]` with SSR
- [ ] Locality page content: 90-day median/range by BHK, sample size, amenities, metro proximity, FAQ
- [ ] `noindex` on filter/query URLs; index locality only after 20+ approved data points
- [ ] JSON-LD: `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage`
- [ ] `sitemap.xml`, `robots.txt` generation

**Dependencies:** Task 3, Task 14
**Files:** `src/app/flats-for-rent-in-hyderabad/`, `src/app/flatmates-in-hyderabad/`, `src/app/rent/`, `src/app/rent-map/`, `src/app/rent/[locality]/`
**Size:** L

#### Task 16: Legal and Privacy Pages
- [ ] Privacy notice (DPDP-compliant): processing description, informed consent
- [ ] Terms of service with anti-brokerage disclaimer
- [ ] Consent/withdrawal/access/deletion request flows
- [ ] Retention policy: delete raw inbound email after 30 days unless tied to report
- [ ] Prominent scam warning: "never pay before visiting and independently verifying"

**Dependencies:** Task 5
**Files:** `src/app/privacy/`, `src/app/terms/`, `src/app/consent/`
**Size:** M

#### Task 17: Observability and Error Tracking
- [ ] Structured logging (request ID, user context without PII)
- [ ] Error tracking (Sentry or similar)
- [ ] Metrics: API latency (p50/p95/p99), verification rate, match rate, report rate, email delivery/bounce
- [ ] Health check endpoints

**Dependencies:** Task 5
**Files:** `src/lib/observability.ts`, `src/app/api/health/route.ts`
**Size:** M

---

### Checkpoint: MVP Complete (Private Beta Ready)
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] End-to-end flow works: pin → listing → seeker → match → intro
- [ ] 50+ approved rent pins, 10+ verified listings, 10+ verified seekers in seed localities
- [ ] Abuse and contact-consent tests passed

---

### Phase 2: First 90 Days (Enhancements)

#### Task 18: Inbound Email Command Handling
- [ ] Parse exact safe phrases: "rented", "still available", "withdraw"
- [ ] Auto-update listing/seeker status from email replies
- [ ] Queue ambiguous language for admin review (LLM optional, validated enum only)
- [ ] Idempotent processing with replay safety

**Dependencies:** Task 13
**Files:** `src/lib/inbound-commands.ts`
**Size:** M

#### Task 19: To-Let Board Photo Uploads
- [ ] Private Supabase Storage bucket for photos
- [ ] Upload endpoint with MIME/magic-byte/size checks
- [ ] EXIF stripping on upload
- [ ] Manual review queue before public display
- [ ] Contributor leaderboard

**Dependencies:** Task 12
**Files:** `src/app/api/photos/`, `src/components/PhotoUpload.tsx`
**Size:** M

#### Task 20: Locality Page Publishing Gates
- [ ] Automated check: 20+ approved/recent data points → index
- [ ] Otherwise navigable but `noindex`
- [ ] Expand coverage based on verified submissions

**Dependencies:** Task 15
**Files:** `src/app/rent/[locality]/page.tsx`
**Size:** S

---

### Phase 3: Scale to 200k Monthly Visitors

#### Task 21: Performance Optimizations
- [ ] Cache public map tiles/viewport responses for 60s (Cloudflare KV)
- [ ] Cluster markers at low zoom levels
- [ ] Pre-aggregate locality statistics (materialized views or cron)
- [ ] Move matching/email work to idempotent queue (BullMQ or similar)
- [ ] Read replica when query evidence warrants

**Dependencies:** Task 6, Task 10, Task 14
**Files:** `src/lib/cache.ts`, `src/lib/queue.ts`, `supabase/functions/`
**Size:** L

#### Task 22: Load Testing and Reliability hardening
- [ ] Synthetic city-wide viewport/map traffic at 200k assumptions
- [ ] Matching batch load tests
- [ ] Chaos testing: DB failover, worker crashes, email delays
- [ ] RPO 1h, RTO 1h verification

**Dependencies:** Task 21
**Files:** `load-tests/`
**Size:** M

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Email deliverability (Resend/domain reputation) | High | Warm domain gradually; monitor bounce/complaint rates; fallback to transactional provider |
| Matching quality without LLM | Medium | Start purely SQL; collect feedback; add LLM classification only for ambiguous cases with validated enum output |
| Abuse/spam at launch | High | Turnstile + per-IP/email limits + duplicate detection + outlier rules from day 1 |
| DPDP compliance gaps | High | Legal review before public launch; embed consent in every flow; deletion endpoint ready |
| Map tile costs at scale | Medium | Start with free tier (OpenMapTiles); cluster aggressively; paid tier only at measured gate |
| Single-founder bus factor | High | Document everything; CI/CD fully automated; runbooks for common ops |

---

## Open Questions

1. **Map tile provider**: OpenMapTiles (self-hosted on Cloudflare R2) vs MapTiler vs Stadia Maps? Need decision before Task 6.
2. **Email domain**: Use `hyderabad.rent` or subdomain `mail.hyderabad.rent` for Resend?
3. **Admin auth**: Supabase Auth (email/password) or magic links only?
4. **LLM for inbound classification**: Which model? Local (Ollama) or API? Budget constraints favor local.
5. **Queue implementation**: BullMQ on Redis (Upstash) vs Supabase pg_boss vs Cloudflare Queues?

---

## Parallelization Opportunities

| Phase | Can Parallelize | Must Sequence |
|-------|-----------------|---------------|
| Foundation | Task 2 (infra) + Task 5 (design/API) | Task 3 → Task 4 (RLS needs tables) |
| MVP Core | Task 6, 7, 8 (independent UI flows) | All need Task 3, 5 first |
| MVP Matching | Task 10, 11 (matching + intro) | Task 10 before 11 |
| Phase 2 | Task 18, 19 (independent) | Both need Task 12, 13 |

---

## Definition of Done (per task)

- [ ] Implementation complete per acceptance criteria
- [ ] Unit tests pass (validation, scoring, tokens, jitter, AI parsing)
- [ ] Integration tests pass (RLS, webhook signatures, double-consent, unsubscribe, reports, duplicates)
- [ ] E2E test covers the feature slice
- [ ] Build succeeds: `npm run build`
- [ ] Lint/typecheck clean: `npm run lint && npx tsc --noEmit`
- [ ] No console errors in browser
- [ ] Mobile responsive at 320/768/1024/1440px
- [ ] Accessibility: keyboard nav, screen reader labels, contrast