import {
  classifyRhythmTap,
  classifyWithLenience,
  adjustZones,
  RHYTHM_WINDOW_MS,
  RHYTHM_ZONES,
} from '../index';

describe('RHYTHM_WINDOW_MS + zones (spec §5.3)', () => {
  it('window is 1200ms', () => {
    expect(RHYTHM_WINDOW_MS).toBe(1200);
  });
  it('perfect zone is 47-53%', () => {
    expect(RHYTHM_ZONES.PERFECT_MIN).toBe(0.47);
    expect(RHYTHM_ZONES.PERFECT_MAX).toBe(0.53);
  });
  it('good zone is 40-60%', () => {
    expect(RHYTHM_ZONES.GOOD_MIN).toBe(0.40);
    expect(RHYTHM_ZONES.GOOD_MAX).toBe(0.60);
  });
});

describe('classifyRhythmTap', () => {
  it('center tap = perfect', () => {
    const r = classifyRhythmTap(600);
    expect(r.quality).toBe('perfect');
    expect(r.deviationMs).toBe(0);
  });

  it('edge of perfect zone (47%) = perfect', () => {
    const r = classifyRhythmTap(0.47 * 1200);
    expect(r.quality).toBe('perfect');
  });

  it('just outside perfect (46%) = good', () => {
    const r = classifyRhythmTap(0.46 * 1200);
    expect(r.quality).toBe('good');
  });

  it('edge of good zone (40%) = good', () => {
    const r = classifyRhythmTap(0.40 * 1200);
    expect(r.quality).toBe('good');
  });

  it('outside green zone (30%) = miss', () => {
    const r = classifyRhythmTap(0.30 * 1200);
    expect(r.quality).toBe('miss');
  });

  it('late tap (90%) = miss', () => {
    const r = classifyRhythmTap(0.90 * 1200);
    expect(r.quality).toBe('miss');
  });

  it('no tap = miss (active player did not tap)', () => {
    const r = classifyRhythmTap(null);
    expect(r.quality).toBe('miss');
    expect(r.position).toBeNull();
  });

  it('AFK mode = ok regardless of tap', () => {
    const afkNoTap = classifyRhythmTap(null, true);
    const afkWithTap = classifyRhythmTap(600, true);
    expect(afkNoTap.quality).toBe('ok');
    expect(afkWithTap.quality).toBe('ok');
  });

  it('negative or out-of-bounds tap = miss', () => {
    expect(classifyRhythmTap(-50).quality).toBe('miss');
    expect(classifyRhythmTap(9999).quality).toBe('miss');
    expect(classifyRhythmTap(NaN).quality).toBe('miss');
  });

  it('deviation is ms from center, signed', () => {
    const early = classifyRhythmTap(500); // 100ms early
    const late = classifyRhythmTap(700);  // 100ms late
    expect(early.deviationMs).toBe(-100);
    expect(late.deviationMs).toBe(100);
  });
});

describe('adjustZones (lenience)', () => {
  it('0 lenience = no change', () => {
    const z = adjustZones(0);
    expect(z.perfectMin).toBe(RHYTHM_ZONES.PERFECT_MIN);
    expect(z.perfectMax).toBe(RHYTHM_ZONES.PERFECT_MAX);
  });

  it('widens zones symmetrically', () => {
    const z = adjustZones(0.10);
    expect(z.perfectMin).toBeLessThan(RHYTHM_ZONES.PERFECT_MIN);
    expect(z.perfectMax).toBeGreaterThan(RHYTHM_ZONES.PERFECT_MAX);
  });

  it('clamps at [0, 1]', () => {
    const z = adjustZones(2.0);
    expect(z.perfectMin).toBeGreaterThanOrEqual(0);
    expect(z.perfectMax).toBeLessThanOrEqual(1);
  });
});

describe('classifyWithLenience', () => {
  it('with lenience, a previously-miss tap becomes good', () => {
    // 36% normally = miss; with 10% lenience, good zone widens by 5% each side
    // so GOOD_MIN becomes 0.35. 36% is now in good.
    const withoutLenience = classifyRhythmTap(0.36 * 1200);
    expect(withoutLenience.quality).toBe('miss');
    const withLenience = classifyWithLenience(0.36 * 1200, 0.10);
    expect(withLenience.quality).toBe('good');
  });

  it('no tap still = miss even with lenience', () => {
    expect(classifyWithLenience(null, 0.5).quality).toBe('miss');
  });
});
