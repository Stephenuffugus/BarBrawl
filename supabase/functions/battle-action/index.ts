// POST /battle-action
// Player submits a combat action. Server applies it via game-core, auto-
// advances the enemy turn, persists the new state + appends to action_log.
//
// The append-only action_log is the cornerstone of anti-cheat: at battle-
// end the server re-derives the final state from (initial, log) using the
// same combat engine. Forged claims fail validation.

// @ts-expect-error — Deno std import.
import { serve } from 'https://deno.land/std/http/server.ts';
import { prelude, jsonResponse, errorResponse } from '../_shared/auth.ts';
// @ts-expect-error — resolved by import_map.json.
import { applyPlayerAction, advanceTurn, seededRng } from '../_shared/game-core.ts';
import type { BattleState, PlayerAction } from '../_shared/game-core.ts';

export interface BattleActionRequest {
  battleId: string;
  action: PlayerAction;
}

serve(async (req: Request) => {
  const pre = await prelude(req, 'battle.action');
  if (!pre.ok) return pre.res;
  const { user, body, supabase } = pre.ctx;

  const { battleId, action } = (body ?? {}) as Partial<BattleActionRequest>;
  if (!battleId || !action) return errorResponse('missing_fields', 400);

  // Load the battle and verify ownership.
  const { data: battle, error: loadErr } = await supabase
    .from('battles')
    .select('id, attacker_character_id, status, state_json, action_log, seed')
    .eq('id', battleId)
    .single();
  if (loadErr || !battle) return errorResponse('battle_not_found', 404);
  if (battle.status !== 'in_progress') return errorResponse('battle_not_active', 409);

  const { data: char, error: charErr } = await supabase
    .from('characters')
    .select('user_id')
    .eq('id', battle.attacker_character_id)
    .single();
  if (charErr || !char || char.user_id !== user.id) {
    return errorResponse('not_attacker', 403);
  }

  // Apply the action with a deterministic RNG seeded by (seed:turn-index).
  const log = (battle.action_log as PlayerAction[] | null) ?? [];
  const idx = log.length;
  let state = battle.state_json as BattleState;
  const rng = seededRng(`${battle.seed}:${idx}`);
  state = applyPlayerAction(state, action, { rng });
  if (!state.result) {
    state = advanceTurn(state, { rng });
  }

  // Persist new state + append the action.
  const newLog = [...log, action];
  const status = state.result ? 'in_progress' /* still mark-complete on /battle-end */ : 'in_progress';
  const { error: updErr } = await supabase
    .from('battles')
    .update({
      state_json: state,
      action_log: newLog,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', battleId);
  if (updErr) return errorResponse(`db_write_failed:${updErr.message}`, 500);

  return jsonResponse({ battleState: state });
});
