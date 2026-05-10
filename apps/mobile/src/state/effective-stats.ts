// Compute a character's effective stats given base + equipped items.
// Demo-grade: sums flat-stat + simple pct-stat affixes from equipped
// items' implicit, prefixes, and suffixes. Anointments and conditional
// passives are out of scope for this layer (the combat engine handles
// those at battle-time via passive-resolver).

import type { Loot } from '@barbrawl/game-core';
import { getClass, type ClassId } from '@barbrawl/game-core';
import type { EquippedSlots } from './game-store';

export interface EffectiveStats {
  hp: number; atk: number; def: number; spd: number; luck: number;
}

const ZERO: EffectiveStats = { hp: 0, atk: 0, def: 0, spd: 0, luck: 0 };

function applyEffect(into: EffectiveStats, effect: Loot.EffectPayload, base: EffectiveStats): void {
  switch (effect.type) {
    case 'flatStat':
      into[effect.stat] += effect.value;
      return;
    case 'pctStat': {
      // pct of BASE stat (not running total) — matches passive resolver.
      const target = effect.stat;
      if (target === 'atk' || target === 'def' || target === 'hp' || target === 'spd' || target === 'luck') {
        into[target] += Math.floor((base[target] * effect.value) / 100);
      }
      return;
    }
    default:
      // crit/dodge/lifesteal/etc — battle engine handles them via passives.
      return;
  }
}

export function computeEffectiveStats(
  classId: ClassId,
  level: number,
  equipped: EquippedSlots,
  inventory: readonly Loot.Item[],
): EffectiveStats {
  const cls = getClass(classId);
  const base: EffectiveStats = {
    hp:   cls.baseStats.hp + (level - 1) * 6,
    atk:  cls.baseStats.atk + (level - 1) * 2,
    def:  cls.baseStats.def + (level - 1) * 1,
    spd:  Math.floor(cls.baseStats.spd + (level - 1) * 0.5),
    luck: cls.baseStats.luck,
  };

  const bonus: EffectiveStats = { ...ZERO };
  const slots: Loot.ItemSlot[] = ['weapon', 'outfit', 'footwear', 'trinket', 'mark'];
  for (const slot of slots) {
    const itemId = equipped[slot];
    if (!itemId) continue;
    const item = inventory.find((it) => it.id === itemId);
    if (!item) continue;
    applyEffect(bonus, item.implicit, base);
    for (const a of item.prefixes) applyEffect(bonus, a.effect, base);
    for (const a of item.suffixes) applyEffect(bonus, a.effect, base);
  }

  return {
    hp:   base.hp + bonus.hp,
    atk:  base.atk + bonus.atk,
    def:  base.def + bonus.def,
    spd:  base.spd + bonus.spd,
    luck: base.luck + bonus.luck,
  };
}
