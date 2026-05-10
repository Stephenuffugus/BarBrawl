// Deno entry-point for @barbrawl/game-core.
//
// Edge functions import what they need from this module. All re-exports
// resolve to the workspace package via the `import_map.json` alias
// `@barbrawl/game-core`. At runtime Deno reads import_map and points it
// at `../../packages/game-core/src/index.ts`.
//
// Why a single shim instead of importing directly in each function:
// - Lets us version game-core access (today: source; tomorrow: bundled
//   `dist/` if cold-start matters).
// - Centralizes the surface so each function file stays tiny.
// - Type errors on Deno-specific paths only show up here.

// @ts-expect-error — resolved by import_map.json at deploy time.
export * from '@barbrawl/game-core';
