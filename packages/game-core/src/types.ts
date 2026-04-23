// Core type system. Platform-agnostic. No RN, no DOM.
//
// DB contract: `ClassId` values and skill-node IDs map 1:1 to Postgres
// columns in spec §8 (characters.class_id, characters.skill_points keys).
// Renaming display names is safe; renaming IDs requires a migration.

export type ClassId =
  | 'steady'      // The Operator
  | 'brewer'      // The Bouncer
  | 'vintner'     // The Hexwright
  | 'shaker'      // The Duelist
  | 'orchardist'  // The Medic
  | 'drifter'     // The Ghost
  | 'gambler';    // The Gambler (added post-spec, see DESIGN_V1.md)

export type ResourceKind =
  | 'focus'        // Operator: builds passively, spent on guaranteed-hit skills
  | 'grit'         // Bouncer: gained on damage taken, spent on retaliation
  | 'curseStacks'  // Hexwright: applied to enemy, detonated by finishers
  | 'tempo'        // Duelist: gained on rhythm-perfect hits, spent on extenders
  | 'reserve'      // Medic: banked HP from overheals
  | 'momentum'     // Ghost: gained on dodge/SPD-trade, spent on blitz skills
  | 'chips';       // Gambler: gained per action, wagered on variance rolls

export type ActionEconomyKind =
  | 'standard'            // 1 action per turn, no twist
  | 'absorb-bank'         // Bouncer: absorb a turn to bank a 2-action turn
  | 'consume-enemy-stacks'// Hexwright: some skills cost enemy curse stacks
  | 'perfect-bonus'       // Duelist: chained perfects grant a free half-action
  | 'heal-bank'           // Medic: overheal converts to Reserve (bankable HP)
  | 'spd-trade'           // Ghost: can trade SPD for a 2nd half-action
  | 'wager';              // Gambler: skills can be "all-in" (2x or 0x on coin flip)

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  luck: number;
}

export interface ActionEconomy {
  kind: ActionEconomyKind;
  description: string;
}

export interface ResourceDef {
  kind: ResourceKind;
  name: string;
  description: string;
  startingCap: number;
  generationRule: string;
}

// Bar types mirror the DB CHECK constraint in supabase/migrations/
// 20260421000002_core_tables.sql (bars.type). Keep this enum and the
// CHECK constraint in sync — adding a type requires a migration.
export type BarType =
  | 'dive'
  | 'pub'
  | 'sports'
  | 'cocktail'
  | 'wine'
  | 'brewery'
  | 'nightclub';

export type Specialty = BarType | 'universal';

export interface ClassDef {
  id: ClassId;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  baseStats: BaseStats;
  resource: ResourceDef;
  actionEconomy: ActionEconomy;
  // Internal tree keys (DB-stable). Display names live in treeDisplayNames.
  treeIds: readonly [string, string, string];
  treeDisplayNames: Readonly<Record<string, string>>;
  specialtyBarType: Specialty;
}

// Skill tree node model (preserves v6 prototype node IDs for DB compat).
export type NodeType = 'small' | 'active' | 'notable' | 'keystone';

export type NodeTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface SkillNode {
  id: string;
  name: string;
  type: NodeType;
  tier: NodeTier;
  effect: string;
  desc: string;
  x: number;
  y: number;
  req?: readonly string[];
}

export type Tree = readonly SkillNode[];

export type TreeBundle = Readonly<Record<string, Tree>>;
