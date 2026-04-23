# @barbrawl/game-core

Pure, platform-agnostic game logic. No React Native, no Expo, no DOM. Runs
in Node, React Native, or browser.

## Scope

- Class definitions (7 archetypes: Operator, Bouncer, Hexwright, Duelist,
  Medic, Ghost, Gambler — DB IDs unchanged from spec §8).
- Skill tree data (~189 nodes — 7 classes × 3 trees × 9 nodes).
- Combat math: damage formula (spec §5.3), rhythm multipliers, crit roll.
- Progression math: XP curve (spec §5.6), level gains.
- Loot: item base definitions, affix pools, rarity rolls, item generator.
- Metroidvania gating types: resistance marks, keys, class gates.

## Explicitly out of scope

- UI rendering (SVG trees, battle screens, etc.)
- Combat state machine / turn engine (lives in edge functions)
- GPS / map logic
- Supabase / network
- Enemy AI

## Design rules

1. All functions pure where possible. RNG is injected, never imported.
2. No mutation of inputs. Builders return fresh objects.
3. Effects are described as typed data, not executed here. The combat
   engine (elsewhere) interprets them.
4. 80%+ unit test coverage on damage, XP, loot math (spec §10).

## Directory

- `src/types.ts` — Type system. Start here.
- `src/classes.ts` — Class roster + resources + action economies.
- `src/trees/` — Skill tree data, one file per class.
- `src/math/` — Damage, XP, crit, rhythm calculations.
- `src/loot/` — Item bases, affix pools, roll functions (next phase).
- `src/gating/` — Resistance/key definitions (next phase).
