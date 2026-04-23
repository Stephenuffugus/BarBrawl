// Bar-type mastery — spec §5.7. Per character, per bar type: tier bonuses
// at 1/5/15/30 conquer counts. Tier 4 (30 clears) also unlocks a title.
//
// mastery is stored in DB as characters.mastery jsonb, e.g.
//   { "dive": 7, "pub": 20, "brewery": 3 }
//
// Compute(mastery) → CombatStats modifier folded into the passive system.

import type { BarType } from '../types';

export interface MasteryTierBonus {
  hp: number;
  atk: number;
  def: number;
  /** Optional title unlock — display only. */
  title?: string;
}

export const MASTERY_TIERS: readonly { conquersRequired: number; bonus: MasteryTierBonus }[] = Object.freeze([
  { conquersRequired: 1,  bonus: { hp: 1,  atk: 0, def: 0 } },
  { conquersRequired: 5,  bonus: { hp: 5,  atk: 0, def: 1 } },
  { conquersRequired: 15, bonus: { hp: 15, atk: 1, def: 2 } },
  { conquersRequired: 30, bonus: { hp: 30, atk: 2, def: 3, title: 'Master' } },
]);

export interface MasteryModifier {
  hp: number;
  atk: number;
  def: number;
  titles: readonly string[];
}

function emptyMod(): MasteryModifier {
  return { hp: 0, atk: 0, def: 0, titles: [] };
}

/**
 * Compute cumulative mastery bonuses for one bar type given N conquers.
 * Each tier crossed adds its bonus on top of the previous (not replacement).
 */
export function bonusesForBarType(conquers: number): MasteryModifier {
  const mod = emptyMod();
  const titles: string[] = [];
  for (const tier of MASTERY_TIERS) {
    if (conquers >= tier.conquersRequired) {
      mod.hp += tier.bonus.hp;
      mod.atk += tier.bonus.atk;
      mod.def += tier.bonus.def;
      if (tier.bonus.title) titles.push(tier.bonus.title);
    }
  }
  return { ...mod, titles };
}

/** Sum bonuses across all 7 bar types for a character. */
export function masteryBonuses(
  mastery: Readonly<Record<string, number>>,
  typedBarType?: readonly BarType[],
): MasteryModifier {
  const mod = emptyMod();
  const titles: string[] = [];
  const types = typedBarType ?? (Object.keys(mastery) as BarType[]);
  for (const t of types) {
    const conquers = mastery[t] ?? 0;
    const tMod = bonusesForBarType(conquers);
    mod.hp += tMod.hp;
    mod.atk += tMod.atk;
    mod.def += tMod.def;
    titles.push(...tMod.titles.map((title) => `${title} of ${t}`));
  }
  return { ...mod, titles };
}

/** Next tier threshold for a bar-type track (for UI progress display). */
export function nextMasteryTier(conquers: number): { target: number; bonus: MasteryTierBonus } | null {
  for (const tier of MASTERY_TIERS) {
    if (conquers < tier.conquersRequired) return { target: tier.conquersRequired, bonus: tier.bonus };
  }
  return null;
}
