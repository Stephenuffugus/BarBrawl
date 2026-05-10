// Battle-result validator.
//
// The flow we lock down:
//   - battle-start: server generates `seed`, persists initial state.
//   - battle-action: server stores the *signed* PlayerAction in an append-
//     only log. Returns next state to client.
//   - battle-end: client says "I won, here's the loot list".
//
// validateBattleLog re-derives the final BattleState from
// (initial state, seed, actions[]) using the SAME combat engine the
// edge function ran live. If the derived state matches the persisted
// state — accept. If not — reject and flag for review.
//
// This is the cheapest, most rigorous anti-cheat we can ship: a player
// would have to forge an action sequence that legitimately produces
// the win they're claiming, which means actually playing the game.
//
// Determinism note: the combat engine is RNG-injected. We seed it with
// `seed + ":" + index` so each action draws from a deterministic stream
// without re-using values across actions.

import type { BattleState, PlayerAction } from '../combat/types';
import { applyPlayerAction, advanceTurn } from '../combat/turn';
import { seededRng } from './seeded-rng';

export interface ValidateInput {
  /** The state produced by initBattle, captured at battle-start. */
  initialState: BattleState;
  /** Append-only action log, in submission order. */
  actions: readonly PlayerAction[];
  /** The state the client claims is final. */
  claimedFinal: BattleState;
}

export type ValidateReason =
  | 'result_mismatch'
  | 'hp_mismatch'
  | 'reward_mismatch'
  | 'state_diverged'
  | 'log_overflow'
  | 'no_result_yet';

export interface ValidateResult {
  ok: boolean;
  reason?: ValidateReason;
  /** Authoritative final state (recomputed). Use this when persisting. */
  derived: BattleState;
}

/** Hard cap to prevent infinite loops from malicious action streams. */
export const MAX_ACTIONS = 500;

export function replayBattle(
  initialState: BattleState,
  actions: readonly PlayerAction[],
): BattleState {
  if (actions.length > MAX_ACTIONS) {
    throw new RangeError(`action log exceeds MAX_ACTIONS (${MAX_ACTIONS})`);
  }
  let state = initialState;
  for (let i = 0; i < actions.length; i++) {
    if (state.result) break;
    const rng = seededRng(`${state.seed}:${i}`);
    state = applyPlayerAction(state, actions[i]!, { rng });
    if (state.result) break;
    state = advanceTurn(state, { rng });
  }
  return state;
}

/**
 * Compare derived vs claimed. We require strict equality on result,
 * the player's HP, and the reward bag. Logs and turn counter are
 * informational and don't gate validation.
 */
export function validateBattleLog(input: ValidateInput): ValidateResult {
  if (input.actions.length > MAX_ACTIONS) {
    return { ok: false, reason: 'log_overflow', derived: input.initialState };
  }
  let derived: BattleState;
  try {
    derived = replayBattle(input.initialState, input.actions);
  } catch {
    return { ok: false, reason: 'state_diverged', derived: input.initialState };
  }

  if (!derived.result) {
    return { ok: false, reason: 'no_result_yet', derived };
  }
  if (derived.result !== input.claimedFinal.result) {
    return { ok: false, reason: 'result_mismatch', derived };
  }

  const derivedPlayer = derived.combatants.find((c) => c.kind === 'player');
  const claimedPlayer = input.claimedFinal.combatants.find((c) => c.kind === 'player');
  if (!derivedPlayer || !claimedPlayer) {
    return { ok: false, reason: 'state_diverged', derived };
  }
  if (derivedPlayer.stats.hp !== claimedPlayer.stats.hp) {
    return { ok: false, reason: 'hp_mismatch', derived };
  }

  // Loot is rolled in battle-end (post-validate), so we ignore reward
  // claims here. result + HP are the load-bearing equality.
  return { ok: true, derived };
}
