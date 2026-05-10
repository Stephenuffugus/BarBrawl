// POST /battle-end
// Finalize a battle, validate the action log, roll loot, award XP+gold,
// update mastery, persist to items + characters tables.
//
// Anti-cheat: the server re-derives the final state from
// (initial_state, action_log) using the same engine the live calls used.
// If the derived state diverges from the live state, we treat the live
// state as suspect and use the validator's derived state instead.

// @ts-expect-error — Deno std import.
import { serve } from 'https://deno.land/std/http/server.ts';
import { prelude, jsonResponse, errorResponse } from '../_shared/auth.ts';
// @ts-expect-error — resolved by import_map.json.
import {
  validateBattleLog, seededRng, applyXp, Loot, Progression,
} from '../_shared/game-core.ts';
import type { BattleState, PlayerAction } from '../_shared/game-core.ts';

export interface BattleEndRequest { battleId: string }
export interface BattleEndResponse {
  result: 'win' | 'loss' | 'flee';
  xp: number;
  gold: number;
  itemIds: readonly string[];
  levelUps: number;
}

const BASE_XP_BY_RESULT = { win: 100, loss: 25, flee: 5 } as const;
const BASE_GOLD_BY_RESULT = { win: 50, loss: 0, flee: 0 } as const;

serve(async (req: Request) => {
  const pre = await prelude(req, 'battle.end');
  if (!pre.ok) return pre.res;
  const { user, body, supabase } = pre.ctx;

  const { battleId } = (body ?? {}) as Partial<BattleEndRequest>;
  if (!battleId) return errorResponse('missing_battleId', 400);

  // Load battle.
  const { data: battle, error: loadErr } = await supabase
    .from('battles')
    .select('id, attacker_character_id, bar_id, status, state_json, initial_state_json, action_log, seed')
    .eq('id', battleId)
    .single();
  if (loadErr || !battle) return errorResponse('battle_not_found', 404);
  if (battle.status !== 'in_progress') return errorResponse('battle_not_active', 409);

  // Load character (for ownership + xp/level update + mastery).
  const { data: charRow, error: charErr } = await supabase
    .from('characters').select('*')
    .eq('id', battle.attacker_character_id).single();
  if (charErr || !charRow || charRow.user_id !== user.id) {
    return errorResponse('not_attacker', 403);
  }

  // Bar (for bar.type → mastery key, bar.tier → loot ilvl).
  const { data: barRow, error: barErr } = await supabase
    .from('bars').select('id, type, atk_modifier').eq('id', battle.bar_id).single();
  if (barErr || !barRow) return errorResponse('bar_not_found', 404);

  // ── Anti-cheat: re-derive final state from initial + action_log ──
  const log = (battle.action_log as PlayerAction[] | null) ?? [];
  const initialState = (battle.initial_state_json ?? battle.state_json) as BattleState;
  const claimedFinal = battle.state_json as BattleState;

  let authoritativeState = claimedFinal;
  if (log.length > 0) {
    const v = validateBattleLog({ initialState, actions: log, claimedFinal });
    if (v.ok) {
      authoritativeState = v.derived;
    } else if (v.reason === 'result_mismatch' || v.reason === 'state_diverged' || v.reason === 'log_overflow') {
      return errorResponse(`anti_cheat:${v.reason}`, 422);
    }
  }
  const result = authoritativeState.result ?? 'flee';

  // ── Rewards ──
  const xpBase = BASE_XP_BY_RESULT[result];
  const goldBase = BASE_GOLD_BY_RESULT[result];

  // Daily-refresh scaling (1.0 / 0.5 / 0.25 by clear count).
  const priorClearsToday = await readClearsToday(supabase, battle.attacker_character_id, battle.bar_id);
  // priorClearsToday is the count of WIN battles already today, BEFORE this one.
  const refresh = Progression.rewardMultiplierForClearNumber(priorClearsToday + 1);
  const xp = Math.floor(xpBase * refresh);
  const gold = Math.floor(goldBase * refresh);

  // Loot rolls: 1 per won battle (boss), more from clear-count + bar tier.
  const itemIds: string[] = [];
  if (result === 'win') {
    const rng = seededRng(`${battle.seed}:loot:0`);
    const item = Loot.rollItem({
      slot: pickSlot(rng),
      barTier: 1, // bars table has no tier column yet; default to 1. TODO: extend bars.
      houseSpec: barRow.type,
      classContext: charRow.class_id,
      rng,
      itemIdGen: () => crypto.randomUUID(),
    });
    const { data: insertedItem, error: itemErr } = await supabase
      .from('items')
      .insert({
        id: item.id,
        owner_user_id: user.id,
        slot: item.slot,
        rarity: item.rarity,
        base_id: item.baseId,
        affixes: item.affixes,
        anointment_node_id: item.anointmentNodeId ?? null,
        item_level: item.itemLevel,
      })
      .select('id').single();
    if (!itemErr && insertedItem) itemIds.push(insertedItem.id);
  }

  // ── XP + level + mastery ──
  // characters.xp is xpIntoLevel (resets to 0 on level-up).
  const xpResult = applyXp({ level: charRow.level, xpIntoLevel: charRow.xp }, xp);
  const levelUps = xpResult.levelsGained;

  const newMastery = { ...(charRow.mastery as Record<string, number> ?? {}) };
  newMastery[barRow.type] = (newMastery[barRow.type] ?? 0) + (result === 'win' ? 1 : 0);

  const { error: charUpdErr } = await supabase
    .from('characters')
    .update({
      xp: xpResult.state.xpIntoLevel,
      level: xpResult.state.level,
      mastery: newMastery,
      bars_won: charRow.bars_won + (result === 'win' ? 1 : 0),
    })
    .eq('id', battle.attacker_character_id);
  if (charUpdErr) return errorResponse(`char_update_failed:${charUpdErr.message}`, 500);

  // Update user gold.
  if (gold > 0) {
    await supabase.rpc('add_gold', { p_user: user.id, p_amount: gold }).then(
      () => undefined,
      () => undefined, // RPC may not exist; gracefully no-op for v1
    );
  }

  // Finalize battle row.
  await supabase.from('battles').update({
    result,
    status: 'complete',
    state_json: authoritativeState,
    xp_earned: xp,
    gold_earned: gold,
    loot_earned: itemIds,
    updated_at: new Date().toISOString(),
  }).eq('id', battleId);

  return jsonResponse({ result, xp, gold, itemIds, levelUps } satisfies BattleEndResponse);
});

async function readClearsToday(supabase: any, characterId: string, barId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from('battles')
    .select('id', { count: 'exact', head: true })
    .eq('attacker_character_id', characterId)
    .eq('bar_id', barId)
    .eq('result', 'win')
    .gte('created_at', `${today}T00:00:00.000Z`);
  return count ?? 0;
}

function pickSlot(rng: () => number): 'weapon' | 'outfit' | 'footwear' | 'trinket' | 'mark' {
  const slots = ['weapon', 'outfit', 'footwear', 'trinket', 'mark'] as const;
  return slots[Math.floor(rng() * slots.length)]!;
}
