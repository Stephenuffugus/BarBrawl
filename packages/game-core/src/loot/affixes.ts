import type { AffixDef, AffixTag, AffixTier, EffectPayload, ItemSlot } from './types';

// Tiered affix pool — D2/PoE-style.
//
// Each concept exposes 4 tiers; higher tiers gate behind higher item level.
// Weights drop sharply with tier so T4 rolls are endgame chase.
//
// Tier gates (item-level minimums):
//   T1 -> 1    (always eligible)
//   T2 -> 20
//   T3 -> 50
//   T4 -> 80
//
// Tier weights (relative probability once eligible):
//   T1: 100, T2: 50, T3: 20, T4: 5
//
// When generating an item at high ilvl, lower tiers are also eligible — but
// higher tiers are included in the weighted pool, so over many rolls a small
// fraction land T4.

export const TIER_ILVL_GATES: Readonly<Record<AffixTier, number>> = Object.freeze({
  1: 1,
  2: 20,
  3: 50,
  4: 80,
});

export const TIER_WEIGHTS: Readonly<Record<AffixTier, number>> = Object.freeze({
  1: 100,
  2: 50,
  3: 20,
  4: 5,
});

const ALL_SLOTS: readonly ItemSlot[] = Object.freeze([
  'weapon', 'outfit', 'footwear', 'trinket', 'mark',
]);

const WEAPON_OR_OUTFIT: readonly ItemSlot[] = Object.freeze(['weapon', 'outfit']);
const NOT_MARK: readonly ItemSlot[] = Object.freeze(['weapon', 'outfit', 'footwear', 'trinket']);

interface Concept {
  idBase: string;
  tag: AffixTag;
  name: string;
  slots: readonly ItemSlot[];
  perTier: (tier: AffixTier) => { effectText: string; effect: EffectPayload };
}

