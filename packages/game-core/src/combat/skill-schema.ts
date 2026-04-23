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
export type PassiveStatKind =
  | 'atk' | 'def' | 'hp' | 'spd' | 'luck'
  | 'crit_chance' | 'crit_dmg' | 'crit_mult'
  | 'dodge' | 'dmg_taken' | 'skill_mult'
  | 'regen' | 'xp' | 'gold'
  | 'magic_dmg'       // Hexwright magic-dmg stat
  | 'status_chance'   // chance to apply DoTs/debuffs on hit
  | 'buff_duration'   // extend buff durations
  | 'debuff_duration' // extend debuff durations
  | 'heals_received'  // + heal received multiplier
  | 'dot_dmg'         // +% DoT damage
  | 'atk_speed'       // +% attack speed
  | 'enemy_miss'      // +% chance enemies miss
  | 'enemy_accuracy_down'; // -% enemy accuracy (= enemy_miss-ish)

export type PassiveEffect =
  // Flat stat bump.
  | { kind: 'flat_stat'; stat: 'atk' | 'def' | 'hp' | 'spd' | 'luck'; value: number }
  // Percent bump of any stat.
  | { kind: 'pct_stat'; stat: PassiveStatKind; value: number }
  // Conditional pct stat (HP-gated or enemy-count-gated).
  | { kind: 'conditional_pct_stat'; stat: 'atk' | 'def' | 'all_stats' | 'hp_regen'; value: number;
      condition: 'hp_above_80' | 'hp_below_30' | 'enemy_count_gte_2' | 'while_cursed' | 'while_marked' | 'stunned_can_regen_no' }
  // Override the crit damage multiplier globally.
  | { kind: 'crit_mult_override'; value: number }
  // Immunity flags.
  | { kind: 'immunity'; to: 'debuffs' | 'knockback' | 'dots' }
  // Prevent defeat once per battle by flooring HP at `floor`.
  | { kind: 'hp_floor'; floor: number; oncePerBattle?: boolean }
  // Revive once with hpPct HP (ETERNAL HARVEST / CODE BLUE).
  | { kind: 'revive_once'; hpPct: number; goldPenaltyPct?: number }
  // Scale stat per N levels (e.g. Old Vines +3% per 10 levels).
  | { kind: 'per_level_scaling'; stat: 'all_stats' | 'atk' | 'def'; valuePerN: number; nLevels: number }
  // Damage bonus against enemies with a specific status.
  | { kind: 'vs_status_dmg'; tag: 'mark' | 'curse' | 'bleed' | 'burn' | 'poison' | 'slow' | 'stun'; value: number }
  // Crits ignore a fraction of defender DEF.
  | { kind: 'crit_def_ignore'; value: number }
  // On-hit apply: every attack applies a status. HAZE-style keystone.
  | { kind: 'auto_status_on_hit'; tag: 'bleed' | 'burn' | 'poison' | 'slow'; turns: number; magnitude: number }
  // All hits crit (for ABSOLUTE CLARITY — pairs with -ATK for balance).
  | { kind: 'all_crit' }
  // Cannot crit (WORLD TREE, IMMOVABLE).
  | { kind: 'no_crit' }
  // Every Nth attack auto-crits; non-crits scaled by penalty (THIRD STRIKE, NEGRONI).
  | { kind: 'every_nth_crit'; n: number; nonCritPenalty: number }
  // First attack of each battle crits (Opening Strike).
  | { kind: 'first_hit_crit' }
  // HP cap as pct of max (FOAM GHOST: HP capped 50%).
  | { kind: 'hp_cap_pct'; pct: number }
  // Convert all direct damage to DoT equivalent (PLAGUE CIDER / OUTBREAK).
  | { kind: 'convert_to_dot'; directScale: number }
  // Reduce all cooldowns by pct.
  | { kind: 'cooldown_reduction'; pct: number }
  // Enemy debuff: all enemies slowed by X (QUIET ROOM, COUCH LOCKED).
  | { kind: 'all_enemies_slowed'; pct: number; selfSpdPenalty: number }
  // After a specific event, next attack has a modifier (Follow-Through, Rinse).
  | { kind: 'after_event_buff'; event: 'crit' | 'dodge'; statBuff: 'atk' | 'crit_chance'; value: number; turns: number }
  // Apply a storage mechanic (Hoarded Power: store N turn bonuses).
  | { kind: 'reserve_storage'; maxStacks: number }
  // Forbid consumables (PERFECT RECALL).
  | { kind: 'forbid_consumables' }
  // Random keystone each battle (WILD RIDE).
  | { kind: 'random_keystone' };

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
