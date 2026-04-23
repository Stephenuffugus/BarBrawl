// POST /battle-start
// Begin a bar run. Loads the character + bar, initializes a BattleState
// via game-core's `initBattle`, persists it in a `battles` row, and returns
// the initial state so the client can render the combat screen.
//
// Request: { barId: string; characterId: string }
// Response: { battleState: BattleState }
//
// Anti-cheat: the server RE-ROLLS the daily room seed using
// (bar_id, date, player_level) per spec §5.4. Never trusts a client seed.

// import { initBattle, toRuntime } from '@barbrawl/game-core';
// import { serve } from 'https://deno.land/std/http/server.ts';

export interface BattleStartRequest {
  barId: string;
  characterId: string;
}

// Response uses BattleState from game-core.
//
// serve(async (req) => {
//   1. Auth the request.
//   2. Validate ownership: characterId must belong to authed user.
//   3. Fetch bar (type, atk_modifier, def_modifier, boss jsonb).
//   4. Fetch character row + convert to CharacterRuntime via toRuntime().
//   5. Generate the daily room sequence: seed = hash(bar.id + today's date).
//   6. For each room, build EnemyTemplate[]:
//      - Normal rooms: 1-3 generic enemies scaled by bar modifiers.
//      - Boss room: { isBoss: true, name: bar.boss.name, ... }.
//   7. initBattle({ battleId, seed, player: runtime, enemyTemplates }).
//   8. INSERT into battles (status='in_progress', state_json=battleState).
//   9. Return battleState.
// });
