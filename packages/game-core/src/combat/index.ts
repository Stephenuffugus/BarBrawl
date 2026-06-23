// Combat engine.
//
// Wired today:
//   - BattleState / Combatant / PlayerAction type model
//   - initBattle() assembles a player + scaled enemies
//   - applyPlayerAction() resolves basic_attack, flee, consumable-log, and
//     a FULL skill dispatcher via SKILL_ACTIONS (skill-actions.ts). All
//     16 SkillAction kinds implemented: attack, multi_hit, aoe_attack,
//     heal, skip_enemy, buff, debuff, dodge_boost, block, charge,
//     apply_all_statuses, wager_coin_flip, chip_consume_attack,
//     random_multiplier_attack, aoe_skip, reveal_and_nerf, swap_hp_pct,
//     random_from_pool.
//   - advanceTurn() ticks status effects, cooldowns, Tempo decay, and
//     runs basic enemy AI. Stun is honored.
//   - Status effects: bleed/burn/poison DoTs, stun (skips turn), buff
//     and debuff magnitudes summed into effective stats.
//   - Cooldowns: per-node, decremented at each of the actor's turns.
//   - Resource generation: per-class rules in resources.ts trigger on
//     turn_start, crit_landed, action_taken, perfect_rhythm, dodge,
//     overheal, damage_taken. Tempo decays 1/turn for Duelist.
//
// Also wired:
//   - Passive effects: `foldPassives(actor.allocatedNodes, ctx)` runs in
//     turn.ts (attack actor + target), status.ts (effective-stats), and
//     keystone-hooks.ts. The 146 non-active nodes are mapped to
//     structured `PassiveEffect` entries in passive-effects.ts and folded
//     into hit-time stat modifiers.
//   - Consumable effects: spec §5.8 catalog resolved in consumables/.
//   - Gating marks: resistance marks + VIP keys checked in gating/.
//
// Now fleshed out (were shallow — see docs/PLAN_OF_ATTACK.md C4):
//   - Ghost SPD buff is a real `buff_spd` status tag (sa_3 Quickening),
//     applied to effective SPD in deriveEffectiveStats — no longer a
//     dodge_up proxy.
//   - HOUSE EDGE keystone (di_9): real coin-flip per attack — win = 2x
//     damage, loss = 0-damage whiff (no status-on-hit lands on a whiff).
//   - Hexwright Unleash (vn_6): consumes banked `charge` ("Hoarded Power")
//     stacks, adding chargeScalingPerStack to the multiplier per stack.
//
// Still display-only / TODO:
//   - A handful of status approximations (slow → debuff_def, blind →
//     mark) will get their own tags once the full StatusEffect taxonomy
//     stabilizes.
//   - Remaining shallow mechanics (see docs/PLAN_OF_ATTACK.md C4): Medic
//     consumable-slot expansion, time-scaling passives (vn_1 +1%/min).

export * from './types';
export { initBattle, scaleEnemyStats, playerCombatant, enemyCombatant,
         type EnemyTemplate, type InitBattleOptions } from './init';
export { applyPlayerAction, advanceTurn, endBattle, type ApplyOptions } from './turn';
export { SKILL_ACTIONS, skillActionFor, isActiveable } from './skill-actions';
export { PASSIVE_EFFECTS, passiveFor, hasPassive } from './passive-effects';
export {
  foldPassives,
  applyModifier,
  applyPassives,
  type StatModifier,
  type PassiveContext,
} from './passive-resolver';
export * from './skill-schema';
export { CLASS_RESOURCE_RULES, rulesFor } from './resources';
