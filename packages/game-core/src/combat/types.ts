// Combat engine types. Pure data — no network, no DB.
//
// The combat engine interprets BattleState + PlayerAction and emits a new
// BattleState. Edge functions wrap this with serialization, auth, and
// persistence. See docs/BARBRAWL_SPEC.md §5.3 + §8.3.
//
// Status effects and cooldowns are scaffolded but not fully resolved in
// this skeleton — see README note at bottom of combat/index.ts.

import type { ClassId, ResourceKind } from '../types';
import type { RhythmQuality } from '../math/damage';

export type CombatantKind = 'player' | 'enemy' | 'boss' | 'defender';

export interface CombatStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  luck: number;
}

export interface CombatResource {
  kind: ResourceKind;
  current: number;
  cap: number;
}

export interface StatusEffect {
  id: string;
  /** Internal tag the engine uses to dispatch resolution logic. */
  tag: 'buff_atk' | 'buff_def' | 'debuff_def' | 'bleed' | 'burn' | 'poison' | 'stun' | 'mark';
  /** Remaining duration in turns. 0 = expires at end-of-turn. */
  turnsLeft: number;
  /** Magnitude used by the resolver (pct, flat amount, or DoT per turn). */
  magnitude: number;
  /** For display / replay. */
  label: string;
}

export interface Combatant {
  id: string;
  kind: CombatantKind;
  name: string;
  classId?: ClassId;
  /** Character level (for per-level-scaling passives). */
  level?: number;
  /** Base stats — pre-passive, pre-status. */
  stats: CombatStats;
  resource?: CombatResource;
  statusEffects: readonly StatusEffect[];
  /** Node IDs of up to 3 equipped active skills. */
  skillsEquipped?: readonly string[];
  /** All allocated tree nodes — feeds the passive resolver. */
  allocatedNodes?: readonly string[];
  /** Remaining cooldown turns, keyed by node ID. */
  cooldowns?: Readonly<Record<string, number>>;
  /** For enemies: crude AI profile. Extend as AI matures. */
  aiProfile?: 'basic_attacker' | 'boss';
}

export interface BattleLogEntry {
  turn: number;
  actorId: string;
  text: string;
  kind: 'attack' | 'skill' | 'status' | 'consumable' | 'flee' | 'defeat' | 'info';
}

export type PlayerActionKind = 'skill' | 'basic_attack' | 'consumable' | 'flee';

export interface PlayerAction {
  kind: PlayerActionKind;
  actorId: string;
  /** Target combatant ID. Required for attack/skill. */
  targetId?: string;
  /** Skill node ID when kind='skill'. */
  skillNodeId?: string;
  /** Rhythm quality reported by the client. Default 'ok' if missing. */
  rhythm?: RhythmQuality;
  /** Consumable stack key when kind='consumable'. */
  consumableId?: string;
}

export type BattleResult = 'win' | 'loss' | 'flee';

export interface BattleRewards {
  xp: number;
  gold: number;
  itemIds: readonly string[];
}

export interface BattleState {
  id: string;
  turn: number;
  /** Index into combatants, whose turn it is. */
  activeCombatantIndex: number;
  combatants: readonly Combatant[];
  log: readonly BattleLogEntry[];
  rewards: BattleRewards;
  result?: BattleResult;
  /** Deterministic seed for replay. RNG is injected at call time. */
  seed: string;
}
