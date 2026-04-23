// Defender stationing logic — spec §5.5. Pure functions that compute:
//   - the DB row shape for an incoming defender
//   - HP decay over time (5% max HP per day)
//   - coin accrual (2/hour per defender, capped 75/day account-wide)
//   - passive XP awards (15% of attacker's XP on every challenge to this bar)
//
// Edge functions `/defender/station`, `/defender/recall`, and the hourly
// cron that sweeps decay/payouts wrap this logic.

import type { CharacterRuntime } from '../character';

export interface DefenderSnapshot {
  character_id: string;
  bar_id: string;
  stationed_at: string;            // ISO timestamp
  current_hp: number;
  max_hp: number;
  stats_snapshot: Readonly<{
    atk: number; def: number; spd: number; luck: number;
  }>;
  loadout_snapshot: Readonly<{
    allocated_nodes: readonly string[];
    equipped_skill_nodes: readonly string[];
    equipped_items: Readonly<Record<string, string>>;
  }>;
  coins_accrued: number;
  xp_accrued: number;
}

export const DEFENDER_RULES = Object.freeze({
  /** Max stationed defenders across all 7 characters per account. */
  MAX_STATIONED_PER_ACCOUNT: 7,
  /** Max coins accrued per account per local day. */
  MAX_COINS_PER_DAY: 75,
  /** Coins a defender produces per hour at a bar. */
  COINS_PER_HOUR: 2,
  /** Max HP lost per 24 hours. */
  HP_DECAY_PCT_PER_DAY: 0.05,
  /** Fraction of attacker's XP awarded to ALL defenders at this bar, win or lose. */
  PASSIVE_XP_FRACTION: 0.15,
  /** Hours between recalling a defender and being able to re-station it. */
  RECALL_COOLDOWN_HOURS: 1,
});

export interface StationOptions {
  character: CharacterRuntime;
  barId: string;
  now?: Date;
  /** Optional explicit equipped skills + items (loadout) at station time. */
  equippedSkillNodes?: readonly string[];
  equippedItems?: Readonly<Record<string, string>>;
}

/**
 * Freeze a character's combat-relevant stats at bar station time. The
 * returned row is ready to INSERT into public.defenders.
 *
 * Importantly the snapshot captures stats AS-IS — a later skill-tree
 * respec or level-up does NOT retroactively buff a stationed defender
 * (spec §5.5 "Stats snapshotted on placement, cannot be modified").
 */
export function stationAsDefender(opts: StationOptions): DefenderSnapshot {
  const now = opts.now ?? new Date();
  return {
    character_id: opts.character.userId + ':' + opts.character.classId,
    bar_id: opts.barId,
    stationed_at: now.toISOString(),
    current_hp: opts.character.stats.hp,
    max_hp: opts.character.stats.maxHp,
    stats_snapshot: {
      atk: opts.character.stats.atk,
      def: opts.character.stats.def,
      spd: opts.character.stats.spd,
      luck: opts.character.stats.luck,
    },
    loadout_snapshot: {
      allocated_nodes: [...opts.character.allocatedNodes],
      equipped_skill_nodes: [...(opts.equippedSkillNodes ?? [])],
      equipped_items: opts.equippedItems ?? {},
    },
    coins_accrued: 0,
    xp_accrued: 0,
  };
}

/**
 * Apply HP decay: 5% max HP per elapsed day (spec §5.5). Partial days
 * decay proportionally. Never drops below 0; resolver elsewhere
 * auto-recalls at 0.
 */
export function decayDefender(
  snapshot: DefenderSnapshot,
  hoursElapsed: number,
): DefenderSnapshot {
  if (hoursElapsed <= 0) return snapshot;
  const daysElapsed = hoursElapsed / 24;
  const decayAmount = Math.ceil(snapshot.max_hp * DEFENDER_RULES.HP_DECAY_PCT_PER_DAY * daysElapsed);
  const newHp = Math.max(0, snapshot.current_hp - decayAmount);
  return { ...snapshot, current_hp: newHp };
}

/**
 * Coin accrual. Respects the account-wide 75/day cap; pass in the coins
 * already accrued today by ALL defenders to compute the incremental gain.
 */
export function accrueCoins(
  snapshot: DefenderSnapshot,
  hoursElapsed: number,
  accountDailyCoinsSoFar: number,
): { snapshot: DefenderSnapshot; gained: number } {
  if (hoursElapsed <= 0) return { snapshot, gained: 0 };
  const raw = Math.floor(DEFENDER_RULES.COINS_PER_HOUR * hoursElapsed);
  const remaining = Math.max(0, DEFENDER_RULES.MAX_COINS_PER_DAY - accountDailyCoinsSoFar);
  const gained = Math.min(raw, remaining);
  return {
    snapshot: { ...snapshot, coins_accrued: snapshot.coins_accrued + gained },
    gained,
  };
}

/**
 * Award passive XP when this bar is challenged. 15% of the attacker's
 * XP earned is granted to every defender stationed here, win or lose.
 */
export function awardPassiveXP(
  snapshot: DefenderSnapshot,
  attackerXPEarned: number,
): DefenderSnapshot {
  const bonus = Math.floor(attackerXPEarned * DEFENDER_RULES.PASSIVE_XP_FRACTION);
  return { ...snapshot, xp_accrued: snapshot.xp_accrued + bonus };
}

/**
 * Can the player station another defender? Enforces the max-7 rule
 * across all of an account's characters.
 */
export function canStationAnother(currentDefenderCount: number): boolean {
  return currentDefenderCount < DEFENDER_RULES.MAX_STATIONED_PER_ACCOUNT;
}

/**
 * Has the recall cooldown on a character expired?
 */
export function recallCooldownExpired(
  lastRecalledAt: Date,
  now: Date = new Date(),
): boolean {
  const ms = now.getTime() - lastRecalledAt.getTime();
  return ms >= DEFENDER_RULES.RECALL_COOLDOWN_HOURS * 3600_000;
}

/**
 * When a defender's HP hits 0, they "return home" carrying accrued
 * coins/XP. Returns the payout payload — caller INSERTs coins to the
 * account wallet and XP onto the character, then DELETEs the defender row.
 */
export interface DefenderReturnPayload {
  coins: number;
  xp: number;
  character_id: string;
}

export function collapseDefender(snapshot: DefenderSnapshot): DefenderReturnPayload {
  return {
    coins: snapshot.coins_accrued,
    xp: snapshot.xp_accrued,
    character_id: snapshot.character_id,
  };
}
