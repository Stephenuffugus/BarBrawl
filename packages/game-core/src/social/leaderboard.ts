// Leaderboards — spec §5.10 "City Tournaments: Monthly leaderboards by
// defender coins earned. Top 100 in each city get unique frames and titles."
//
// Pure ranking. Caller aggregates defender coin totals from the DB and
// hands them to this module; no live queries here.

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  /** Primary ranking metric — defender coins earned this period. */
  coinsEarned: number;
  /** Optional tiebreakers. */
  barsWon?: number;
  characterLevel?: number;
  /** City / region identifier. */
  region: string;
}

export interface RankedEntry extends LeaderboardEntry {
  rank: number;
  tierBadge: 'top_1' | 'top_10' | 'top_100' | 'top_1000' | null;
}

/**
 * Rank entries within a single region. Ties break on barsWon, then
 * characterLevel. Unranked entries get rank:0 (shouldn't happen).
 */
export function rankEntries(entries: readonly LeaderboardEntry[]): readonly RankedEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.coinsEarned !== a.coinsEarned) return b.coinsEarned - a.coinsEarned;
    if ((b.barsWon ?? 0) !== (a.barsWon ?? 0)) return (b.barsWon ?? 0) - (a.barsWon ?? 0);
    return (b.characterLevel ?? 0) - (a.characterLevel ?? 0);
  });
  return sorted.map((e, idx) => {
    const rank = idx + 1;
    const tierBadge =
      rank === 1 ? 'top_1' :
      rank <= 10 ? 'top_10' :
      rank <= 100 ? 'top_100' :
      rank <= 1000 ? 'top_1000' :
      null;
    return { ...e, rank, tierBadge };
  });
}

/**
 * Group leaderboard rankings by region. Each region ranks independently
 * (a player on the NYC board doesn't compete against SF).
 */
export function rankByRegion(
  entries: readonly LeaderboardEntry[],
): Readonly<Record<string, readonly RankedEntry[]>> {
  const byRegion: Record<string, LeaderboardEntry[]> = {};
  for (const e of entries) {
    (byRegion[e.region] ??= []).push(e);
  }
  const out: Record<string, readonly RankedEntry[]> = {};
  for (const [region, list] of Object.entries(byRegion)) {
    out[region] = rankEntries(list);
  }
  return out;
}

export interface PageOpts {
  offset?: number;
  limit: number;
}

export function page<T>(items: readonly T[], opts: PageOpts): readonly T[] {
  const offset = opts.offset ?? 0;
  return items.slice(offset, offset + opts.limit);
}

/**
 * Convenience: top-N of a region. Returns empty array if the region
 * is unknown to the entries.
 */
export function topNOfRegion(
  entries: readonly LeaderboardEntry[],
  region: string,
  n: number,
): readonly RankedEntry[] {
  const byRegion = rankByRegion(entries);
  return page(byRegion[region] ?? [], { limit: n });
}

/**
 * Find one user's entry in a region (for "your rank: #42" displays).
 * Returns null if absent or no entries in region.
 */
export function userRankInRegion(
  entries: readonly LeaderboardEntry[],
  userId: string,
  region: string,
): RankedEntry | null {
  const byRegion = rankByRegion(entries);
  return (byRegion[region] ?? []).find((r) => r.userId === userId) ?? null;
}
