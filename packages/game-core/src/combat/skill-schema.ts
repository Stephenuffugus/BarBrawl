// Structured skill-action schema. Replaces the earlier display-only effect
// strings on SkillNode. Each active/keystone node that should trigger a
// combat effect has an entry in SKILL_ACTIONS (skill-actions.ts) mapping
// its nodeId to a typed SkillAction.
//
// The combat engine's skill branch dispatches on SkillAction.kind.

import type { ResourceKind } from '../types';

export type StatusEffectTag =
  | 'bleed' | 'burn' | 'poison'            // DoTs
  | 'stun' | 'blind'                        // skip-actions
  | 'mark'                                  // generic marker (Hexwright + Operator)
  | 'curse'                                 // Hexwright stacking curse
  | 'slow'                                  // -SPD
  | 'buff_atk' | 'buff_def' | 'buff_crit'   // self buffs (pct)
  | 'debuff_atk' | 'debuff_def' | 'debuff_crit' // enemy debuffs (pct)
  | 'dodge_up'                              // pct dodge boost
  | 'block'                                 // block next N hits
  | 'immune_dot'                            // immune to DoTs
  | 'reflect'                               // reflect pct of incoming dmg
  | 'charge';                               // stored-up next-hit multiplier

export interface AppliedStatus {
  tag: StatusEffectTag;
  turns: number;
  /** Interpretation depends on tag (pct for buffs, flat for DoTs, etc). */
  magnitude: number;
}

/** Optional gate on an action — e.g., Second Wind only usable below 30% HP. */
export type ActionCondition =
  | 'hp_below_30'
  | 'hp_above_80'
  | 'has_perfect_last_turn'
  | 'enemy_has_curse';

export type SkillAction =
  // Plain single-target damage skill. guaranteedHit bypasses dodge/accuracy.
  | {
      kind: 'attack';
      multiplier: number;
      guaranteedHit?: boolean;
      guaranteedCrit?: boolean;
      /** Fraction of target DEF ignored, 0..1. */
      defIgnore?: number;
      statusOnHit?: readonly AppliedStatus[];
      cooldown?: number;
      oncePerBattle?: boolean;
      critMultiplierOverride?: number;
    }
  // Multiple hits at multiplierPerHit each. Crit rolls independently per hit.
  | {
      kind: 'multi_hit';
      hits: number;
      multiplierPerHit: number;
      defReductionSelfTurns?: number;
      selfDebuff?: AppliedStatus;
      cooldown?: number;
    }
  // AoE — hits all living enemies.
  | {
      kind: 'aoe_attack';
      multiplier: number;
      statusOnHit?: readonly AppliedStatus[];
      cooldown?: number;
    }
  // Heal self by pct of max HP. Optional cleanse + self-buffs applied.
  | {
      kind: 'heal';
      healPct: number;
      cleanse?: boolean;
      selfBuffs?: readonly AppliedStatus[];
      condition?: ActionCondition;
      targetRule?: 'self' | 'all_allies';
      cooldown?: number;
    }
  // Skip the enemy's next turn (stun-like).
  | {
      kind: 'skip_enemy';
      cooldown?: number;
    }
  // Apply one or more buffs to self (or allies).
  | {
      kind: 'buff';
      buffs: readonly AppliedStatus[];
      targetRule?: 'self' | 'all_allies';
      cooldown?: number;
    }
  // Apply one or more debuffs to target.
  | {
      kind: 'debuff';
      debuffs: readonly AppliedStatus[];
      cooldown?: number;
    }
  // Raise dodge chance for N turns.
  | {
      kind: 'dodge_boost';
      dodgePct: number;
      turns: number;
      cooldown?: number;
    }
  // Block next N incoming attacks (reduces damage to 0).
  | {
      kind: 'block';
      hitsBlocked: number;
      reflectPct?: number;
      cooldown?: number;
    }
  // Skip this turn, bank a charge. On next attack, apply releaseMultiplier.
  | {
      kind: 'charge';
      chargeTurns: number;
      releaseMultiplier: number;
      autoCrit?: boolean;
      cooldown?: number;
    }
  // Apply all active debuffs (curses/DoTs) at once, plus base damage.
  | {
      kind: 'apply_all_statuses';
      multiplier: number;
      statusesToApply: readonly AppliedStatus[];
      cooldown?: number;
    }
  // Gambler: coin-flip wager. 50/50 win(winMult) / loss(lossMult) on damage.
  | {
      kind: 'wager_coin_flip';
      winMultiplier: number;
      lossMultiplier: number;
      chipCost?: number;
      cooldown?: number;
    }
  // Gambler: consume N Chips for a heavy attack.
  | {
      kind: 'chip_consume_attack';
      chipCost: number;
      multiplier: number;
      cooldown?: number;
    }
  // Gambler: random roll between min% and max%.
  | {
      kind: 'random_multiplier_attack';
      minMultiplier: number;
      maxMultiplier: number;
      cooldown?: number;
    }
  // AoE skip — each enemy has skipChance to lose next turn.
  | {
      kind: 'aoe_skip';
      skipChance: number;
      cooldown?: number;
    }
  // Reveal enemy upcoming move + reduce their crit by pct for N turns.
  | {
      kind: 'reveal_and_nerf';
      critReductionPct: number;
      turns: number;
      cooldown?: number;
    }
  // Swap HP% with enemy. Extreme reset.
  | {
      kind: 'swap_hp_pct';
      cooldown?: number;
      oncePerBattle?: boolean;
    }
  // Wild Card / Dealer's Choice: random effect pulled from a pool.
  | {
      kind: 'random_from_pool';
      pool: readonly SkillAction[];
      cooldown?: number;
    };

/** Passive effects applied continuously while the node is allocated. */
export type PassiveEffect =
  | { kind: 'flat_stat'; stat: 'atk' | 'def' | 'hp' | 'spd' | 'luck'; value: number }
  | { kind: 'pct_stat'; stat: 'atk' | 'def' | 'hp' | 'spd' | 'luck' | 'crit_dmg' | 'dmg_taken' | 'skill_mult' | 'crit_chance' | 'dodge' | 'regen' | 'xp' | 'gold'; value: number }
  | { kind: 'conditional_pct_stat'; stat: 'atk' | 'def'; value: number; condition: 'hp_above_80' | 'hp_below_30' | 'enemy_count_gte_2' }
  | { kind: 'crit_mult_override'; value: number }
  | { kind: 'immunity'; to: 'debuffs' | 'knockback' | 'dots' }
  | { kind: 'hp_floor'; floor: number; oncePerBattle?: boolean }
  | { kind: 'revive_once'; hpPct: number; goldPenaltyPct?: number };

/** Class-specific resource generation event triggers. */
export type ResourceGenEvent =
  | { on: 'turn_start'; amount: number }
  | { on: 'crit_landed'; amount: number }
  | { on: 'action_taken'; amount: number }
  | { on: 'damage_taken'; perHpUnit: number; amount: number }
  | { on: 'perfect_rhythm'; amount: number }
  | { on: 'dodge'; amount: number }
  | { on: 'overheal'; amount: number };

export interface ClassResourceRules {
  kind: ResourceKind;
  events: readonly ResourceGenEvent[];
  /** Decay per turn. */
  decayPerTurn?: number;
}
