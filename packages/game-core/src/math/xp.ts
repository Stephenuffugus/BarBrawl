// XP and leveling — spec §5.6. Pure functions.

export const LEVEL_CAP = 1000;

/** XP required to advance from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  if (!Number.isFinite(level) || level < 1) {
    throw new RangeError(`level must be >= 1, got ${level}`);
  }
  if (level >= LEVEL_CAP) return Infinity;
  return Math.floor(80 * Math.pow(level, 1.45));
}

/** Total lifetime XP needed to reach `level` from level 1. */
export function totalXpToReach(level: number): number {
  if (!Number.isFinite(level) || level < 1) {
    throw new RangeError(`level must be >= 1, got ${level}`);
  }
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpToNext(l);
  return sum;
}

export interface LevelGains {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  skillPoints: number;
}

/** Per-level gains per spec §5.6: +6 HP, +2 ATK, +1 DEF, +0.5 SPD, 1 SP. */
export function gainsForLevels(levels: number): LevelGains {
  if (!Number.isInteger(levels) || levels < 0) {
    throw new RangeError(`levels must be a non-negative integer, got ${levels}`);
  }
  return {
    hp: 6 * levels,
    atk: 2 * levels,
    def: 1 * levels,
    spd: 0.5 * levels,
    skillPoints: levels,
  };
}

/**
 * Apply an incoming XP award to a (level, xpInto) state.
 * Handles multi-level-ups in a single award. Clamps at LEVEL_CAP.
 */
export interface ProgressState {
  level: number;
  xpIntoLevel: number;
}

export interface ProgressResult {
  state: ProgressState;
  levelsGained: number;
}

export function applyXp(state: ProgressState, award: number): ProgressResult {
  if (!Number.isFinite(award) || award < 0) {
    throw new RangeError(`award must be >= 0, got ${award}`);
  }
  let { level, xpIntoLevel } = state;
  let remaining = award;
  let levelsGained = 0;
  while (level < LEVEL_CAP) {
    const need = xpToNext(level) - xpIntoLevel;
    if (remaining < need) {
      xpIntoLevel += remaining;
      remaining = 0;
      break;
    }
    remaining -= need;
    level += 1;
    xpIntoLevel = 0;
    levelsGained += 1;
  }
  if (level >= LEVEL_CAP) {
    xpIntoLevel = 0;
  }
  return { state: { level, xpIntoLevel }, levelsGained };
}
