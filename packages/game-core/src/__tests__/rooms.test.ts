import { ROOMS_BY_TYPE, generateBarRun, todayDateKey } from '../bars';

describe('ROOMS_BY_TYPE', () => {
  it('covers all 7 bar types', () => {
    const types = ['dive','pub','sports','cocktail','wine','brewery','nightclub'] as const;
    for (const t of types) {
      expect(ROOMS_BY_TYPE[t]).toBeDefined();
      expect(ROOMS_BY_TYPE[t].length).toBeGreaterThan(0);
    }
  });

  it('every bar type has exactly one boss room', () => {
    for (const [type, pool] of Object.entries(ROOMS_BY_TYPE)) {
      const bosses = pool.filter((r) => r.isBoss);
      if (bosses.length !== 1) {
        throw new Error(`${type} has ${bosses.length} boss rooms, expected 1`);
      }
    }
  });
});

describe('generateBarRun', () => {
  it('returns 4-6 rooms total (3-5 normals + 1 boss)', () => {
    const run = generateBarRun('bar_1', 'dive', '2026-04-23');
    expect(run.length).toBeGreaterThanOrEqual(4);
    expect(run.length).toBeLessThanOrEqual(6);
  });

  it('boss room is always last', () => {
    const run = generateBarRun('bar_1', 'cocktail', '2026-04-23');
    expect(run[run.length - 1]!.isBoss).toBe(true);
  });

  it('is deterministic for the same inputs', () => {
    const a = generateBarRun('bar_abc', 'pub', '2026-04-23');
    const b = generateBarRun('bar_abc', 'pub', '2026-04-23');
    expect(a).toEqual(b);
  });

  it('produces different layouts for different days', () => {
    const a = generateBarRun('bar_1', 'brewery', '2026-04-23');
    const b = generateBarRun('bar_1', 'brewery', '2026-04-24');
    // At least one of room count or order should differ across days.
    const aNames = a.map((r) => r.name).join(',');
    const bNames = b.map((r) => r.name).join(',');
    expect(aNames === bNames).toBe(false);
  });

  it('produces different layouts for different bars on same day', () => {
    const a = generateBarRun('bar_A', 'nightclub', '2026-04-23');
    const b = generateBarRun('bar_B', 'nightclub', '2026-04-23');
    const aNames = a.map((r) => r.name).join(',');
    const bNames = b.map((r) => r.name).join(',');
    expect(aNames === bNames).toBe(false);
  });

  it('only picks from the bar type\'s room pool', () => {
    const run = generateBarRun('bar_1', 'wine', '2026-04-23');
    const poolNames = new Set(ROOMS_BY_TYPE.wine.map((r) => r.name));
    for (const room of run) {
      expect(poolNames.has(room.name)).toBe(true);
    }
  });
});

describe('todayDateKey', () => {
  it('returns YYYY-MM-DD format', () => {
    const d = new Date('2026-04-23T05:30:00Z');
    expect(todayDateKey(d)).toBe('2026-04-23');
  });
});
