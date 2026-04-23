// Character creation logic. Produces a ready-to-insert row shape that
// matches the characters table schema (supabase migration 20260421000002).
// Pure — returns data; caller does the DB INSERT.

import type { ClassId } from '../types';
import { getClass } from '../classes';

/**
 * Shape of a row to be INSERTed into public.characters. Mirrors the DB
 * migration. The DB fills id, created_at. Everything else we provide.
 */
export interface NewCharacterRow {
  user_id: string;
  class_id: ClassId;
  name: string;
  level: number;
  xp: number;
  allocated_nodes: readonly string[];
  bars_won: number;
  mastery: Readonly<Record<string, number>>;
  inventory: readonly unknown[];
  equipped: Readonly<Record<string, unknown>>;
  consumables: Readonly<Record<string, number>>;
}

/**
 * Derived in-memory character state for the combat engine. Includes
 * computed runtime fields (current HP, resource meter) that the DB row
 * alone doesn't track — those live in the BattleState during a fight.
 */
export interface CharacterRuntime {
  userId: string;
  classId: ClassId;
  name: string;
  level: number;
  xp: number;
  stats: { hp: number; maxHp: number; atk: number; def: number; spd: number; luck: number };
  resource: { kind: string; current: number; cap: number };
  allocatedNodes: readonly string[];
  barsWon: number;
  mastery: Readonly<Record<string, number>>;
}

export interface CreateOptions {
  userId: string;
  classId: ClassId;
  /** Optional display name. Defaults to the class display name. */
  name?: string;
}

/**
 * Produce the row shape for a fresh level-1 character of a given class.
 * Stats come from the class's baseStats (spec §5.1). Resource starts at 0.
 */
export function createLevel1Character(opts: CreateOptions): NewCharacterRow {
  const cls = getClass(opts.classId);
  return {
    user_id: opts.userId,
    class_id: cls.id,
    name: opts.name ?? cls.name,
    level: 1,
    xp: 0,
    allocated_nodes: [],
    bars_won: 0,
    mastery: {},
    inventory: [],
    equipped: {},
    consumables: {},
  };
}

/**
 * Produce the in-memory runtime state for a character at a specific level
 * (for combat init, defender snapshotting, or stat preview). Applies
 * per-level gains from spec §5.6 on top of baseStats.
 */
export function toRuntime(
  row: NewCharacterRow,
  overrides: Partial<Pick<CharacterRuntime, 'stats' | 'resource'>> = {},
): CharacterRuntime {
  const cls = getClass(row.class_id);
  const level = row.level;
  const b = cls.baseStats;
  const gain = Math.max(0, level - 1);
  const stats = overrides.stats ?? {
    hp: b.hp + gain * 6,
    maxHp: b.hp + gain * 6,
    atk: b.atk + gain * 2,
    def: b.def + gain * 1,
    spd: b.spd + gain * 0.5,
    luck: b.luck,
  };
  const resource = overrides.resource ?? {
    kind: cls.resource.kind,
    current: 0,
    cap: cls.resource.startingCap,
  };
  return {
    userId: row.user_id,
    classId: row.class_id,
    name: row.name,
    level: row.level,
    xp: row.xp,
    stats,
    resource,
    allocatedNodes: row.allocated_nodes,
    barsWon: row.bars_won,
    mastery: row.mastery,
  };
}

/** Create all 7 characters for a new signup. Spec §8: one per class. */
export function createStarterRoster(userId: string): readonly NewCharacterRow[] {
  const ids: ClassId[] = ['steady', 'brewer', 'vintner', 'shaker', 'orchardist', 'drifter', 'gambler'];
  return ids.map((classId) => createLevel1Character({ userId, classId }));
}
