// Pixel scale + screen layout constants. We render every "pixel" as a
// View of size PIXEL. A 16x16 sprite at PIXEL=4 occupies 64 logical px.
//
// Why 4: lets a 64x64 enemy sprite (16x16 pixel grid × 4) fit comfortably
// on a 390-wide phone with room for chrome. Bigger PIXEL = chunkier but
// less screen real estate.
//
// On a tablet we'd bump PIXEL to 6. v1 ignores tablet.

export const PIXEL = 4;

/** Sprite grid sizes (in pixels — multiply by PIXEL for screen size). */
export const TILE_PX = 16;        // 16x16 tile (Pokemon Red default)
export const ENEMY_PX = 32;       // 32x32 enemy sprite (PS-style chunky)
export const BOSS_PX = 48;        // 48x48 boss sprite

/** Screen-side helpers. */
export const tileSize = TILE_PX * PIXEL;   // 64 logical px
export const enemySize = ENEMY_PX * PIXEL; // 128 logical px
export const bossSize = BOSS_PX * PIXEL;   // 192 logical px

/** Battle layout — proportional, fits a 390x844 phone with room to breathe. */
export const BATTLE_LAYOUT = {
  topPad: 24,
  enemyAreaHeight: 240,
  logHeight: 88,
  hudHeight: 132,
  panelGap: 8,
} as const;

/** Pixel font fallback. We'll swap for a real 8-bit font later. */
export const PIXEL_FONT = {
  family: 'Courier',  // monospace fallback that exists everywhere
  weight: '700' as const,
  letterSpacing: 1,
} as const;
