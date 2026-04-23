// Daily refresh scaling — spec §1.6:
//   "First clear each day = full rewards, second = 50%, third+ = 25%."
//
// Pure helper. Edge function battle-end queries the battles table for
// today's clears of (character_id, bar_id), counts them, and passes the
// count (inclusive of this clear) to rewardMultiplierForClearNumber.

/**
 * Multiplier applied to XP/gold/loot rewards for the Nth clear of a
 * specific bar on a given local day.
 *
 * @param clearNumber 1 = first clear today, 2 = second, etc.
 */
export function rewardMultiplierForClearNumber(clearNumber: number): number {
  if (!Number.isFinite(clearNumber) || clearNumber < 1) {
    throw new RangeError(`clearNumber must be >= 1, got ${clearNumber}`);
  }
  if (clearNumber === 1) return 1.0;
  if (clearNumber === 2) return 0.5;
  return 0.25;
}

/**
 * Given a sorted (ascending) list of prior-clear timestamps (ISO strings
 * or Date objects) for the SAME (character, bar) pair and a "now" moment,
 * return the clear number this new clear represents.
 *
 * Uses local day boundaries (midnight local). Caller supplies a
 * `timeZoneOffsetMinutes` if they need a specific TZ — default uses UTC.
 *
 * Per spec §5.4 "All bars reset at local midnight."
 */
export function clearNumberToday(
  priorClears: readonly (string | Date)[],
  now: Date,
  timeZoneOffsetMinutes = 0,
): number {
  const today = localDayKey(now, timeZoneOffsetMinutes);
  let todayCount = 0;
  for (const t of priorClears) {
    const d = typeof t === 'string' ? new Date(t) : t;
    if (localDayKey(d, timeZoneOffsetMinutes) === today) todayCount++;
  }
  return todayCount + 1;
}

function localDayKey(d: Date, tzOffsetMinutes: number): string {
  const shifted = new Date(d.getTime() + tzOffsetMinutes * 60_000);
  // YYYY-MM-DD in shifted-time (ignoring actual TZ of runtime).
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convenience: scale a reward bundle by today's clear number.
 */
export function scaleRewards<T extends { xp: number; gold: number }>(
  rewards: T,
  clearNumber: number,
): T {
  const mult = rewardMultiplierForClearNumber(clearNumber);
  return {
    ...rewards,
    xp: Math.floor(rewards.xp * mult),
    gold: Math.floor(rewards.gold * mult),
  };
}

/**
 * First-conquer detection: is this the player's first-ever clear of
 * a particular bar? If so, spec §5.6 grants 2× XP and +100 bonus XP
 * for killing the boss the first time. Combine with the daily-refresh
 * multiplier externally (first-conquer stacks multiplicatively).
 */
export function isFirstConquer(priorClearCountEver: number): boolean {
  return priorClearCountEver === 0;
}