const CONCEPTS: readonly Concept[] = [
  // Flat stat suffixes ("of X")
  {
    idBase: 'of_might',
    tag: 'suffix',
    name: 'of Might',
    slots: WEAPON_OR_OUTFIT,
    perTier: (t) => {
      const v = [4, 8, 14, 22][t - 1] ?? 0;
      return { effectText: `+${v} ATK`, effect: { type: 'flatStat', stat: 'atk', value: v } };
    },
  },
  {
    idBase: 'of_endurance',
    tag: 'suffix',
    name: 'of Endurance',
    slots: NOT_MARK,
    perTier: (t) => {
      const v = [20, 40, 70, 120][t - 1] ?? 0;
      return { effectText: `+${v} HP`, effect: { type: 'flatStat', stat: 'hp', value: v } };
    },
  },
  {
    idBase: 'of_the_wall',
    tag: 'suffix',
    name: 'of the Wall',
    slots: NOT_MARK,
    perTier: (t) => {
      const v = [2, 4, 7, 12][t - 1] ?? 0;
      return { effectText: `+${v} DEF`, effect: { type: 'flatStat', stat: 'def', value: v } };
    },
  },
  {
    idBase: 'of_the_fox',
    tag: 'suffix',
    name: 'of the Fox',
    slots: NOT_MARK,
    perTier: (t) => {
      const v = [2, 3, 5, 8][t - 1] ?? 0;
      return { effectText: `+${v} SPD`, effect: { type: 'flatStat', stat: 'spd', value: v } };
    },
  },
  {
    idBase: 'of_the_cat',
    tag: 'suffix',
    name: 'of the Cat',
    slots: NOT_MARK,
    perTier: (t) => {
      const v = [3, 6, 10, 15][t - 1] ?? 0;
      return { effectText: `+${v} LUCK`, effect: { type: 'flatStat', stat: 'luck', value: v } };
    },
  },
  // Percent crit
  {
    idBase: 'of_crit',
    tag: 'suffix',
    name: 'of Crit',
    slots: NOT_MARK,
    perTier: (t) => {
      const v = [3, 6, 10, 15][t - 1] ?? 0;
      return { effectText: `+${v}% crit chance`, effect: { type: 'critChance', value: v } };
    },
  },
  {
    idBase: 'of_finesse',
    tag: 'suffix',
    name: 'of Finesse',
    slots: NOT_MARK,
    perTier: (t) => {
      const v = [3, 5, 8, 12][t - 1] ?? 0;
      return { effectText: `+${v}% skill multiplier`, effect: { type: 'skillMult', value: v } };
    },
  },
  {
    idBase: 'of_thorns',
    tag: 'suffix',
    name: 'of Thorns',
    slots: ['outfit', 'trinket'],
    perTier: (t) => {
      const v = [3, 6, 10, 15][t - 1] ?? 0;
      return { effectText: `Reflect ${v} damage`, effect: { type: 'reflect', value: v } };
    },
  },
  {
    idBase: 'of_the_shadow',
    tag: 'suffix',
    name: 'of the Shadow',
    slots: ['outfit', 'footwear', 'trinket'],
    perTier: (t) => {
      const v = [3, 5, 8, 12][t - 1] ?? 0;
      return { effectText: `+${v}% dodge`, effect: { type: 'dodge', value: v } };
    },
  },
  {
    idBase: 'of_vigor',
    tag: 'suffix',
    name: 'of Vigor',
    slots: ['outfit', 'trinket'],
    perTier: (t) => {
      const v = [1, 2, 3, 5][t - 1] ?? 0;
      return { effectText: `+${v}% HP regen/turn`, effect: { type: 'regen', value: v } };
    },
  },
  {
    idBase: 'of_fortune',
    tag: 'suffix',
    name: 'of Fortune',
    slots: ALL_SLOTS,
    perTier: (t) => {
      const v = [5, 10, 15, 25][t - 1] ?? 0;
      return { effectText: `+${v}% gold`, effect: { type: 'gold', value: v } };
    },
  },
  {
    idBase: 'of_study',
    tag: 'suffix',
    name: 'of Study',
    slots: ALL_SLOTS,
    perTier: (t) => {
      const v = [5, 10, 15, 25][t - 1] ?? 0;
      return { effectText: `+${v}% XP`, effect: { type: 'xp', value: v } };
    },
  },
  {
    idBase: 'of_the_leech',
    tag: 'suffix',
    name: 'of the Leech',
    slots: ['weapon', 'trinket'],
    perTier: (t) => {
      const v = [2, 4, 7, 10][t - 1] ?? 0;
      return { effectText: `${v}% lifesteal`, effect: { type: 'lifesteal', value: v } };
    },
  },
  // Prefixes
  {
    idBase: 'brutal',
    tag: 'prefix',
    name: 'Brutal',
    slots: ['weapon'],
    perTier: (t) => {
      const v = [5, 10, 15, 25][t - 1] ?? 0;
      return { effectText: `+${v}% damage`, effect: { type: 'pctStat', stat: 'damage', value: v } };
    },
  },
  {
    idBase: 'honed',
    tag: 'prefix',
    name: 'Honed',
    slots: ['weapon'],
    perTier: (t) => {
      const v = [5, 10, 15, 25][t - 1] ?? 0;
      return { effectText: `+${v}% crit damage`, effect: { type: 'pctStat', stat: 'critDmg', value: v } };
    },
  },
  {
    idBase: 'swift',
    tag: 'prefix',
    name: 'Swift',
    slots: ['footwear', 'outfit'],
    perTier: (t) => {
      const v = [5, 10, 15, 25][t - 1] ?? 0;
      return { effectText: `+${v}% SPD`, effect: { type: 'pctStat', stat: 'spd', value: v } };
    },
  },
  {
    idBase: 'heavy',
    tag: 'prefix',
    name: 'Heavy',
    slots: ['outfit'],
    perTier: (t) => {
      const v = [10, 15, 20, 30][t - 1] ?? 0;
      return { effectText: `+${v}% DEF`, effect: { type: 'pctStat', stat: 'def', value: v } };
    },
  },
  {
    idBase: 'trained',
    tag: 'prefix',
    name: 'Trained',
    slots: ['weapon', 'trinket'],
    perTier: (t) => {
      const v = [5, 10, 15, 25][t - 1] ?? 0;
      return { effectText: `-${v}% cooldowns`, effect: { type: 'cooldown', value: v } };
    },
  },
  {
    idBase: 'blooded',
    tag: 'prefix',
    name: 'Blooded',
    slots: ['weapon'],
    perTier: (t) => {
      const v = [2, 4, 7, 10][t - 1] ?? 0;
      return { effectText: `${v}% lifesteal`, effect: { type: 'lifesteal', value: v } };
    },
  },
  {
    idBase: 'reinforced',
    tag: 'prefix',
    name: 'Reinforced',
    slots: ['outfit', 'footwear'],
    perTier: (t) => {
      const v = [10, 20, 35, 60][t - 1] ?? 0;
      return { effectText: `+${v} HP`, effect: { type: 'flatStat', stat: 'hp', value: v } };
    },
  },
];

function expandConcept(c: Concept): readonly AffixDef[] {
  return ([1, 2, 3, 4] as const).map<AffixDef>((tier) => {
    const { effectText, effect } = c.perTier(tier);
    return {
      id: `${c.idBase}_t${tier}`,
      tag: c.tag,
      tier,
      name: c.name,
      effectText,
      effect,
      ilvlMin: TIER_ILVL_GATES[tier],
      weight: TIER_WEIGHTS[tier],
      slotEligibility: c.slots,
    };
  });
}

export const AFFIX_POOL: readonly AffixDef[] = Object.freeze(
  CONCEPTS.flatMap(expandConcept),
);

export function affixesEligible(opts: {
  slot: ItemSlot;
  tag?: AffixTag;
  ilvl: number;
}): readonly AffixDef[] {
  return AFFIX_POOL.filter((a) => {
    if (!a.slotEligibility.includes(opts.slot)) return false;
    if (opts.tag && a.tag !== opts.tag) return false;
    if (a.ilvlMin > opts.ilvl) return false;
    return true;
  });
}
