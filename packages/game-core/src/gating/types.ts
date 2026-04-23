// Metroidvania gating model — design doc §3.
//
// Three orthogonal gate mechanisms:
//   1. Resistance marks  — trinket/mark slot items that enable survival
//      at Tier 4+ of a bar-theme's damage type.
//   2. VIP keys          — consumable items that unlock a bar's sealed
//      post-boss dungeon floor.
//   3. Mastery tier gates — handled separately in spec §5.7 bar mastery.
//
// The resolver functions are pure. Combat/inventory state lives elsewhere;
// game-core only describes the data and eligibility rules.

import type { BarType } from '../types';

export type DamageType =
  | 'physical'
  | 'blunt'
  | 'sonic'
  | 'toxic'
  | 'impact'
  | 'shadow'
  | 'heat'
  | 'edged';

// Bar themes map 1:1 to BarType from core types. DESIGN_V1.md §3.1 used
// placeholder names (speakeasy, craft) that didn't match the DB schema;
// this reconciles to the DB's 7 types, preserving design intent.
export const BAR_THEME_DAMAGE: Readonly<Record<BarType, DamageType>> = Object.freeze({
  dive: 'blunt',       // chairs, fists
  pub: 'edged',        // darts, broken pint glass
  sports: 'impact',    // thrown projectiles, pool balls
  cocktail: 'toxic',   // concoction burns, DoT elixirs
  wine: 'shadow',      // sommelier hexes, cellar curses
  brewery: 'heat',     // fermenter blasts, kiln hazards
  nightclub: 'sonic',  // strobe, bass wave, sound blasts
});

export interface ResistanceMark {
  id: string;
  name: string;
  against: DamageType;
  /** Fractional resistance, 0..1. 0.5+ required to survive Tier 4+. */
  strength: number;
  description: string;
}

export interface VIPKey {
  id: string;
  name: string;
  forBarTheme: BarType;
  /** Keys are consumed on use. */
  consumeOnUse: true;
  description: string;
}

/** Minimum resistance strength needed to survive Tier 4+ content. */
export const SURVIVAL_THRESHOLD = 0.5;

/** Below this tier, no gating — everyone can enter. */
export const GATING_BEGINS_AT_TIER = 4;
