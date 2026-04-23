// Public surface of @barbrawl/game-core.

export * from './types';
export { CLASSES, CLASS_BY_ID, getClass } from './classes';
export { TREES, ALL_TREE_IDS, NODE_BY_ID, getTree } from './trees';
export { makeTree } from './trees/tree-factory';
export {
  computeDamage,
  RHYTHM_MULTIPLIER,
  DEFAULT_CRIT_MULTIPLIER,
  type DamageInput,
  type DamageResult,
  type RhythmQuality,
} from './math/damage';
export {
  LEVEL_CAP,
  xpToNext,
  totalXpToReach,
  gainsForLevels,
  applyXp,
  type LevelGains,
  type ProgressState,
  type ProgressResult,
} from './math/xp';
export * as Loot from './loot';
export * as Gating from './gating';
export * as Combat from './combat';
export * as Consumables from './consumables';
export * as Progression from './progression';
export * as Bars from './bars';
export * as Events from './events';
export * as Geo from './geo';
export * as Social from './social';
export {
  createLevel1Character,
  createStarterRoster,
  toRuntime,
  type NewCharacterRow,
  type CharacterRuntime,
  type CreateOptions,
} from './character';
