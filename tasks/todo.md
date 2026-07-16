# hyderabad.rent MVP — Task Checklist

## Phase 0: Foundation

- [ ] **Task 1**: Initialize Git repo + save plan as `docs/hyderabad-rent-mvp-plan.md`
- [ ] **Task 2**: Configure Cloudflare, Supabase, Resend, Search Console, DNS, backups, secrets
- [ ] **Task 3**: Database schema + migrations (all tables, PostGIS, GeoJSON seed, GiST indexes)
- [ ] **Task 4**: RLS policies + security headers + encrypted fields + CORS
- [ ] **Task 5**: Design tokens + API contracts (Zod) + CI pipeline

### Checkpoint: Foundation
- [ ] Tests pass, build clean, migrations run, RLS verified, CI green

---

## Phase 1: Launchable MVP

- [ ] **Task 6**: Map browsing + rent pins (MapLibre, `/api/map`, `/api/rent-pins`, clustering, geocoding)
- [ ] **Task 7**: Verified listings (whole flat + room, 2-step email verification, admin review, status flow)
- [ ] **Task 8**: Seeker requests (email verification, one per email, form + status)
- [ ] **Task 9**: Email verification + action tokens (Resend, 24h expiry, rate limits, unsubscribe links)
- [ ] **Task 10**: Deterministic matching job (SQL, daily digest, Supabase Cron)
- [ ] **Task 11**: Double-consent introductions (accept/decline, 7-day window, intro email, audit trail)
- [ ] **Task 12**: Reporting + admin moderation (Turnstile, reasons, `/admin`, quarantine/ban, audit)
- [ ] **Task 13**: Resend inbound webhook (signature verify, idempotency, command parsing, review queue)
- [ ] **Task 14**: Live stats + aggregates (locality medians, viewport counts, city counters, pre-aggregated)
- [ ] **Task 15**: SEO pages (3 city pages, locality template SSR, JSON-LD, sitemap, robots.txt, 20-data-point gate)
- [ ] **Task 16**: Legal/privacy (DPDP notice, terms, anti-brokerage, consent/withdrawal/deletion, 30-day retention, scam warning)
- [ ] **Task 17**: Observability (structured logs, error tracking, metrics, health checks)

### Checkpoint: MVP / Private Beta Ready
- [ ] Tests pass, build clean, E2E flow works, 50+ pins / 10+ listings / 10+ seekers in seed, abuse tests pass

---

## Phase 2: First 90 Days

- [ ] **Task 18**: Inbound email commands ("rented", "still available", "withdraw" + ambiguous → review)
- [ ] **Task 19**: To-Let board photos (private storage, MIME/magic/EXIF checks, review queue, leaderboard)
- [ ] **Task 20**: Locality publishing gates (auto-index at 20+ data points, else noindex)

---

## Phase 3: Scale to 200k/mo

- [ ] **Task 21**: Performance (60s KV cache, marker clustering, pre-aggregated MVs, idempotent queue, read replica)
- [ ] **Task 22**: Load testing + reliability (200k synthetic traffic, matching batches, chaos, RPO/RTO 1h)

---

## Open Questions (Resolve Before Relevant Task)

1. Map tile provider: OpenMapTiles/R2 vs MapTiler vs Stadia?
2. Email domain: `hyderabad.rent` vs `mail.hyderabad.rent`?
3. Admin auth: Supabase email/password vs magic links?
4. LLM for inbound: local (Ollama) vs API? Budget favors local.
5. Queue: BullMQ/Upstash Redis vs pg_boss vs Cloudflare Queues?