import {
  WORLD_BOSS_RULES,
  worldBossPhase,
  applyWorldBossHit,
  computeWorldBossRewards,
  spawnWorldBoss,
  type WorldBoss,
} from '../events';

function testSpawn(maxHp = 1_000_000): WorldBoss {
  return spawnWorldBoss({
    id: 'wb1',
    barId: 'bar_1',
    region: 'nyc',
    saturday8pm: new Date('2026-04-25T20:00:00Z'),
    maxHp,
  });
}

describe('spawnWorldBoss', () => {
  it('creates a boss with the 48-hour window', () => {
    const wb = testSpawn();
    const start = new Date(wb.startsAt).getTime();
    const end = new Date(wb.endsAt).getTime();
    expect(end - start).toBe(WORLD_BOSS_RULES.WINDOW_HOURS * 3600_000);
  });
});

describe('worldBossPhase', () => {
  const wb = testSpawn();
  it('pending before window', () => {
    expect(worldBossPhase(wb, new Date('2026-04-24T10:00:00Z'))).toBe('pending');
  });
  it('active during window', () => {
    expect(worldBossPhase(wb, new Date('2026-04-26T10:00:00Z'))).toBe('active');
  });
  it('ended after window', () => {
    expect(worldBossPhase(wb, new Date('2026-04-28T10:00:00Z'))).toBe('ended');
  });
  it('ended if currentHp hit zero', () => {
    const killed = { ...wb, currentHp: 0 };
    expect(worldBossPhase(killed, new Date('2026-04-26T10:00:00Z'))).toBe('ended');
  });
});

describe('applyWorldBossHit', () => {
  const nowActive = new Date('2026-04-26T10:00:00Z');

  it('records damage + reduces hp', () => {
    const wb = testSpawn(100);
    const next = applyWorldBossHit(wb, 'user_1', 30, nowActive);
    expect(next.currentHp).toBe(70);
    expect(next.contributions['user_1']).toBe(30);
  });

  it('caps damage at remaining hp', () => {
    const wb = testSpawn(50);
    const next = applyWorldBossHit(wb, 'user_1', 200, nowActive);
    expect(next.currentHp).toBe(0);
    expect(next.contributions['user_1']).toBe(50);
  });

  it('accumulates across hits from same user', () => {
    let wb = testSpawn(1000);
    wb = applyWorldBossHit(wb, 'u1', 100, nowActive);
    wb = applyWorldBossHit(wb, 'u1', 200, nowActive);
    wb = applyWorldBossHit(wb, 'u2', 50, nowActive);
    expect(wb.contributions['u1']).toBe(300);
    expect(wb.contributions['u2']).toBe(50);
    expect(wb.currentHp).toBe(650);
  });

  it('ignores hits when boss is pending or ended', () => {
    const wb = testSpawn(1000);
    const pendingNow = new Date('2026-04-24T10:00:00Z');
    expect(applyWorldBossHit(wb, 'u1', 100, pendingNow)).toBe(wb);
    const endedNow = new Date('2026-04-28T10:00:00Z');
    expect(applyWorldBossHit(wb, 'u1', 100, endedNow)).toBe(wb);
  });

  it('ignores zero/negative damage', () => {
    const wb = testSpawn(100);
    expect(applyWorldBossHit(wb, 'u1', 0, nowActive)).toBe(wb);
    expect(applyWorldBossHit(wb, 'u1', -10, nowActive)).toBe(wb);
  });
});

describe('computeWorldBossRewards', () => {
  it('empty contributors = no rewards', () => {
    const wb = testSpawn();
    expect(computeWorldBossRewards(wb)).toEqual([]);
  });

  it('sorts by damage descending and assigns tiers', () => {
    const wb: WorldBoss = {
      ...testSpawn(),
      contributions: {
        u1: 1000, u2: 500, u3: 250, u4: 100, u5: 50,
      },
    };
    const rewards = computeWorldBossRewards(wb);
    expect(rewards[0]!.userId).toBe('u1');
    expect(rewards[0]!.tier).toBe('top_1pct');
    // Since contributors.length=5, 1% rounds up to 1 (top), 10% → 1 (covered),
    // 50% → 3 (u1, u2, u3 get 50pct or better), rest participant.
    expect(rewards[rewards.length - 1]!.tier).toBe('participant');
    expect(rewards.map((r) => r.userId)).toEqual(['u1','u2','u3','u4','u5']);
  });

  it('top 1% reward tier is strictly best', () => {
    const contributions: Record<string, number> = {};
    for (let i = 0; i < 200; i++) contributions[`u${i}`] = 1000 - i;
    const wb = { ...testSpawn(), contributions };
    const rewards = computeWorldBossRewards(wb);
    const top = rewards.filter((r) => r.tier === 'top_1pct');
    const second = rewards.filter((r) => r.tier === 'top_10pct')[0]!;
    expect(top.length).toBeGreaterThanOrEqual(2); // 1% of 200 = 2
    expect(top[0]!.goldReward).toBeGreaterThan(second.goldReward);
  });
});
