# PLAN OF ATTACK — from demo to real game

> Captured 2026-05-23 after first hands-on playtest. Goal: a real
> location-based RPG worth shipping. Built entirely on free + open
> source tools. No paid SDKs, no paid hosts, no recurring infra cost
> until paid features ship. Live URL today:
> https://stephenuffugus.github.io/BarBrawl/

## North star

BarBrawl is a **location-based RPG** that turns real bars into raidable
dungeons. You walk in real life, the map shows real venues, you tap a
bar to fight inside its themed dungeon, you claim it, you defend it
against other players. The bar setting is texture; the loop is
Pokémon-Go-meets-Diablo-meets-Soul-Calibur-rhythm.

The game-core engine is already substantially built (409+ tests, full
combat dispatcher, 189-node skill trees, loot, gating, defenders,
events). What's missing is everything *around* the engine to make it
a real game instead of a demo.

## Where we are (honest assessment)

**Working today (live at the github.io URL):**
- Title screen + first-run tutorial overlay
- A pretend tile-grid "map" (12×18 pokemon-style — placeholder, not the
  real design)
- 3-room dungeon crawls
- Full PS1-style battle with rhythm + skills + items + status effects
- 7-class roster, persistent skill-tree allocations, equipment
- Loot drops, mark/VIP-key gating, defender stationing
- Mastery, daily quests, login streak, crawl pass, replay viewer

**Demo-only / missing:**
- The map (must be real-world Leaflet, not tile grid)
- Persistence is localStorage only (wipes on browser clear)
- No multiplayer, no leaderboards, no real defenders attacked by others
- No auth (player identity is a hard-coded `demo-user`)
- No backend — Supabase schema/edge functions exist but aren't deployed
- Placeholder pixel-art sprites (abstract blocks, not real characters)
- No music; SFX is web-audio synth (functional but bare)
- 5 known shallow mechanics still need fleshing (Hexwright Reserve
  stacks, Ghost SPD tag, Medic slots, time-scaling, coin-flip 2x/0x)
- Rhythm bar's tap affordance is poor (first playtester missed it)

## Tools we will use (all free / open source)

### Hosting + infra
- **GitHub Pages** — current host, free forever for public repos.
- **GitHub Actions** — CI/CD, generous free tier.
- **Supabase free tier** — Postgres + Auth + Edge Functions + Storage.
  500MB DB, 50k MAU, 5GB storage, 2M function invocations/mo. Enough
  for early playtest + launch.
- **Cloudflare DNS** — already managing lucidwinds.com; free tier.

### Map + location
- **Leaflet** — battle-tested OSS map library (matches Lucid Winds).
- **OpenStreetMap tiles via CartoDB Voyager** — free, no API key.
- **OpenStreetMap Nominatim** — free geocoding (rate-limited; we self-
  host or batch for production).
- **OpenStreetMap Overpass API** — query bars/pubs/breweries by area.
  Free, public endpoints exist; can self-host if rate-limited.
- **Browser Geolocation API** — free, accurate enough for the 100m
  proximity check in spec §8.2.

### Art + audio
- **OpenGameArt.org** — free pixel art assets (CC0 / CC-BY).
- **itch.io free asset packs** — many CC0 packs for chiptune sprites.
- **Kenney.nl** — large CC0 game-art library.
- **freesound.org** — free SFX (verify licenses).
- **Audacity** — free DAW for trimming/mixing.
- **Aseprite** ($20 once, not free, but cheapest sprite editor) OR
  **LibreSprite** (free fork).
- **Generative tools** for placeholder ideation only — final assets
  must have clear license.

### Backend
- **Supabase JS SDK** — already in deps.
- **Deno Edge Functions** — already scaffolded in `supabase/functions/`.
- **PostGIS** — already enabled in migrations for bar geo queries.

### Observability
- **Sentry free tier** — 5k errors/mo, plenty for playtest.
- **PostHog free tier** — 1M events/mo, product analytics.

### Distribution + community
- **GitHub Pages** for the playable web build.
- **itch.io** as a secondary distribution surface (free, gamer
  audience, no fees on free games).
