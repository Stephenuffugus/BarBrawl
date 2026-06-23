import type { ConsumableDef } from './types';

// Spec §5.8 catalog. IDs are stable DB keys; the `consumables` jsonb
// column on characters stores { [id]: count }.

export const CONSUMABLES: readonly ConsumableDef[] = Object.freeze([
  {
    id: 'small_brew',
    name: 'Soothing Salve',
    rarity: 'common',
    description: 'Restore 30% HP.',
    effect: { kind: 'heal_pct', pct: 0.30 },
  },
  {
    id: 'house_special',
    name: 'Garden Tonic',
    rarity: 'uncommon',
    description: 'Restore 70% HP.',
    effect: { kind: 'heal_pct', pct: 0.70 },
  },
  {
    id: 'shot_of_courage',
    name: 'Wildfire Tea',
    rarity: 'uncommon',
    description: '+40% ATK for 3 turns.',
    effect: { kind: 'buff_self', stat: 'atk', pct: 40, turns: 3 },
  },
  {
    id: 'iron_tonic',
    name: 'Bark Poultice',
    rarity: 'uncommon',
    description: '+50% DEF for 3 turns.',
    effect: { kind: 'buff_self', stat: 'def', pct: 50, turns: 3 },
  },
  {
    id: 'focus_vial',
    name: 'Clarity Tincture',
    rarity: 'rare',
    description: '+30% crit for 3 turns.',
    effect: { kind: 'buff_self', stat: 'crit_chance', pct: 30, turns: 3 },
  },
  {
    id: 'emergency_elixir',
    name: 'Reviving Seed',
    rarity: 'rare',
    description: 'Take root again at 50% HP if felled. Once per battle.',
    effect: { kind: 'auto_revive', hpPct: 0.50 },
  },
  {
    id: 'palette_cleanser',
    name: 'Cleansing Brew',
    rarity: 'uncommon',
    description: 'Clear all afflictions.',
    effect: { kind: 'cleanse' },
  },
]);

export const CONSUMABLE_BY_ID: Readonly<Record<string, ConsumableDef>> = Object.freeze(
  CONSUMABLES.reduce<Record<string, ConsumableDef>>((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {}),
);

export function getConsumable(id: string): ConsumableDef {
  const c = CONSUMABLE_BY_ID[id];
  if (!c) throw new RangeError(`Unknown consumable id: ${id}`);
  return c;
}
