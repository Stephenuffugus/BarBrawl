# BarBrawl

Location-based mobile RPG where every real bar is a mini-dungeon.
Walk to a bar, fight through procedurally generated rooms, claim
it, leave a defender, earn while you sleep.

> **Design is locked.** See [`docs/BARBRAWL_SPEC.md`](docs/BARBRAWL_SPEC.md)
> for the complete spec. Non-negotiable principles live in §1 of
> that document and govern every implementation choice.

## Repo layout

```
apps/
  mobile/         React Native + Expo client (the game)
supabase/
  migrations/     Postgres 16 + PostGIS schema
  functions/      Deno Edge Functions (server-authoritative game logic)
docs/
  BARBRAWL_SPEC.md          Full design + technical spec
  CLAUDE_QUICKSTART.md      How to work with Claude Code on this repo
  prototype/                Reference v6 web prototype (source of truth for content)
  references/               External research notes (map integration, etc.)
.github/workflows/ci.yml    Lint + typecheck + test on every PR
```

## Getting started

1. **External accounts.** Read [`SETUP.md`](SETUP.md) first — it
   lists the accounts and API keys you need to provision before the
   app can actually run (Supabase, Mapbox, Expo/EAS, Google Places,
   etc.).
2. **Local dev.**
   ```bash
   pnpm install

   # Mobile
   cd apps/mobile
   cp .env.example .env      # fill in values from SETUP.md
   pnpm start

   # Supabase (optional; only needed when working on server code)
   supabase start
   ```
3. **CI.** Every PR runs lint + typecheck + tests. Keep them green.

## Build order

Follow `docs/BARBRAWL_SPEC.md` §12 phase-by-phase. Phase 0 (this
commit) scaffolds the repo. Phase 1 is auth + character creation.

## Principles (never compromise)

1. Zero pay-to-win — cosmetics only, forever.
2. Drinking is optional — the Steady class is equally viable.
3. Any character can attempt any bar.
4. Bars are fixed identities; enemies scale to the player.
5. Power comes from depth, not underleveled enemies.
6. Daily midnight reset.
7. Server-authoritative — never trust the client.

See spec §1 for the full list.
