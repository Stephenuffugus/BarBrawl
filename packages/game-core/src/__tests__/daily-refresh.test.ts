import {
  rewardMultiplierForClearNumber,
  clearNumberToday,
  scaleRewards,
  isFirstConquer,
} from '../progression';

describe('rewardMultiplierForClearNumber (spec §1.6)', () => {
  it('first clear = 1.0x', () => {
    expect(rewardMultiplierForClearNumber(1)).toBe(1.0);
  });
  it('second clear = 0.5x', () => {
    expect(rewardMultiplierForClearNumber(2)).toBe(0.5);
  });
  it('third clear and beyond = 0.25x', () => {
    expect(rewardMultiplierForClearNumber(3)).toBe(0.25);
    expect(rewardMultiplierForClearNumber(10)).toBe(0.25);
  });
  it('rejects zero and negative', () => {
    expect(() => rewardMultiplierForClearNumber(0)).toThrow(RangeError);
    expect(() => rewardMultiplierForClearNumber(-1)).toThrow(RangeError);
  });
});

describe('clearNumberToday', () => {
  it('returns 1 when no prior clears', () => {
    const now = new Date('2026-04-23T20:00:00Z');
    expect(clearNumberToday([], now)).toBe(1);
  });

  it('counts prior clears on the same day', () => {
    const now = new Date('2026-04-23T20:00:00Z');
    const prior = [
      '2026-04-23T10:00:00Z',
      '2026-04-23T18:00:00Z',
    ];
    expect(clearNumberToday(prior, now)).toBe(3);
  });

  it('ignores yesterday\'s clears', () => {
    const now = new Date('2026-04-23T02:00:00Z');
    const prior = [
      '2026-04-22T18:00:00Z',
      '2026-04-22T23:00:00Z',
    ];
    expect(clearNumberToday(prior, now)).toBe(1);
  });

  it('honors timezone offset', () => {
    // 2026-04-23T02:00Z = 2026-04-22T21:00 in UTC-5
    const now = new Date('2026-04-23T02:00:00Z');
    const prior = ['2026-04-22T23:00:00Z']; // local day = 2026-04-22 in UTC-5
    // With tzOffset -300 (UTC-5), both now and prior are 2026-04-22.
    expect(clearNumberToday(prior, now, -300)).toBe(2);
  });
});

describe('scaleRewards', () => {
  it('scales xp and gold but preserves other keys', () => {
    const r = { xp: 100, gold: 50, itemIds: ['a'] };
    expect(scaleRewards(r, 1)).toEqual({ xp: 100, gold: 50, itemIds: ['a'] });
    expect(scaleRewards(r, 2)).toEqual({ xp: 50, gold: 25, itemIds: ['a'] });
    expect(scaleRewards(r, 3)).toEqual({ xp: 25, gold: 12, itemIds: ['a'] });
  });
});

describe('isFirstConquer', () => {
  it('true when never cleared before', () => {
    expect(isFirstConquer(0)).toBe(true);
  });
  it('false after one prior clear', () => {
    expect(isFirstConquer(1)).toBe(false);
  });
});
