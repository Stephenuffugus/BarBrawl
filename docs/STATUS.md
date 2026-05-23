# STATUS — pick-up notes

> **Read this first when resuming work on BarBrawl.** It's the shortest
> path from "what state is the repo in?" to "what should I do next?".

## Playtest deploy (live URL)

**Live now:** https://stephenuffugus.github.io/BarBrawl/

GitHub Pages serves from the `deploy` branch. Pipeline:

1. Push to `main` (changes under `apps/mobile/**`, `packages/game-core/**`,
   `pnpm-lock.yaml`, or the workflow itself).
2. `.github/workflows/deploy-hostinger.yml` runs on a GitHub runner:
   builds the Expo web bundle with `baseUrl=/BarBrawl`, copies
   `apps/mobile/web/.htaccess` into dist, touches `.nojekyll`, then
   orphan-commits + force-pushes `apps/mobile/dist/` to the `deploy`
   branch.
3. GitHub Pages auto-publishes the new `deploy` commit (~30-90 sec).

Why this stack:
- Codespace can't reach Hostinger (their firewall drops our outbound IP).
- Hostinger Git pull worked but mis-located files; spent ~6h on path
  fights and gave up. The `apps/mobile/web/.htaccess` is kept in tree
  in case the Hostinger path gets revisited.
- GitHub Pages is free, no secrets to manage, repo had to be flipped
  to PUBLIC for free-plan Pages (was private).
- The workflow name still says "deploy-hostinger" — leave it, the file
  is the live deploy pipeline regardless of where it ships.

Why `.nojekyll`: GitHub Pages defaults to Jekyll, which silently drops
folders starting with `_`. The Expo bundle lives in `_expo/`, so the
JS 404s without that marker.

`https://lucidwinds.com/barbrawl/` was the original target but
abandoned — Hostinger never pulled into a path that matched what
Apache serves. Possible follow-up: Cloudflare redirect from
`lucidwinds.com/barbrawl/*` → the github.io URL, or fix the Hostinger
Git install path with the leading-slash convention the Lucid Winds
deploy uses (`/public_html/barbrawl`).

## Playtest feedback (2026-05-23, first hands-on)

User loaded the live URL and surfaced two real issues:

1. **Rhythm bar isn't visibly tappable.** The whole `<Pressable>`
   wraps the meter but reads as decoration. The "TAP IN THE GOLD"
   caption is too quiet. Tracked as task 8 — needs button affordance.
2. **Tile-grid map is wrong direction.** Spec calls for a real-world
   map with GPS + nearby bars (location-based RPG). User has working
   Leaflet + CartoDB Voyager in Lucid Winds — port that pattern here.
   Tracked as task 9.

## Plan of attack

See [docs/PLAN_OF_ATTACK.md](./PLAN_OF_ATTACK.md) — phased build-out
from demo to shippable. Foundation → Backend → Polish → Distribution.

## Where we are

**Mobile demo runs end-to-end on web with deep mechanics surfaced.**
Full loop: Title → Map (camera-following Pokemon town with 4 tiered
bars) → Preview (bar context + tier/damage gating) → Dungeon (3-room
Pokemon-style crawl) → Battle (PS1-literal layout + rhythm input +
skill panel + ITEM consumables + status effect chips + per-class
resource bar) → Victory flash → Rewards (scaled XP/gold/loot from
daily-refresh × first-conquer × tier modifiers, real loot drop, mark
drop on tier-3+ wins) → Defender placement → Territory → back to Map
(claimed bars pulse gold).

