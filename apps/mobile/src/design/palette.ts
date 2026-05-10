// GBC-style palette for BarBrawl. We use a 16-color "stage" palette per
// scene — Game Boy Color's hardware allowed 32k onscreen but per-tile only
// 4 colors, which is what we lean into. Each bar theme defines its own
// 4-color tile palette + a shared UI palette for chrome.
//
// Aesthetic target: dark, neon-lit, barlight-warm. Black backgrounds with
// crunchy color blocks. PS1-Master-System-when-it-could-show-off vibes.

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

/* ─── per-bar-theme tile palettes (4 colors + transparent) ─────────
 * Convention: pal[0] = darkest, pal[3] = brightest. Transparent is `T`. */

export type TilePalette = readonly [string, string, string, string];

export const BAR_PALETTES = {
  dive: ['#1a0f08', '#3d2510', '#a06028', '#f8c878'] as const,    // amber/brown
  pub: ['#0a1a14', '#1d402a', '#5da870', '#c8f0a0'] as const,     // forest green
  sports: ['#0a0e22', '#1c2860', '#4870c8', '#a0c8f8'] as const,  // royal blue
  cocktail: ['#1a0a28', '#421860', '#9050d0', '#e0a8f8'] as const,// magenta-violet
  wine: ['#180810', '#400820', '#902848', '#e87898'] as const,    // burgundy
  brewery: ['#180e08', '#403018', '#c89048', '#f8e0a0'] as const, // hop-gold
  nightclub: ['#080820', '#400860', '#e000a0', '#f870f0'] as const,// neon pink
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
  steady:    '#f8c020', // Operator — gold sights
  brewer:    '#a07040', // Bouncer — leather jacket
  vintner:   '#a040c0', // Hexwright — purple sigil
  shaker:    '#e8e8e8', // Duelist — silver blade
  orchardist:'#60c870', // Medic — emerald cross
  drifter:   '#5870b0', // Ghost — slate cloak
  gambler:   '#e04050', // Gambler — red felt / cards
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
