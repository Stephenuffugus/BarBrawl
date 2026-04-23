import type { BattleState, Combatant, CombatStats } from './types';
import type { CharacterRuntime } from '../character';

// Enemy factory. Level-scaled per spec §5.4 (see prototype scaleEnemy).
// This duplicates the math in a pure, injectable form.

export interface EnemyTemplate {
  id: string;
  name: string;
  isBoss?: boolean;
  barAtkMod?: number;
  barDefMod?: number;
  /** Optional level override. Defaults to player level with small variance. */
  level?: number;
}

export function scaleEnemyStats(
  playerLevel: number,
  opts: { isBoss?: boolean; atkMod?: number; defMod?: number; levelJitter?: number } = {},
): CombatStats {
  const isBoss = opts.isBoss ?? false;
  const atkMod = opts.atkMod ?? 1.0;
  const defMod = opts.defMod ?? 1.0;
  const effectiveLevel = Math.max(1, playerLevel - 2 + (opts.levelJitter ?? 0));
  const hp  = Math.floor((isBoss ? 300 : 60) + effectiveLevel * (isBoss ? 35 : 12));
  const atk = Math.floor((isBoss ? 14 : 6) + effectiveLevel * (isBoss ? 1.2 : 0.7) * atkMod);
  const def = Math.floor((isBoss ? 8 : 4) + effectiveLevel * (isBoss ? 0.5 : 0.3) * defMod);
  return {
    hp,
    maxHp: hp,
    atk,
    def,
    spd: isBoss ? 10 : 8,
    luck: isBoss ? 8 : 4,
  };
}

export function playerCombatant(rt: CharacterRuntime, idOverride?: string): Combatant {
  return {
    id: idOverride ?? `player:${rt.userId}:${rt.classId}`,
    kind: 'player',
    name: rt.name,
    classId: rt.classId,
    stats: { ...rt.stats },
    resource: rt.resource ? { ...rt.resource } : undefined,
    statusEffects: [],
    cooldowns: {},
  } as Combatant;
}

export function enemyCombatant(
  tpl: EnemyTemplate,
  playerLevel: number,
  levelJitter = 0,
): Combatant {
  const stats = scaleEnemyStats(playerLevel, {
    isBoss: tpl.isBoss ?? false,
    atkMod: tpl.barAtkMod ?? 1.0,
    defMod: tpl.barDefMod ?? 1.0,
    levelJitter,
  });
  return {
    id: tpl.id,
    kind: tpl.isBoss ? 'boss' : 'enemy',
    name: tpl.name,
    stats,
    statusEffects: [],
    aiProfile: tpl.isBoss ? 'boss' : 'basic_attacker',
  };
}

export interface InitBattleOptions {
  battleId: string;
  seed: string;
  player: CharacterRuntime;
  enemyTemplates: readonly EnemyTemplate[];
  /** 0 typically — first turn goes to fastest combatant; we keep player first for now. */
  startingCombatantIndex?: number;
}

/** Set up a fresh BattleState. Determinism: seed + rng caller controls. */
export function initBattle(opts: InitBattleOptions): BattleState {
  const playerLevel = opts.player.level;
  const player = playerCombatant(opts.player);
  const enemies = opts.enemyTemplates.map((t) => enemyCombatant(t, playerLevel));
  const combatants = [player, ...enemies];
  return {
    id: opts.battleId,
    seed: opts.seed,
    turn: 1,
    activeCombatantIndex: opts.startingCombatantIndex ?? 0,
    combatants,
    log: [
      { turn: 1, actorId: 'system', kind: 'info',
        text: `Battle ${opts.battleId} begins. ${enemies.length} enem${enemies.length === 1 ? 'y' : 'ies'}.` },
    ],
    rewards: { xp: 0, gold: 0, itemIds: [] },
  };
}