**Every spec system from game-core has UI now.** Including:
- 7-class roster with persistent allocations, equipment, mastery
- 21 skill trees (D2-style, prereq lines), respec for level² gold
- Full battle: rhythm × skills × consumables × status effects
- Multi-character party: bring a backup, SWAP mid-fight, shared XP
- Loot: rolls + equip + sell + Resistance Marks + VIP keys
- Metroidvania gating: tier 4+ requires matching mark
- VIP keys: ~30% drop on tier-3+, consume for 2× reward runs
- Defender stationing + decay + coin claim + recall
- Mastery (49 tracks) + Daily Quests + Login Streak
- Crawl Pass tier progression + World Boss alert
- Battle Replay viewer (step / autoplay / reset)
- Bar nomination form (player-submitted bars with dedup validator)
- Patrol enemies in dungeons (skirmish encounters, +25 XP each)

`apps/mobile/` shipped:
- **Design system** (`src/design/`): GBC palette per bar theme, scale
  tokens, sprite catalog (32×32 enemies, 48×48 boss), tile catalog +
  overworld map (12×18 with 4 tiered bars), dungeon room layouts.
- **Components** (`src/components/`): PixelGrid, PixelText, Panel,
  HpBar (animated drain), MenuList, RhythmBar (1.2s marker), SkillPanel,
  ConsumablePanel, TreeGraph (D2-style), NodeDetailPanel, Tilemap,
  PlayerSprite (2-frame walk), DPad, ShakeFlash, VictoryFlash,
  ResourceBar (per-class), StatusRow (effect chips), ClaimMarker
  (pulsing gold over claimed bars).
- **Audio** (`src/audio/sfx.ts`): Web Audio synth, 11 patches generated
  inline. Lazy AudioContext + auto-resume + persistent mute toggle.
- **State** (`src/state/`): Zustand persist middleware via
  portableStorage. Persists roster (7 chars), inventory, gold,
  respecTokens, equipped, claimedBars, marks, barClears, loginStreak,
  dailyQuests, crawlPassXp, audioMuted, lastBattle. Actions: setActive,
  allocateNode (SP-capped), awardXp (+ Crawl Pass + token grant on
  level milestones), bumpMastery, earnMark, equipItem, unequipSlot,
  consumeItem, sellItem, claimBar, stationDefender, collectBarCoins,
  registerLogin, rollDailyQuestsIfNeeded, applyBattleToQuests,
  claimDailyQuest, respecCharacter, recordBarClear, saveLastBattle,
  toggleMuted. effective-stats.ts folds equipped affixes into combat.
- **Screens** (`app/`): index (title with mute toggle, Crawl Pass
  progress strip, login streak chip, world boss alert ribbon), map
  (camera-following 12×18 overworld, claimed bars pulse, tier badges),
  preview (bar context + boss preview, locked panel for tier 4+
  without mark), dungeon (3-room walkable interior, themed per bar),
  battle (PS1 layout, FIGHT/SKILL/ITEM/RUN, rhythm bar, status chips,
  resource bar, attacker pose, theme backdrop), tree (D2 graph,
  respec link), roster (7 classes with effective stats + slot
  chips), inventory (rarity cards, EQUIP+SELL, marks panel), rewards
  (real loot + bar-claim status), defender (pick from 7 to station),
  territory (claimed bars + HP decay + CLAIM coins + RECALL), mastery
  (7×7 tracks with progress bars), quests (3 daily + login streak
  header + claim XP), respec (gold or token), replay (step/autoplay
  through last battle log).
  damage flash + sprite shake + screen vignette on hit, victory flash,
  reads effective stats), tree (D2 graph with prereq lines, allocate
  with SP cap), roster (7 classes with stats + equipped slot chips),
  inventory (rarity-tinted cards, slot filters, EQUIP), rewards (real
  loot panel, BAR CLAIMED status), defender (pick from 7 to station).

**Phase 0 complete** (commit `968e9d5`). Scaffold is live:

- Monorepo: pnpm workspace, `apps/mobile` + `supabase/` + `packages/game-core`
- Mobile: Expo SDK 52, TS strict, expo-router, theme tokens ported,
  spec §8 deps declared, EAS profiles defined
