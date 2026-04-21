# supabase/

Postgres 16 + PostGIS schema + Edge Functions for BarBrawl.

## Layout

- `migrations/` — SQL migrations, applied in filename order by the
  Supabase CLI.
- `functions/` — Deno Edge Functions (Phase 4+).
- `seed.sql` — local-only seed data.
- `config.toml` — Supabase project config for `supabase start`.

## Local dev

```bash
# One-time
brew install supabase/tap/supabase   # or the platform equivalent
supabase init                        # only if config.toml is missing

# Start a local stack (Postgres + Studio + Auth + Storage)
supabase start

# Apply migrations
supabase db reset    # wipes + reapplies all migrations + seed
```

## Production

The production project is created in the Supabase dashboard (see
`../SETUP.md`). Once created, link the repo and push migrations:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Schema source of truth

All schema changes start in the spec (`docs/BARBRAWL_SPEC.md` §8),
land as a migration here, then ship. Never modify the production
schema via the dashboard — always go through a migration.
