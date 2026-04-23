import { makeTree } from './tree-factory';
import type { Tree } from '../types';

// Ghost — "Drifter" (DB id). Tree DB keys: indica/sativa/hybrid.
// Display names: Drift / Blur / Slip.
//
// Porting source: v6 prototype TREES.indica / .sativa / .hybrid. Effects
// preserved. Cannabis strain metaphor replaced entirely with movement-specialist
// framing. This is the class most re-themed — every name was drug-coded.

export const indicaTree: Tree = makeTree('in', [
  ['Vertigo',           '-3% enemy SPD',                    'Their feet get heavy.'],
  ['Tangle',            '+5% stun chance',                  'They trip over themselves.'],
  ['Weight of Air',     'Active: -50% SPD 3 turns',         'Gravity increases.'],
  ['Lingering Chill',   '+10% debuff duration',             'Nothing wears off clean.'],
  ['Sitting Duck',      'Slowed targets +20% dmg taken',    'They stopped moving.'],
  ['Dreamwalk',         'Active: AoE 50% skip turn chance', 'None of this is happening.'],
  ['Lockdown',          'Stunned targets cannot regen',     'Frozen in place.'],
  ['Leaden Limbs',      'Slowed targets -30% ATK',          'Arms like anchors.'],
  ['QUIET ROOM',        'KEYSTONE: All enemies slowed. You -50% SPD.', 'Everyone moves your speed now.'],
]);

export const sativaTree: Tree = makeTree('sa', [
  ['Quickstep',         '+4 SPD',                           'Gone before they turn.'],
  ['Pinpoint',          '+5% crit',                         'Narrowed.'],
  ['Adrenaline',        'Active: +100% SPD/crit 2 turns',   'Time sharpens.'],
  ['Lucky Break',       '+15% luck',                        'Something goes your way.'],
  ['Untouchable',       '+25% dodge when SPD > enemy',      "You're already somewhere else."],
  ['Reckless Charge',   'Active: Attack 3x, -50% DEF',      'Straight through. No cover.'],
  ['Opening Strike',    'First hit each battle crits',      "They didn't know you were here."],
  ['Snowball',          'Cooldowns -1 per kill',            'Momentum builds.'],
  ['GALE',              'KEYSTONE: +100% SPD. No rest turns.', 'Always moving. Always.'],
]);

export const hybridTree: Tree = makeTree('hy', [
  ['Shapeless',         '+2 all stats',                     'A little of everything.'],
  ['Inured',            '-10% dmg taken',                   "You've lived through worse."],
  ['Mirror Match',      'Active: Swap HP% with enemy',      'Fair is overrated.'],
  ['Wildcard Stats',    '+5% chance of random bonus/turn',  'Small dice, small wins.'],
  ['Flow State',        'Cooldowns -20%',                   'Everything lines up.'],
  ['Static Burst',      'Active: Random effect from any tree', 'Even you are guessing.'],
  ['Adaptive',          'Resist last damage type taken',    'Fool you once.'],
  ['Crosswind',         '+1 to effects from other trees',   'Borrowed pressure.'],
  ['WILD RIDE',         'KEYSTONE: Random keystone each battle.', 'You are a different fight every time.'],
]);
