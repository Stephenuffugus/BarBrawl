import { makeTree } from './tree-factory';
import type { Tree } from '../types';

// Gambler — entirely new class (no prototype source). Tree DB keys: dice / cards / house.
// Display names: Dice (Variance) / Cards (Combos) / House (Edge).
//
// Design intent per DESIGN_V1.md:
//   - Dice    : raw variance — 50-200% rolls, coin-flip wagers, high ceiling.
//   - Cards   : combo/chain — rewards sustained perfect rhythm.
//   - House   : crit/luck edge — reads enemies, stacks advantage.
// Resource: Chips (gained per action; +3 per crit; spent on wagers).

export const diceTree: Tree = makeTree('di', [
  ['Dice Hand',         '+4% crit',                          'Always looking for the angle.'],
  ['Loaded Die',        '+3 ATK',                            'A little weight, a little lie.'],
  ['Roll of the Dice',  'Active: Deal 50-200% ATK random',   "Pull the arm. See what you get."],
  ['Hot Streak',        '+6% crit after each hit (resets on miss)', 'The run is on.'],
  ['Snake Eyes',        'Crits deal 2.5x; -10% accuracy',    'Big win, bigger risk.'],
  ['All In',            'Active: Next skill 2x or 0x (coin flip)', 'Push the stack.'],
  ['Pocket Change',     '+10% gold, +1 Chip/turn',           'Always walk in with something.'],
  ['Big Gamble',        'On All-In win: +1 action this turn', "The table turns."],
  ['HOUSE EDGE',        'KEYSTONE: All attacks 2x or 0x on flip. +20% hit chance baseline.', 'Live by the coin.'],
]);

export const cardsTree: Tree = makeTree('ca', [
  ['Dealt Hand',        '+3 LUCK',                           'The cards come to you.'],
  ['Shuffle',           '+3 SPD',                            'Restart, reposition.'],
  ['Stacked Deck',      'Active: Draw 3 random 1-turn buffs','Always something useful.'],
  ['Face Card',         'Crits deal +15%',                   "The ones that count."],
  ['Blackjack',         'Chain 2 perfects: +30% next hit',   "21. Hit me again."],
  ['Full House',        'Active: Consume 5 Chips, 250% ATK', 'All of it.'],
  ['Ace Up Sleeve',     'Once/battle: convert a miss to hit','You had it the whole time.'],
  ['Five Card Run',     'Chain 5 perfects: massive crit window', 'A hand nobody saw.'],
  ['ROYAL FLUSH',       'KEYSTONE: Perfect chains never break. -30% base damage.', 'Every card counts, forever.'],
]);

export const houseTree: Tree = makeTree('hu', [
  ['House Cut',         '+5% gold',                          'Always take a taste.'],
  ['Counting',          '+4% crit',                          "You've been watching."],
  ['Read the Table',    'Active: See enemy crit, reduce 50%','Nothing is a surprise.'],
  ['Tell',              'Enemy next action revealed',        "They always touch their tie."],
  ['Stacked Odds',      '+2% crit per crit landed (resets on miss)', 'The run builds itself.'],
  ['Double Down',       'Active: Wager all Chips — 2x on win, lose all on loss', 'You know the math.'],
  ['Skim',              '+1 Chip per assist in party fights','Something off the top.'],
  ['Insurance',         'Once/battle: guaranteed dodge',     'You saw the hit coming an hour ago.'],
  ['HOUSE ALWAYS WINS', 'KEYSTONE: LUCK doubled. Other stats -20%.', 'It does. It really does.'],
]);
