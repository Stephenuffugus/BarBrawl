import type { CombatStats } from './types';
import type { PassiveEffect } from './skill-schema';
import { passiveFor } from './passive-effects';

// Fold allocated passive effects into a character's base stats.
//
// Pipeline:
//   1. Walk allocated_nodes.
//   2. For each, look up PassiveEffect.
//   3. Accumulate flat + pct modifiers into a StatModifier object.
//   4. Apply to baseStats to produce effectiveStats.
//
// Conditional passives (hp_above_80, hp_below_30, while_cursed, etc.)
// are applied at damage-calc time by passing the current HP% and status
// set to `applyPassivesWithContext`.
//
// Non-stat keystones (HAZE auto-bleed, HOUSE EDGE coin-flip on every hit,
// THIRD STRIKE every-3rd-crit, etc.) do NOT modify stats — they're combat
// hooks. The combat engine inspects `hasKeystoneHook(nodeId, ...)` before
// applying a hit. Full hook integration is TODO — this resolver covers
// the stat-modifier portion.

export interface StatModifier {
  flat: { atk: number; def: number; hp: number; spd: number; luck: number };
  pct: { atk: number; def: number; hp: number; spd: number; luck: number; crit_chance: number; crit_dmg: number; dodge: number; regen: number; xp: number; gold: number; skill_mult: number };
  critMultOverride?: number;
  forbidConsumables: boolean;
  allCrit: boolean;
  noCrit: boolean;
  reviveOnce?: { hpPct: number; goldPenaltyPct?: number };
  hpFloor?: { value: number; oncePerBattle: boolean };
  immunities: { debuffs: boolean; knockback: boolean; dots: boolean };
  /** Simple aggregate of dmg-taken pct (negative values = reduction). */
  dmgTakenPct: number;
}

function emptyModifier(): StatModifier {
  return {
    flat: { atk: 0, def: 0, hp: 0, spd: 0, luck: 0 },
    pct: { atk: 0, def: 0, hp: 0, spd: 0, luck: 0, crit_chance: 0, crit_dmg: 0, dodge: 0, regen: 0, xp: 0, gold: 0, skill_mult: 0 },
    forbidConsumables: false,
    allCrit: false,
    noCrit: false,
    immunities: { debuffs: false, knockback: false, dots: false },
    dmgTakenPct: 0,
  };
}

export interface PassiveContext {
  hpPct: number;
  enemyCount: number;
  hasCurse?: boolean;
  hasMark?: boolean;
  stunned?: boolean;
  level?: number;
}

export function foldPassives(
  allocatedNodes: readonly string[],
  context: PassiveContext = { hpPct: 1.0, enemyCount: 1 },
): StatModifier {
  const mod = emptyModifier();

  for (const nodeId of allocatedNodes) {
    const p = passiveFor(nodeId);
    if (!p) continue;
    applyOne(mod, p, context);

    // Companion effects — keystones with secondary costs hardcoded to the
    // node id (since PassiveEffect is a single record).
    applyCompanion(mod, nodeId);
  }

  return mod;
}

function applyOne(mod: StatModifier, p: PassiveEffect, ctx: PassiveContext) {
  switch (p.kind) {
    case 'flat_stat':
      mod.flat[p.stat] += p.value;
      break;
    case 'pct_stat':
      // Map the wider PassiveStatKind to the narrower StatModifier.pct keys.
      if (p.stat in mod.pct) {
        (mod.pct as Record<string, number>)[p.stat] += p.value;
      } else if (p.stat === 'dmg_taken') {
        mod.dmgTakenPct += p.value;
      }
      // Unhandled kinds (magic_dmg, status_chance, etc.) are recorded for
      // later consumption by combat hooks — not yet stored here.
      break;
    case 'conditional_pct_stat': {
      const active = evaluateCondition(p.condition, ctx);
      if (!active) break;
      if (p.stat === 'atk' || p.stat === 'def') mod.pct[p.stat] += p.value;
      else if (p.stat === 'all_stats') {
        mod.pct.atk += p.value;
        mod.pct.def += p.value;
        mod.pct.hp += p.value;
        mod.pct.spd += p.value;
        mod.pct.luck += p.value;
      } else if (p.stat === 'hp_regen') {
        mod.pct.regen += p.value;
      }
      break;
    }
    case 'crit_mult_override':
      mod.critMultOverride = p.value;
      break;
    case 'immunity':
      mod.immunities[p.to] = true;
      break;
    case 'hp_floor':
      mod.hpFloor = { value: p.floor, oncePerBattle: p.oncePerBattle ?? true };
      break;
    case 'revive_once':
      mod.reviveOnce = p.goldPenaltyPct !== undefined ? { hpPct: p.hpPct, goldPenaltyPct: p.goldPenaltyPct } : { hpPct: p.hpPct };
      break;
    case 'per_level_scaling': {
      const level = ctx.level ?? 1;
      const bumps = Math.floor(level / p.nLevels);
      const total = bumps * p.valuePerN;
      if (p.stat === 'atk' || p.stat === 'def') mod.pct[p.stat] += total;
      else {
        mod.pct.atk += total;
        mod.pct.def += total;
        mod.pct.hp += total;
        mod.pct.spd += total;
        mod.pct.luck += total;
      }
      break;
    }
    case 'all_crit':
      mod.allCrit = true;
      break;
    case 'no_crit':
      mod.noCrit = true;
      break;
    case 'cooldown_reduction':
      // Stored as a virtual stat for now; combat engine reads mod.pct.skill_mult
      // OR we can surface via a dedicated field. For now, stuff into skill_mult
      // as a rough proxy. TODO: real CD field.
      mod.pct.skill_mult += p.pct * 0.1;
      break;
    case 'first_hit_crit':
    case 'every_nth_crit':
    case 'auto_status_on_hit':
    case 'vs_status_dmg':
    case 'crit_def_ignore':
    case 'convert_to_dot':
    case 'all_enemies_slowed':
    case 'after_event_buff':
    case 'reserve_storage':
    case 'random_keystone':
    case 'hp_cap_pct':
      // Combat-hook passives — not stat modifiers. Combat engine queries
      // `hasPassive(nodeId)` and dispatches special behavior when the node
      // is allocated. Stat folding is a no-op here.
      break;
  }
}