- DB: PostGIS + all core tables + RLS policies from spec §8,
  three ordered migrations in `supabase/migrations/`
- CI: `.github/workflows/ci.yml` — pnpm, Node 20, lint + typecheck + test
- Docs: spec, quickstart, prototype source, map-integration notes,
  `SETUP.md` with external-account checklist

**Design Proposal v1 landed (uncommitted).** `docs/design/DESIGN_V1.md`
is the diff against the spec covering: reskinned 7-class roster (alcohol
theming dropped — memory `feedback_no_alcohol_typing.md`), PoE/D2/Borderlands
hybrid affix loot system, Metroidvania gear-gating via resistance marks + VIP
keys, Helldivers-style open-raid beacons (deferred to v1.5), and a "no
blockchain for launch" position with Back Bar Market in-game trading.
User signed off on all four load-bearing decisions. Gambler added as 7th
class (Summoner deferred to post-launch class expansion).

**`packages/game-core` is live and fully populated.** What's ported:

- `src/types.ts` — Class / Resource / ActionEconomy / SkillNode typed
- `src/classes.ts` — All 7 classes (Operator, Bouncer, Hexwright, Duelist,
  Medic, Ghost, Gambler) with new names, preserved DB IDs and stat spreads,
  distinct resource + action-economy per class
- `src/math/damage.ts` — spec §5.3 damage formula, pure, RNG injected
- `src/math/xp.ts` — spec §5.6 XP curve + level-up gains + applyXp
- `src/trees/` — **All 21 trees fully ported** (189 nodes). Drink-theme
  flavor stripped. Gambler's 3 trees are brand-new content (Dice/Cards/
  House). Node IDs preserved for DB stability.
- `src/loot/` — Full affix generator:
  - 26 item bases across weapon/outfit/footwear/trinket, each with an
    implicit mod that defines its identity
  - Tiered affix pool: 20 concepts × 4 tiers = 80 affixes, gated by ilvl
  - 21 class anointments (3 per class) each referencing a real skill-tree
    node — Legendary-only "build items" (Borderlands BL3 pattern)
  - Pure `rollItem()` with injected RNG. Distribution tested to spec §5.9
    (60/27/9/3/1) within ±0.5% over 100k rolls.
