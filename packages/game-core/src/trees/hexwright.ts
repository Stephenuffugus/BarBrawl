import { makeTree } from './tree-factory';
import type { Tree } from '../types';

// Hexwright — "Vintner" (DB id). Tree DB keys: tannin/vintage/aeration.
// Display names: Mark / Wither / Echo.
//
// Porting source: v6 prototype TREES.tannin / .vintage / .aeration. Effects
// preserved. Wine metaphor replaced with curse/sigil framing.

export const tanninTree: Tree = makeTree('tn', [
  ['Pointed Gaze',      '+4 magic dmg',                     'You see where it hurts.'],
  ['Evil Eye',          '+5% status chance',                'Small hexes land first.'],
  ['Hex Mark',          'Active: -30% DEF 3 turns',         'Named, now vulnerable.'],
  ['Bold Will',         '+10% magic dmg',                   'Intent made sharper.'],
  ['Marked For Pain',   'Cursed enemies +25% dmg taken',    'Every blow is heavier now.'],
  ['Blood Sigil',       'Active: 180% magic dmg, apply all curses', 'Everything at once.'],
  ['Deep Curse',        '+1 turn on all debuffs',           'Curses linger.'],
  ['Harbinger',         '+10% crit per curse stack',        'You caused this.'],
  ['COVEN',             'KEYSTONE: Curses spread to defenders. -25% HP.', "What's on them is on everyone."],
]);

export const vintageTree: Tree = makeTree('vn', [
  ['Still Waters',      '+1% ATK/min in battle',            'You were waiting.'],
  ['Shadowed Mind',     '+5% crit',                         'Quiet readiness.'],
  ['Gather Will',       'Active: Skip turn, +50% next',     'Hold. Hold. Now.'],
  ['Ancient Pact',      '+3% stats per 10 levels',          'Something old, owed back.'],
  ['Hoarded Power',     'Store 3 turn bonuses',             'You keep what you take.'],
  ['Unleash',           'Active: Unleash all Hoarded Power','Spent all at once.'],
  ['Festering',         'Each turn +2% crit (resets on crit)', 'Something is building.'],
  ['No Ceiling',        'Hoarded Power cap removed',        'Keep storing. No limit.'],
  ['OLDEST TRICK',      'KEYSTONE: First attack 10x dmg. Once/battle.', 'You have done this before.'],
]);

export const aerationTree: Tree = makeTree('ar', [
  ['Vessel',            '+10% heals received',              'An open channel.'],
  ['Resonate',          '+5% all stats 1 turn on skill use','Ripple outward.'],
  ['Unburden',          'Active: Heal 30% + cleanse',       'Let it go.'],
  ['Long Echo',         '+10% buff duration',               'The sound stays.'],
  ['Renewed Will',      'Heals also grant +10% ATK 3 turns','Mended and sharper.'],
  ['Share Burden',      'Active: Heal allies 25%',          'Their weight is yours.'],
  ['Shared Pact',       'Allies +15% all stats',            'Bound to each other.'],
  ['Wellspring',        'Heals +50%',                       'More where that came from.'],
  ['LIVING HEX',        'KEYSTONE: Heal 3% HP/turn. Max 100% ATK.', 'You bleed life instead of dying.'],
]);