- **Discord (free)** for community + playtester feedback.

## Phased build-out

Each phase ends with a shippable improvement to the live URL. No phase
is allowed to drag past 2 weeks without re-scoping.

### Phase A — Foundation (~2 weeks)

The bones a "real" game needs. After this phase, the demo no longer
feels like a demo.

A1. **Replace tile-grid map with Leaflet.**
  - Port the Leaflet + CartoDB Voyager setup from Lucid Winds.
  - Show user's GPS location (browser Geolocation API).
  - Plot demo bars from Supabase seed (15 mock bars across 3 cities).
  - Tap a bar marker → existing preview screen.
  - Tile catalog (`apps/mobile/src/design/tiles.ts`) stays for the
    *dungeon interior*, only the overworld map is swapped.

A2. **Polish the rhythm bar.**
  - Big "TAP!" prompt overlay during `awaiting-rhythm` phase.
  - Border + drop-shadow on the bar so it reads as a button.
  - Optional: marker pulse / glow when crossing the gold zone.
  - Optional: keyboard support (space bar) for web players.

A3. **Real auth.**
  - Supabase Auth (email magic-link, free tier).
  - On first login, bootstrap a real `accounts` row + the 7-character
    roster (uses existing `createStarterRoster`).
  - Migrate Zustand-persisted demo state to Supabase on auth.
  - Stay client-side for unauth'd users (demo mode still works for
    casual visitors).

A4. **Bar discovery from real venues.**
  - Overpass API query for `amenity=bar|pub|biergarten` within a
    radius of the player.
  - On first sighting, write to `bars` table (with the existing
    nomination dedup logic).
  - Bar themes auto-assigned by venue type tags (with a manual override
    via the existing nomination/claim flow).

**Phase A definition of done:** Open the URL, sign in with email, see a
real-world map of your area with real bars as markers. Tap one, fight
its dungeon, claim it. Sign out, sign back in from another device, see
your claimed bars on the map.

### Phase B — Live & multiplayer (~2 weeks)

The thing that turns BarBrawl from solo Diablo into territorial PvP.

B1. **Deploy the edge functions** that already exist:
  - `character-create`, `battle-start`, `battle-action`, `battle-end`
    — all have bodies, just need a Supabase project + env vars.
  - Wire mobile client to call them instead of running engine purely
    client-side. (Engine still runs locally as the optimistic source;
    server is authoritative on conflict.)

B2. **Real defenders attacked by other players.**
  - When player A claims a bar and stations a defender, player B can
    attack it. The defender's stats + skill tree + equipment come from
    A's saved data. B fights it. Either:
    - B wins: B claims the bar, A loses the bar + accumulated coins.
    - B loses: defender HP decays, B pays a flee/loss cost.
  - Implements spec §5.5 (defender system) end-to-end.

B3. **Leaderboards + social.**
  - Logic exists in `packages/game-core/src/social/`. UI doesn't.
  - Regional + global leaderboards by gold / bars claimed / level.
  - User profile pages (show favorite class, claimed bars, badges).

B4. **Push notifications when your bar is attacked.**
  - Browser Notification API (free) + service worker (registered via
    Expo PWA).
  - Real push delivery for installed PWA users.

**Phase B definition of done:** You can claim a bar, see it claimed in
the leaderboard, get notified when someone attacks it, lose it if they
beat your defender. Other players see your username on their map when
they pass by a bar you own.

### Phase C — Content + polish (~2 weeks)

Make it look and feel like a real game, not a programmer's prototype.

C1. **Real pixel art.**
  - 7 character class sprites (idle + walk + attack frames each).
  - ~10 enemy types per bar theme (~70 enemies, but can share frames).
  - ~7 boss sprites (one per bar theme).
  - Overworld tilemap pieces (only for dungeon interiors; map is
    Leaflet now).
  - Source: Kenney.nl + OpenGameArt for placeholders; commission a
    pixel artist for the hero classes when budget allows.

C2. **Audio.**
  - Chiptune background tracks: title, overworld, battle, victory, boss.
  - Polish the synth SFX into a sample-based pack with bigger crunch.
  - Mute toggle is already wired.

