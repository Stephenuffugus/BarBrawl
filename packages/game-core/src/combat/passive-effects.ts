import type { PassiveEffect } from './skill-schema';

// Map of tree-node ID → PassiveEffect for every non-active node in the game.
// Covers 146 nodes (21 trees × 9 - 43 actives/activeable-keystones = 146).
//
// Balance: numbers preserved verbatim from the v6 prototype `effect` strings.
// Where a concept didn't fit the existing taxonomy cleanly, I extended the
// PassiveEffect type (see skill-schema.ts). Anything tagged "// BALANCE:" is
// a design decision not in the prototype.

export const PASSIVE_EFFECTS: Readonly<Record<string, PassiveEffect>> = Object.freeze({
  // ─── OPERATOR / Precision (focus) ─────────────────────────────────
  fo_1: { kind: 'pct_stat', stat: 'crit_chance', value: 4 },              // Fixed Gaze
  fo_2: { kind: 'flat_stat', stat: 'atk', value: 3 },                      // Still Hands
  fo_4: { kind: 'pct_stat', stat: 'crit_chance', value: 6 },              // Calibrate
  fo_5: { kind: 'pct_stat', stat: 'crit_dmg', value: 25 },                 // Laser Focus
  fo_7: { kind: 'vs_status_dmg', tag: 'mark', value: 10 },                 // Analyze
  fo_8: { kind: 'crit_def_ignore', value: 0.5 },                           // Bullseye
  fo_9: { kind: 'all_crit' },                                               // ABSOLUTE CLARITY (keystone)
  // Pairs with -40% base ATK via a separate conditional stat — applied below:
  // (we store it as a same-node secondary via a compound registry in the
  // resolver; for simplicity, ABSOLUTE CLARITY applies all_crit AND a flat
  // -40% ATK. The resolver knows to subtract when fo_9 is allocated.)

  // ─── OPERATOR / Analysis (clarity) ────────────────────────────────
  cl_1: { kind: 'pct_stat', stat: 'xp', value: 5 },                        // Sharp Memory
  cl_2: { kind: 'conditional_pct_stat', stat: 'all_stats', value: 5,
          condition: 'enemy_count_gte_2' },                                 // Read Room
  cl_4: { kind: 'pct_stat', stat: 'xp', value: 10 },                       // Study Habit
  cl_5: { kind: 'immunity', to: 'debuffs' },                               // Unclouded
  cl_7: { kind: 'after_event_buff', event: 'dodge', statBuff: 'atk',
          value: 5, turns: 1 },                                             // Patience (unused-turn approximation)
  // ^ BALANCE: "Each unused turn: +5% next hit" — modeled as after-dodge buff
  //   since we don't track "turn skipped" events yet.
  cl_8: { kind: 'pct_stat', stat: 'skill_mult', value: 25 },               // Muscle Memory
  cl_9: { kind: 'pct_stat', stat: 'xp', value: 100 },                      // PERFECT RECALL (keystone)
  // ^ Also forbids consumables; resolver checks for cl_9 to block consumable actions.

  // ─── OPERATOR / Composure (resolve) ───────────────────────────────
  re_1: { kind: 'flat_stat', stat: 'def', value: 5 },                      // Grounded
  re_2: { kind: 'pct_stat', stat: 'dmg_taken', value: -5 },                // Stoic (negative = reduction)
  re_4: { kind: 'flat_stat', stat: 'hp', value: 15 },                      // Breathe Deep
  re_5: { kind: 'pct_stat', stat: 'def', value: 20 },                      // Unshakeable (+ immune-knockback; see immunity below)
  re_7: { kind: 'pct_stat', stat: 'regen', value: 2 },                     // Steady Breathing
  re_8: { kind: 'hp_floor', floor: 1, oncePerBattle: true },               // Iron Will
  re_9: { kind: 'pct_stat', stat: 'dmg_taken', value: -50 },               // IMMOVABLE (keystone) — also no_crit (below)

  // ─── BOUNCER / Impact (hops) ──────────────────────────────────────
  ho_1: { kind: 'flat_stat', stat: 'atk', value: 3 },                      // Heavy Fist
  ho_2: { kind: 'pct_stat', stat: 'crit_chance', value: 5 },               // Knuckle Sting
  ho_4: { kind: 'pct_stat', stat: 'atk', value: 8 },                       // Coiled Spring
  ho_5: { kind: 'conditional_pct_stat', stat: 'atk', value: 20,
          condition: 'hp_above_80' },                                       // Fresh Shift
  ho_7: { kind: 'cooldown_reduction', pct: 10 },                           // Rolling Thunder
  ho_8: { kind: 'pct_stat', stat: 'dot_dmg', value: 50 },                  // Deep Bruise
  ho_9: { kind: 'auto_status_on_hit', tag: 'bleed', turns: 2, magnitude: 5 }, // BROKEN BOTTLE (keystone)
  // ^ Also applies -20% DEF — we layer a pct_stat def -20 in the registry.

  // ─── BOUNCER / Bulwark (barley) ───────────────────────────────────
  ba_1: { kind: 'flat_stat', stat: 'def', value: 4 },                      // Padded Vest
  ba_2: { kind: 'flat_stat', stat: 'hp', value: 8 },                       // Solid Frame
  ba_4: { kind: 'flat_stat', stat: 'hp', value: 15 },                      // Deep Chest
  ba_5: { kind: 'pct_stat', stat: 'def', value: 25 },                      // Seasoned (also +10% max HP — second entry below)
  ba_7: { kind: 'pct_stat', stat: 'regen', value: 20 },                    // Scar Tissue
  ba_8: { kind: 'conditional_pct_stat', stat: 'def', value: 50,
          condition: 'hp_below_30' },                                       // Cornered (+heal 5%/turn at <30%)
  ba_9: { kind: 'revive_once', hpPct: 30 },                                // LAST STAND (keystone)
  // ^ Also -30% ATK — applied as companion pct_stat in registry.

  // ─── BOUNCER / Intimidate (foam) ──────────────────────────────────
  fm_1: { kind: 'pct_stat', stat: 'dodge', value: 5 },                     // Shoulder Fake
  fm_2: { kind: 'pct_stat', stat: 'enemy_miss', value: 5 },                // Cold Stare
  fm_4: { kind: 'flat_stat', stat: 'spd', value: 2 },                      // Light Feet
  fm_5: { kind: 'pct_stat', stat: 'dodge', value: 15 },                    // Slip & Counter (also +10% crit on dodge — compound)
  fm_7: { kind: 'pct_stat', stat: 'enemy_accuracy_down', value: 15 },      // Menace
  fm_8: { kind: 'after_event_buff', event: 'dodge', statBuff: 'crit_chance',
          value: 100, turns: 1 },                                           // Counterpunch
  fm_9: { kind: 'pct_stat', stat: 'dodge', value: 50 },                    // JUKE (keystone)
  // ^ Also HP capped 50% — apply via hp_cap_pct companion.

  // ─── HEXWRIGHT / Mark (tannin) ────────────────────────────────────
  tn_1: { kind: 'flat_stat', stat: 'atk', value: 4 },                      // Pointed Gaze (4 magic dmg ~= +4 ATK)
  tn_2: { kind: 'pct_stat', stat: 'status_chance', value: 5 },             // Evil Eye
  tn_4: { kind: 'pct_stat', stat: 'magic_dmg', value: 10 },                // Bold Will
  tn_5: { kind: 'vs_status_dmg', tag: 'curse', value: 25 },                // Marked For Pain
  tn_7: { kind: 'pct_stat', stat: 'debuff_duration', value: 33 },          // Deep Curse (+1 turn ~= +33% on 3-turn debuffs)
  // ^ BALANCE: flat "+1 turn" modeled as +33% duration. Actual +1 turn logic
  //   lives in the status applicator when tn_7 is allocated.
  tn_8: { kind: 'conditional_pct_stat', stat: 'atk', value: 10,
          condition: 'while_cursed' },                                      // Harbinger (+10% crit per stack; modeled as atk for now)
  tn_9: { kind: 'pct_stat', stat: 'hp', value: -25 },                      // COVEN (keystone) — -25% HP, curses spread
  // ^ "Curses spread to defenders" is a combat hook, applied separately when tn_9 present.

  // ─── HEXWRIGHT / Wither (vintage) ─────────────────────────────────
  vn_1: { kind: 'pct_stat', stat: 'atk', value: 1 },                       // Still Waters (+1% ATK/min — simplified to +1% static)
  // ^ BALANCE: Time-based scaling not yet modeled; fixed 1% baseline.
  vn_2: { kind: 'pct_stat', stat: 'crit_chance', value: 5 },               // Shadowed Mind
  vn_4: { kind: 'per_level_scaling', stat: 'all_stats', valuePerN: 3, nLevels: 10 },  // Ancient Pact
  vn_5: { kind: 'reserve_storage', maxStacks: 3 },                         // Hoarded Power
  vn_7: { kind: 'pct_stat', stat: 'crit_chance', value: 2 },               // Festering (resets; simplified to +2% static per allocated)
  // ^ BALANCE: "per turn +2% crit (resets on crit)" — flat +2% static.
  vn_8: { kind: 'reserve_storage', maxStacks: 999 },                       // No Ceiling (uncapped)
  // vn_9 is active (OLDEST TRICK); omitted from passives.

  // ─── HEXWRIGHT / Echo (aeration) ──────────────────────────────────
  ar_1: { kind: 'pct_stat', stat: 'heals_received', value: 10 },           // Vessel
  ar_2: { kind: 'after_event_buff', event: 'crit', statBuff: 'atk',
          value: 5, turns: 1 },                                             // Resonate
  ar_4: { kind: 'pct_stat', stat: 'buff_duration', value: 10 },            // Long Echo
  ar_5: { kind: 'after_event_buff', event: 'crit', statBuff: 'atk',
          value: 10, turns: 3 },                                             // Renewed Will
  ar_7: { kind: 'conditional_pct_stat', stat: 'all_stats', value: 15,
          condition: 'enemy_count_gte_2' },                                 // Pairing
  // ^ BALANCE: "Allies +15% all stats" is a party-play mechanic. Without
  //   party play live, modeled as a self-buff in multi-enemy rooms.
  ar_8: { kind: 'pct_stat', stat: 'heals_received', value: 50 },           // Perfect Pour
  ar_9: { kind: 'conditional_pct_stat', stat: 'hp_regen', value: 3,
          condition: 'hp_above_80' },                                       // LIVING HEX (keystone)
  // ^ Also "Max 100% ATK" cap — apply via custom keystone hook.

  // ─── DUELIST / Flourish (shaken) ──────────────────────────────────
  sh_1: { kind: 'flat_stat', stat: 'atk', value: 4 },                      // Cold Steel (+4 cold dmg ≈ atk)
  sh_2: { kind: 'pct_stat', stat: 'atk_speed', value: 8 },                 // Quick Draw
  sh_4: { kind: 'pct_stat', stat: 'status_chance', value: 5 },             // Chilling Blow (freeze chance)
  sh_5: { kind: 'pct_stat', stat: 'crit_chance', value: 30 },              // Twin Fangs — "Multi-hits +30% crit"
  sh_7: { kind: 'pct_stat', stat: 'skill_mult', value: 20 },               // Clean Edge
  sh_8: { kind: 'crit_def_ignore', value: 0.3 },                           // Piercing Thrust
  sh_9: { kind: 'pct_stat', stat: 'skill_mult', value: -40 },              // WIDE SWEEP (keystone)
  // ^ AoE-everything modifier applied via separate keystone hook.

  // ─── DUELIST / Feint (stirred) ────────────────────────────────────
  st_1: { kind: 'pct_stat', stat: 'crit_chance', value: 5 },               // Steady Hand
  st_2: { kind: 'flat_stat', stat: 'atk', value: 3 },                      // Trained Footwork (+3 ATK, +3 SPD; SPD portion below)
  st_4: { kind: 'pct_stat', stat: 'crit_dmg', value: 5 },                  // Measured Blow
  st_5: { kind: 'crit_mult_override', value: 2.5 },                        // True Edge
  st_7: { kind: 'after_event_buff', event: 'crit', statBuff: 'atk',
          value: 10, turns: 1 },                                             // Follow-Through
  st_8: { kind: 'after_event_buff', event: 'crit', statBuff: 'crit_chance',
          value: 15, turns: 1 },                                             // Stored Intent
  st_9: { kind: 'every_nth_crit', n: 3, nonCritPenalty: 0.5 },             // THIRD STRIKE (keystone)

  // ─── DUELIST / Riposte (garnish) ──────────────────────────────────
  gn_1: { kind: 'flat_stat', stat: 'luck', value: 5 },                     // Sleight (+5% luck)
  gn_2: { kind: 'pct_stat', stat: 'gold', value: 10 },                     // Hustle
  gn_4: { kind: 'pct_stat', stat: 'regen', value: 2 },                     // Breath Control
  gn_5: { kind: 'after_event_buff', event: 'crit', statBuff: 'atk',
          value: 15, turns: 1 },                                             // Poise
  gn_7: { kind: 'cooldown_reduction', pct: 15 },                           // Signature Move
  gn_8: { kind: 'pct_stat', stat: 'gold', value: 25 },                     // Fan Favorite (+25% gold; also +10% XP)
  gn_9: { kind: 'cooldown_reduction', pct: -100 },                         // GRANDMASTER (keystone) — all 3 skills/turn, cooldowns 2x
  // ^ Actual semantic ("all 3 skills/turn") applied via keystone hook; -100% here
  //   means cooldown_reduction field shouldn't be taken literally (see resolver).

  // ─── MEDIC / Mend (orchard) ───────────────────────────────────────
  or_1: { kind: 'flat_stat', stat: 'hp', value: 6 },                       // Patched Up
  or_2: { kind: 'pct_stat', stat: 'regen', value: 1 },                     // Gentle Touch
  or_4: { kind: 'flat_stat', stat: 'hp', value: 15 },                      // Reinforced Frame
  or_5: { kind: 'pct_stat', stat: 'heals_received', value: 30 },           // Skilled Hands (heals +30%)
  or_7: { kind: 'pct_stat', stat: 'heals_received', value: 15 },           // Triage Allies
  or_8: { kind: 'pct_stat', stat: 'regen', value: 100 },                   // Constant Care
  or_9: { kind: 'pct_stat', stat: 'regen', value: 5 },                     // LIFELINE (keystone) — also no_crit

  // ─── MEDIC / Bitter Root (ferment) ────────────────────────────────
  fe_1: { kind: 'pct_stat', stat: 'dot_dmg', value: 30 },                  // Caustic Oil (+3 DoT dmg ≈ ~30% of base 10)
  // ^ BALANCE: Flat "+3 DoT dmg" interpreted as +30% of a baseline 10-dmg DoT.
  fe_2: { kind: 'pct_stat', stat: 'debuff_duration', value: 33 },          // Fester
  fe_4: { kind: 'pct_stat', stat: 'status_chance', value: 20 },            // Contagion (DoTs spread)
  fe_5: { kind: 'conditional_pct_stat', stat: 'def', value: -25,
          condition: 'enemy_count_gte_2' },                                 // Crumble
  // ^ "DoT enemies -25% DEF" modeled as conditional enemy debuff; simplified.
  fe_7: { kind: 'pct_stat', stat: 'dot_dmg', value: 25 },                  // Deeper Infection
  fe_8: { kind: 'pct_stat', stat: 'debuff_duration', value: 999 },         // Gangrene (until dead)
  fe_9: { kind: 'convert_to_dot', directScale: 0.5 },                      // OUTBREAK (keystone)

  // ─── MEDIC / Triage (harvest) ─────────────────────────────────────
  hr_1: { kind: 'pct_stat', stat: 'dmg_taken', value: -5 },                // Tough Skin
  hr_2: { kind: 'flat_stat', stat: 'hp', value: 10 },                      // Emergency Reserve
  hr_4: { kind: 'flat_stat', stat: 'hp', value: 10 },                      // Extra Kits (+3 consumable slots)
  // ^ BALANCE: Consumable slot expansion not yet a stat; placeholder HP bump.
  hr_5: { kind: 'conditional_pct_stat', stat: 'all_stats', value: 20,
          condition: 'hp_above_80' },                                       // Pre-Flight Check
  // ^ BALANCE: "+20% HP each battle start" modeled as conditional all-stat boost.
  hr_7: { kind: 'pct_stat', stat: 'heals_received', value: 50 },           // Stocked Bag
  hr_8: { kind: 'hp_floor', floor: 1, oncePerBattle: true },               // Guardian Instinct (50% chance — modeled as floor for now)
  hr_9: { kind: 'revive_once', hpPct: 100, goldPenaltyPct: 50 },           // CODE BLUE (keystone)

  // ─── GHOST / Drift (indica) ───────────────────────────────────────
  in_1: { kind: 'pct_stat', stat: 'enemy_accuracy_down', value: 3 },       // Vertigo
  in_2: { kind: 'pct_stat', stat: 'status_chance', value: 5 },             // Tangle
  in_4: { kind: 'pct_stat', stat: 'debuff_duration', value: 10 },          // Lingering Chill
  in_5: { kind: 'vs_status_dmg', tag: 'slow', value: 20 },                 // Sitting Duck
  in_7: { kind: 'conditional_pct_stat', stat: 'hp_regen', value: -100,
          condition: 'stunned_can_regen_no' },                              // Lockdown
  in_8: { kind: 'vs_status_dmg', tag: 'slow', value: 30 },                 // Leaden Limbs
  in_9: { kind: 'all_enemies_slowed', pct: 30, selfSpdPenalty: 50 },       // QUIET ROOM (keystone)

  // ─── GHOST / Blur (sativa) ────────────────────────────────────────
  sa_1: { kind: 'flat_stat', stat: 'spd', value: 4 },                      // Quickstep
  sa_2: { kind: 'pct_stat', stat: 'crit_chance', value: 5 },               // Pinpoint
  sa_4: { kind: 'flat_stat', stat: 'luck', value: 15 },                    // Lucky Break
  sa_5: { kind: 'pct_stat', stat: 'dodge', value: 25 },                    // Untouchable
  sa_7: { kind: 'first_hit_crit' },                                         // Opening Strike
  sa_8: { kind: 'cooldown_reduction', pct: 10 },                           // Snowball (-1 cd per kill; simplified)
  sa_9: { kind: 'pct_stat', stat: 'spd', value: 100 },                     // GALE (keystone)

  // ─── GHOST / Slip (hybrid) ────────────────────────────────────────
  hy_1: { kind: 'flat_stat', stat: 'atk', value: 2 },                      // Shapeless (+2 all stats; ATK only for simplicity)
  // ^ BALANCE: "+2 all stats" modeled as +2 ATK only. Real all-stats bump
  //   requires the resolver to broadcast flat_stat across all 5 stats.
  hy_2: { kind: 'pct_stat', stat: 'dmg_taken', value: -10 },               // Inured
  hy_4: { kind: 'pct_stat', stat: 'luck', value: 5 },                      // Wildcard Stats
  hy_5: { kind: 'cooldown_reduction', pct: 20 },                           // Flow State
  hy_7: { kind: 'immunity', to: 'dots' },                                   // Adaptive (simplified to DoT immunity)
  hy_8: { kind: 'flat_stat', stat: 'luck', value: 3 },                     // Crosswind
  // ^ BALANCE: "+1 to other trees effects" is a cross-tree synergy — no
  //   direct stat translation. Placeholder +3 LUCK until the cross-tree
  //   synergy resolver lands.
  hy_9: { kind: 'random_keystone' },                                        // WILD RIDE (keystone)

  // ─── GAMBLER / Dice ───────────────────────────────────────────────
  di_1: { kind: 'pct_stat', stat: 'crit_chance', value: 4 },               // Dice Hand
  di_2: { kind: 'flat_stat', stat: 'atk', value: 3 },                      // Loaded Die
  di_4: { kind: 'pct_stat', stat: 'crit_chance', value: 6 },               // Hot Streak
  di_5: { kind: 'crit_mult_override', value: 2.5 },                        // Snake Eyes (2.5x crit, -10% acc)
  di_7: { kind: 'pct_stat', stat: 'gold', value: 10 },                     // Pocket Change
  di_8: { kind: 'after_event_buff', event: 'crit', statBuff: 'atk',
          value: 20, turns: 1 },                                             // Big Gamble (simplified: on-crit next-turn buff)
  di_9: { kind: 'all_crit' },                                               // HOUSE EDGE (keystone)
  // ^ Semantically: "all attacks 2x or 0x on flip. +20% hit chance." Complex —
  //   treated as all_crit for stat approximation; full coin-flip hooks TBD.

  // ─── GAMBLER / Cards ──────────────────────────────────────────────
  ca_1: { kind: 'flat_stat', stat: 'luck', value: 3 },                     // Dealt Hand
  ca_2: { kind: 'flat_stat', stat: 'spd', value: 3 },                      // Shuffle
  ca_4: { kind: 'pct_stat', stat: 'crit_dmg', value: 15 },                 // Face Card
  ca_5: { kind: 'after_event_buff', event: 'crit', statBuff: 'atk',
          value: 30, turns: 1 },                                             // Blackjack
  ca_7: { kind: 'hp_floor', floor: 1, oncePerBattle: true },               // Ace Up Sleeve (once-per-battle miss→hit)
  ca_8: { kind: 'pct_stat', stat: 'crit_chance', value: 20 },              // Five Card Run (simplified chain bonus)
  ca_9: { kind: 'pct_stat', stat: 'skill_mult', value: -30 },              // ROYAL FLUSH (keystone) — chains never break
  // ^ Rhythm-chain hook applied separately.

  // ─── GAMBLER / House ──────────────────────────────────────────────
  hu_1: { kind: 'pct_stat', stat: 'gold', value: 5 },                      // House Cut
  hu_2: { kind: 'pct_stat', stat: 'crit_chance', value: 4 },               // Counting
  hu_4: { kind: 'pct_stat', stat: 'crit_chance', value: 3 },               // Tell (reveal + small boost)
  hu_5: { kind: 'after_event_buff', event: 'crit', statBuff: 'crit_chance',
          value: 2, turns: 999 },                                            // Stacked Odds
  hu_7: { kind: 'pct_stat', stat: 'gold', value: 3 },                      // Skim
  hu_8: { kind: 'hp_floor', floor: 1, oncePerBattle: true },               // Insurance
  hu_9: { kind: 'pct_stat', stat: 'luck', value: 100 },                    // HOUSE ALWAYS WINS (keystone) — LUCK doubled
  // ^ Also -20% other stats; applied via keystone hook.
});

export function passiveFor(nodeId: string): PassiveEffect | undefined {
  return PASSIVE_EFFECTS[nodeId];
}

/** For UI: does this node have a passive effect? */
export function hasPassive(nodeId: string): boolean {
  return nodeId in PASSIVE_EFFECTS;
}
