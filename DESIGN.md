# Design — Hyderabad Rent

<!-- impeccable:design-schema 1 -->

Durable visual decisions. PRODUCT.md owns product truth; this file owns the look. Tokens live in `src/design-tokens.ts`.

## World

**Retro-futurist, practical-dark.** Warm charcoal ground, a single Hyderabad-gold accent that behaves like light (neon, dawn, scan), off-white text. The retro-future register is optimism-through-instrumentation: sunrises, grids, beacons — never chrome-and-cyberpunk menace, never generic proptech pastel.

## Color

- Base: warm dark charcoal — `background #141210`, surface `#1A1815`, text `#EDEDE6`. Not pure black.
- Accent: Hyderabad gold `#E8A838` (heritage + warmth). Hover `#F0C050`, muted `#3D3518`, soft `rgba(232,168,56,0.12)`.
- Secondary signal: info sky `#4FC3F7` (room/flatmate pins, info). Semantic states follow tokens.
- Strategy: **Restrained** — neutrals carry the surface; gold is reserved for the brand mark, links, focus, primary actions, and rent money values. On an Operate surface, light (accent) must mean something.

## The mark — Sunburst Keyhole

A rising synth-wave sun — concentric banded half-disc — whose central negative space is a keyhole: circle bow + tapered stem. Rental keys meeting a new-home dawn.

- Geometry: `viewBox 0 0 64 64`, 2px stroke grid, 2px module gap between the sun field and the keyhole void. Legible to 16px; below that the keyhole reads as a solid core dot.
- Structure: outer band (full ring), mid + inner bands split into left/right arcs by the keyhole channel, scan-floor baseline with descending square dashes.
- Usage: gold strokes on transparent. `logo-dark` = mark, transparent ground (for charcoal surfaces). `logo-light` = mark recolored to charcoal `#141210` (for off-white surfaces). Never gold-on-white, never filled slab, never dropshadow.
- The mark IS the favicon (`src/app/icon.svg`) and the header brand symbol; it anchors the OpenGraph composition.

## Typography

System stack (`-apple-system, Segoe UI, Roboto`) for UI. The logo lockup wordmark is letterspaced uppercase ("HYDERABAD" / tracked-out "RENT") — instrument-label register. Display faces with a point of view may be introduced for Persuade surfaces later; product UI stays system.

## Motion / texture

SVG-native neon glow (`feGaussianBlur`) lives **inside the asset only**. Product CSS stays flat — no glow shadows, no animation on the mark. Future motion (e.g. scan-line sweep on hero) must be authored as one orchestrated piece, not scattered hovers.

## Surfaces

- **Map & app (Operate):** unchanged incumbent system; the mark slots into the fixed header as symbol + "Hyderabad Rent" wordmark.
- **OG/social:** dark charcoal field, centered double-stroke mark + keyhole, teal horizon baseline with perspective grid vanishing to it, wordmark either side of center, `hyderabad.rent` URL strip. Authored at 1200×630 in `src/app/opengraph-image.tsx`.
