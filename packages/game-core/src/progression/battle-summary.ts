// Build a BattleSummary from a finalized BattleState. Used by quest
// progress updates, XP awards, and battle history records.
//
// Pure — takes a state snapshot + bar context and extracts counts.

import type { BattleState } from '../combat/types';
import type { BarType } from '../types';
import type { BattleSummary } from './quests';

export interface SummaryContext {
  barType: BarType;
  barLevel: number;
  playerLevel: number;
  consumablesUsed: number;
  roomsCleared: number;
  goldEarned: number;
}

/** Compute the BattleSummary from a resolved battle. */
export function buildBattleSummary(
  state: BattleState,
  ctx: SummaryContext,
): BattleSummary {
  const won = state.result === 'win';
  const bossDefeated = state.combatants.some(
    (c) => c.kind === 'boss' && c.stats.hp <= 0,
  );
  const player = state.combatants.find((c) => c.kind === 'player');
  const endedHpPct = player && player.stats.maxHp > 0
    ? player.stats.hp / player.stats.maxHp
    : 0;

  // Scan the log for player-driven events.
  let perfectHits = 0;
  let skillsUsed = 0;
  let statusApplies = 0;
  let biggestHit = 0;

  for (const entry of state.log) {
    if (!player || entry.actorId !== player.id) {
      // We attribute these to the player only.
      if (entry.kind === 'skill' && (entry.text.includes('applies') || entry.text.includes('debuff'))) {
        // Ally-applied statuses still count elsewhere; skip for player quest.
      }
      continue;
    }
    if (entry.kind === 'skill') {
      // Skill uses include status-apply + heal + damage. Disambiguate by text.
      if (entry.text.startsWith(player.name + ' uses ') === false) skillsUsed++;
      // Status applies when the log mentions "applies" or "blinds" etc.
      if (/debuff|applies|stun|bleed|burn|poison|mark|curse|slow|blind/i.test(entry.text)) {
        statusApplies++;
      }
      const m = entry.text.match(/for (\d+)/);
      if (m && m[1]) {
        const dmg = parseInt(m[1], 10);
        if (dmg > biggestHit) biggestHit = dmg;
      }
      if (entry.text.includes('(perfect!)')) perfectHits++;
    }
  }

  return {
    won,
    barType: ctx.barType,
    barLevel: ctx.barLevel,
    playerLevel: ctx.playerLevel,
    bossDefeated,
    perfectHits,
    skillsUsed,
    statusApplies,
    consumablesUsed: ctx.consumablesUsed,
    biggestHit,
    roomsCleared: ctx.roomsCleared,
    endedHpPct,
    goldEarned: ctx.goldEarned,
  };
}
