import { makeTree } from './tree-factory';
import type { Tree } from '../types';

// The Forager — entirely new class (no prototype source). Tree DB keys: dice / cards / house.
// Display names: Wild Harvest (Variance) / Seasons (Combos) / Four-Leaf Luck (Edge).
//
// Design intent per DESIGN_V1.md:
//   - Wild Harvest    : raw variance — 50-200% rolls, coin-flip finds, high ceiling.
//   - Seasons         : combo/chain — rewards sustained perfect rhythm.
//   - Four-Leaf Luck  : crit/luck edge — reads the land, stacks fortune.
// Resource: Seeds (gained per action; +3 per crit; spent on wild finds).

export const diceTree: Tree = makeTree('di', [
  ['Forager\'s Eye',    '+4% crit',                          'Always spotting the ripe one.'],
  ['Heavy Seed',        '+3 ATK',                            'Some seeds carry more weight.'],
  ['Lucky Scatter',     'Active: Deal 50-200% ATK random',   "Cast the seeds. See what grows."],
  ['Bountiful Streak',  '+6% crit after each hit (resets on miss)', 'The harvest is rolling in.'],
  ['Bitter Berry',      'Crits deal 2.5x; -10% accuracy',    'Sweet reward, sharp bite.'],
  ['Wild Gambit',       'Active: Next skill 2x or 0x (coin flip)', 'Trust the wind.'],
  ['Pocketful of Seeds','+10% gold, +1 Seed/turn',           'Always walk the trail with a few to spare.'],
  ['Windfall',          'On Wild Gambit win: +1 action this turn', "The grove gives back."],
  ['NATURE\'S BOUNTY',  'KEYSTONE: All attacks 2x or 0x on flip. +20% hit chance baseline.', 'Live by the seasons.'],
]);

export const cardsTree: Tree = makeTree('ca', [
  ['Fertile Ground',    '+3 LUCK',                           'The land favors you.'],
  ['Fresh Furrow',      '+3 SPD',                            'Turn the soil, start anew.'],
  ['Seed Pouch',        'Active: Draw 3 random 1-turn buffs','Always something useful in the bag.'],
  ['First Bloom',       'Crits deal +15%',                   "The ones that flower true."],
  ['Spring Thaw',       'Chain 2 perfects: +30% next hit',   "The thaw breaks. Grow on."],
  ['Full Bloom',        'Active: Consume 5 Seeds, 250% ATK', 'Everything bursts open at once.'],
  ['Hidden Sprout',     'Once/battle: convert a miss to hit','It was taking root all along.'],
  ['Four Seasons',      'Chain 5 perfects: massive crit window', 'A turning of the year nobody saw.'],
  ['EVERGREEN',         'KEYSTONE: Perfect chains never break. -30% base damage.', 'Every season counts, forever.'],
]);

export const houseTree: Tree = makeTree('hu', [
  ['Gleaning',          '+5% gold',                          'Always gather what others leave.'],
  ['Reading Tracks',    '+4% crit',                          "You've been watching the trail."],
  ['Read the Weather',  'Active: See enemy crit, reduce 50%','No storm catches you off guard.'],
  ['Telltale Sign',     'Enemy next action revealed',        "The leaves always turn before the wind."],
  ['Mounting Fortune',  '+2% crit per crit landed (resets on miss)', 'The luck builds on itself.'],
  ['Go to Seed',        'Active: Risk all Seeds — 2x on win, lose all on loss', 'You know how the wild works.'],
  ['Shared Harvest',    '+1 Seed per assist in party fights','A little set aside for the others.'],
  ['Sheltered',         'Once/battle: guaranteed dodge',     'You read the hollow hours before.'],
  ['FORTUNE FAVORS',    'KEYSTONE: LUCK doubled. Other stats -20%.', 'The wild always provides. It really does.'],
]);
