// Consumable type model — spec §5.8.
//
// Consumables are packed before a bar run (up to 4) and used in-battle
// without ending a turn. Used consumables are consumed regardless of
// battle outcome; unused ones return to stash.
//
// Per DESIGN_V1.md the drink flavor is kept on consumables as "inventory
// props." Names come straight from the spec.

import type { Rarity } from '../loot/types';

export type ConsumableEffect =
  // Heal a percentage of max HP.
  | { kind: 'heal_pct'; pct: number }
  // Apply a timed self-buff that multiplies a stat.
  | { kind: 'buff_self'; stat: 'atk' | 'def' | 'crit_chance'; pct: number; turns: number }
  // Remove all debuffs/DoTs from self.
  | { kind: 'cleanse' }
  // If the next lethal hit happens, revive at hpPct. One per battle.
  | { kind: 'auto_revive'; hpPct: number };

export interface ConsumableDef {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  effect: ConsumableEffect;
}
