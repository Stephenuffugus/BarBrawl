import type { ClassDef } from './types';

// Spec §5.1 stat spreads preserved. DB IDs preserved. Names, resources,
// and action economies are new per docs/design/DESIGN_V1.md.
//
// All resources and action-economy twists are *descriptive* here. The
// combat engine (edge functions) is responsible for interpreting them.
// game-core only provides the data.

export const CLASSES: readonly ClassDef[] = [
  {
    id: 'steady',
    name: 'The Operator',
    icon: '🎯',
    color: '#4895ef',
    tagline: 'Clear-eyed. Balanced in all things.',
    baseStats: { hp: 110, atk: 11, def: 11, spd: 11, luck: 11 },
    resource: {
      kind: 'focus',
      name: 'Focus',
      description: 'Builds passively. Spent on guaranteed-hit skills.',
      startingCap: 10,
      generationRule: '+1 per turn; +2 per crit landed.',
    },
    actionEconomy: {
      kind: 'standard',
      description: 'One action per turn. Crits convert into Focus for later guaranteed hits.',
    },
    treeIds: ['focus', 'clarity', 'resolve'],
    treeDisplayNames: {
      focus: 'Precision',
      clarity: 'Analysis',
      resolve: 'Composure',
    },
    specialtyBarType: 'universal',
  },
  {
    id: 'brewer',
    name: 'The Bouncer',
    icon: '🛡️',
    color: '#DAA520',
    tagline: 'Heavy hitter. Slow to rile, hard to drop.',
    baseStats: { hp: 130, atk: 12, def: 14, spd: 7, luck: 6 },
    resource: {
      kind: 'grit',
      name: 'Grit',
      description: 'Gained when taking damage. Spent on retaliation skills.',
      startingCap: 10,
      generationRule: '+1 per 10 HP damage absorbed.',
    },
    actionEconomy: {
      kind: 'absorb-bank',
      description: 'Can spend a turn absorbing to bank a 2-action retaliation turn.',
    },
    treeIds: ['hops', 'barley', 'foam'],
    treeDisplayNames: {
      hops: 'Impact',
      barley: 'Bulwark',
      foam: 'Intimidate',
    },
    specialtyBarType: 'dive',
  },
  {
    id: 'vintner',
    name: 'The Hexwright',
    icon: '🔮',
    color: '#722f37',
    tagline: 'Debuff caster. Curses compound.',
    baseStats: { hp: 85, atk: 8, def: 6, spd: 12, luck: 15 },
    resource: {
      kind: 'curseStacks',
      name: 'Curse Stacks',
      description: 'Applied to enemies. Finishers consume stacks for amplified damage.',
      startingCap: 5,
      generationRule: 'Applied by marking skills, max stacks per enemy scales with tree.',
    },
    actionEconomy: {
      kind: 'consume-enemy-stacks',
      description: 'Some skills cost enemy curse stacks instead of player resource.',
    },
    treeIds: ['tannin', 'vintage', 'aeration'],
    treeDisplayNames: {
      tannin: 'Mark',
      vintage: 'Wither',
      aeration: 'Echo',
    },
    specialtyBarType: 'cocktail',
  },
  {
    id: 'shaker',
    name: 'The Duelist',
    icon: '⚔️',
    color: '#8338ec',
    tagline: 'Burst hybrid. Live on the mixup.',
    baseStats: { hp: 95, atk: 11, def: 8, spd: 13, luck: 13 },
    resource: {
      kind: 'tempo',
      name: 'Tempo',
      description: 'Gained on rhythm-perfect hits. Spent on combo extenders.',
      startingCap: 5,
      generationRule: '+1 per perfect rhythm hit; decays 1/turn if unused.',
    },
    actionEconomy: {
      kind: 'perfect-bonus',
      description: 'Three perfects in a row grant a free half-action next turn.',
    },
    treeIds: ['shaken', 'stirred', 'garnish'],
    treeDisplayNames: {
      shaken: 'Flourish',
      stirred: 'Feint',
      garnish: 'Riposte',
    },
    specialtyBarType: 'sports',
  },
  {
    id: 'orchardist',
    name: 'The Medic',
    icon: '⚕️',
    color: '#ff8c00',
    tagline: 'Sustain healer. The last one standing.',
    baseStats: { hp: 115, atk: 9, def: 10, spd: 10, luck: 11 },
    resource: {
      kind: 'reserve',
      name: 'Reserve',
      description: 'Banked HP from overheals. Released on demand.',
      startingCap: 50,
      generationRule: 'Overheal above max HP banks into Reserve, capped by tree nodes.',
    },
    actionEconomy: {
      kind: 'heal-bank',
      description: 'Overheal beyond max HP is converted to Reserve and can be released later.',
    },
    treeIds: ['orchard', 'ferment', 'harvest'],
    treeDisplayNames: {
      orchard: 'Mend',
      ferment: 'Bitter Root',
      harvest: 'Triage',
    },
    specialtyBarType: 'brewery',
  },
  {
    id: 'drifter',
    name: 'The Ghost',
    icon: '🌫️',
    color: '#06d6a0',
    tagline: 'Evasion and chaos. Slip through.',
    baseStats: { hp: 100, atk: 10, def: 8, spd: 14, luck: 13 },
    resource: {
      kind: 'momentum',
      name: 'Momentum',
      description: 'Gained on dodges and SPD-trades. Spent on blitz skills.',
      startingCap: 10,
      generationRule: '+1 per successful dodge; +2 per SPD-trade half-action.',
    },
    actionEconomy: {
      kind: 'spd-trade',
      description: 'Can trade current SPD for an extra half-action once per turn.',
    },
    treeIds: ['indica', 'sativa', 'hybrid'],
    treeDisplayNames: {
      indica: 'Drift',
      sativa: 'Blur',
      hybrid: 'Slip',
    },
    specialtyBarType: 'nightclub',
  },
  {
    id: 'gambler',
    name: 'The Gambler',
    icon: '🎲',
    color: '#e63946',
    tagline: 'High variance. House rules are a suggestion.',
    baseStats: { hp: 100, atk: 10, def: 8, spd: 11, luck: 17 },
    resource: {
      kind: 'chips',
      name: 'Chips',
      description: 'Earned per action. Wagered on escalating skills with variance payoffs.',
      startingCap: 10,
      generationRule: '+1 per action taken; +3 per crit.',
    },
    actionEconomy: {
      kind: 'wager',
      description: 'Skills can be declared "all-in": 2× damage on a coin flip, 0× on the loss.',
    },
    treeIds: ['dice', 'cards', 'house'],
    treeDisplayNames: {
      dice: 'Dice (Variance)',
      cards: 'Cards (Combos)',
      house: 'House (Edge)',
    },
    specialtyBarType: 'speakeasy',
  },
] as const;

export const CLASS_BY_ID: Readonly<Record<string, ClassDef>> = Object.freeze(
  CLASSES.reduce<Record<string, ClassDef>>((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {}),
);

export function getClass(id: string): ClassDef {
  const c = CLASS_BY_ID[id];
  if (!c) throw new RangeError(`Unknown class id: ${id}`);
  return c;
}
