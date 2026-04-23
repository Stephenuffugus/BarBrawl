import type { SkillAction } from './skill-schema';

// Map of tree-node ID -> SkillAction. All 2 actives per tree (42 total)
// plus the one activeable keystone (OLDEST TRICK) have entries here.
// Passive keystones/notables/smalls are handled separately via
// passive-effects.ts (applied as long as the node is allocated).
//
// Balance: multipliers, DoT magnitudes, and durations are preserved
// verbatim from the v6 prototype's `effect` strings. Where the prototype
// left numbers ambiguous ("massive crit", "random major effect"), I chose
// conservative values documented inline below. Any number tagged
// "// BALANCE:" is a design decision not present in the prototype.

export const SKILL_ACTIONS: Readonly<Record<string, SkillAction>> = Object.freeze({
  // ─── OPERATOR / Precision (focus) ─────────────────────────────────
  fo_3: { kind: 'attack', multiplier: 1.3, guaranteedHit: true },           // Clean Strike
  fo_6: { kind: 'dodge_boost', dodgePct: 100, turns: 1, cooldown: 3 },      // Perfect Read

  // ─── OPERATOR / Analysis (clarity) ────────────────────────────────
  cl_3: { kind: 'skip_enemy', cooldown: 4 },                                 // Lucid Moment
  cl_6: { kind: 'heal', healPct: 0.5, cleanse: true, cooldown: 5 },         // Know Thyself

  // ─── OPERATOR / Composure (resolve) ───────────────────────────────
  re_3: { kind: 'buff', buffs: [{ tag: 'buff_def', turns: 2, magnitude: 100 }], cooldown: 3 },  // Hold Line
  re_6: { kind: 'heal', healPct: 0.4, condition: 'hp_below_30', cooldown: 5 },  // Second Wind

  // ─── BOUNCER / Impact (hops) ──────────────────────────────────────
  ho_3: { kind: 'attack', multiplier: 1.4, statusOnHit: [{ tag: 'stun', turns: 1, magnitude: 1 }] },  // Haymaker
  ho_6: { kind: 'attack', multiplier: 2.0, statusOnHit: [{ tag: 'bleed', turns: 3, magnitude: 8 }], cooldown: 3 },  // Sledgehammer

  // ─── BOUNCER / Bulwark (barley) ───────────────────────────────────
  ba_3: { kind: 'block', hitsBlocked: 2, cooldown: 4 },                     // Crossed Arms
  ba_6: { kind: 'block', hitsBlocked: 0, reflectPct: 40, cooldown: 4 },    // Brick Wall — buff equivalent
  // ^ Brick Wall reads as +100% DEF 3t + reflect 40%. Modeling as block-style
  //   helper with reflect; full DEF buff in turn resolver adds 100% mitigation.

  // ─── BOUNCER / Intimidate (foam) ──────────────────────────────────
  fm_3: { kind: 'debuff', debuffs: [{ tag: 'blind', turns: 2, magnitude: 50 }], cooldown: 3 },  // Eye Jab
  fm_6: { kind: 'aoe_attack', multiplier: 0.8, statusOnHit: [{ tag: 'stun', turns: 1, magnitude: 20 }], cooldown: 4 },  // Crowd Sweep

  // ─── HEXWRIGHT / Mark (tannin) ────────────────────────────────────
  tn_3: { kind: 'debuff', debuffs: [{ tag: 'debuff_def', turns: 3, magnitude: 30 }], cooldown: 2 },  // Hex Mark
  tn_6: { kind: 'apply_all_statuses', multiplier: 1.8, statusesToApply: [
    { tag: 'debuff_def', turns: 3, magnitude: 30 },
    { tag: 'curse', turns: 4, magnitude: 1 },
    { tag: 'debuff_atk', turns: 3, magnitude: 20 },
  ], cooldown: 5 },  // Blood Sigil

  // ─── HEXWRIGHT / Wither (vintage) ─────────────────────────────────
  vn_3: { kind: 'charge', chargeTurns: 1, releaseMultiplier: 1.5, cooldown: 3 },  // Gather Will
  vn_6: { kind: 'attack', multiplier: 2.5, cooldown: 6 },                    // Unleash (Hoarded Power release)
  // ^ "Unleash all Hoarded Power" — conservative 2.5x base; real version
  //   scales with stored Hoarded Power stacks (not yet implemented).

  // ─── HEXWRIGHT / Echo (aeration) ──────────────────────────────────
  ar_3: { kind: 'heal', healPct: 0.3, cleanse: true, cooldown: 4 },         // Unburden
  ar_6: { kind: 'heal', healPct: 0.25, targetRule: 'all_allies', cooldown: 5 },  // Share Burden

  // ─── DUELIST / Flourish (shaken) ──────────────────────────────────
  sh_3: { kind: 'multi_hit', hits: 3, multiplierPerHit: 0.6 },              // Flurry
  sh_6: { kind: 'attack', multiplier: 2.0, statusOnHit: [{ tag: 'burn', turns: 3, magnitude: 6 }], cooldown: 3 },  // Molten Edge

  // ─── DUELIST / Feint (stirred) ────────────────────────────────────
  st_3: { kind: 'attack', multiplier: 1.3, guaranteedCrit: true, cooldown: 2 },  // Surgical Strike
  st_6: { kind: 'charge', chargeTurns: 3, releaseMultiplier: 4.0, autoCrit: true, cooldown: 6 },  // Wind-Up
  // ^ "3-turn charge, massive crit" → 4x auto-crit (8x with 1.8 crit multiplier
  //   effectively ~7.2x). BALANCE: Chosen to rival Sledgehammer's 2.0x × 1.8 crit.

  // ─── DUELIST / Riposte (garnish) ──────────────────────────────────
  gn_3: { kind: 'debuff', debuffs: [{ tag: 'blind', turns: 1, magnitude: 100 }], cooldown: 3 },  // Fake-Out
  // ^ Original: "Active: Enemy miss + your crit" — simplified to blind+guaranteed
  //   crit on next turn is too compound; using pure blind for now. BALANCE: Consider
  //   adding buff_crit self in a later pass.
  gn_6: {
    kind: 'random_from_pool', cooldown: 4, pool: [
      { kind: 'attack', multiplier: 2.0 },
      { kind: 'heal', healPct: 0.4, cleanse: true },
      { kind: 'buff', buffs: [{ tag: 'buff_atk', turns: 3, magnitude: 30 }] },
      { kind: 'debuff', debuffs: [{ tag: 'debuff_def', turns: 3, magnitude: 40 }] },
      { kind: 'skip_enemy' },
    ],
  },  // Wild Card

  // ─── MEDIC / Mend (orchard) ───────────────────────────────────────
  or_3: { kind: 'heal', healPct: 0.4, cooldown: 3 },                         // Field Dressing
  or_6: { kind: 'heal', healPct: 0.4, cleanse: true, selfBuffs: [
    { tag: 'buff_atk', turns: 3, magnitude: 20 },
  ], cooldown: 6 },  // Full Workup

  // ─── MEDIC / Bitter Root (ferment) ────────────────────────────────
  fe_3: { kind: 'debuff', debuffs: [{ tag: 'poison', turns: 5, magnitude: 5 }], cooldown: 3 },  // Septic Strike
  // ^ "5% HP/turn for 5 turns" — magnitude 5 represents 5 flat damage/turn at base;
  //   the status resolver can scale to pct HP when we surface enemy max HP.
  //   BALANCE: Flat 5/turn is weak early, strong late — consistent with DoT spec.
  fe_6: { kind: 'apply_all_statuses', multiplier: 1.0, statusesToApply: [
    { tag: 'bleed', turns: 3, magnitude: 5 },
    { tag: 'burn', turns: 3, magnitude: 5 },
    { tag: 'poison', turns: 5, magnitude: 5 },
  ], cooldown: 5 },  // Bitter Bloom

  // ─── MEDIC / Triage (harvest) ─────────────────────────────────────
  hr_3: { kind: 'buff', buffs: [{ tag: 'immune_dot', turns: 3, magnitude: 1 }], cooldown: 4 },  // Antitoxin
  hr_6: { kind: 'heal', healPct: 0.5, cleanse: true, selfBuffs: [
    { tag: 'immune_dot', turns: 3, magnitude: 1 },
  ], cooldown: 6 },  // Crash Cart

  // ─── GHOST / Drift (indica) ───────────────────────────────────────
  in_3: { kind: 'debuff', debuffs: [{ tag: 'slow', turns: 3, magnitude: 50 }], cooldown: 3 },  // Weight of Air
  in_6: { kind: 'aoe_skip', skipChance: 50, cooldown: 5 },                   // Dreamwalk

  // ─── GHOST / Blur (sativa) ────────────────────────────────────────
  sa_3: { kind: 'buff', buffs: [
    { tag: 'buff_crit', turns: 2, magnitude: 100 },
    { tag: 'dodge_up', turns: 2, magnitude: 50 },
  ], cooldown: 4 },  // Adrenaline
  // ^ "+100% SPD/crit 2 turns" — SPD buff not yet a status tag; substituting
  //   dodge_up 50% as a SPD proxy. BALANCE: revisit when SPD has a status tag.
  sa_6: { kind: 'multi_hit', hits: 3, multiplierPerHit: 1.0,
    selfDebuff: { tag: 'debuff_def', turns: 1, magnitude: 50 }, cooldown: 4 },  // Reckless Charge

  // ─── GHOST / Slip (hybrid) ────────────────────────────────────────
  hy_3: { kind: 'swap_hp_pct', cooldown: 8, oncePerBattle: true },          // Mirror Match
  hy_6: {
    kind: 'random_from_pool', cooldown: 5, pool: [
      { kind: 'attack', multiplier: 1.8 },
      { kind: 'heal', healPct: 0.3 },
      { kind: 'debuff', debuffs: [{ tag: 'burn', turns: 3, magnitude: 5 }] },
      { kind: 'buff', buffs: [{ tag: 'dodge_up', turns: 2, magnitude: 40 }] },
      { kind: 'skip_enemy' },
    ],
  },  // Static Burst

  // ─── GAMBLER / Dice ───────────────────────────────────────────────
  di_3: { kind: 'random_multiplier_attack', minMultiplier: 0.5, maxMultiplier: 2.0 },  // Roll of the Dice
  di_6: { kind: 'wager_coin_flip', winMultiplier: 2.0, lossMultiplier: 0.0, cooldown: 3 },  // All In

  // ─── GAMBLER / Cards ──────────────────────────────────────────────
  ca_3: {
    kind: 'random_from_pool', cooldown: 4, pool: [
      { kind: 'buff', buffs: [{ tag: 'buff_atk', turns: 1, magnitude: 30 }] },
      { kind: 'buff', buffs: [{ tag: 'buff_def', turns: 1, magnitude: 30 }] },
      { kind: 'buff', buffs: [{ tag: 'buff_crit', turns: 1, magnitude: 30 }] },
      { kind: 'buff', buffs: [{ tag: 'dodge_up', turns: 1, magnitude: 30 }] },
      { kind: 'heal', healPct: 0.1 },
    ],
  },  // Stacked Deck — draws 3 random 1-turn buffs; implemented as single for skeleton
  // ^ BALANCE: Full "draw 3" semantics to come in a future pass.
  ca_6: { kind: 'chip_consume_attack', chipCost: 5, multiplier: 2.5, cooldown: 4 },  // Full House

  // ─── GAMBLER / House ──────────────────────────────────────────────
  hu_3: { kind: 'reveal_and_nerf', critReductionPct: 50, turns: 2, cooldown: 4 },  // Read the Table
  hu_6: { kind: 'wager_coin_flip', winMultiplier: 2.0, lossMultiplier: 0.0, chipCost: 999, cooldown: 5 },  // Double Down
  // ^ "Wager all Chips — 2x on win, lose all on loss" — chipCost 999 is shorthand
  //   for "whatever the player currently holds". Resolver treats it specially.

  // ─── ACTIVEABLE KEYSTONES ─────────────────────────────────────────
  // Only a couple of keystones have a once-per-battle active trigger.
  vn_9: { kind: 'attack', multiplier: 10.0, oncePerBattle: true, cooldown: 999 },  // OLDEST TRICK
  // ^ Passive keystones (ABSOLUTE CLARITY, IMMOVABLE, HAZE, JUKE, etc.) are
  //   handled by the passive-effects system, not here.
});

export function skillActionFor(nodeId: string): SkillAction | undefined {
  return SKILL_ACTIONS[nodeId];
}

/** For UI: does this node have an active action (vs. being a passive)? */
export function isActiveable(nodeId: string): boolean {
  return nodeId in SKILL_ACTIONS;
}
