import type { ConsumableDef } from './types';

// Spec §5.8 catalog. IDs are stable DB keys; the `consumables` jsonb
// column on characters stores { [id]: count }.

export const CONSUMABLES: readonly ConsumableDef[] = Object.freeze([
  {
    id: 'small_brew',
    name: 'Small Brew',
    rarity: 'common',
    description: 'Heal 30% HP.',
    effect: { kind: 'heal_pct', pct: 0.30 },
  },
  {
    id: 'house_special',
    name: 'House Special',
    rarity: 'uncommon',
    description: 'Heal 70% HP.',
    effect: { kind: 'heal_pct', pct: 0.70 },
  },
  {
    id: 'shot_of_courage',
    name: 'Shot of Courage',
    rarity: 'uncommon',
    description: '+40% ATK for 3 turns.',
    effect: { kind: 'buff_self', stat: 'atk', pct: 40, turns: 3 },
  },
  {
    id: 'iron_tonic',
    name: 'Iron Tonic',
    rarity: 'uncommon',
    description: '+50% DEF for 3 turns.',
    effect: { kind: 'buff_self', stat: 'def', pct: 50, turns: 3 },
  },
  {
    id: 'focus_vial',
    name: 'Focus Vial',
    rarity: 'rare',
    description: '+30% crit for 3 turns.',
    effect: { kind: 'buff_self', stat: 'crit_chance', pct: 30, turns: 3 },
  },
  {
    id: 'emergency_elixir',
    name: 'Emergency Elixir',
    rarity: 'rare',
    description: 'Auto-revive at 50% HP if killed. Once per battle.',
    effect: { kind: 'auto_revive', hpPct: 0.50 },
  },
  {
    id: 'palette_cleanser',
    name: 'Palette Cleanser',
    rarity: 'uncommon',
    description: 'Remove all debuffs.',
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
