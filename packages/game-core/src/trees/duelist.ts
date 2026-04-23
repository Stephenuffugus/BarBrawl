import { makeTree } from './tree-factory';
import type { Tree } from '../types';

// Duelist — "Shaker" (DB id). Tree DB keys: shaken/stirred/garnish.
// Display names: Flourish / Feint / Riposte.
//
// Porting source: v6 prototype TREES.shaken / .stirred / .garnish. Effects
// preserved. Cocktail metaphor replaced with blademaster framing.

export const shakenTree: Tree = makeTree('sh', [
  ['Cold Steel',        '+4 cold dmg',                      'The blade has no mood.'],
  ['Quick Draw',        '+8% attack speed',                 'First move is already won.'],
  ['Flurry',            'Active: 3 hits at 60% ATK',        'No break between strikes.'],
  ['Chilling Blow',     '5% freeze chance',                 'They seize up.'],
  ['Twin Fangs',        'Multi-hits +30% crit',             'Each one bites deeper.'],
  ['Molten Edge',       'Active: 200% ATK + burn',          'Heated, then driven home.'],
  ['Clean Edge',        '+20% skill dmg',                   'No wasted motion.'],
  ['Piercing Thrust',   'Bursts ignore 30% DEF',            'Find the gap.'],
  ['WIDE SWEEP',        'KEYSTONE: AoE everything. -40% single target.', 'All of you. At once.'],
]);

export const stirredTree: Tree = makeTree('st', [
  ['Steady Hand',       '+5% crit',                         'Zero wobble.'],
  ['Trained Footwork',  '+3 ATK, +3 SPD',                   'Angles learned years ago.'],
  ['Surgical Strike',   'Active: Guaranteed crit 130%',     'Exactly where it needs to go.'],
  ['Measured Blow',     '+5% crit dmg',                     'The pause before the point.'],
  ['True Edge',         'Crits deal 2.5x not 1.8x',         'When it matters, it matters.'],
  ['Wind-Up',           'Active: 3-turn charge, massive crit', 'Patience wins bouts.'],
  ['Follow-Through',    'After crit +10% ATK next',         "Don't stop now."],
  ['Stored Intent',     '+15% crit per unused turn',        'Holding.'],
  ['THIRD STRIKE',      'KEYSTONE: Every 3rd attack crits. Non-crits -50%.', 'Count. Count. Strike.'],
]);

export const garnishTree: Tree = makeTree('gn', [
  ['Sleight',           '+5% luck',                         'Small deceptions compound.'],
  ['Hustle',            '+10% gold',                        'You always find a dollar.'],
  ['Fake-Out',          'Active: Enemy miss + your crit',   "They're looking the wrong way."],
  ['Breath Control',    'Heal 2% on skill use',             'Center yourself.'],
  ['Poise',             'Skills buff you +15%',             'Carriage becomes pressure.'],
  ['Wild Card',         'Active: Random major effect',      'Even you are surprised.'],
  ['Signature Move',    'Cooldowns -15%',                   "The one they remember you for."],
  ['Fan Favorite',      '+25% gold, +10% XP',               'The crowd came for you.'],
  ['GRANDMASTER',       'KEYSTONE: All 3 skills per turn. Cooldowns 2x.', 'Full kit, always.'],
]);
