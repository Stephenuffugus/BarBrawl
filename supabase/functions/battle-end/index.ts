// POST /battle-end
// Finalize a battle (win/loss/flee). Rolls rewards, writes to items/battles/
// characters tables, updates mastery, and returns the reward summary.
//
// Request: { battleId: string }
// Response: { xp: number; gold: number; itemIds: string[]; levelUps: number }

// import { rollItem } from '@barbrawl/game-core';

export interface BattleEndRequest {
  battleId: string;
}

export interface BattleEndResponse {
  xp: number;
  gold: number;
  itemIds: readonly string[];
  levelUps: number;
}

// serve(async (req) => {
//   1. Auth + ownership check.
//   2. Load battles row; reject if status != 'in_progress'.
//   3. Inspect state_json.result:
//      - 'win' => full XP + gold + 1 loot roll per defeated boss room,
//                rarer loot rolls per regular enemy, weighted by bar_tier.
//      - 'loss' => partial XP (25%), no gold, no loot.
//      - 'flee' => minimal XP (5%), no rewards.
//   4. For each loot roll:
//        const item = rollItem({
//          slot: pickSlot(rng),
//          barTier: bar.tier,
//          houseSpec: bar.type,
//          classContext: character.class_id,
//          rng: seededRng(battle.seed + idx),
//          itemIdGen: () => crypto.randomUUID(),
//        });
//      INSERT INTO items (...) VALUES (...).
//   5. UPDATE characters SET xp = xp + earned, level = new_level (use
//      applyXp from game-core), mastery = bumped_by_bar_type.
//   6. UPDATE battles SET result, rewards jsonb, status = 'complete'.
//   7. Return { xp, gold, itemIds, levelUps }.
// });
