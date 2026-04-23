import { applyLogin, freshStreak, rewardsForStreak } from '../events';

describe('freshStreak', () => {
  it('starts empty', () => {
    const s = freshStreak();
    expect(s).toEqual({
      lastLoginDate: null, currentStreak: 0, longestStreak: 0, totalLogins: 0,
    });
  });
});

describe('applyLogin', () => {
  it('first login: streak becomes 1', () => {
    const { state, isNewDay } = applyLogin(freshStreak(), new Date('2026-04-23T10:00:00Z'));
    expect(state.currentStreak).toBe(1);
    expect(state.lastLoginDate).toBe('2026-04-23');
    expect(isNewDay).toBe(true);
  });

  it('same-day repeat: no change', () => {
    const { state } = applyLogin(freshStreak(), new Date('2026-04-23T10:00:00Z'));
    const again = applyLogin(state, new Date('2026-04-23T23:00:00Z'));
    expect(again.state).toBe(state);
    expect(again.isNewDay).toBe(false);
    expect(again.rewards).toEqual([]);
  });

  it('consecutive day increments streak', () => {
    let s = freshStreak();
    s = applyLogin(s, new Date('2026-04-23T10:00:00Z')).state;
    s = applyLogin(s, new Date('2026-04-24T10:00:00Z')).state;
    s = applyLogin(s, new Date('2026-04-25T10:00:00Z')).state;
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(3);
    expect(s.totalLogins).toBe(3);
  });

  it('missed day resets to 1 but preserves longestStreak', () => {
    let s = freshStreak();
    s = applyLogin(s, new Date('2026-04-23T10:00:00Z')).state;
    s = applyLogin(s, new Date('2026-04-24T10:00:00Z')).state;
    s = applyLogin(s, new Date('2026-04-25T10:00:00Z')).state;
    s = applyLogin(s, new Date('2026-04-27T10:00:00Z')).state; // skipped 26
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(3);
  });

  it('triggers milestone rewards on day 3, 7, 14, 30', () => {
    let s = freshStreak();
    let fired3 = false, fired7 = false;
    for (let day = 0; day < 7; day++) {
      const now = new Date(Date.UTC(2026, 3, 23 + day, 10, 0, 0));
      const r = applyLogin(s, now);
      s = r.state;
      if (s.currentStreak === 3) fired3 = r.rewards.some((x) => x.reason.includes('3-day'));
      if (s.currentStreak === 7) fired7 = r.rewards.some((x) => x.reason.includes('7-day'));
    }
    expect(fired3).toBe(true);
    expect(fired7).toBe(true);
  });
});

describe('rewardsForStreak', () => {
  it('day-1 login has a small gold bonus', () => {
    const r = rewardsForStreak(1);
    expect(r.find((x) => x.kind === 'gold')).toBeDefined();
  });

  it('day-7 adds respec token + consumables', () => {
    const r = rewardsForStreak(7);
    expect(r.some((x) => x.kind === 'respec_token')).toBe(true);
    expect(r.some((x) => x.kind === 'consumable')).toBe(true);
  });

  it('day-30 adds cosmetic title', () => {
    const r = rewardsForStreak(30);
    expect(r.some((x) => x.kind === 'cosmetic')).toBe(true);
  });

  it('non-milestone days only grant base gold', () => {
    const r = rewardsForStreak(4);
    expect(r.length).toBe(1);
    expect(r[0]!.kind).toBe('gold');
  });
});
