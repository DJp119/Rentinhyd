# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** Young professionals and students moving to Hyderabad's IT corridor (Gachibowli–Madhapur–Kondapur–HITEC City–Financial District) for tech jobs. They need a rental property or flatmate arrangement without paying brokerage, without creating an account, and without exposing their contact details until they choose to.

**Secondary:** Property owners and landlords in Hyderabad who want to list flats or rooms without paying brokerage or dealing with agents. They need a simple, trustable channel to reach genuine tenants.

## Product Purpose

Hyderabad Rent is a zero-brokerage, no-account rental marketplace for Hyderabad. It makes finding a flat or flatmate in Hyderabad fast, private, and trustworthy — without an account, without brokerage fees, and without exposing personal contact information until both parties consent.

Success means the product becomes the default place Hyderabad's tech corridor turns to when they need to rent or fill a vacancy.

## Positioning

Hyderabad Rent is meaningfully different from alternatives because it uniquely combines:

- **Zero brokerage** — no fees, no deposits, no agent middlemen (unlike Nobroker's platform fees, Magicbricks/Housing's agent-heavy model)
- **No-account, privacy-first** — anonymous browsing, email-only identity, no profile or signup required, contact details shared only after double consent (unlike every major portal requiring accounts)
- **Map-first, verified** — the interactive map is the primary interface, not a listings feed; every listing requires email verification and risk review before going live
- **Hyderabad-specific, community-seeded** — built specifically for Hyderabad with locality-level data, metro proximity, real rent aggregates, and data seeded through community contribution rather than portal scraping

## Operating Context

- Users typically access the site on mobile while commuting, messaging, or actively searching for housing
- The core flow is: land on map → browse pins by area/rent band → tap a pin → read listing details → submit interest via email → receive match digest → double-consent → contact introduction
- Hyderabad's rental market is highly seasonal (tech hiring cycles), locality-concentrated (IT corridor), and dominated by brokers who charge 1–2 months' rent as fees
- Users range from first-time renters to experienced professionals; many are new to Hyderabad and unfamiliar with neighbourhoods
- Rental scams are common — "never pay before visiting" is a prominent safety message

## Capabilities and Constraints

**Confirmed capabilities:**
- Interactive Google Maps with three pin layers: rent pins (anonymous, color-coded by band), whole-flat listings (gold), room/flatmate listings (sky blue)
- Verified listings with email verification, moderation queue, and status workflow (pending → approved / quarantined / expired / rented)
- Seeker requests: users submit what they're looking for, verified by email
- Deterministic matching: SQL-first algorithm scoring geography (30%), budget (25%), BHK/type (20%), timing (15%), lifestyle (10%) — minimum 40 score threshold
- Double-consent contact introduction: both parties must accept within 7 days before contact is shared via email
- Daily match digest emails and inbound email webhook for owner replies ("rented", "still available", "withdraw")
- Admin moderation console with audit trail, abuse detection (Turnstile, rate limits, duplicate detection, outlier rules, bot scoring), and report queue
- SEO pages: `/flats-for-rent-in-hyderabad`, `/flatmates-in-hyderabad`, `/rent-map`, and dynamic `/rent/[locality]` pages with real stats (indexed after 20+ approved data points)
- Responsive design, mobile-first with bottom sheets, floating action buttons

**Confirmed constraints:**
- No user accounts — email-only identity via signed action links
- No brokerage, payments, deposits, or transactions of any kind
- No PGs, short stays, or commercial rentals
- No phone numbers exposed publicly — double-consent reveal only
- No scraping of competing portals
- One active seeker per verified email
- Privacy jitter on coordinates (200m radius); PII encrypted at rest (AES-GCM)
- Deployment: Cloudflare Workers via OpenNext, Supabase Postgres/PostGIS, Resend for email
- Team: single founder; operational ceiling ₹3,000/month; target 200k monthly visitors

## Brand Commitments

- **Name:** Hyderabad Rent (product), hyderabad.rent (brand), rentinhyderabad.in (domain)
- **Visual identity:** Dark, practical system for Hyderabad — warm charcoal background, warm gold (#E8A838) accent, off-white text. "Not copied from Bengaluru — distinct identity." Gold accent reflects Hyderabad heritage and warmth.
- **Voice:** Practical, trustworthy, no-fluff. Does not sound like a generic proptech platform. Safety-conscious without being alarmist.
- **Assets:** Map pin SVG as de facto logo. No formal logo suite or brand guidelines exist yet.
- **Tagline:** "Zero brokerage rental marketplace" (emerges from product behaviour, not a launched tagline)

## Evidence on Hand

- Real codebase with implemented MVP features (map, listings, seekers, matching, admin, SEO pages, email)
- Design tokens with complete colour, typography, spacing, shadow, and component system
- MVP plan document at `docs/hyderabad-rent-mvp-plan.md`
- `.env.local.example` with documented environment configuration
- Terms of service and privacy policy (DPDP-compliant)
- No real user data, testimonials, case studies, or press coverage on hand yet

## Product Principles

1. **Trust before growth** — verification, moderation, double-consent, and abuse controls come before scale. Every feature must preserve or strengthen the trust baseline.
2. **No account required** — the product is for people who need housing, not a new account. Email-only identity keeps friction at zero.
3. **Hyderabad-first, not India-generic** — every design and product decision should reflect Hyderabad's specific market, culture, and corridor geography. Avoid generic proptech patterns.
4. **Privacy as architecture, not policy** — contact details, personal data, and exact locations are never exposed by default. They are revealed only through explicit, informed consent.
5. **Practical over polished** — solve the real problem (finding housing without getting scammed or paying brokerage) before adding delight. Dark, warm, functional — not minimalist for its own sake.

## Accessibility & Inclusion

- Responsive down to 320px viewport width
- Mobile-first with iOS-friendly input sizing (16px prevents zoom)
- Bottom sheets accessible via keyboard
- Performance targets: mobile LCP <2.5s, INP <200ms, CLS <0.1
- No screen reader-specific testing confirmed yet
- Content is English-only at launch; Hyderabad's rental market primarily operates in English + Telugu + Hindi
