# STATUS — pick-up notes

> **Read this first when resuming work on BarBrawl.** It's the shortest
> path from "what state is the repo in?" to "what should I do next?".

## Where we are

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
- **217 unit tests pass** across 17 suites. Root `pnpm -r typecheck` +
  `pnpm -r lint` + `pnpm -r test` all green.

**Supabase additions:**
- `supabase/migrations/20260423000001_add_gambler_class.sql` — extends
  the `characters.class_id` CHECK constraint to allow 'gambler'.
- `supabase/migrations/20260423000002_items.sql` — account-bound items
  table with equipped_character_id, equipped_slot, chain_asset_id
  (schema-forward for blockchain hook), unique-equipped-per-slot index,
  and RLS policies.
- `supabase/seed.sql` — 15 mock bars across NYC, SF, Austin covering
  all 7 bar types. Applied by `supabase db reset`.
- `supabase/functions/` — 4 edge-function skeletons (character-create,
  battle-start, battle-action, battle-end) with typed request/response
  contracts and documented integration shape with game-core.

**Mobile build fixes:**
- eslint downgraded from `^9.0.0` to `^8.57.0` + `@typescript-eslint/*`
  from `^8` to `^7.18` to restore legacy `.eslintrc.js` support. Lint
  now passes workspace-wide.

**CI lint is broken (pre-existing, not my changes).** `apps/mobile`
ships `eslint ^9.0.0` but keeps legacy `.eslintrc.js`; ESLint 9 requires
flat-config `eslint.config.js`. `pnpm -r typecheck` and `pnpm -r test`
both pass. Fix options: (a) downgrade to `eslint ^8.57` + matching
`@typescript-eslint ^7`, or (b) migrate mobile to `eslint.config.js`
flat config. Small scope, not touched without user say-so.

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
- [x] Phase 7: Defender System — **logic complete** (station, decay, coins, XP, recall). Edge function + UI TBD.
- [x] Phase 8: Consumables — **catalog + resolver complete**. Stash/pack UI TBD.
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
3. **Commit the uncommitted work?** (pnpm-lock, design doc, game-core.)
4. **Fix the broken mobile lint?** Downgrade to eslint 8 is the minimal fix.

**Immediate next-turn work queue (all portable, path A):**

1. **Rhythm UI + input wiring** — client-side: rhythm bar animation,
   tap detection, RhythmQuality classification. Mobile/web split.
   Needs the distribution-target decision.
2. **First edge function deployed end-to-end** — pick one (character-
   create is simplest), wire `supabase/functions/import_map.json`,
   deploy, smoke-test. Blocked on Supabase project.
3. **Daily quest system** — spec §5.6 mentions 3 rotating daily quests
   awarding 25-150 XP each. Pure generator + completion detector.
4. **Consumables crafting** — combine N rare loot items into a consumable
   (spec §5.8 sources mention crafting).
5. **Bar room procgen** — spec §5.4. Daily 3-5 rooms from bar's pool
   using (bar_id, date) seed. Already sketched in prototype; port to
   game-core as a pure function.
6. **Open raid stubs** (post-Phase-7) — data model only, deferred.

The logic layer of the game is now largely complete. The gates are
distribution-target, Supabase project (both blocked on user/capital),
and client UI work.

## How to drop back in with Claude

Short pickup prompt for future sessions:

> Read `docs/STATUS.md` first. The repo is paused at end-of-Phase-0.
> Pick up from the "Recommended next steps" section. Default to
> path A unless I say otherwise.
