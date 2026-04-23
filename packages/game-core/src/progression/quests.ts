// Daily quest system — spec §5.6. Three rotating quests per day, 25-150
// XP each. Deterministic selection from a shared pool keyed on
// (user_id, date) so every player sees a rotation, but yours is your own.
//
// Quests progress across battles (not within). Completion is evaluated
// after each battle's summary. Reward claiming is a separate step.

import type { BarType } from '../types';

export type QuestProgressKind =
  // Cumulative across battles today:
  | 'boss_kills'
  | 'wins_of_type'
  | 'no_consumable_wins'
  | 'perfect_hits'
  | 'skill_uses'
  | 'status_applies'
  | 'gold_earned'
  // Single-battle thresholds (max seen today):
  | 'big_hit_damage'
  | 'full_hp_win'
  | 'fast_clear_rooms'
  | 'underdog_win';

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  kind: QuestProgressKind;
  /** Target value; completion when progress >= target. */
  target: number;
  /** XP granted on claim. */
  xpReward: number;
  /** Optional modifier for some kinds (e.g. bar type filter). */
  barType?: BarType;
}

export const QUEST_CATALOG: readonly QuestDef[] = Object.freeze([
  { id: 'q_boss_3',           name: 'Hunting Season',    kind: 'boss_kills',          target: 3,   xpReward: 100, description: 'Defeat 3 bar bosses today.' },
  { id: 'q_perfect_10',       name: 'Perfect Timing',    kind: 'perfect_hits',        target: 10,  xpReward: 50,  description: 'Land 10 perfect-rhythm hits.' },
  { id: 'q_no_consumable_1',  name: 'Clean Sweep',       kind: 'no_consumable_wins',  target: 1,   xpReward: 80,  description: 'Win a fight without using any consumable.' },
  { id: 'q_skill_15',         name: 'Fluid Technique',   kind: 'skill_uses',          target: 15,  xpReward: 40,  description: 'Use active skills 15 times.' },
  { id: 'q_status_10',        name: 'Death of a Thousand', kind: 'status_applies',    target: 10,  xpReward: 50,  description: 'Apply 10 status effects (DoTs, debuffs, stuns).' },
  { id: 'q_big_hit_500',      name: 'Heavy Hitter',      kind: 'big_hit_damage',      target: 500, xpReward: 100, description: 'Deal 500+ damage in a single hit.' },
  { id: 'q_full_hp',          name: 'Untouched',         kind: 'full_hp_win',         target: 1,   xpReward: 60,  description: 'Win a battle ending above 80% HP.' },
  { id: 'q_fast_3',           name: 'In and Out',        kind: 'fast_clear_rooms',    target: 3,   xpReward: 50,  description: 'Clear a bar in 3 rooms or fewer.' },
  { id: 'q_underdog_1',       name: 'Punching Up',       kind: 'underdog_win',        target: 1,   xpReward: 150, description: 'Win a bar 5+ levels above your character.' },
  { id: 'q_gold_200',         name: 'Pocket Lined',      kind: 'gold_earned',         target: 200, xpReward: 25,  description: 'Earn 200 gold.' },
  { id: 'q_dive_win_3',       name: 'Dive Regular',      kind: 'wins_of_type',        target: 3,   xpReward: 50,  description: 'Win 3 dive-bar battles.', barType: 'dive' },
  { id: 'q_cocktail_win_2',   name: 'High-End',          kind: 'wins_of_type',        target: 2,   xpReward: 75,  description: 'Win 2 cocktail-lounge battles.', barType: 'cocktail' },
  { id: 'q_brewery_win_2',    name: 'Craft Connoisseur', kind: 'wins_of_type',        target: 2,   xpReward: 75,  description: 'Win 2 brewery battles.', barType: 'brewery' },
  { id: 'q_nightclub_win_1',  name: 'Bottle Service',    kind: 'wins_of_type',        target: 1,   xpReward: 100, description: 'Win a nightclub battle.', barType: 'nightclub' },
]);

