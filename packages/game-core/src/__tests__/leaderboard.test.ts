import {
  rankEntries,
  rankByRegion,
  topNOfRegion,
  userRankInRegion,
  page,
  type LeaderboardEntry,
} from '../social';

const nyc: readonly LeaderboardEntry[] = [
  { userId: 'u1', displayName: 'Alice',   coinsEarned: 500, region: 'nyc', barsWon: 10, characterLevel: 30 },
  { userId: 'u2', displayName: 'Bob',     coinsEarned: 800, region: 'nyc', barsWon: 15, characterLevel: 25 },
  { userId: 'u3', displayName: 'Cole',    coinsEarned: 500, region: 'nyc', barsWon: 12, characterLevel: 28 },
];

const sf: readonly LeaderboardEntry[] = [
  { userId: 'u4', displayName: 'Dana',    coinsEarned: 1000, region: 'sf', barsWon: 20 },
  { userId: 'u5', displayName: 'Erik',    coinsEarned: 100,  region: 'sf' },
];

const all = [...nyc, ...sf];

describe('rankEntries', () => {
  it('sorts by coins desc', () => {
    const ranked = rankEntries(nyc);
    expect(ranked.map((r) => r.userId)).toEqual(['u2', 'u3', 'u1']);
  });

  it('ties break on barsWon', () => {
    const ranked = rankEntries(nyc);
    // Alice and Cole both have 500 coins; Cole has 12 wins, Alice 10.
    const cole = ranked.find((r) => r.userId === 'u3')!;
    const alice = ranked.find((r) => r.userId === 'u1')!;
    expect(cole.rank).toBeLessThan(alice.rank);
  });

  it('assigns tier badges', () => {
    const many: LeaderboardEntry[] = Array.from({ length: 150 }, (_, i) => ({
      userId: `u${i}`, displayName: `P${i}`, coinsEarned: 1000 - i, region: 'nyc',
    }));
    const ranked = rankEntries(many);
    expect(ranked[0]!.tierBadge).toBe('top_1');
    expect(ranked[5]!.tierBadge).toBe('top_10');
    expect(ranked[50]!.tierBadge).toBe('top_100');
    expect(ranked[120]!.tierBadge).toBe('top_1000');
  });
});

describe('rankByRegion', () => {
  it('groups entries by region and ranks each independently', () => {
    const byRegion = rankByRegion(all);
    expect(byRegion.nyc?.length).toBe(3);
    expect(byRegion.sf?.length).toBe(2);
    // nyc top is Bob (800 coins).
    expect(byRegion.nyc?.[0]?.userId).toBe('u2');
    // sf top is Dana.
    expect(byRegion.sf?.[0]?.userId).toBe('u4');
  });
});

describe('topNOfRegion', () => {
  it('returns top N per region', () => {
    const top2 = topNOfRegion(all, 'nyc', 2);
    expect(top2.length).toBe(2);
    expect(top2[0]!.userId).toBe('u2');
  });

  it('empty for unknown region', () => {
    expect(topNOfRegion(all, 'lax', 5)).toEqual([]);
  });
});

describe('userRankInRegion', () => {
  it('returns the ranked entry for a user', () => {
    const r = userRankInRegion(all, 'u3', 'nyc');
    expect(r).not.toBeNull();
    expect(r!.rank).toBe(2);
  });

  it('null for missing user', () => {
    expect(userRankInRegion(all, 'absent', 'nyc')).toBeNull();
  });
});

describe('page', () => {
  it('slices with offset + limit', () => {
    const xs = [1, 2, 3, 4, 5];
    expect(page(xs, { limit: 2 })).toEqual([1, 2]);
    expect(page(xs, { offset: 2, limit: 2 })).toEqual([3, 4]);
    expect(page(xs, { offset: 10, limit: 2 })).toEqual([]);
  });
});
