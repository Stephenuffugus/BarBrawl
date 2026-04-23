// Daily login streak tracking. Spec §5.8 mentions "daily login rewards"
// as a consumable source. This module formalizes the streak math + the
// milestone reward table.

export interface LoginStreakState {
  /** YYYY-MM-DD local-date of last login. */
  lastLoginDate: string | null;
  currentStreak: number;
  longestStreak: number;
  /** Total logins ever (for lifetime achievements). */
  totalLogins: number;
}

export function freshStreak(): LoginStreakState {
  return { lastLoginDate: null, currentStreak: 0, longestStreak: 0, totalLogins: 0 };
}

/**
 * Apply a login at `now`. Returns the updated streak state + which
 * rewards (if any) unlock for this particular login.
 *
 * - Same-day repeat login: no state change.
 * - Consecutive next day: streak increments, milestones may award.
 * - Skipped day(s): streak resets to 1.
 * - First-ever login: streak becomes 1.
 */
export function applyLogin(
  state: LoginStreakState,
  now: Date = new Date(),
  tzOffsetMinutes: number = 0,
): { state: LoginStreakState; isNewDay: boolean; rewards: readonly LoginReward[] } {
  const today = localDayKey(now, tzOffsetMinutes);
  if (state.lastLoginDate === today) {
    return { state, isNewDay: false, rewards: [] };
  }

  const prevDay = state.lastLoginDate
    ? yesterdayKey(today)
    : null;
  const consecutive = state.lastLoginDate === prevDay;
  const newStreak = consecutive ? state.currentStreak + 1 : 1;
  const longest = Math.max(state.longestStreak, newStreak);
  const nextState: LoginStreakState = {
    lastLoginDate: today,
    currentStreak: newStreak,
    longestStreak: longest,
    totalLogins: state.totalLogins + 1,
  };
  return {
    state: nextState,
    isNewDay: true,
    rewards: rewardsForStreak(newStreak),
  };
}

function yesterdayKey(todayKey: string): string {
  const [y, m, d] = todayKey.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function localDayKey(d: Date, tzOffsetMinutes: number): string {
  const shifted = new Date(d.getTime() + tzOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Reward table ──────────────────────────────────────────────────

export type LoginRewardKind =
  | 'gold'
  | 'consumable'
  | 'respec_token'
  | 'cosmetic';

export interface LoginReward {
  kind: LoginRewardKind;
  amount: number;
  /** For consumable/cosmetic kinds, the item id. */
  itemId?: string;
  /** Why this reward fired — human-readable. */
  reason: string;
}

/**
 * Every login grants a small gold bonus. Specific milestones add bigger
 * one-time-per-streak rewards.
 */
export function rewardsForStreak(streak: number): readonly LoginReward[] {
  const out: LoginReward[] = [{
    kind: 'gold',
    amount: 50 + streak * 10,
    reason: `Day ${streak} login bonus`,
  }];
  if (streak === 3) {
    out.push({ kind: 'consumable', itemId: 'small_brew', amount: 1, reason: '3-day streak: Small Brew' });
  }
  if (streak === 7) {
    out.push({ kind: 'consumable', itemId: 'house_special', amount: 2, reason: '7-day streak: 2× House Special' });
    out.push({ kind: 'respec_token', amount: 1, reason: '7-day streak: free respec token' });
  }
  if (streak === 14) {
    out.push({ kind: 'consumable', itemId: 'focus_vial', amount: 1, reason: '14-day streak: Focus Vial' });
  }
  if (streak === 30) {
    out.push({ kind: 'consumable', itemId: 'emergency_elixir', amount: 1, reason: '30-day streak: Emergency Elixir' });
    out.push({ kind: 'respec_token', amount: 3, reason: '30-day streak: 3× respec tokens' });
    out.push({ kind: 'cosmetic', amount: 1, itemId: 'regular_title', reason: '30-day streak: "Regular" title' });
  }
  return out;
}
