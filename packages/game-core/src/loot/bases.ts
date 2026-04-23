import type { ItemBase } from './types';

// Item base pool. Each base has a slot + one implicit mod that gives it its
// identity. Implicits are uniform across rarities — they're what makes a
// "Brass Knuckles" different from a "Bar Stool" before any affixes roll.
//
// Categories let the roller bias drops (e.g., "gritty/melee" for Dive bars).

const weapons: readonly ItemBase[] = [
  {
    id: 'brass_knuckles',
    slot: 'weapon',
    name: 'Brass Knuckles',
    implicitText: '+15% unarmed damage',
    implicit: { type: 'implicitUnarmed', value: 15 },
    category: 'melee_light',
  },
  {
    id: 'bar_stool',
    slot: 'weapon',
    name: 'Bar Stool',
    implicitText: '+20% stagger chance',
    implicit: { type: 'implicitStun', value: 20 },
    category: 'melee_heavy',
  },
  {
    id: 'bottle',
    slot: 'weapon',
    name: 'Broken Bottle',
    implicitText: '+10% bleed on hit',
    implicit: { type: 'implicitBleed', value: 10 },
    category: 'melee_light',
  },
  {
    id: 'cue_stick',
    slot: 'weapon',
    name: 'Cue Stick',
    implicitText: '+12% damage at long reach',
    implicit: { type: 'implicitReach', value: 12 },
    category: 'melee_reach',
  },
  {
    id: 'pool_ball_sock',
    slot: 'weapon',
    name: 'Pool Ball Sock',
    implicitText: '±30% damage variance',
    implicit: { type: 'implicitVariance', value: 30 },
    category: 'melee_heavy',
  },
  {
    id: 'switchblade',
    slot: 'weapon',
    name: 'Switchblade',
    implicitText: '+15% crit chance',
    implicit: { type: 'critChance', value: 15 },
    category: 'melee_light',
  },
  {
    id: 'flask',
    slot: 'weapon',
    name: 'Heavy Flask',
    implicitText: '+20% thrown damage',
    implicit: { type: 'implicitThrow', value: 20 },
    category: 'thrown',
  },
  {
    id: 'mic_stand',
    slot: 'weapon',
    name: 'Mic Stand',
    implicitText: '+15% stun chance',
    implicit: { type: 'implicitStun', value: 15 },
    category: 'melee_reach',
  },
  {
    id: 'chain',
    slot: 'weapon',
    name: 'Coiled Chain',
    implicitText: '+10% reach, hits wrap around',
    implicit: { type: 'implicitReach', value: 10 },
    category: 'melee_reach',
  },
  {
    id: 'crowbar',
    slot: 'weapon',
    name: 'Crowbar',
    implicitText: 'Ignores 10% DEF',
    implicit: { type: 'pctStat', stat: 'damage', value: 10 },
    category: 'melee_heavy',
  },
];

const outfits: readonly ItemBase[] = [
  {
    id: 'leather_jacket',
    slot: 'outfit',
    name: 'Leather Jacket',
    implicitText: '+6 DEF',
    implicit: { type: 'flatStat', stat: 'def', value: 6 },
    category: 'armor_medium',
  },
  {
    id: 'flannel',
    slot: 'outfit',
    name: 'Flannel Shirt',
    implicitText: '+15 HP',
    implicit: { type: 'flatStat', stat: 'hp', value: 15 },
    category: 'armor_light',
  },
  {
    id: 'hoodie',
    slot: 'outfit',
    name: 'Hoodie',
    implicitText: '+5% dodge',
    implicit: { type: 'dodge', value: 5 },
    category: 'armor_light',
  },
  {
    id: 'bar_apron',
    slot: 'outfit',
    name: 'Bar Apron',
    implicitText: '+1 consumable slot',
    implicit: { type: 'pctStat', stat: 'luck', value: 5 },
    category: 'utility',
  },
  {
    id: 'trench_coat',
    slot: 'outfit',
    name: 'Trench Coat',
    implicitText: '+10 DEF, -2 SPD',
    implicit: { type: 'flatStat', stat: 'def', value: 10 },
    category: 'armor_heavy',
  },
  {
    id: 'dress_shirt',
    slot: 'outfit',
    name: 'Pressed Shirt',
    implicitText: '+8% crit damage',
    implicit: { type: 'pctStat', stat: 'critDmg', value: 8 },
    category: 'armor_light',
  },
];

const footwear: readonly ItemBase[] = [
  {
    id: 'work_boots',
    slot: 'footwear',
    name: 'Work Boots',
    implicitText: '+4 DEF',
    implicit: { type: 'flatStat', stat: 'def', value: 4 },
  },
  {
    id: 'sneakers',
    slot: 'footwear',
    name: 'Sneakers',
    implicitText: '+3 SPD',
    implicit: { type: 'flatStat', stat: 'spd', value: 3 },
  },
  {
    id: 'combat_boots',
    slot: 'footwear',
    name: 'Combat Boots',
    implicitText: '+5 DEF, +1 SPD',
    implicit: { type: 'flatStat', stat: 'def', value: 5 },
  },
  {
    id: 'dress_shoes',
    slot: 'footwear',
    name: 'Dress Shoes',
    implicitText: '+10% crit chance',
    implicit: { type: 'critChance', value: 10 },
  },
  {
    id: 'loafers',
    slot: 'footwear',
    name: 'Loafers',
    implicitText: '+2 SPD, +5% dodge',
    implicit: { type: 'dodge', value: 5 },
  },
];

const trinkets: readonly ItemBase[] = [
  {
    id: 'pocket_watch',
    slot: 'trinket',
    name: 'Pocket Watch',
    implicitText: '+5% cooldown reduction',
    implicit: { type: 'cooldown', value: 5 },
  },
  {
    id: 'lighter',
    slot: 'trinket',
    name: 'Zippo Lighter',
    implicitText: '+3% crit chance',
    implicit: { type: 'critChance', value: 3 },
  },
  {
    id: 'dog_tags',
    slot: 'trinket',
    name: 'Dog Tags',
    implicitText: '+8 HP',
    implicit: { type: 'flatStat', stat: 'hp', value: 8 },
  },
  {
    id: 'medallion',
    slot: 'trinket',
    name: 'Medallion',
    implicitText: '+5% XP',
    implicit: { type: 'xp', value: 5 },
  },
  {
    id: 'keychain',
    slot: 'trinket',
    name: 'Keychain',
    implicitText: '+5% gold',
    implicit: { type: 'gold', value: 5 },
  },
  {
    id: 'lucky_ring',
    slot: 'trinket',
    name: 'Lucky Ring',
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
