// Damage formula — spec §5.3. Pure function. RNG is injected.
//
//   baseDamage  = (atk + level * 2) * skill.multiplier
//   rhythmBonus = { perfect: 2.0, good: 1.5, ok: 1.0, miss: 0.5 }
//   critRoll    = rng() < (luck / 80 + critBuff)
//   final       = max(1, baseDamage * rhythmBonus + variance - enemyDef)
//   if crit:    final *= critMultiplier  (default 1.8; Ghost crit passive 2.5)

export type RhythmQuality = 'perfect' | 'good' | 'ok' | 'miss';

export const RHYTHM_MULTIPLIER: Readonly<Record<RhythmQuality, number>> = {
  perfect: 2.0,
  good: 1.5,
  ok: 1.0,
  miss: 0.5,
};

export const DEFAULT_CRIT_MULTIPLIER = 1.8;

export interface DamageInput {
  attackerAtk: number;
  attackerLevel: number;
  attackerLuck: number;
  skillMultiplier: number;
  rhythm: RhythmQuality;
  defenderDef: number;
  /** Flat damage bump/dip added before defense. Server-rolled per-hit. */
  variance: number;
  /** Additional crit chance from buffs/nodes. 0..1. */
  critBuff: number;
  /** Crit damage multiplier. Default 1.8; Ghost passive raises to 2.5. */
  critMultiplier?: number;
  /** Injected RNG in [0, 1). */
  rng: () => number;
}

export interface DamageResult {
  damage: number;
  crit: boolean;
  perfectHit: boolean;
}

export function computeDamage(i: DamageInput): DamageResult {
  const base = (i.attackerAtk + i.attackerLevel * 2) * i.skillMultiplier;
  const afterRhythm = base * RHYTHM_MULTIPLIER[i.rhythm];
  const preClamp = afterRhythm + i.variance - i.defenderDef;
  const clamped = Math.max(1, preClamp);
  const critChance = i.attackerLuck / 80 + i.critBuff;
  const crit = i.rng() < critChance;
  const critMult = crit ? (i.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER) : 1;
  const damage = Math.max(1, Math.floor(clamped * critMult));
  return { damage, crit, perfectHit: i.rhythm === 'perfect' };
}