function evaluateCondition(cond: string, ctx: PassiveContext): boolean {
  switch (cond) {
    case 'hp_above_80':    return ctx.hpPct >= 0.8;
    case 'hp_below_30':    return ctx.hpPct < 0.3;
    case 'enemy_count_gte_2': return ctx.enemyCount >= 2;
    case 'while_cursed':   return !!ctx.hasCurse;
    case 'while_marked':   return !!ctx.hasMark;
    case 'stunned_can_regen_no': return !!ctx.stunned;
  }
  return false;
}

/** Hardcoded keystone secondary costs (balance companions to the primary). */
function applyCompanion(mod: StatModifier, nodeId: string) {
  switch (nodeId) {
    case 'fo_9': mod.pct.atk -= 40; break;        // ABSOLUTE CLARITY -40% ATK
    case 're_9': mod.noCrit = true; break;         // IMMOVABLE no-crit
    case 'or_9': mod.noCrit = true; break;         // LIFELINE no-crit
    case 'ho_9': mod.pct.def -= 20; break;         // BROKEN BOTTLE -20% DEF
    case 'ba_9': mod.pct.atk -= 30; break;         // LAST STAND -30% ATK
    case 'fm_9': mod.pct.hp = Math.min(mod.pct.hp, -50); break; // JUKE HP cap 50%
    case 'ca_9': mod.pct.atk -= 30; break;         // ROYAL FLUSH -30% base dmg
    case 'hu_9': {                                 // HOUSE ALWAYS WINS
      mod.pct.atk -= 20;
      mod.pct.def -= 20;
      mod.pct.hp -= 20;
      mod.pct.spd -= 20;
      break;
    }
    case 'in_9': mod.pct.spd -= 50; break;         // QUIET ROOM self SPD
    case 'gn_9': mod.pct.skill_mult += 0; break;   // GRANDMASTER: complex; no stat change
    case 'sh_9': mod.pct.atk -= 40; break;         // WIDE SWEEP -40% single-target
  }
}

/** Apply a StatModifier to base stats and return effective stats. */
export function applyModifier(base: CombatStats, mod: StatModifier): CombatStats {
  const atk = Math.floor((base.atk + mod.flat.atk) * (1 + mod.pct.atk / 100));
  const def = Math.floor((base.def + mod.flat.def) * (1 + mod.pct.def / 100));
  const hp  = Math.floor((base.maxHp + mod.flat.hp) * (1 + mod.pct.hp / 100));
  const spd = Math.max(0, Math.floor((base.spd + mod.flat.spd) * (1 + mod.pct.spd / 100)));
  const luck = Math.max(0, Math.floor((base.luck + mod.flat.luck) * (1 + mod.pct.luck / 100)));
  return {
    hp: Math.min(base.hp, hp), // current HP never exceeds new max
    maxHp: hp,
    atk: Math.max(1, atk),
    def: Math.max(0, def),
    spd,
    luck,
  };
}

/** Convenience: fold + apply in one pass. */
export function applyPassives(
  base: CombatStats,
  allocatedNodes: readonly string[],
  ctx?: PassiveContext,
): CombatStats {
  const mod = foldPassives(allocatedNodes, ctx);
  return applyModifier(base, mod);
}
