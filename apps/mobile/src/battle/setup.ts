// Demo battle bootstrapper. Builds a battle from the active character +
// (optionally) a backup character. Enemy lineup is themed by bar type.
// Active character's class drives skills equipped + sprite accent.
// Equipped items + allocated skill nodes are folded into the player
// Combatant so equipment + tree passives affect fight outcomes.

import { Combat, getClass, toRuntime, type ClassId } from '@barbrawl/game-core';
import { useGameStore } from '@/state/game-store';
import { computeEffectiveStats } from '@/state/effective-stats';
import type { BarThemeId } from '@/design/palette';

/** Reserve character — sat on the bench, available via SWAP. */
export interface ReserveChar {
  classId: ClassId;
  level: number;
  allocatedNodes: readonly string[];
  equippedSkills: readonly string[];
  /** Effective stats at start; HP burns down on swap-in if previously hurt. */
  maxHp: number;
  startingHp: number;
}

/** Two normal enemies + one boss per bar theme. */
const ENEMY_LINEUPS: Record<BarThemeId, { patron: string; tough: string; boss: string }> = {
  dive:      { patron: 'Drunken Patron',  tough: 'Pool Cue Bruiser',  boss: 'Bar Owner' },
  pub:       { patron: 'Regular',         tough: 'Old Timer',         boss: 'Publican' },
  sports:    { patron: 'Loud Fan',        tough: 'Bookie',            boss: 'Coach' },
  cocktail:  { patron: 'Mixologist',      tough: 'Bottle Service',    boss: 'Sommelier' },
  wine:      { patron: 'Vineyard Snob',   tough: 'Cellar Master',     boss: 'Vintner' },
  brewery:   { patron: 'Hop Head',        tough: 'Cooper',            boss: 'Brewmaster' },
  nightclub: { patron: 'Doorman',         tough: 'Promoter',          boss: 'DJ' },
};

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
  /** Equipped skill node IDs for the active player. */
  equipped: readonly string[];
  /** Class ID of the active player (for sprite accent + post-battle XP awards). */
  classId: ClassId;
  /** Bench: characters available via SWAP. Demo supports 1 backup. */
  reserves: readonly ReserveChar[];
}

/** Convert a roster row + theme into a Combat.Combatant ready for the live state. */
function buildPlayerCombatant(classId: ClassId, level: number, opts?: { hp?: number }) {
  const store = useGameStore.getState();
  const row = store.roster.find((r) => r.class_id === classId);
  if (!row) throw new Error(`No roster row for ${classId}`);
  const charEquipped = store.equipped[classId] ?? {};
  const lvl = Math.max(level, 5);
  const eff = computeEffectiveStats(classId, lvl, charEquipped, store.inventory);
  const equipped = defaultActivesFor(classId);
  const runtime = toRuntime({ ...row, level: lvl }, {
    stats: { ...eff, maxHp: eff.hp },
  });
  // Combat.playerCombatant builds the standard Combatant shape. We then
  // override HP if a residual was passed (for swap-back continuity).
  const c = Combat.playerCombatant(runtime, `player:${classId}:${Date.now()}`);
  return {
    combatant: opts?.hp !== undefined
      ? { ...c, stats: { ...c.stats, hp: Math.max(0, Math.min(opts.hp, c.stats.maxHp)) } }
      : c,
    equipped,
    runtime,
    allocatedNodes: row.allocated_nodes,
  };
}

export function buildSwapCombatant(classId: ClassId, residualHp?: number) {
  const store = useGameStore.getState();
  const row = store.roster.find((r) => r.class_id === classId);
  if (!row) throw new Error(`No roster row for ${classId}`);
  const lvl = Math.max(row.level, 5);
  const built = buildPlayerCombatant(
    classId,
    lvl,
    residualHp !== undefined ? { hp: residualHp } : {},
  );
  return {
    combatant: { ...built.combatant, skillsEquipped: [...built.equipped], allocatedNodes: [...built.allocatedNodes] },
    equipped: built.equipped,
  };
}

export interface BuildBattleOptions {
  /** Bar theme drives enemy names and sprite accent. */
  theme?: BarThemeId;
  /** Bar id — feeds the seed for deterministic enemy stats per location. */
  barId?: string;
  /** Optional backup character class. */
  secondaryClassId?: ClassId | null;
}

/** Build a battle from the current active character in the store. */
export function buildDemoBattle(opts: BuildBattleOptions = {}): DemoBattle {
  const theme: BarThemeId = opts.theme ?? 'dive';
  const lineup = ENEMY_LINEUPS[theme];
  const store = useGameStore.getState();
  const active = store.active();
  const equipped = defaultActivesFor(active.class_id);
  const charEquipped = store.equipped[active.class_id] ?? {};
  const level = Math.max(active.level, 5);

  // Stats: base + per-level scaling + equipped flat/pct affixes folded in
  // via computeEffectiveStats. toRuntime gives us the resource shape; we
  // override its stats with the equipment-aware version.
  const eff = computeEffectiveStats(active.class_id as ClassId, level, charEquipped, store.inventory);
  const runtime = toRuntime({ ...active, level }, {
    stats: { ...eff, maxHp: eff.hp },
  });

  const enemyTemplates: Combat.EnemyTemplate[] = [
    { id: 'patron', name: lineup.patron, barAtkMod: 1.0, barDefMod: 1.0 },
    { id: 'boss',   name: lineup.boss,   isBoss: true, barAtkMod: 1.0, barDefMod: 1.0 },
  ];

  let state = Combat.initBattle({
    battleId: `demo-${opts.barId ?? 'bar'}-${Date.now()}`,
    seed: `${opts.barId ?? 'demo'}:${theme}`,
    player: runtime,
    enemyTemplates,
  });

  // Patch player with skillsEquipped + allocated_nodes so the SkillPanel
  // knows the loadout and the passive resolver folds in tree passives.
  state = {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'player'
        ? { ...c, skillsEquipped: [...equipped], allocatedNodes: [...active.allocated_nodes] }
        : c,
    ),
  };

  // Build reserves snapshot. Their stats are baked at battle-start so
  // mid-fight respec/equip changes don't retroactively buff the bench.
  const reserves: ReserveChar[] = [];
  if (opts.secondaryClassId && opts.secondaryClassId !== active.class_id) {
    const row = store.roster.find((r) => r.class_id === opts.secondaryClassId);
    if (row) {
      const lvl = Math.max(row.level, 5);
      const rEq = store.equipped[row.class_id] ?? {};
      const rEff = computeEffectiveStats(row.class_id as ClassId, lvl, rEq, store.inventory);
      reserves.push({
        classId: row.class_id as ClassId,
        level: lvl,
        allocatedNodes: row.allocated_nodes,
        equippedSkills: defaultActivesFor(row.class_id as ClassId),
        maxHp: rEff.hp,
        startingHp: rEff.hp,
      });
    }
  }

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
    reserves,
  };
}