- `src/gating/` — Metroidvania gating:
  - 8 damage types, mapped per bar theme (reconciled with DB's 7 bar types)
  - 7 resistance marks (one per damage type)
  - 7 VIP keys (one per bar theme)
  - `canSurviveTier`, `canEnterVIPRoom`, `barThemeUnlocked` pure resolvers
- `src/character/` — `createLevel1Character`, `createStarterRoster`,
  `toRuntime`. Produces DB row shapes + in-memory runtime with per-level
  stat scaling from spec §5.6.
- `src/combat/` — **Turn engine now fully wired.** Has:
  - `BattleState`/`Combatant`/`PlayerAction` types
  - `initBattle`, `applyPlayerAction`, `advanceTurn`, `endBattle`
  - **Full SkillAction dispatcher**: 16 action kinds (attack, multi_hit,
    aoe_attack, heal, skip_enemy, buff, debuff, dodge_boost, block,
    charge, apply_all_statuses, wager_coin_flip, chip_consume_attack,
    random_multiplier_attack, aoe_skip, reveal_and_nerf, swap_hp_pct,
    random_from_pool)
  - `SKILL_ACTIONS` registry covering 42 active skill nodes + OLDEST
    TRICK keystone (43 entries). Balance numbers preserved from the v6
    prototype; any value I chose has a `// BALANCE:` comment.
  - Status resolver with DoT tick, stun skip, buff/debuff sums into
    effective stats. Cooldowns decrement per-actor turn. Tempo decays.
  - Per-class resource generation rules (Focus/Grit/Curse Stacks/Tempo/
    Reserve/Momentum/Chips) triggered on turn_start, crit, action,
    damage_taken, perfect_rhythm, dodge, overheal.
  - **Full passive-effect system**: 146 non-active nodes (smalls,
    notables, passive keystones) mapped to structured `PassiveEffect`
    data. Resolver folds flat + pct stats, per-level scaling,
    conditional modifiers (HP thresholds, enemy count, curse state),
    crit overrides (allCrit / noCrit / critMultOverride), dmg-taken
    reductions, immunities, revive-once, HP floor. Keystones apply
    their balance companion (fo_9 -40% ATK, ho_9 -20% DEF, hu_9 -20%
    other-stats, etc.) automatically.
  - Passives are consumed live in `deriveEffectiveStats` during every
    hit — conditional effects (Fresh Shift HP>80%, Cornered HP<30%,
    Read Room 2+ enemies) re-evaluate each swing.
  - **6 keystone combat hooks** fire during attack resolution:
    BROKEN BOTTLE auto-applies Bleed every hit, THIRD STRIKE forces
    crit every 3rd attack, Opening Strike crits the first hit of
    battle, Bullseye ignores 50% DEF on crit, OUTBREAK converts
    direct damage to 3-turn poison, vs-status-dmg multipliers
    (Analyze +10% vs marked, Marked For Pain +25% vs cursed).
- `src/consumables/` — spec §5.8 catalog (7 items) + in-combat resolver
  (heal_pct, buff_self, cleanse, auto_revive). Auto-revive on defeat
  triggers when HP would hit 0, restores to hpPct of maxHp, consumes
  the marker (once per battle).
- `src/progression/` —
  - spec §5.7 bar-type mastery bonuses (4 tiers, folded into `toRuntime`)
  - spec §1.6 daily-refresh reward scaling (1.0/0.5/0.25x by clear
    number, timezone-aware)
  - spec §5.5 defender system: `stationAsDefender`, `decayDefender`
    (5% max HP/day), `accrueCoins` (2/hr, 75/day account cap),
    `awardPassiveXP` (15% of attacker), `collapseDefender` payout,
    recall cooldown + max-7-per-account enforcement.
- **Class-specific action economies wired**:
  - Bouncer `absorb`: consume turn → bank +1 action next turn (enemy
    gets a free swing while Bouncer winds up).
  - Ghost `spd_trade`: halve current SPD for an immediate bonus action.
  - Duelist 3-perfect streak: consecutive perfect-rhythm hits bank a
    bonus action (streak resets on any non-perfect).
  - `advanceTurn` checks counters before passing to the next actor;
    player stays active while `bonus_actions_pending` > 0.
- `src/bars/` — spec §5.4 daily 3-5 room procgen from ROOMS_BY_TYPE
  catalog, seeded deterministically by (bar_id, dateKey).
- `src/events/` — Weekly world bosses (Titans with 48h window,
  contribution-tier rewards), daily login streaks with milestone
  rewards at 3/7/14/30 days, seasonal challenges with multiplicative
  XP/gold effect stacking (renamed "Sober October" → "Operator's Month"
  to match class reskin), Crawl Pass 50-tier XP progression.
- `src/geo/` — Haversine distance, `isWithinRadius` (spec §8.2 100m
  default), `nearbyBars`, GPS-fix validity check. Pattern matches
  Lucid Winds per memory.
- `src/social/` — Leaderboards: rank, regional grouping, top-N tier
  badges, paginated lookup, user-rank-in-region.
- `src/consumables/crafting.ts` — 8 recipes for consumable crafting.
  tryCraft picks lowest-ilvl components to protect player's best gear.
- `src/progression/quests.ts` — 14-quest daily catalog; seeded daily
  rotation per user; threshold + accumulator quest kinds.
- `src/progression/respec.ts` — `level² gold` cost formula, token
  grants every 10 levels; typed errors for insufficient funds.
- `src/progression/battle-summary.ts` — translates finalized
  `BattleState` → `BattleSummary` for quest progress hooks.
- `src/security/` — **anti-cheat layer** (new):
  - `hmac.ts` — WebCrypto HMAC-SHA256 request signing, replay-protection
    nonce store interface, in-memory store, constant-time compare.
  - `rate-limit.ts` — pure token-bucket with pluggable storage; per-route
    DEFAULT_LIMITS calibrated to spec §8.3 (battle.action 1/500ms etc.).
  - `gps.ts` — speed-of-travel + teleport + accuracy + timestamp
    heuristics, sliding-window scoring; suspicion in [0,1].
  - `battle-validator.ts` — replays a battle from (initialState, actions[])
    through the live combat engine, compares vs claimed final. result +
    HP equality is load-bearing; loot is rolled post-validate.
  - `seeded-rng.ts` — Mulberry32 seeded RNG used by validator + edge
    functions for deterministic per-action streams.
- `src/bars/nomination.ts` — **bar nomination + owner claim flow** (new):
  - `validateNomination` — name+address+type+coord validation, geo+name
    dedup against existing bars/nominations (Sørensen-Dice bigram).
  - `createClaim`/`verifyClaim`/`approveClaim`/`rejectClaim` — owner
    claim state machine (pending → verified → approved/rejected/expired)
    with one-time challenge tokens, 30-day TTL, 4 challenge methods.
- **408 unit tests pass** across 33 suites. Root `pnpm -r typecheck` +
  `pnpm -r lint` + `pnpm -r test` all green.

**Supabase additions:**
- `supabase/migrations/20260423000001_add_gambler_class.sql` — extends
  the `characters.class_id` CHECK constraint to allow 'gambler'.
- `supabase/migrations/20260423000002_items.sql` — account-bound items
  table with equipped_character_id, equipped_slot, chain_asset_id
  (schema-forward for blockchain hook), unique-equipped-per-slot index,
  and RLS policies.
- `supabase/migrations/20260510000001_battle_state_and_owner_claims.sql`
  — extends `battles` with `seed`/`status`/`state_json`/
  `initial_state_json`/`action_log`/`updated_at` (replay + validator
  support); adds `bar_owner_claims` table with RLS for spec §5.11.
- `supabase/seed.sql` — 15 mock bars across NYC, SF, Austin covering
  all 7 bar types. Applied by `supabase db reset`.
- `supabase/functions/` — 4 edge functions, **bodies wired** (no longer
  stubs). character-create, battle-start, battle-action, battle-end all
  use the standard prelude (HMAC verify + JWT auth + rate-limit) and
  re-export game-core via `_shared/game-core.ts`. battle-end re-derives
  the final state from the action log via `validateBattleLog` before
  awarding loot/XP. `import_map.json` aliases `@barbrawl/game-core` to
  the workspace source. Deno-runtime; not typecked locally.

**Mobile build fixes:**
- eslint downgraded from `^9.0.0` to `^8.57.0` + `@typescript-eslint/*`
  from `^8` to `^7.18` to restore legacy `.eslintrc.js` support. Lint
  now passes workspace-wide.

**CI lint fixed.** eslint was downgraded from ^9 to ^8.57 with matching
@typescript-eslint ^7.18 — mobile's legacy `.eslintrc.js` now works and
`pnpm -r lint` passes workspace-wide.

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
- [ ] Phase 1: Auth & Character Creation — **bootstrap logic done**; blocked on Supabase project for table writes
- [ ] Phase 2: Map View with Mock Bars — **data (seed) done**; blocked on distribution decision for map lib
- [x] Phase 3: Skill Trees — **data layer complete** (21 trees, 189 nodes, 146 passives + 43 active actions). UI TBD.
- [x] Phase 4: Single-Player Combat — **engine complete** (SkillAction dispatch, passives, keystone hooks, status, cooldowns, resources, consumables, auto-revive). UI + rhythm input wiring TBD.
- [x] Phase 5: Rewards, XP & Loot — **generator + items table complete**. Endpoint wiring TBD.
- [ ] Phase 6: Real Bars via Google Places — blocked on Google Cloud + cost
- [x] Phase 7: Defender System — **logic complete** (station, decay, coins, XP, recall). Edge function + UI TBD.
- [x] Phase 8: Consumables — **catalog + resolver + crafting complete**. Stash/pack UI TBD.
- [ ] Phase 9: Cosmetics Shop — blocked on RevenueCat (real money, defer)
- [ ] Phase 10: Bar Claiming & Owner Dashboard — workflow/UI concern
- [x] Phase 11: Social & Leaderboards — **ranking logic complete**. UI TBD.
- [x] Phase 12: Global Events — **world boss + seasonal + Crawl Pass math complete**. UI + scheduler TBD.
- [x] Phase 13a: Anti-cheat layer — **HMAC signing, rate limit, GPS spoof, battle validator complete**. Plumbed into edge function prelude.
- [x] Phase 13b: Edge function bodies — **all 4 wired** (character-create, battle-start, battle-action, battle-end). Deploy-ready pending Supabase project + env (`BB_HMAC_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- [x] Phase 13c: Bar nomination + owner claim — **logic + DB schema complete**. Submission flow + admin review UI TBD.
- [x] Phase 13d: Mobile UI demo — **full game loop playable on web**. Title → Map → Preview → Dungeon → Battle → Victory → Rewards → Defender placement → Map. Real game-core engine throughout (rhythm classifier, applyPlayerAction, advanceTurn, applyXp, rollItem). Audio synthesized inline. Persistence via localStorage. Equipment + tree allocations affect combat.
- [ ] Phase 13: Polish, Balancing & Beta
- [ ] Phase 14: Launch

## Outstanding asks to the user (resume prompt)

When you come back to this project, answer these and we can move:

1. **Distribution target?** Native only / web only / both / still TBD?
2. **Ready to run `SETUP.md` checklist?** (Mostly blocked on capital.)

**The game-core logic layer is substantially complete.** Phases 3, 4, 5,
7, 8, 11, 12 are green at the logic layer. Remaining work is UI + infra
(blocked on distribution target + Supabase project) plus minor content
additions.

When you pick this back up, the depth layer is essentially complete.
Remaining work is **art, infra, or polish** rather than systems:

1. **Real character + enemy + tile sprite art**. The placeholder
   PixelGrid sprites work but are abstract. Replacing them with
   actual Pokemon Red-style art would visually 10× the demo. Feeds
   via `apps/mobile/src/design/sprites.ts` and `tiles.ts` strings —
   change the data, not the components.
2. **Distribution target decision** — still the load-bearing blocker
   for native shipping. Web demo runs as-is; native build needs the
   audio swap (expo-av + .wav files) and `@react-native-async-storage/
   async-storage` swap in `state/storage.ts`.
3. **First edge function deployed end-to-end** — bodies are written
   and `import_map.json` is in place. Smoke-test character-create
   against a real Supabase project.
4. **Open raid system** (post-launch v1.5) — design sketch in DESIGN_V1.md.
5. **Cosmetics shop** ($, RevenueCat) — deferred until launch infra.
6. **Bar Dashboard Pro** ($29/mo B2B) — venue owner onboarding.

Data additions still welcome (more anointments, world-boss tiers,
quest variants, cosmetics) but not blockers.

Data additions welcome but not blockers: more class anointments, quest
variants, cosmetic rewards, world-boss tiers.

## How to drop back in with Claude

Short pickup prompt for future sessions:

> Read `docs/STATUS.md` first. The game-core logic layer is
> substantially complete (see "Where we are"). Most remaining work is
> UI + infra (rhythm input, map rendering, edge function deploy) and
> is gated on the distribution target decision + Supabase project.
> If you say "keep going", default to the ordered list under
> "When you pick this back up".
