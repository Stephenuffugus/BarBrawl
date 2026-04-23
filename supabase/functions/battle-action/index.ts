// POST /battle-action
// Player submits a combat action. Server applies it via game-core, auto-
// advances the enemy turn, persists the new state, and returns it.
//
// Rate-limited to 1 per 500ms per spec §8.3.
//
// Request: { battleId: string; action: PlayerAction }
// Response: { battleState: BattleState }

// import { applyPlayerAction, advanceTurn } from '@barbrawl/game-core';

export interface BattleActionRequest {
  battleId: string;
  // Shape matches PlayerAction in game-core; duplicated here for the Deno boundary.
  action: {
    kind: 'skill' | 'basic_attack' | 'consumable' | 'flee';
    actorId: string;
    targetId?: string;
    skillNodeId?: string;
    rhythm?: 'perfect' | 'good' | 'ok' | 'miss';
    consumableId?: string;
  };
}

// serve(async (req) => {
//   1. Auth + rate-limit check (use Supabase Edge KV or simple Upstash).
//   2. Load battles row by battleId. Reject if status != 'in_progress'.
//   3. Verify the authed user is the attacker (battles.attacker_character_id
//      belongs to them).
//   4. Deserialize state_json -> BattleState.
//   5. Apply the action:
//        let state = applyPlayerAction(state, action, { rng: seededRng(seed) });
//        if (!state.result) state = advanceTurn(state, { rng: ... });
//   6. Serialize state back to jsonb.
//   7. UPDATE battles SET state_json = new, updated_at = now() WHERE id = ?.
//   8. Return battleState.
// });
