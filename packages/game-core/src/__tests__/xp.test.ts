import {
  LEVEL_CAP,
  xpToNext,
  totalXpToReach,
  gainsForLevels,
  applyXp,
} from '../math/xp';

describe('xpToNext (spec §5.6)', () => {
  it('level 1 → 2 costs 80 XP (matches spec example)', () => {
    expect(xpToNext(1)).toBe(80);
  });

  it('follows formula floor(80 * L^1.45)', () => {
    for (const L of [1, 2, 5, 10, 50, 100, 500, 999]) {
      expect(xpToNext(L)).toBe(Math.floor(80 * Math.pow(L, 1.45)));
    }
  });

  it('is strictly monotonic in level', () => {
    let prev = 0;
    for (let L = 1; L < 100; L++) {
      const cur = xpToNext(L);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it('returns Infinity at/after level cap', () => {
    expect(xpToNext(LEVEL_CAP)).toBe(Infinity);
    expect(xpToNext(LEVEL_CAP + 100)).toBe(Infinity);
  });

  it('rejects invalid input', () => {
    expect(() => xpToNext(0)).toThrow(RangeError);
    expect(() => xpToNext(-1)).toThrow(RangeError);
    expect(() => xpToNext(NaN)).toThrow(RangeError);
  });
});

describe('totalXpToReach', () => {
  it('level 1 requires 0 total XP', () => {
    expect(totalXpToReach(1)).toBe(0);
  });

  it('level 2 requires xpToNext(1) total XP', () => {
    expect(totalXpToReach(2)).toBe(xpToNext(1));
  });

  it('level 3 accumulates 1→2 and 2→3', () => {
    expect(totalXpToReach(3)).toBe(xpToNext(1) + xpToNext(2));
  });

  it('is monotonically non-decreasing', () => {
    let prev = 0;
    for (let L = 1; L <= 50; L++) {
      const cur = totalXpToReach(L);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });
});

describe('gainsForLevels (spec §5.6)', () => {
  it('0 levels = no gains', () => {
    expect(gainsForLevels(0)).toEqual({
      hp: 0, atk: 0, def: 0, spd: 0, skillPoints: 0,
    });
  });

  it('1 level = +6 HP, +2 ATK, +1 DEF, +0.5 SPD, +1 SP', () => {
    expect(gainsForLevels(1)).toEqual({
      hp: 6, atk: 2, def: 1, spd: 0.5, skillPoints: 1,
    });
  });

  it('scales linearly', () => {
    const g = gainsForLevels(10);
    expect(g).toEqual({
      hp: 60, atk: 20, def: 10, spd: 5, skillPoints: 10,
    });
  });

  it('rejects non-integer or negative levels', () => {
    expect(() => gainsForLevels(-1)).toThrow(RangeError);
    expect(() => gainsForLevels(1.5)).toThrow(RangeError);
  });
});

describe('applyXp', () => {
  it('awards partial XP without leveling', () => {
    const r = applyXp({ level: 1, xpIntoLevel: 0 }, 40);
    expect(r.state).toEqual({ level: 1, xpIntoLevel: 40 });
    expect(r.levelsGained).toBe(0);
  });

  it('awards exact-level XP and advances', () => {
    const r = applyXp({ level: 1, xpIntoLevel: 0 }, 80);
    expect(r.state).toEqual({ level: 2, xpIntoLevel: 0 });
    expect(r.levelsGained).toBe(1);
  });

  it('rolls excess XP into the next level', () => {
    const r = applyXp({ level: 1, xpIntoLevel: 0 }, 120);
    expect(r.state.level).toBe(2);
    expect(r.state.xpIntoLevel).toBe(40); // 120 - 80 spillover
    expect(r.levelsGained).toBe(1);
  });

  it('handles multi-level-up from a single huge award', () => {
    const r = applyXp({ level: 1, xpIntoLevel: 0 }, 1_000_000);
    expect(r.levelsGained).toBeGreaterThan(5);
    expect(r.state.level).toBeGreaterThan(5);
    expect(r.state.level).toBeLessThanOrEqual(LEVEL_CAP);
  });

  it('clamps at LEVEL_CAP', () => {
    const r = applyXp({ level: LEVEL_CAP - 1, xpIntoLevel: 0 }, 1e18);
    expect(r.state.level).toBe(LEVEL_CAP);
    expect(r.state.xpIntoLevel).toBe(0);
  });

  it('rejects negative awards', () => {
    expect(() => applyXp({ level: 1, xpIntoLevel: 0 }, -1)).toThrow(RangeError);
  });
});
