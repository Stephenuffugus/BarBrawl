import type { ResistanceMark, VIPKey } from './types';
import type { BarType } from '../types';

// Resistance marks drop from Tier 3 clears of a matching bar theme.
// Each mark is slot=mark (new slot added in design doc §2.2) — it does NOT
// occupy trinket. Players can carry multiple marks and swap loadout per run.
//
// One mark per damage type at launch. Expansion adds tiered marks later
// (e.g., "Greater Flame Ward" with higher strength + stat bonuses).

export const RESISTANCE_MARKS: readonly ResistanceMark[] = Object.freeze([
  {
    id: 'mark_blunt',
    name: 'Hardwood Ward',
    against: 'blunt',
    strength: 0.6,
    description: 'Dive-bar chairs and stools glance off.',
  },
  {
    id: 'mark_sonic',
    name: 'Dampened Ward',
    against: 'sonic',
    strength: 0.6,
    description: 'Sound blasts and strobe-stuns lose their sting.',
  },
  {
    id: 'mark_toxic',
    name: 'Filter Ward',
    against: 'toxic',
    strength: 0.6,
    description: 'Burn DoTs and cocktail hazes barely register.',
  },
  {
    id: 'mark_impact',
    name: 'Bulwark Ward',
    against: 'impact',
    strength: 0.6,
    description: 'Thrown glassware and pool balls bounce.',
  },
  {
    id: 'mark_shadow',
    name: 'Lucid Ward',
    against: 'shadow',
    strength: 0.6,
    description: 'Hexes and debuffs slip off you.',
  },
  {
    id: 'mark_heat',
    name: 'Kiln Ward',
    against: 'heat',
    strength: 0.6,
    description: 'Brewery steam and fermenter blasts pass through.',
  },
  {
    id: 'mark_edged',
    name: 'Thick Skin Ward',
    against: 'edged',
    strength: 0.6,
    description: 'Broken glass and knives find no purchase.',
  },
]);

export const RESISTANCE_MARK_BY_ID: Readonly<Record<string, ResistanceMark>> =
  Object.freeze(
    RESISTANCE_MARKS.reduce<Record<string, ResistanceMark>>((acc, m) => {
      acc[m.id] = m;
      return acc;
    }, {}),
  );

// VIP Keys drop from a different-themed bar than the one they unlock, per
// design §3.1.B. Creates cross-bar progression: cocktail-key drops at a
// speakeasy, etc.

export const VIP_KEYS: readonly VIPKey[] = Object.freeze([
  { id: 'key_dive',      name: 'Back-Door Key',    forBarTheme: 'dive',      consumeOnUse: true, description: 'Opens the VIP basement at any dive.' },
  { id: 'key_nightclub', name: 'VIP Wristband',    forBarTheme: 'nightclub', consumeOnUse: true, description: 'Gets you past the rope at any club.' },
  { id: 'key_cocktail',  name: 'Unmarked Menu',    forBarTheme: 'cocktail',  consumeOnUse: true, description: 'The back-bar list is yours tonight.' },
  { id: 'key_sports',    name: 'Owner\'s Token',   forBarTheme: 'sports',    consumeOnUse: true, description: 'The owner\'s booth. Behind the scoreboard.' },
  { id: 'key_speakeasy', name: 'Password Token',   forBarTheme: 'speakeasy', consumeOnUse: true, description: 'Whisper at the door. They\'ll know.' },
  { id: 'key_brewery',   name: 'Brewer\'s Cask',   forBarTheme: 'brewery',   consumeOnUse: true, description: 'The reserve cellar opens for you.' },
  { id: 'key_craft',     name: 'Glassblower\'s Seal', forBarTheme: 'craft',  consumeOnUse: true, description: 'The workshop-back bar admits you.' },
]);

export const VIP_KEY_BY_BAR_THEME: Readonly<Record<BarType, VIPKey>> = Object.freeze(
  VIP_KEYS.reduce<Record<BarType, VIPKey>>((acc, k) => {
    acc[k.forBarTheme] = k;
    return acc;
  }, {} as Record<BarType, VIPKey>),
);
