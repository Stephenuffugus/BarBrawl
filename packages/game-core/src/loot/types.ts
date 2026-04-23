// Loot system type model. Pure data; the combat/inventory engine interprets
// effects. Design reference: docs/design/DESIGN_V1.md §2.

import type { ClassId, BarType } from '../types';

export type ItemSlot = 'weapon' | 'outfit' | 'footwear' | 'trinket' | 'mark';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: readonly Rarity[] = Object.freeze([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]);

// Drop rates from spec §5.9. Sum must equal 1.0.
export const RARITY_DROP_RATES: Readonly<Record<Rarity, number>> = Object.freeze({
  common: 0.60,
  uncommon: 0.27,
  rare: 0.09,
  epic: 0.03,
  legendary: 0.01,
});

// Explicit-affix slot count per rarity (design doc §2.1).
// Legendary's fixed class-anointment is separate and not counted here.
export const AFFIX_SLOTS_BY_RARITY: Readonly<Record<Rarity, number>> = Object.freeze({
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 3,
});

// Discriminated union of effect payloads. Keep narrow and additive; the
// combat/stat engine interprets these.
export type PctStatKind =
  | 'atk' | 'def' | 'hp' | 'spd' | 'luck' | 'crit' | 'dodge' | 'damage' | 'critDmg';

export type FlatStatKind = 'atk' | 'def' | 'hp' | 'spd' | 'luck';

export type EffectPayload =
  | { type: 'flatStat'; stat: FlatStatKind; value: number }
  | { type: 'pctStat'; stat: PctStatKind; value: number }
  | { type: 'critChance'; value: number }
  | { type: 'critMult'; value: number }
  | { type: 'lifesteal'; value: number }
  | { type: 'reflect'; value: number }
  | { type: 'dodge'; value: number }
  | { type: 'gold'; value: number }
  | { type: 'xp'; value: number }
  | { type: 'regen'; value: number }
  | { type: 'skillMult'; value: number }
  | { type: 'cooldown'; value: number }
  | { type: 'implicitUnarmed'; value: number }
  | { type: 'implicitReach'; value: number }
  | { type: 'implicitThrow'; value: number }
  | { type: 'implicitBleed'; value: number }
  | { type: 'implicitVariance'; value: number }
  | { type: 'implicitStun'; value: number }
  | { type: 'anointment'; nodeRef: string; description: string };

export interface ItemBase {
  id: string;
  slot: ItemSlot;
  name: string;
  implicitText: string;
  implicit: EffectPayload;
  category?: string;
}

export type AffixTag = 'prefix' | 'suffix';
export type AffixTier = 1 | 2 | 3 | 4;

export interface AffixDef {
  id: string;
  tag: AffixTag;
  tier: AffixTier;
  name: string;
  effectText: string;
  effect: EffectPayload;
  ilvlMin: number;
  weight: number;
  slotEligibility: readonly ItemSlot[];
}

export interface RolledAffix {
  affixId: string;
  tag: AffixTag;
  tier: AffixTier;
  name: string;
  effectText: string;
  effect: EffectPayload;
}

export interface AnointmentDef {
  id: string;
  classId: ClassId;
  name: string;
  effectText: string;
  nodeRef: string;
}

export interface Item {
  id: string;
  baseId: string;
  slot: ItemSlot;
  displayName: string;
  rarity: Rarity;
  ilvl: number;
  implicitText: string;
  implicit: EffectPayload;
  prefixes: readonly RolledAffix[];
  suffixes: readonly RolledAffix[];
  anointment?: AnointmentDef;
  boundToUserId: string | null;
  chainAssetId: string | null;
}

export interface RollContext {
  slot: ItemSlot;
  barTier: number;
  houseSpec?: BarType;
  classContext?: ClassId;
  rarityOverride?: Rarity;
  rng: () => number;
  itemIdGen: () => string;
}
