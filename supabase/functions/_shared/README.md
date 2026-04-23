# Supabase Edge Functions — scaffolding

These are Deno-runtime functions that wrap `@barbrawl/game-core` logic
with Supabase auth + persistence. Spec §8.3 defines the endpoint set.

## Status

**Skeleton only.** Each folder has a `index.ts` that declares its Request/
Response contract and shows the integration shape. None are deployed.

**Before first deploy:**

1. Set up `supabase/functions/import_map.json` aliasing
   `@barbrawl/game-core` to a bundled build of the package. Options:
   - Build game-core to `dist/` then import the compiled output.
   - Or import source files directly with a Deno-friendly entry point.
2. Wire up auth header extraction + `createClient` with the user's JWT.
3. Move shared helpers (cors, auth, error handlers) into
   `supabase/functions/_shared/`.

## Endpoints

| Route | Purpose | Body | Returns |
|---|---|---|---|
| `POST /character/create` | Create the 7-character starter roster for a new user | — | character IDs |
| `POST /battle/start` | Begin a bar run | `{ barId, characterId }` | initial `BattleState` |
| `POST /battle/action` | Submit a player action | `{ battleId, action }` | new `BattleState` |
| `POST /battle/end` | Finalize battle, roll rewards | `{ battleId }` | `{ xp, gold, itemIds }` |

The request/response shapes live in each function's `index.ts` as TypeScript
types that exactly match `@barbrawl/game-core` types.
