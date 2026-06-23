import type { ItemBase } from './types';

// Item base pool. Each base has a slot + one implicit mod that gives it its
// identity. Implicits are uniform across rarities — they're what makes a
// "Work Gloves" different from a "Heavy Rake" before any affixes roll.
//
// Categories let the roller bias drops (e.g., "gritty/melee" for overgrown lots).

const weapons: readonly ItemBase[] = [
  {
    id: 'brass_knuckles',
    slot: 'weapon',
    name: 'Work Gloves',
    implicitText: '+15% bare-hand work',
    implicit: { type: 'implicitUnarmed', value: 15 },
    category: 'melee_light',
  },
  {
    id: 'bar_stool',
    slot: 'weapon',
    name: 'Heavy Rake',
    implicitText: '+20% topple chance',
    implicit: { type: 'implicitStun', value: 20 },
    category: 'melee_heavy',
  },
  {
    id: 'bottle',
    slot: 'weapon',
    name: 'Pruning Shears',
    implicitText: '+10% lingering trim on hit',
    implicit: { type: 'implicitBleed', value: 10 },
    category: 'melee_light',
  },
  {
    id: 'cue_stick',
    slot: 'weapon',
    name: 'Long Pruning Pole',
    implicitText: '+12% damage at long reach',
    implicit: { type: 'implicitReach', value: 12 },
    category: 'melee_reach',
  },
  {
    id: 'pool_ball_sock',
    slot: 'weapon',
    name: 'Seed Sack',
    implicitText: '±30% damage variance',
    implicit: { type: 'implicitVariance', value: 30 },
    category: 'melee_heavy',
  },
  {
    id: 'switchblade',
    slot: 'weapon',
    name: 'Grafting Knife',
    implicitText: '+15% crit chance',
    implicit: { type: 'critChance', value: 15 },
    category: 'melee_light',
  },
  {
    id: 'flask',
    slot: 'weapon',
    name: 'Seed Pouch',
    implicitText: '+20% tossed reach',
    implicit: { type: 'implicitThrow', value: 20 },
    category: 'thrown',
  },
  {
    id: 'mic_stand',
    slot: 'weapon',
    name: 'Garden Hoe',
    implicitText: '+15% topple chance',
    implicit: { type: 'implicitStun', value: 15 },
    category: 'melee_reach',
  },
  {
    id: 'chain',
    slot: 'weapon',
    name: 'Coiled Vine',
    implicitText: '+10% reach, wraps around',
    implicit: { type: 'implicitReach', value: 10 },
    category: 'melee_reach',
  },
  {
    id: 'crowbar',
    slot: 'weapon',
    name: 'Digging Bar',
    implicitText: 'Ignores 10% DEF',
    implicit: { type: 'pctStat', stat: 'damage', value: 10 },
    category: 'melee_heavy',
  },
];

const outfits: readonly ItemBase[] = [
  {
    id: 'leather_jacket',
    slot: 'outfit',
    name: 'Canvas Smock',
    implicitText: '+6 DEF',
    implicit: { type: 'flatStat', stat: 'def', value: 6 },
    category: 'armor_medium',
  },
  {
    id: 'flannel',
    slot: 'outfit',
    name: 'Quilted Vest',
    implicitText: '+15 HP',
    implicit: { type: 'flatStat', stat: 'hp', value: 15 },
    category: 'armor_light',
  },
  {
    id: 'hoodie',
    slot: 'outfit',
    name: 'Sun Hood',
    implicitText: '+5% dodge',
    implicit: { type: 'dodge', value: 5 },
    category: 'armor_light',
  },
  {
    id: 'bar_apron',
    slot: 'outfit',
    name: "Gardener's Apron",
    implicitText: '+1 consumable slot',
    implicit: { type: 'pctStat', stat: 'luck', value: 5 },
    category: 'utility',
  },
  {
    id: 'trench_coat',
    slot: 'outfit',
    name: 'Oilskin Coat',
    implicitText: '+10 DEF, -2 SPD',
    implicit: { type: 'flatStat', stat: 'def', value: 10 },
    category: 'armor_heavy',
  },
  {
    id: 'dress_shirt',
    slot: 'outfit',
    name: 'Tailored Field Coat',
    implicitText: '+8% crit damage',
    implicit: { type: 'pctStat', stat: 'critDmg', value: 8 },
    category: 'armor_light',
  },
];

const footwear: readonly ItemBase[] = [
  {
    id: 'work_boots',
    slot: 'footwear',
    name: 'Garden Boots',
    implicitText: '+4 DEF',
    implicit: { type: 'flatStat', stat: 'def', value: 4 },
  },
  {
    id: 'sneakers',
    slot: 'footwear',
    name: 'Trail Shoes',
    implicitText: '+3 SPD',
    implicit: { type: 'flatStat', stat: 'spd', value: 3 },
  },
  {
    id: 'combat_boots',
    slot: 'footwear',
    name: 'Mud Boots',
    implicitText: '+5 DEF, +1 SPD',
    implicit: { type: 'flatStat', stat: 'def', value: 5 },
  },
  {
    id: 'dress_shoes',
    slot: 'footwear',
    name: 'Polished Clogs',
    implicitText: '+10% crit chance',
    implicit: { type: 'critChance', value: 10 },
  },
  {
    id: 'loafers',
    slot: 'footwear',
    name: 'Woven Sandals',
    implicitText: '+2 SPD, +5% dodge',
    implicit: { type: 'dodge', value: 5 },
  },
];

const trinkets: readonly ItemBase[] = [
  {
    id: 'pocket_watch',
    slot: 'trinket',
    name: 'Sundial Charm',
    implicitText: '+5% cooldown reduction',
    implicit: { type: 'cooldown', value: 5 },
  },
  {
    id: 'lighter',
    slot: 'trinket',
    name: 'Polished Trowel Charm',
    implicitText: '+3% crit chance',
    implicit: { type: 'critChance', value: 3 },
  },
  {
    id: 'dog_tags',
    slot: 'trinket',
    name: 'Acorn Pendant',
    implicitText: '+8 HP',
    implicit: { type: 'flatStat', stat: 'hp', value: 8 },
  },
  {
    id: 'medallion',
    slot: 'trinket',
    name: 'Pressed Leaf Locket',
    implicitText: '+5% XP',
    implicit: { type: 'xp', value: 5 },
  },
  {
    id: 'keychain',
    slot: 'trinket',
    name: 'Seed Ring',
    implicitText: '+5% gold',
    implicit: { type: 'gold', value: 5 },
  },
  {
    id: 'lucky_ring',
    slot: 'trinket',
    name: 'Four-Leaf Charm',
    implicitText: '+4 LUCK',
    implicit: { type: 'flatStat', stat: 'luck', value: 4 },
  },
];

export const ITEM_BASES: readonly ItemBase[] = Object.freeze([
  ...weapons,
  ...outfits,
  ...footwear,
  ...trinkets,
]);

export const ITEM_BASE_BY_ID: Readonly<Record<string, ItemBase>> = Object.freeze(
  ITEM_BASES.reduce<Record<string, ItemBase>>((acc, b) => {
    acc[b.id] = b;
    return acc;
  }, {}),
);

export function basesForSlot(slot: ItemBase['slot']): readonly ItemBase[] {
  return ITEM_BASES.filter((b) => b.slot === slot);
}
