import type { ResistanceMark, VIPKey } from './types';
import type { BarType } from '../types';

// Wards drop from Tier 3 clears of a matching habitat theme.
// Each ward is slot=mark (new slot added in design doc §2.2) — it does NOT
// occupy trinket. Players can carry multiple wards and swap loadout per run.
//
// One ward per wild element at launch. Expansion adds tiered wards later
// (e.g., "Greater Sun Ward" with higher strength + stat bonuses).

export const RESISTANCE_MARKS: readonly ResistanceMark[] = Object.freeze([
  {
    id: 'mark_blunt',
    name: 'Bramble Ward',
    against: 'blunt',
    strength: 0.6,
    description: 'Tangled brambles and falling boughs glance off.',
  },
  {
    id: 'mark_sonic',
    name: 'Windsong Ward',
    against: 'sonic',
    strength: 0.6,
    description: 'Resonant windsong and night air lose their sting.',
  },
  {
    id: 'mark_toxic',
    name: 'Pollen Ward',
    against: 'toxic',
    strength: 0.6,
    description: 'Pollen haze and lingering sap barely register.',
  },
  {
    id: 'mark_impact',
    name: 'Bulwark Ward',
    against: 'impact',
    strength: 0.6,
    description: 'Windfall and rolling stones bounce away.',
  },
  {
    id: 'mark_shadow',
    name: 'Lucid Ward',
    against: 'shadow',
    strength: 0.6,
    description: 'Deep shade and blight slip off you.',
  },
  {
    id: 'mark_heat',
    name: 'Sun Ward',
    against: 'heat',
    strength: 0.6,
    description: 'Greenhouse swelter and steam vents pass through.',
  },
  {
    id: 'mark_edged',
    name: 'Thornhide Ward',
    against: 'edged',
    strength: 0.6,
    description: 'Thorns and sharp hedge growth find no purchase.',
  },
]);

export const RESISTANCE_MARK_BY_ID: Readonly<Record<string, ResistanceMark>> =
  Object.freeze(
    RESISTANCE_MARKS.reduce<Record<string, ResistanceMark>>((acc, m) => {
      acc[m.id] = m;
      return acc;
    }, {}),
  );

// Gate keys drop from a different-themed habitat than the one they open, per
// design §3.1.B. Creates cross-habitat progression: a Rose Garden key drops at
// an Old Orchard, etc.

export const VIP_KEYS: readonly VIPKey[] = Object.freeze([
  { id: 'key_dive',      name: 'Meadow Gate Key',     forBarTheme: 'dive',      consumeOnUse: true, description: 'Opens the hidden hollow within any Wild Meadow.' },
  { id: 'key_pub',       name: 'Garden Gate Key',     forBarTheme: 'pub',       consumeOnUse: true, description: 'The walled nook of a Cottage Garden opens to you.' },
  { id: 'key_sports',    name: 'Keeper\'s Token',     forBarTheme: 'sports',    consumeOnUse: true, description: "The Community Park's quiet grove, past the old gate." },
  { id: 'key_cocktail',  name: 'Rose Seal',           forBarTheme: 'cocktail',  consumeOnUse: true, description: 'The inner Rose Garden bed is yours to tend.' },
  { id: 'key_wine',      name: 'Orchard Pass',        forBarTheme: 'wine',      consumeOnUse: true, description: 'The old orchard\'s private rows unlock.' },
  { id: 'key_brewery',   name: 'Greenhouse Key',      forBarTheme: 'brewery',   consumeOnUse: true, description: 'The sealed propagation room opens for you.' },
  { id: 'key_nightclub', name: 'Moonlit Pass',        forBarTheme: 'nightclub', consumeOnUse: true, description: 'Past the wild thicket into any Moonlit Grove.' },
]);

export const VIP_KEY_BY_BAR_THEME: Readonly<Record<BarType, VIPKey>> = Object.freeze(
  VIP_KEYS.reduce<Record<BarType, VIPKey>>((acc, k) => {
    acc[k.forBarTheme] = k;
    return acc;
  }, {} as Record<BarType, VIPKey>),
);