C3. **Onboarding flow (real, not just an overlay).**
  - Forced first-battle tutorial with overlay tooltips.
  - Class pick on first run (instead of pre-seeded roster).
  - First-bar claim tutorial (find a bar within X meters, walk close,
    tap to enter, beat the boss).

C4. **Flesh out the 5 shallow mechanics:**
  - Hexwright Reserve stack scaling (passive Hoarded Power needs
    real stacks).
  - Ghost SPD buff as a real speed status tag (not dodge_up proxy).
  - Medic Triage consumable-slot expansion (real slot count, not HP
    placebo).
  - Time-scaling passives (`vn_1 +1%/min`) — wire to elapsed-time
    tracker.
  - Coin-flip keystone (`ca_9`, `hu_6`) — real 2x/0x semantics.

C5. **Balance pass.**
  - Tune from playtest data, not feel. (See PostHog integration in C6.)
  - Mark every changed number with `// BALANCE:` comment per memory
    convention.

C6. **Observability + analytics.**
  - Sentry for JS errors.
  - PostHog for: funnel (title → first battle → first claim), session
    length, screen drop-off, class-pick distribution, win rate by
    class, gold inflation rate.

**Phase C definition of done:** Take a screenshot side-by-side with
a Pokémon Red battle screen. They should be in the same ballpark
visually. A first-time player should understand the loop within 60
seconds of landing on the URL.

### Phase D — Launch (~1 week)

D1. **Landing page on lucidwinds.com.**
  - Single-page pitch: what BarBrawl is, screenshots, gif of a battle,
    "Play now" → github.io URL.
  - Email capture for "notify me when iOS / Android ship."

D2. **itch.io listing.**
  - Free HTML5 game upload.
  - Tags: rpg, location-based, pixel-art, multiplayer, free.
  - Embed the same web bundle.

D3. **Closed beta with ~10 friends.**
  - Discord channel for feedback.
  - PostHog dashboard for behavioral feedback.
  - One round of iteration before public launch.

D4. **Public launch.**
  - Post in r/IndieGaming, r/incremental_games (location-based is
    novel), r/AndroidGaming (PWA installable).
  - Twitter / mastodon thread with the battle gif.

## Stretch goals (Phase E and beyond)

- **Native iOS + Android builds** — Expo already supports this; just
  need EAS profile + Apple Developer ($99/yr) + Google Play ($25 once).
- **Open raid beacons** (Helldivers-style; design sketch in DESIGN_V1.md).
- **Cross-game rewards with Lucid Winds** — clearing a tier-N bar in
  BarBrawl grants a reward in Lucid Winds (see
  `project_hosting_and_lucid_tie_in.md` memory).
- **Cosmetics shop** — free game, optional skins; RevenueCat or Stripe.
- **Bar Dashboard Pro** ($29/mo B2B for real bar owners) — see
  spec §13.

## What I will NOT do (kept honest about pitfalls)

- Won't lock the engine to a specific platform until distribution is
  confirmed. game-core stays pure TypeScript, runnable in Node, web,
  RN, or Deno. (Current invariant — see
  `project_game_core_layout` memory.)
- Won't commit built artifacts to `main`. Deploy branch / GitHub Pages
  pipeline stays as-is.
- Won't paid-fy anything that has a free OSS equivalent. The whole
  point of this plan is to ship without recurring infra cost until
  paid features exist.
- Won't promise launch dates. Phase ETAs are ranges, and "done" is
  defined per phase.
- Won't silently re-balance prototype numbers (per
  `project_balance_convention` memory).
- Won't change shared credentials (Hostinger SSH passwords, Lucid
  Winds keys) without flagging blast radius first.

## When you say "let's get started"

I'll default to **Phase A1 (Leaflet map)** since that's the biggest
visible improvement and unblocks A4 (real venues). If you want a
different starting point, name it and I'll switch.

The phases are designed to ship independently — A doesn't need B done
to be valuable, etc. We can also re-order based on what feels right
once we're moving.
