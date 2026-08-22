# Project Dossier — BarBrawl

> **Audience:** another Claude (or person) deciding how to monetize or
> showcase this work. Written to be ingested standalone — it does not
> assume you can see the repo. Two halves, clearly split:
> **Part A is the honest internal assessment** (real state, blockers,
> what it'd cost to ship — no spin). **Part B is showcase-ready copy**
> you can lift verbatim. Don't blend them: A is for decisions, B is for
> audiences.
>
> *Compiled 2026-05-16 from a direct inspection of the repo + git
> history. Figures below are git-verified, not taken from the project's
> own marketing docs (which overstate in places — flagged where it
> matters).*

---

# PART A — Honest Internal Assessment

## TL;DR (the six lines that matter)

1. **What it is:** a location-based mobile RPG — every real bar near you
   is a procedurally-generated dungeon you fight through, claim, and
   defend for passive income. Diablo build-depth × Pokémon GO geography.
2. **Stage:** *advanced prototype.* The entire game-logic layer is built
   and tested; the full game loop is playable as a local web demo.
3. **Not shipped.** No production deployment, no backend provisioned,
   no users, no app-store presence, no revenue. Zero external traction.
4. **Build quality is genuinely high** for a solo prototype:
   deterministic tested core, server-authoritative anti-cheat, clean
   monorepo, CI green, ~409 passing tests.
5. **Blocked on two things:** a distribution decision (native vs web)
   and capital (~$100–150 to provision the accounts that unblock
   shipping). Neither is a technical problem.
6. **Most sellable asset is not "the game"** — it's the engine + design
   system + the demonstrated ability to ship a deep, tested, cheat-
   resistant game system fast. Frame accordingly (see Part B).

## Identity

| | |
|---|---|
| Name | BarBrawl |
| One-liner | Every real bar near you is a mini-dungeon: walk up, fight through it, claim it, station a defender, earn while you sleep. |
| Genre | Location-based RPG (Pokémon GO geography + Diablo/PoE build depth) |
| Owner | Single developer (you) |
| Built with | Claude Opus 4.7, collaboratively; **ported from your own prior web prototype** (`docs/prototype/barbrawl-v6.jsx` + a v6 design doc). The systems design is yours; the structured/tested implementation is AI-assisted. State this plainly when showcasing — it's a strength (you directed a deep build), not something to hide. |
| License/IP | Sole-owned, no third-party encumbrances observed in-repo. |

## Verified facts (git-checked, no spin)

| Metric | Value | Source |
|---|---|---|
| Commits | 52 | `git rev-list --count` |
| Active work days | **3** (Apr 21: 3 commits · Apr 23: 18 · May 10: 31) | `git log --date=short` |
| Elapsed calendar span | ~3 weeks (2026-04-21 → 2026-05-10) | git dates |
| Contributors | 1 | `git shortlog` |
| Tracked files | 198 (118 `.ts`, 39 `.tsx`, 13 `.md`, 8 `.json`, 7 `.sql`) | `git ls-files` |
| Source lines (TS/TSX, excl. deps) | ~21,000 | `wc -l` |
| Test suites / test cases | 33 suites / ~409 cases, all passing | repo |

> ⚠️ **Correction for the money-Claude:** the project's own
> `GAME_OVERVIEW.md` footer says "a single day … 20 commits, 356
> tests." Git says **3 work sessions over 3 weeks, 52 commits, ~409
> tests.** The real numbers are *more* impressive than the doc — but if
> you showcase this, use the git-verified figures, not the doc's, so a
> technical reviewer can't catch an inflation.

## Tech stack

- **Monorepo:** pnpm workspace.
- **`packages/game-core`** — pure, platform-agnostic TypeScript game
  logic. No React/RN imports; runs in Node, browser, or RN. 13 domain
  modules: combat, trees, loot, gating, progression, events,
  consumables, character, bars, geo, social, math, **security**.
  RNG is injected (deterministic + testable). DB-stable IDs preserved.
- **`apps/mobile`** — Expo SDK 52 / React Native (TS strict,
  expo-router). Full game loop runs today as a **web demo** with a
  hand-built pixel-art design system, Web Audio synth SFX, and
  localStorage persistence.
- **`supabase/`** — Postgres 16 + PostGIS, ordered migrations with RLS
  policies, 15-bar seed across NYC/SF/Austin, **4 Deno edge functions
  with bodies wired** (HMAC-verify + JWT + rate-limit prelude;
  battle-end re-derives state from the action log before awarding loot).
- **CI:** GitHub Actions — lint + typecheck + test on every PR, green.

## Depth of build — done vs not (honest)

**Built and tested (logic layer is real):**

- 7 playable classes, each with a *distinct resource meter + action
  economy* (not just stat reskins) — this is the genuinely good design
  work.
- 21 skill trees / 189 nodes — 43 active skills with typed action data,
  146 passive effects folded into live combat math, 6 keystone combat
  hooks.
- Full turn-based combat engine: 16 skill-action kinds, status effects
  (DoT/stun/buff/debuff), cooldowns, per-class resource generation,
  rhythm-input multipliers, consumables + auto-revive.
- Loot generator: 26 bases, 80 tiered affixes, 21 class anointments,
  deterministic rolls — drop distribution tested to spec within ±0.5%
  over 100k rolls.
- Metroidvania gating (resistance marks + VIP keys), defender/passive-
  income system, mastery, daily refresh, respec, world bosses, login
  streaks, seasonal stacking, Crawl Pass, leaderboards, deterministic
  daily room procgen.
- **Anti-cheat / server-authoritative layer:** WebCrypto HMAC request
  signing + replay-nonce, pure token-bucket rate limiting, GPS-spoof
  heuristics (speed/teleport/accuracy scoring), and a **battle
  validator that replays the action log through the live engine and
  rejects mismatched outcomes.** This is the single most commercially
  interesting piece of code in the repo.

**Not built (and why it matters for money):**

- ❌ No production deployment / no Supabase project provisioned.
- ❌ No real users, no traction, no revenue, no analytics — *there is
  zero market evidence here. Treat all revenue projections in the
  in-repo docs ($750K Y1 / $80M Y3) as aspiration, not data.*
- ❌ No app-store presence; native build path not exercised on a device.
- ❌ Art is placeholder (abstract pixel grids), not finished assets.
- ❌ Map/UI only exists as a web demo, gated on the native-vs-web call.
- ❌ Legal/operational layer is **entirely absent from code**: venue
  consent for "claiming" real named bars, liability/safety for sending
  users to bars, alcohol-adjacency under App Store / Play policy,
  location-privacy compliance. These are not bugs — they're unaddressed
  product risks (see Risks).

## Engineering quality assessment

**Strengths (these are real and rare for a solo prototype):**

- Clean separation of pure logic from platform — the core is reusable
  IP independent of how the game ships.
- Deterministic + RNG-injected + ~409 tests: the math is trustworthy
  and the system is *demonstrably* server-validatable.
- The anti-cheat design is mature: it assumes a hostile client and
  proves results by replay rather than trusting them.
- Spec-driven, with a decision record (`DESIGN_V1.md`) and disciplined
  pickup docs — this reads like someone who can run a project, not just
  write code.

**Caveats a buyer/employer/investor will (rightly) probe:**

- It is a prototype with **no shipped product and no users.** Depth of
  systems ≠ product-market fit. Don't let the polish of the docs imply
  traction.
- Single-contributor, AI-assisted, compressed timeline — impressive,
  but the showcase value is "this person can direct AI to build deep,
  correct systems fast," *not* "this is a battle-tested production
  codebase."
- The product concept carries non-trivial real-world risk (below) that
  no amount of code quality offsets.

## What's genuinely unique & valuable (the IP)

Ranked by how sellable it is *independent of the game ever shipping*:

1. **The deterministic, replay-validatable combat/loot engine +
   anti-cheat layer.** A server-authoritative system that proves
   outcomes by re-running the action log is directly reusable for *any*
   competitive/economy game. This is the crown jewel.
2. **The game-systems design itself** — 7 classes with distinct action
   economies, a 189-node tree, a PoE/Borderlands/Destiny hybrid affix
   system, Metroidvania geo-gating. This is portfolio-grade design work.
3. **The playable web demo** — a tangible artifact for any pitch,
   partnership, or "show, don't tell" conversation.
4. **The full written spec + decision records** — proof of product
   thinking, not just coding.
5. **The B2B hook (Bar Dashboard Pro)** — conceptually interesting but
   pre-product; treat as a narrative, not an asset.

## Monetization paths (ranked, realistic)

| # | Path | Capital to first $ | Honest odds | Notes |
|---|---|---|---|---|
| 1 | **Showcase to land paid work / contracts** (use the engine + demo as proof you ship deep tested systems) | ~$0 | **Highest ROI** | The most reliable money here is *your reputation*, not the game. Part B is built for this. |
| 2 | **License/sell the engine pattern** (deterministic replay-validated combat + anti-cheat) as a reusable module or paid consult to other game devs | low | Medium | Needs it extracted + documented as a product, not a game subsystem. |
| 3 | **Ship the game web-first** (Leaflet + free tiles, ~$0 infra) as a free cosmetic-monetized title | ~$0–50 | Medium-low | Cheapest path to a live product; revenue depends entirely on getting users, which is the unsolved problem. |
| 4 | **Raise / partner on the game** using the demo + spec | $0 to pitch | Low-medium | Possible but the legal/venue model is the hard question any serious party will ask first. |
| 5 | **Native store launch** | ~$125+/yr + art | Lowest near-term | Highest cost, highest risk, alcohol/location store-policy exposure. Defer. |

**Recommendation for the money-Claude:** lead with path 1, keep path 3
warm as the cheapest "make it real" option, and *do not* present the
in-repo revenue projections as evidence to anyone.

## Risks & liabilities (do not omit these in any pitch)

- **Venue consent / trademark:** "claiming" and renaming real,
  named bars without permission is a legal and PR exposure. The B2B
  dashboard is partly a mitigation but isn't built.
- **Safety/liability:** a game whose loop sends users to bars invites
  obvious duty-of-care and alcohol-association scrutiny — even with the
  (well-designed) sober-friendly Operator principle.
- **Platform policy:** Apple/Google have specific rules around
  alcohol-adjacent and location-based apps; not yet validated.
- **No traction:** every "this could be $80M" claim is unvalidated.
- **Key-person/AI provenance:** fine to disclose, but a serious
  acquirer will want to know what's reproducible without the original
  prototype + AI workflow.

## What it would take to ship (web-first, cheapest path)

1. Decide native-vs-web (web = ~$0 infra; the repo already documents
   the Leaflet/CartoDB swap and it matches your live Lucid Winds stack).
2. Provision a free-tier Supabase project, set 3 env vars, smoke-test
   the already-written `character-create` edge function.
3. Swap the demo's localStorage/Web-Audio shims for the web prod path.
4. Replace placeholder art (the single biggest *visible* quality jump;
   data-driven via two sprite/tile files).
5. Address the venue/legal model *before* any public launch.

Steps 2–4 are days of work, not architecture. Step 5 is the real gate.

---

# PART B — Showcase-Ready Copy (lift verbatim)

> Use these as-is for a portfolio, a pitch deck, a "what I've built"
> email, or an investor one-pager. All figures here are git-verified.

### One-line

> **BarBrawl** — a location-based RPG where every real bar is a
> procedurally-generated dungeon. Diablo-grade build depth on a Pokémon
> GO map, with a fully server-authoritative, cheat-resistant engine.

### Elevator (≈60 words)

> BarBrawl turns the bars around you into a persistent RPG world: walk
> to one, fight through procedurally-generated rooms, claim it, station
> a defender, and earn while you're away. Under the hood it's a
> deterministic, fully-tested combat and loot engine with a
> server-authoritative anti-cheat layer that validates every battle by
> replay. Playable end-to-end today as a web demo.

### Engineering highlight (for a technical audience)

> A pure, platform-agnostic TypeScript game core — 7 classes with
> distinct action economies, 21 skill trees (189 nodes), a
> PoE/Borderlands-style tiered affix loot system, and a 16-action
> combat engine — built deterministically with injected RNG and ~409
> passing tests across 33 suites. The standout is a server-authoritative
> anti-cheat layer: HMAC-signed requests with replay protection,
> GPS-spoof heuristics, and a battle validator that re-derives every
> outcome from the action log and rejects any mismatch. ~21K lines,
> CI-green, clean monorepo, ported from spec to tested code across three
> focused build sessions.

### Design highlight (for a product/games audience)

> Seven classes that play differently because each has its own resource
> meter and action economy — not stat reskins. A 189-node skill tree
> where every keystone carries a deliberate trade-off. Metroidvania
> progression mapped onto real-world geography via resistance marks and
> cross-bar VIP keys. A strict, baked-in ethics spec: zero pay-to-win,
> drinking always optional, server-authoritative by design.

### Provenance line (use this — honesty is the credibility)

> Designed by me from an original prototype; implemented collaboratively
> with Claude Opus 4.7 into a structured, tested codebase. Demonstrates
> the ability to take a deep game-systems vision and direct it to a
> correct, verifiable build quickly.

---

*End of dossier. For deeper detail the repo contains: `docs/BARBRAWL_SPEC.md`
(full spec), `docs/GAME_OVERVIEW.md` (system tour — note the inflated
footer), `docs/design/DESIGN_V1.md` (decision record), and
`packages/game-core/` (the sellable engine).*
