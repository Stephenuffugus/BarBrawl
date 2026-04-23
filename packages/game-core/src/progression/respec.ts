// Respec system — spec §5.2:
//   "Respecs: Cost gold, scales with level. Lv 10 = 100 gold,
//    Lv 100 = 10,000 gold. Free respec tokens from major patches
//    and every 10 levels (5 tokens granted)."
//
// Pure helpers. Edge function wraps these with DB writes.

export const RESPEC_RULES = Object.freeze({
  /**
   * Respec gold cost formula: level^2.
   * Spec §5.2 anchors: Lv 10 = 100, Lv 100 = 10,000.
   * Quadratic scaling means respeccing at endgame is expensive, protecting
   * hard-earned optimal builds.
   */
  COST_EXPONENT: 2,
  /** Levels between free-token grants. */
  TOKEN_GRANT_INTERVAL: 10,
  /** Tokens granted each interval. */
  TOKENS_PER_GRANT: 5,
});

export function respecCostGold(level: number): number {
  if (!Number.isFinite(level) || level < 1) {
    throw new RangeError(`level must be >= 1, got ${level}`);
  }
  return level * level;
}

/**
 * How many free respec tokens to grant for a level-up that crossed
 * from `oldLevel` to `newLevel`. Grants 5 tokens each time the player
 * crosses a multiple of 10.
 */
export function respecTokensFromLevelUp(oldLevel: number, newLevel: number): number {
  if (newLevel <= oldLevel) return 0;
  const oldMilestones = Math.floor(oldLevel / RESPEC_RULES.TOKEN_GRANT_INTERVAL);
  const newMilestones = Math.floor(newLevel / RESPEC_RULES.TOKEN_GRANT_INTERVAL);
  return Math.max(0, (newMilestones - oldMilestones) * RESPEC_RULES.TOKENS_PER_GRANT);
}

export interface RespecInput {
  level: number;
  allocatedNodes: readonly string[];
  goldBalance: number;
  tokenBalance: number;
  useToken: boolean;
}

export interface RespecResult {
  ok: true;
  allocatedNodes: readonly string[];  // will be empty after
  skillPointsAvailable: number;       // equals level
  goldSpent: number;
  tokensSpent: number;
  goldBalance: number;
  tokenBalance: number;
}

export interface RespecError {
  ok: false;
  reason: 'insufficient_gold' | 'insufficient_tokens' | 'already_blank';
  costGold: number;
}

/**
 * Execute a respec. Returns either the new state or a specific reason.
 * Leaves the caller to persist the new character row.
 */
export function applyRespec(input: RespecInput): RespecResult | RespecError {
  if (input.allocatedNodes.length === 0) {
    return { ok: false, reason: 'already_blank', costGold: 0 };
  }
  if (input.useToken) {
    if (input.tokenBalance < 1) {
      return { ok: false, reason: 'insufficient_tokens', costGold: 0 };
    }
    return {
      ok: true,
      allocatedNodes: [],
      skillPointsAvailable: input.level,
      goldSpent: 0,
      tokensSpent: 1,
      goldBalance: input.goldBalance,
      tokenBalance: input.tokenBalance - 1,
    };
  }
  const cost = respecCostGold(input.level);
  if (input.goldBalance < cost) {
    return { ok: false, reason: 'insufficient_gold', costGold: cost };
  }
  return {
    ok: true,
    allocatedNodes: [],
    skillPointsAvailable: input.level,
    goldSpent: cost,
    tokensSpent: 0,
    goldBalance: input.goldBalance - cost,
    tokenBalance: input.tokenBalance,
  };
}
