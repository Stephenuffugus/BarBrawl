// Combat engine — skeleton.
//
// What this module does today:
//   - BattleState / Combatant / PlayerAction type model
//   - initBattle() assembles a player + scaled enemies
//   - applyPlayerAction() resolves basic_attack, flee, and a placeholder
//     skill (which currently falls back to basic-attack math). Consumables
//     are logged but not yet applied.
//   - advanceTurn() rotates to the next combatant and runs a simple
//     enemy AI (basic attack on player).
//
// What it does NOT do yet (OPEN DESIGN — needs user input):
//   - Structured skill effects. Skill node `effect` strings like
//     "Active: 140% ATK + stagger splash" are display-only. To actually
//     apply skill effects we need either (a) a typed `action` field on
//     SkillNode, or (b) a parser for the effect strings. Recommendation
//     is (a) — add SkillAction to types, back-fill the 21 active nodes
//     and 21 keystones first (42 nodes total), leave notable/small as
//     pure passives interpreted separately.
//   - Status effect resolution (DoTs, stuns, buffs). The StatusEffect
//     type exists but tick-down and application aren't wired into
//     advanceTurn yet.
//   - Cooldowns. Cooldowns[] field exists but isn't decremented.
//   - Resource generation/consumption (Focus/Grit/Tempo/etc.) per class.
//   - Consumable effects (consumables are logged, not applied).
//   - Resistance/damage-type interaction with Metroid gating marks.
//
// This skeleton is enough for the edge-function wiring to start shaping
// `POST /battle/start` and `POST /battle/action`, and for UI testing of
// turn flow. The pieces above land across the next few sessions.

export * from './types';
export { initBattle, scaleEnemyStats, playerCombatant, enemyCombatant,
         type EnemyTemplate, type InitBattleOptions } from './init';
export { applyPlayerAction, advanceTurn, endBattle, type ApplyOptions } from './turn';
