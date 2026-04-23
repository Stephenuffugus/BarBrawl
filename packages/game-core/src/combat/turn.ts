import type { BattleState, BattleLogEntry, Combatant, PlayerAction } from './types';
import { computeDamage, type RhythmQuality } from '../math/damage';

// Turn resolution skeleton. Fully resolves BASIC ATTACK + FLEE. Skill
// resolution falls through to basic-attack math using the player's base
// ATK — because skill nodes currently carry display-only effect strings
// (not structured action data).
//
// See design note at bottom of combat/index.ts for the structured-skill-
// effects migration plan. Once skills have typed actions, the skill branch
// here becomes a real dispatch on SkillAction.kind.

function replaceAt<T>(arr: readonly T[], idx: number, next: T): T[] {
  const copy = arr.slice();
  copy[idx] = next;
  return copy;
}

function findIndex(state: BattleState, id: string): number {
  return state.combatants.findIndex((c) => c.id === id);
}

function appendLog(state: BattleState, entry: BattleLogEntry): BattleLogEntry[] {
  return [...state.log, entry];
}

function applyDamageTo(
  state: BattleState,
  targetIdx: number,
  damage: number,
  logEntry: BattleLogEntry,
): BattleState {
  const target = state.combatants[targetIdx]!;
  const newHp = Math.max(0, target.stats.hp - damage);
  const nextTarget: Combatant = {
    ...target,
    stats: { ...target.stats, hp: newHp },
  };
  let log = appendLog(state, logEntry);
  if (newHp === 0) {
    log = appendLog(
      { ...state, log },
      { turn: state.turn, actorId: target.id, kind: 'defeat',
        text: `${target.name} is defeated.` },
    );
  }
  return {
    ...state,
    combatants: replaceAt(state.combatants, targetIdx, nextTarget),
    log,
  };
}

function evaluateResult(state: BattleState): BattleState['result'] | undefined {
  const player = state.combatants.find((c) => c.kind === 'player');
  if (!player || player.stats.hp <= 0) return 'loss';
  const enemiesAlive = state.combatants.some(
    (c) => (c.kind === 'enemy' || c.kind === 'boss') && c.stats.hp > 0,
  );
  if (!enemiesAlive) return 'win';
  return undefined;
}

function rhythmWithDefault(r?: RhythmQuality): RhythmQuality {
  return r ?? 'ok';
}

/** Advance activeCombatantIndex to the next living combatant (cyclic). */
function advanceIndex(state: BattleState): number {
  const n = state.combatants.length;
  let i = state.activeCombatantIndex;
  for (let step = 0; step < n; step++) {
    i = (i + 1) % n;
    if (state.combatants[i]!.stats.hp > 0) return i;
  }
  return state.activeCombatantIndex;
}

export interface ApplyOptions {
  rng: () => number;
}

/**
 * Apply a player action to the battle. Returns the new state.
 * For skeleton purposes: 'skill' and 'basic_attack' both resolve as a
 * basic attack using computeDamage. 'consumable' logs-only (no effect
 * applied yet). 'flee' ends the battle.
 */
export function applyPlayerAction(
  state: BattleState,
  action: PlayerAction,
  opts: ApplyOptions,
): BattleState {
  if (state.result) return state;
  const actorIdx = findIndex(state, action.actorId);
  if (actorIdx < 0) throw new RangeError(`Actor ${action.actorId} not in battle`);
  const actor = state.combatants[actorIdx]!;

  if (action.kind === 'flee') {
    return {
      ...state,
      result: 'flee',
      log: appendLog(state, {
        turn: state.turn, actorId: actor.id, kind: 'flee',
        text: `${actor.name} flees the fight.`,
      }),
    };
  }

  if (action.kind === 'consumable') {
    return {
      ...state,
      log: appendLog(state, {
        turn: state.turn, actorId: actor.id, kind: 'consumable',
        text: `${actor.name} uses ${action.consumableId ?? 'a consumable'}. (effect pending)`,
      }),
    };
  }

  // skill + basic_attack: resolve as an attack.
  if (!action.targetId) {
    throw new RangeError('skill/basic_attack requires targetId');
  }
  const targetIdx = findIndex(state, action.targetId);
  if (targetIdx < 0) throw new RangeError(`Target ${action.targetId} not in battle`);
  const target = state.combatants[targetIdx]!;
  const rhythm = rhythmWithDefault(action.rhythm);

  // Skeleton: skillMultiplier = 1.0 for basic, 1.4 for skill (placeholder).
  const skillMultiplier = action.kind === 'skill' ? 1.4 : 1.0;
  // Flat variance roll: ±5% of base damage; simplified.
  const variance = Math.floor((opts.rng() - 0.5) * 10);
  const dmg = computeDamage({
    attackerAtk: actor.stats.atk,
    attackerLevel: 1,
    attackerLuck: actor.stats.luck,
    skillMultiplier,
    rhythm,
    defenderDef: target.stats.def,
    variance,
    critBuff: 0,
    rng: opts.rng,
  });

  const entry: BattleLogEntry = {
    turn: state.turn,
    actorId: actor.id,
    kind: action.kind === 'skill' ? 'skill' : 'attack',
    text: `${actor.name} ${dmg.crit ? 'CRITS' : 'hits'} ${target.name} for ${dmg.damage}` +
          (rhythm === 'perfect' ? ' (perfect!)' : ''),
  };

  const next = applyDamageTo(state, targetIdx, dmg.damage, entry);
  const result = evaluateResult(next);
  return result ? { ...next, result } : next;
}

/**
 * Advance the turn: if the next combatant is an enemy, resolve their AI
 * action (basic attack on the player). If it's the player's turn, just
 * increment the turn counter and pass control.
 */
export function advanceTurn(state: BattleState, opts: ApplyOptions): BattleState {
  if (state.result) return state;
  const nextIdx = advanceIndex(state);
  const nextActor = state.combatants[nextIdx]!;
  const player = state.combatants.find((c) => c.kind === 'player');
  let working: BattleState = { ...state, activeCombatantIndex: nextIdx };

  if ((nextActor.kind === 'enemy' || nextActor.kind === 'boss') && player && player.stats.hp > 0) {
    // Enemy AI: basic attack on player with ok rhythm.
    working = applyPlayerAction(
      working,
      { kind: 'basic_attack', actorId: nextActor.id, targetId: player.id, rhythm: 'ok' },
      opts,
    );
  }

  // Turn counter ticks when we wrap back to the player.
  if (nextActor.kind === 'player') {
    working = { ...working, turn: working.turn + 1 };
  }
  return working;
}

export function endBattle(
  state: BattleState,
  rewards: BattleState['rewards'],
): BattleState {
  return {
    ...state,
    rewards,
    log: appendLog(state, {
      turn: state.turn, actorId: 'system', kind: 'info',
      text: `Battle ended: ${state.result ?? 'unresolved'}.`,
    }),
  };
}
