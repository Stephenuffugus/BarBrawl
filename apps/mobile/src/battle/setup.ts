// Demo battle bootstrapper. Builds a battle from the active character in
// the game store + a deterministic enemy lineup. Active character's class
// drives skills equipped + sprite accent + skill tree allocation.

import { Combat, getClass, toRuntime, type ClassId } from '@barbrawl/game-core';
import { useGameStore } from '@/state/game-store';

/** Bouncer's 3 equipped actives — what the SkillPanel shows.
 *  When the active char isn't a Bouncer, we look up that class's actives. */
function defaultActivesFor(classId: ClassId): readonly string[] {
  // First two active nodes per tree of the class — by tree-node ID convention,
  // _3 and _6 are the two actives in each 9-node tree.
  const cls = getClass(classId);
  const ids: string[] = [];
  for (const treeId of cls.treeIds) {
    // node IDs are `<prefix>_<n>`. Prefix = first 2-3 letters of treeId.
    const prefix = treePrefix(treeId);
    ids.push(`${prefix}_3`); // tier-2 active (always available early)
  }
  return ids;
}

function treePrefix(treeId: string): string {
  // Map each tree ID to its node-prefix used in tree-factory.ts.
  // (Some trees use 2-char prefixes, some 3-char.)
  const map: Record<string, string> = {
    focus: 'fo', clarity: 'cl', resolve: 're',
    hops: 'ho', barley: 'ba', foam: 'fm',
    tannin: 'tn', vintage: 'vn', aeration: 'ar',
    shaken: 'sh', stirred: 'st', garnish: 'gn',
    orchard: 'or', ferment: 'fe', harvest: 'hv',
    indica: 'in', sativa: 'sa', hybrid: 'hy',
    dice: 'di', cards: 'cr', house: 'hs',
  };
  return map[treeId] ?? treeId.slice(0, 2);
}

export interface DemoBattle {
  state: Combat.BattleState;
  playerId: string;
  patronId: string;
  bossId: string;
  enemySpriteIds: Record<string, 'drunken_patron' | 'bar_patron' | 'bar_boss'>;
  /** Equipped skill node IDs for the player. */
  equipped: readonly string[];
  /** Class ID of the player (for sprite accent + post-battle XP awards). */
  classId: ClassId;
}

/** Build a battle from the current active character in the store. */
export function buildDemoBattle(): DemoBattle {
  const active = useGameStore.getState().active();
  const equipped = defaultActivesFor(active.class_id);
  const runtime = toRuntime({
    ...active,
    // bias level for a clean demo if char hasn't leveled yet
    level: Math.max(active.level, 5),
  });

  const enemyTemplates: Combat.EnemyTemplate[] = [
    { id: 'patron', name: 'Drunken Patron', barAtkMod: 1.0, barDefMod: 1.0 },
    { id: 'boss',   name: 'Bar Owner',      isBoss: true, barAtkMod: 1.0, barDefMod: 1.0 },
  ];

  let state = Combat.initBattle({
    battleId: 'demo-battle-1',
    seed: 'demo-seed',
    player: runtime,
    enemyTemplates,
  });

  // Patch player with skillsEquipped so SkillPanel knows the loadout.
  state = {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'player' ? { ...c, skillsEquipped: [...equipped] } : c,
    ),
  };

  const playerId = state.combatants[0]!.id;
  const patronId = state.combatants[1]!.id;
  const bossId = state.combatants[2]!.id;

  return {
    state,
    playerId,
    patronId,
    bossId,
    enemySpriteIds: {
      [patronId]: 'drunken_patron',
      [bossId]: 'bar_boss',
    },
    equipped,
    classId: active.class_id,
  };
}
