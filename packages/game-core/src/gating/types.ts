// Metroidvania gating model — design doc §3.
//
// Three orthogonal gate mechanisms:
//   1. Wards            — trinket/ward slot items that enable survival
//      at Tier 4+ of a habitat's wild element.
//   2. Gate keys        — consumable items that open a habitat's hidden
//      inner grove beyond its keeper trial.
//   3. Mastery tier gates — handled separately in spec §5.7 habitat mastery.
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

// Habitat themes map 1:1 to BarType from core types. DESIGN_V1.md §3.1 used
// placeholder names that didn't match the DB schema;
// this reconciles to the DB's 7 types, preserving design intent.
export const BAR_THEME_DAMAGE: Readonly<Record<BarType, DamageType>> = Object.freeze({
  dive: 'blunt',       // Wild Meadow — tangled brambles, falling boughs
  pub: 'edged',        // Cottage Garden — thorns, sharp hedge growth
  sports: 'impact',    // Community Park — windfall, rolling stones
  cocktail: 'toxic',   // Rose Garden — pollen haze, lingering sap
  wine: 'shadow',      // Old Orchard — deep shade, blighted hollows
  brewery: 'heat',     // Greenhouse — sun-glass swelter, steam vents
  nightclub: 'sonic',  // Moonlit Grove — windsong, resonant night air
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
  /** Gate keys are consumed on use. */
  consumeOnUse: true;
  description: string;
}

/** Minimum resistance strength needed to survive Tier 4+ content. */
export const SURVIVAL_THRESHOLD = 0.5;

/** Below this tier, no gating — everyone can enter. */
export const GATING_BEGINS_AT_TIER = 4;