export const QUEST_BY_ID: Readonly<Record<string, QuestDef>> = Object.freeze(
  QUEST_CATALOG.reduce<Record<string, QuestDef>>((acc, q) => {
    acc[q.id] = q;
    return acc;
  }, {}),
);

/** Deterministic 3-quest pick for a given (user, date). */
export function pickDailyQuests(userId: string, dateKey: string): readonly [QuestDef, QuestDef, QuestDef] {
  const seed = hashStrings([userId, dateKey]);
  const shuffled = shuffle(QUEST_CATALOG, seed);
  if (shuffled.length < 3) throw new Error('QUEST_CATALOG too small');
  return [shuffled[0]!, shuffled[1]!, shuffled[2]!] as const;
}

function hashStrings(keys: readonly string[]): number {
  let h = 0x811c9dc5 >>> 0;
  for (const s of keys) {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h >>> 0;
}

function shuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = items.slice();
  let state = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Battle outcome summary — consumed by updateQuestProgress. Edge function
 * builds this from a finalized BattleState before calling.
 */
export interface BattleSummary {
  won: boolean;
  barType: BarType;
  barLevel: number;
  playerLevel: number;
  bossDefeated: boolean;
  perfectHits: number;
  skillsUsed: number;
  statusApplies: number;
  consumablesUsed: number;
  biggestHit: number;
  roomsCleared: number;
  endedHpPct: number;
  goldEarned: number;
}

export interface QuestProgress {
  questId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

/**
 * Apply a battle summary to a quest-progress record. Pure — returns the
 * updated record. Does NOT auto-claim the reward.
 */
export function updateQuestProgress(
  def: QuestDef,
  prior: QuestProgress,
  summary: BattleSummary,
): QuestProgress {
  if (prior.claimed) return prior;
  let delta = 0;
  switch (def.kind) {
    case 'boss_kills':
      if (summary.won && summary.bossDefeated) delta = 1;
      break;
    case 'wins_of_type':
      if (summary.won && summary.barType === def.barType) delta = 1;
      break;
    case 'no_consumable_wins':
      if (summary.won && summary.consumablesUsed === 0) delta = 1;
      break;
    case 'perfect_hits':
      delta = summary.perfectHits;
      break;
    case 'skill_uses':
      delta = summary.skillsUsed;
      break;
    case 'status_applies':
      delta = summary.statusApplies;
      break;
    case 'gold_earned':
      delta = summary.goldEarned;
      break;
    case 'big_hit_damage':
      // Threshold quest: progress = max seen. Target is the threshold itself.
      if (summary.biggestHit >= def.target) {
        return {
          ...prior,
          progress: def.target,
          completed: true,
        };
      }
      delta = 0;
      break;
    case 'full_hp_win':
      if (summary.won && summary.endedHpPct >= 0.8) delta = 1;
      break;
    case 'fast_clear_rooms':
      // Win in N rooms or fewer — progress is 1 if satisfied.
      if (summary.won && summary.roomsCleared <= def.target) {
        return { ...prior, progress: def.target, completed: true };
      }
      delta = 0;
      break;
    case 'underdog_win':
      if (summary.won && summary.barLevel >= summary.playerLevel + 5) delta = 1;
      break;
  }
  const progress = Math.min(def.target, prior.progress + delta);
  return {
    ...prior,
    progress,
    completed: progress >= def.target,
  };
}

/**
 * Claim a completed quest. Returns the XP to award and the updated
 * progress record (claimed=true so it can't be claimed twice).
 */
export function claimQuest(def: QuestDef, progress: QuestProgress): {
  xpAwarded: number;
  updated: QuestProgress;
} {
  if (!progress.completed) {
    throw new Error(`Quest ${def.id} is not yet complete`);
  }
  if (progress.claimed) {
    throw new Error(`Quest ${def.id} was already claimed`);
  }
  return {
    xpAwarded: def.xpReward,
    updated: { ...progress, claimed: true },
  };
}

export function freshQuestProgress(def: QuestDef): QuestProgress {
  return { questId: def.id, progress: 0, completed: false, claimed: false };
}
