import { makeTree } from './tree-factory';
import type { Tree } from '../types';

// Operator — "Steady" (DB id). Tree DB keys kept as focus/clarity/resolve
// for schema stability. Display names (Precision/Analysis/Composure) live
// on ClassDef.treeDisplayNames.
//
// Porting source: docs/prototype/barbrawl-v6.jsx TREES.focus / .clarity / .resolve.
// Nodes that did not reference alcohol/drinking needed no rename (most of this
// class was archetypally clean already — that's why Operator is the pattern
// proof). A small handful of phrases with "sober"/"steady" framing were reworked
// toward neutral precision-speak.

export const focusTree: Tree = makeTree('fo', [
  ['Fixed Gaze',       '+4% crit',                        'Nothing escapes your eye.'],
  ['Still Hands',      '+3 ATK',                          'No shake, no waste.'],
  ['Clean Strike',     'Active: 130% ATK, always hits',   'Precision over power.'],
  ['Calibrate',        '+6% crit',                        'Zero in.'],
  ['Laser Focus',      'Crits deal +25% more',            'Compound precision.'],
  ['Perfect Read',     'Active: Predict + dodge next attack', 'You saw it coming.'],
  ['Analyze',          '+10% dmg to marked enemies',      'Studied them already.'],
  ['Bullseye',         'Crits ignore 50% DEF',            'Nothing stops clean hits.'],
  ['ABSOLUTE CLARITY', 'KEYSTONE: All hits crit. -40% base ATK.', 'When you see everything, you miss nothing.'],
]);

export const clarityTree: Tree = makeTree('cl', [
  ['Sharp Memory',     '+5% XP earned',                   'Every lesson sticks.'],
  ['Read Room',        '+5% all stats vs more enemies',   'The more, the clearer.'],
  ['Lucid Moment',     'Active: Skip enemy turn',         'Time slows.'],
  ['Study Habit',      '+10% XP',                         'Compounding knowledge.'],
  ['Unclouded',        'Immune to debuffs',               'Nothing clouds you.'],
  ['Know Thyself',     'Active: Restore 50% HP + cleanse','Centered.'],
  ['Patience',         'Each unused turn: +5% next hit',  'Wait for it.'],
  ['Muscle Memory',    '+25% active skill effectiveness', 'Trained to reflex.'],
  ['PERFECT RECALL',   'KEYSTONE: Earn 2x XP. Cannot use consumables.', "You don't need shortcuts."],
]);

export const resolveTree: Tree = makeTree('re', [
  ['Grounded',         '+5 DEF',                          'Rooted stance.'],
  ['Stoic',            '-5% dmg taken',                   'Pain is noise.'],
  ['Hold Line',        'Active: +100% DEF for 2 turns',   'Nothing past.'],
  ['Breathe Deep',     '+15 HP',                          'Capacity increases.'],
  ['Unshakeable',      '+20% DEF, immune to knockback',   'Foundation solid.'],
  ['Second Wind',      'Active: Heal 40% HP when below 30%', 'Not done yet.'],
  ['Steady Breathing', 'Regen 2% HP/turn',                'Constant recovery.'],
  ['Iron Will',        'Cannot be reduced below 1 HP once/battle', 'Force of will.'],
  ['IMMOVABLE',        'KEYSTONE: Take 50% less dmg. Cannot deal crits.', 'Be the mountain.'],
]);
