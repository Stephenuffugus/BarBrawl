// GBC-style palette for Wild Wardens. We use a 16-color "stage" palette per
// scene — Game Boy Color's hardware allowed 32k onscreen but per-tile only
// 4 colors, which is what we lean into. Each venue theme defines its own
// 4-color tile palette + a shared UI palette for chrome.
//
// Aesthetic target: lush, sunlit garden greenery — earthy soils, blooming
// flowers, dappled leaf-light, mossy stone. Soft natural color blocks that
// feel overgrown and alive, with a gentle storybook-botanical warmth.

/* ─── universal palette ─────────────────────────────────────────── */

export const VOID = '#000000';

/** Shared chrome — text, borders, HP bar, menu chevron. Used everywhere. */
export const UI = {
  bg: '#000000',          // pure black void (PS1 battle background)
  text: '#f8f8f8',        // off-white, kinder on the eye than #fff
  textDim: '#888098',     // greyed menu items
  border: '#f8f8f8',      // 1-px chrome around panels
  borderDark: '#202028',  // inner shadow line
  panelFill: '#101018',   // dark fill behind panels
  hpFull: '#74e070',      // GBC-green HP bar at 100%
  hpHalf: '#f8c020',      // amber when below 50%
  hpLow: '#f04040',       // red when below 25%
  cursor: '#f8b800',      // GBC-gold menu chevron
  shadow: '#202028',
} as const;

/* ─── per-venue tile palettes (4 colors + transparent) ─────────────
 * Convention: pal[0] = darkest, pal[3] = brightest. Transparent is `T`. */

export type TilePalette = readonly [string, string, string, string];

export const BAR_PALETTES = {
  dive: ['#0e1a0a', '#2c4818', '#6ca038', '#e8e070'] as const,    // Wild Meadow — earthy greens + wildflower yellow
  pub: ['#1a1410', '#4a3a28', '#a87858', '#f8c0d0'] as const,     // Cottage Garden — warm soil + cozy floral pink
  sports: ['#0a1e0c', '#1d5028', '#48b050', '#b8f088'] as const,  // Community Park — bright park greens
  cocktail: ['#280a18', '#701030', '#d04068', '#f8a8c0'] as const,// Rose Garden — deep rose reds + petal pink
  wine: ['#1a0e08', '#4a2810', '#b06828', '#f0c060'] as const,    // Old Orchard — bark brown + amber apple
  brewery: ['#081a14', '#185038', '#40b078', '#c0f8c8'] as const, // Greenhouse — glass-green + bright leaf
  nightclub: ['#060a20', '#142858', '#3858a8', '#f8d860'] as const,// Moonlit Grove — night blues + firefly gold
} satisfies Record<string, TilePalette>;

export type BarThemeId = keyof typeof BAR_PALETTES;

/* ─── enemy / character palette ──────────────────────────────────
 * Classes share a body palette; per-class accent recolors a single index. */

export const BODY = {
  outline: '#000000',
  skinDark: '#582818',
  skinMid: '#a06038',
  skinLight: '#e0a070',
  hairDark: '#181010',
  hairMid: '#403028',
  cloth: '#181828',
  clothLight: '#384060',
} as const;

/** Class accents — replaces the single "accent" color in body sprites. */
export const CLASS_ACCENT = {
  steady:    '#f0d040', // The Operator — sunflower gold
  brewer:    '#7a5838', // The Bulwark — sturdy bark brown
  vintner:   '#9850b8', // The Hexwright — foxglove violet
  shaker:    '#e8f0e0', // The Duelist — pale dewy silver-green
  orchardist:'#58c060', // The Medic — healing leaf green
  drifter:   '#6080a0', // The Ghost — misty slate-blue
  gambler:   '#e07840', // The Forager — ripe-berry orange
} as const;

/* ─── helpers ───────────────────────────────────────────────────── */

/**
 * Resolve a sprite character to a hex color. Sprite encoding convention:
 *   "."         — transparent (skip)
 *   "0".."3"    — bar-theme tile palette indices
 *   "T".."Z"    — body sprite slots (see BODY_SLOTS)
 *   "K"         — outline / black
 *   "@"         — class accent (substituted by caller)
 */
export const BODY_SLOTS = {
  T: BODY.outline,
  S: BODY.skinDark,
  s: BODY.skinMid,
  L: BODY.skinLight,
  H: BODY.hairDark,
  h: BODY.hairMid,
  C: BODY.cloth,
  c: BODY.clothLight,
} as const;

export function colorAt(
  ch: string,
  tile: TilePalette,
  accent: string,
): string | null {
  if (ch === '.' || ch === ' ') return null;
  if (ch === 'K') return BODY.outline;
  if (ch === '@') return accent;
  if (ch >= '0' && ch <= '3') return tile[Number(ch) as 0|1|2|3];
  if (ch in BODY_SLOTS) return BODY_SLOTS[ch as keyof typeof BODY_SLOTS];
  return null;
}
