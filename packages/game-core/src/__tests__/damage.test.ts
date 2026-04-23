import {
  computeDamage,
  RHYTHM_MULTIPLIER,
  DEFAULT_CRIT_MULTIPLIER,
} from '../math/damage';

// Deterministic RNG helpers
const alwaysCrit = () => 0;
const neverCrit = () => 0.9999;

describe('computeDamage (spec §5.3)', () => {
  const base = {
    attackerAtk: 20,
    attackerLevel: 10,
    attackerLuck: 10,
    skillMultiplier: 1.0,
    defenderDef: 5,
    variance: 0,
    critBuff: 0,
    rng: neverCrit,
  } as const;

  it('applies the base formula: (atk + level*2) * skillMult', () => {
    const r = computeDamage({ ...base, rhythm: 'ok' });
    // base = (20 + 20) * 1.0 = 40; rhythm ok = 1.0; -5 def = 35
    expect(r.damage).toBe(35);
    expect(r.crit).toBe(false);
    expect(r.perfectHit).toBe(false);
  });

  it('perfect rhythm doubles pre-defense damage', () => {
    const r = computeDamage({ ...base, rhythm: 'perfect' });
    // 40 * 2.0 = 80; -5 def = 75
    expect(r.damage).toBe(75);
    expect(r.perfectHit).toBe(true);
  });

  it('miss rhythm halves pre-defense damage', () => {
    const r = computeDamage({ ...base, rhythm: 'miss' });
    // 40 * 0.5 = 20; -5 def = 15
    expect(r.damage).toBe(15);
  });

  it('clamps to minimum 1 damage when defense overwhelms', () => {
    const r = computeDamage({ ...base, defenderDef: 1000, rhythm: 'miss' });
    expect(r.damage).toBeGreaterThanOrEqual(1);
  });

  it('crit applies default 1.8x multiplier after clamp', () => {
    const r = computeDamage({ ...base, rhythm: 'ok', rng: alwaysCrit });
    // 35 * 1.8 = 63
    expect(r.crit).toBe(true);
    expect(r.damage).toBe(63);
  });

  it('honors Ghost passive crit multiplier of 2.5', () => {
    const r = computeDamage({
      ...base,
      rhythm: 'ok',
      rng: alwaysCrit,
      critMultiplier: 2.5,
    });
    // 35 * 2.5 = 87.5 -> floor = 87
    expect(r.damage).toBe(87);
  });

  it('crit chance uses luck/80 + critBuff', () => {
    // luck=40, buff=0 -> 0.5 chance. rng=0.49 should crit; rng=0.51 should not.
    const below = computeDamage({ ...base, rhythm: 'ok', attackerLuck: 40, rng: () => 0.49 });
    const above = computeDamage({ ...base, rhythm: 'ok', attackerLuck: 40, rng: () => 0.51 });
    expect(below.crit).toBe(true);
    expect(above.crit).toBe(false);
  });

  it('variance is added before defense subtraction', () => {
    const r = computeDamage({ ...base, rhythm: 'ok', variance: 10 });
    // 40 + 10 - 5 = 45
    expect(r.damage).toBe(45);
  });

  it('rhythm multipliers match spec values', () => {
    expect(RHYTHM_MULTIPLIER.perfect).toBe(2.0);
    expect(RHYTHM_MULTIPLIER.good).toBe(1.5);
    expect(RHYTHM_MULTIPLIER.ok).toBe(1.0);
    expect(RHYTHM_MULTIPLIER.miss).toBe(0.5);
  });

  it('default crit multiplier matches spec', () => {
    expect(DEFAULT_CRIT_MULTIPLIER).toBe(1.8);
  });

  it('skill multiplier scales linearly', () => {
    const one = computeDamage({ ...base, rhythm: 'ok', skillMultiplier: 1.0 });
    const two = computeDamage({ ...base, rhythm: 'ok', skillMultiplier: 2.0 });
    // ((atk + lv*2) * mult) - def, not linear through defense — but before-def is linear
    // Check that doubling skill roughly doubles damage (allowing flat -5 def drift)
    expect(two.damage).toBe(one.damage * 2 + 5); // 35*2 = 70, +5 because we only subtract def once
  });

  it('is deterministic given fixed RNG', () => {
    const r1 = computeDamage({ ...base, rhythm: 'good', rng: () => 0.3 });
    const r2 = computeDamage({ ...base, rhythm: 'good', rng: () => 0.3 });
    expect(r1).toEqual(r2);
  });
});
