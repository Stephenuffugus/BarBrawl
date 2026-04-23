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
// Still display-only / TODO:
//   - Consumable effects.
//   - Resistance/damage-type interaction with Metroid gating marks.
//   - Passive effects from notable/small/passive-keystone nodes (the
//     allocated_nodes array is read but not yet interpreted for stat
//     modifiers).
//   - Some status approximations (slow → debuff_def, blind → mark) will
//     get their own tags once the full StatusEffect taxonomy stabilizes.

export * from './types';
export { initBattle, scaleEnemyStats, playerCombatant, enemyCombatant,
         type EnemyTemplate, type InitBattleOptions } from './init';
export { applyPlayerAction, advanceTurn, endBattle, type ApplyOptions } from './turn';
export { SKILL_ACTIONS, skillActionFor, isActiveable } from './skill-actions';
export * from './skill-schema';
export { CLASS_RESOURCE_RULES, rulesFor } from './resources';
