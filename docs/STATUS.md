# STATUS — pick-up notes

> **Read this first when resuming work on BarBrawl.** It's the shortest
> path from "what state is the repo in?" to "what should I do next?".

## Where we are

**Phase 0 complete** (commit `968e9d5`). Scaffold is live:

- Monorepo: pnpm workspace, `apps/mobile` + `supabase/`
- Mobile: Expo SDK 52, TS strict, expo-router, theme tokens ported,
  spec §8 deps declared, EAS profiles defined
- DB: PostGIS + all core tables + RLS policies from spec §8,
  three ordered migrations in `supabase/migrations/`
- CI: `.github/workflows/ci.yml` — pnpm, Node 20, lint + typecheck + test
- Docs: spec, quickstart, prototype source, map-integration notes,
  `SETUP.md` with external-account checklist

**Nothing is running yet.** No `pnpm install` has been done, no
Supabase project created, no Mapbox token, no EAS init. Those are all
listed in `SETUP.md` and deferred until the user has capital.

## Open decisions (blocking non-trivial work)

### 1. Distribution model — **biggest open question**

Spec §2 locks iOS + Android native (Expo, no web). User said ".io or
whatever is going to be best" which may or may not mean itch.io / web.

Three paths, with cost implications:

| Path | Cost | Pivot risk |
|---|---|---|
| Native only (follow spec) | Apple $99/yr + Google $25 once + Mapbox | Highest — wasted work if pivot |
| Web only (itch.io style) | $0 upfront | Shifts map/GPS stack; invalidates some §8 deps |
| Web + native (Expo supports web) | Native costs deferred | Slower per feature |

**Recommended default while this is unresolved:** build
**distribution-agnostic** code (content, math, Supabase schema,
game-core logic). Keep UI/map/platform-specific work behind thin
adapters. Defer EAS / store / Mapbox plumbing until decided.

### 2. Mapbox provider library

Spec §8 says "react-native-maps + Mapbox GL provider" — those are
actually two separate libs. I chose `@rnmapbox/maps` (true Mapbox GL,
matches spec intent). Alternative: `react-native-maps` with Google
Maps (simpler, no Mapbox account). Unconfirmed.

### 3. Web pivot would change the map lib entirely
If web distribution becomes primary, the right stack is Leaflet +
CartoDB Voyager (matches user's Lucid Winds setup — free, no API key,
proven). `docs/references/map-integration-notes.md` documents the
patterns that transfer.

## Recommended next steps (in order of distribution-agnosticism)

### A. Pure-portable work — safe regardless of distribution

These move the project forward and don't depend on the native/web
decision. Recommended starting point when resuming.

1. **Extract a `packages/game-core`** package with:
   - All content constants (classes, trees, bars, rooms,
     consumables) typed properly — ported from
     `docs/prototype/barbrawl-v6.jsx`
   - Pure damage formula (spec §5.3), XP curve (§5.6), rhythm
     resolution, loot roll tables (§5.9)
   - `generateBarRun(barId, date, playerLevel)` deterministic from
     seed (§5.4)
   - Unit tests for all of the above (spec §10: 80%+ coverage on
     damage/XP/reward math)
   - No React Native imports. Runs in Node, RN, or browser.
2. **Seed file for bars** — pick a small set (10-20 bars in 2-3 test
   cities) and write a SQL seed in `supabase/seed.sql` so local
   `supabase db reset` populates the map with something.
3. **Edge Function skeletons** — Deno/TypeScript stubs for the
   routes in spec §8.3 (`/battle/start`, `/battle/action`, etc.) so
   the shape is in place even if bodies are empty.

### B. Native-assuming work — do only after confirming native-only

1. `@rnmapbox/maps` integration: map screen with GPS, Mapbox night
   style, tap-to-detail bottom sheet
2. Push notifications, haptics, expo-secure-store auth wiring
3. EAS development build on a real device

### C. Web-assuming work — do only after confirming web path

1. Swap `@rnmapbox/maps` for Leaflet + CartoDB (apply the
   `docs/references/map-integration-notes.md` patterns directly)
2. Browser-geolocation version of the proximity check (coarser, so
   tune the 100m threshold)
3. `react-native-web` integration OR strip RN and build a plain web
   app (decision point — depends on whether native remains a future
   target)

## Phase checklist progress (from spec §12)

- [x] Phase 0: Project Setup
- [ ] Phase 1: Auth & Character Creation — **blocked** on Supabase project
- [ ] Phase 2: Map View with Mock Bars — **blocked** on distribution decision
- [ ] Phase 3: Skill Trees — **unblocked** via path A above
- [ ] Phase 4: Single-Player Combat — **partially unblocked** via path A (server logic + math)
- [ ] Phase 5: Rewards, XP & Loot — **unblocked** via path A
- [ ] Phase 6: Real Bars via Google Places — blocked on Google Cloud + cost
- [ ] Phase 7: Defender System — depends on Phase 4
- [ ] Phase 8: Consumables & Stash
- [ ] Phase 9: Cosmetics Shop — blocked on RevenueCat (real money, defer)
- [ ] Phase 10: Bar Claiming & Owner Dashboard
- [ ] Phase 11: Social & Leaderboards
- [ ] Phase 12: Global Events
- [ ] Phase 13: Polish, Balancing & Beta
- [ ] Phase 14: Launch

## Outstanding asks to the user (resume prompt)

When you come back to this project, answer these and we can move:

1. **Distribution target?** Native only / web only / both / still TBD?
2. **Ready to run `SETUP.md` checklist?** (Mostly blocked on capital.)
3. **Which path from §"Recommended next steps" should I take?** A (portable), B (native), C (web)?

If you just say "keep going," I'll default to **path A** —
distribution-agnostic game-core + tests. That's the work most likely
to still be useful no matter which direction we commit to.

## How to drop back in with Claude

Short pickup prompt for future sessions:

> Read `docs/STATUS.md` first. The repo is paused at end-of-Phase-0.
> Pick up from the "Recommended next steps" section. Default to
> path A unless I say otherwise.
