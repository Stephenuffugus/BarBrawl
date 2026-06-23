// Art drop-in registry.
//
// This is the single seam between externally-made art (Midjourney / ChatGPT /
// a pixel artist) and the running game. Drop a transparent PNG into
// `apps/mobile/assets/sprites/` following the naming convention in
// `docs/ART_SPEC.md`, then add ONE line to `SPRITE_ASSETS` below:
//
//     bramble_idle: require('../../assets/sprites/bramble_idle.png'),
//
// Everything renders with the procedural PixelGrid placeholders until a real
// asset is registered here. Registering a key makes PixelGrid (and any caller
// that goes through `resolveSpriteAsset`) prefer the image automatically — no
// call-site changes required.
//
// Keys are free-form art keys (NOT stable game ids). They map onto game data
// at the call site. Keep them lowercase_snake_case and aligned with the file
// name (minus extension) so the registry reads like the asset folder.

import type { ImageSourcePropType } from 'react-native';

/**
 * Registered image assets, keyed by sprite key.
 *
 * INTENTIONALLY EMPTY by default: with no entries the whole game falls back to
 * the procedural placeholder sprites and still builds + renders. Add entries as
 * art lands. Metro bundles each `require`d PNG at build time.
 *
 * Example (uncomment + drop the matching file in to activate):
 *   steady_idle: require('../../assets/sprites/steady_idle.png'),
 *   meadow_floor: require('../../assets/sprites/meadow_floor.png'),
 */
export const SPRITE_ASSETS: Record<string, ImageSourcePropType> = {
  // (no art registered yet — see docs/ART_SPEC.md)
};

export type SpriteAssetKey = keyof typeof SPRITE_ASSETS;

/**
 * Look up a registered image asset for a sprite key.
 * Returns `undefined` when no art exists for that key, signalling callers to
 * use their procedural placeholder instead.
 */
export function resolveSpriteAsset(key: string | undefined): ImageSourcePropType | undefined {
  if (!key) return undefined;
  return SPRITE_ASSETS[key];
}

/** True when a real image is registered for this sprite key. */
export function hasSpriteAsset(key: string | undefined): boolean {
  return resolveSpriteAsset(key) !== undefined;
}
