// World boss (Weekly Titan) logic — spec §5.10.
//
//   "Every Saturday 8pm local, a random verified high-tier bar in each
//    region becomes a 'Titan' for 48 hours. HP is in the millions — the
//    player community collectively chips it down. Damage contribution
//    determines individual rewards."
//
// Pure functions. The scheduler (cron) spawns a WorldBoss at Saturday 8pm;
// edge functions apply hits as players win combat against the Titan bar;
// a final sweep at end-of-window pays out rewards.

export type WorldBossPhase = 'pending' | 'active' | 'ended';

export interface WorldBoss {
  id: string;
  /** The bar hosting this Titan. */
  barId: string;
  /** Region/city identifier (e.g. "nyc", "sf"). */
  region: string;
  maxHp: number;
  currentHp: number;
  startsAt: string;  // ISO
  endsAt: string;    // ISO
  /** Map of user_id → total damage dealt to this Titan. */
  contributions: Readonly<Record<string, number>>;
}

export const WORLD_BOSS_RULES = Object.freeze({
  /** Duration of the window from spawn. */
  WINDOW_HOURS: 48,
  /** Typical titan HP floor. Should be scaled by region population in prod. */
  DEFAULT_MAX_HP: 5_000_000,
});

export function worldBossPhase(boss: WorldBoss, now: Date = new Date()): WorldBossPhase {
  const start = new Date(boss.startsAt).getTime();
  const end = new Date(boss.endsAt).getTime();
  const t = now.getTime();
  if (t < start) return 'pending';
  if (t > end) return 'ended';
  if (boss.currentHp <= 0) return 'ended';
  return 'active';
}

/** Record a damage contribution. Immutable update. */
export function applyWorldBossHit(
  boss: WorldBoss,
  userId: string,
  damage: number,
  now: Date = new Date(),
): WorldBoss {
  if (worldBossPhase(boss, now) !== 'active') return boss;
  if (damage <= 0) return boss;
  const capped = Math.min(damage, boss.currentHp);
  const newContributions = {
    ...boss.contributions,
    [userId]: (boss.contributions[userId] ?? 0) + capped,
  };
  return {
    ...boss,
    currentHp: Math.max(0, boss.currentHp - capped),
    contributions: newContributions,
  };
}

export type RewardTier = 'top_1pct' | 'top_10pct' | 'top_50pct' | 'participant';

export interface ContributorReward {
  userId: string;
  damageDealt: number;
  tier: RewardTier;
  goldReward: number;
  xpReward: number;
  /** Optional rare drop id; filled in by caller rolling from the pool. */
  itemTier: 'epic' | 'rare' | 'uncommon' | 'common';
}

const TIER_REWARDS: Readonly<Record<RewardTier, { gold: number; xp: number; item: ContributorReward['itemTier'] }>> = Object.freeze({
  top_1pct:     { gold: 10_000, xp: 5_000, item: 'epic' },
  top_10pct:    { gold: 3_000,  xp: 2_000, item: 'rare' },
  top_50pct:    { gold: 1_000,  xp: 800,   item: 'uncommon' },
  participant:  { gold: 200,    xp: 200,   item: 'common' },
});

/**
 * Given a finalized world boss, compute per-user rewards. Caller inserts
 * the gold/xp onto the account and rolls item drops from the pool.
 */
export function computeWorldBossRewards(boss: WorldBoss): readonly ContributorReward[] {
  const contributors = Object.entries(boss.contributions)
    .map(([userId, dmg]) => ({ userId, dmg }))
    .filter((c) => c.dmg > 0)
    .sort((a, b) => b.dmg - a.dmg);
  if (contributors.length === 0) return [];

  const onePctCount = Math.max(1, Math.ceil(contributors.length * 0.01));
  const tenPctCount = Math.max(onePctCount, Math.ceil(contributors.length * 0.10));
  const fiftyPctCount = Math.max(tenPctCount, Math.ceil(contributors.length * 0.50));

  return contributors.map((c, idx): ContributorReward => {
    const tier: RewardTier =
      idx < onePctCount    ? 'top_1pct' :
      idx < tenPctCount    ? 'top_10pct' :
      idx < fiftyPctCount  ? 'top_50pct' :
                             'participant';
    const r = TIER_REWARDS[tier];
    return {
      userId: c.userId,
      damageDealt: c.dmg,
      tier,
      goldReward: r.gold,
      xpReward: r.xp,
      itemTier: r.item,
    };
  });
}

/**
 * Create a fresh world boss. Deterministic startsAt/endsAt based on the
 * Saturday-8pm schedule per spec.
 */
export function spawnWorldBoss(opts: {
  id: string;
  barId: string;
  region: string;
  saturday8pm: Date;
  maxHp?: number;
}): WorldBoss {
  const maxHp = opts.maxHp ?? WORLD_BOSS_RULES.DEFAULT_MAX_HP;
  const end = new Date(opts.saturday8pm.getTime() + WORLD_BOSS_RULES.WINDOW_HOURS * 3600_000);
  return {
    id: opts.id,
    barId: opts.barId,
    region: opts.region,
    maxHp,
    currentHp: maxHp,
    startsAt: opts.saturday8pm.toISOString(),
    endsAt: end.toISOString(),
    contributions: {},
  };
}
