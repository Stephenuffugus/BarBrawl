import { makeTree } from './tree-factory';
import type { Tree } from '../types';

// Bouncer — "Brewer" (DB id). Tree DB keys kept as hops/barley/foam for
// schema stability. Display names: Impact / Bulwark / Intimidate.
//
// Porting source: v6 prototype TREES.hops / .barley / .foam. Effects preserved
// verbatim. Node names and flavor text reworked away from beer/brewing metaphor.

export const hopsTree: Tree = makeTree('ho', [
  ['Heavy Fist',       '+3 ATK',                           'Build from the shoulder.'],
  ['Knuckle Sting',    '+5% crit',                         'First contact always hurts.'],
  ['Haymaker',         'Active: 140% ATK + stagger splash','Wide, heavy, unavoidable.'],
  ['Coiled Spring',    '+8% ATK',                          'Loaded, ready to release.'],
  ['Fresh Shift',      '+20% ATK when HP > 80%',           'You just got here.'],
  ['Sledgehammer',     'Active: 200% ATK + bleed 3 turns', 'Fight-ender. Takes you with it.'],
  ['Rolling Thunder',  'Active skills -10% cooldown',      'Hit after hit.'],
  ['Deep Bruise',      'Bleed DoT +50% dmg',               'The mark lasts days.'],
  ['BROKEN BOTTLE',    'KEYSTONE: All hits apply Bleed. -20% DEF.', "When it's on, everything cuts."],
]);

export const barleyTree: Tree = makeTree('ba', [
  ['Padded Vest',      '+4 DEF',                           'Simple, effective.'],
  ['Solid Frame',      '+8 HP',                            'Wide shoulders, deep chest.'],
  ['Crossed Arms',     'Active: Block next 2 hits',        'Planted. Unmoved.'],
  ['Deep Chest',       '+15 HP',                           'There is more of you.'],
  ['Seasoned',         '+25% DEF, +10% max HP',            'You have been here before.'],
  ['Brick Wall',       'Active: +100% DEF 3 turns, reflect 40%', 'Hit me. See what happens.'],
  ['Scar Tissue',      '+20% HP regen',                    'Healed over, harder.'],
  ['Cornered',         'At HP<30%, +50% DEF, heal 5%/turn','Bad time to be near you.'],
  ['LAST STAND',       'KEYSTONE: Revive once at 30% HP. -30% ATK.', 'You do not fall twice.'],
]);

export const foamTree: Tree = makeTree('fm', [
  ['Shoulder Fake',    '+5% dodge',                        'They reach the wrong way.'],
  ['Cold Stare',       '+5% enemy miss',                   'They hesitate.'],
  ['Eye Jab',          'Active: Blind enemy 2 turns',      'Cheap. Legal enough.'],
  ['Light Feet',       '+2 SPD',                           'Boxer bounce.'],
  ['Slip & Counter',   '+15% dodge, +10% crit on dodges',  'You left an opening.'],
  ['Crowd Sweep',      'Active: AoE 80% ATK, 20% stun',    'Everyone out.'],
  ['Menace',           '-15% enemy accuracy',              "They can't read you."],
  ['Counterpunch',     'After dodge, next hit crits',      'You waited for it.'],
  ['JUKE',             'KEYSTONE: 50% dodge. HP capped 50%.', "Can't hit what isn't there."],
]);
