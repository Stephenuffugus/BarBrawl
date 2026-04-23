import type { ResistanceMark, VIPKey } from './types';
import { BAR_THEME_DAMAGE, GATING_BEGINS_AT_TIER, SURVIVAL_THRESHOLD } from './types';
import type { BarType } from '../types';

// Pure eligibility resolvers. Combat/inventory state lives elsewhere.

export interface CharacterGatingLoadout {
  equippedMarks: readonly ResistanceMark[];
  inventoryKeys: readonly VIPKey[];
  barMasteryTiers: Readonly<Record<BarType, number>>;
}

export interface SurvivalCheck {
  canEnter: boolean;
  reason: 'tier_below_gate' | 'has_resistance' | 'no_resistance' | 'weak_resistance';
  requiredMark?: { against: ResistanceMark['against']; minStrength: number };
}

/**
 * Can this character survive Tier-N content at a bar of the given theme?
 * Tiers below GATING_BEGINS_AT_TIER are ungated (Metroidvania "always visible,
 * soft difficulty below, hard-lock above" rule).
 */
export function canSurviveTier(
  loadout: CharacterGatingLoadout,
  barTheme: BarType,
  tier: number,
): SurvivalCheck {
  if (tier < GATING_BEGINS_AT_TIER) {
    return { canEnter: true, reason: 'tier_below_gate' };
  }
  const dmgType = BAR_THEME_DAMAGE[barTheme];
  const relevant = loadout.equippedMarks.filter((m) => m.against === dmgType);
  if (relevant.length === 0) {
    return {
      canEnter: false,
      reason: 'no_resistance',
      requiredMark: { against: dmgType, minStrength: SURVIVAL_THRESHOLD },
    };
  }
  const strong = relevant.some((m) => m.strength >= SURVIVAL_THRESHOLD);
  if (!strong) {
    return {
      canEnter: false,
      reason: 'weak_resistance',
      requiredMark: { against: dmgType, minStrength: SURVIVAL_THRESHOLD },
    };
  }
  return { canEnter: true, reason: 'has_resistance' };
}

export interface VIPCheck {
  canEnter: boolean;
  reason: 'has_key' | 'missing_key';
  requiredKeyTheme?: BarType;
}

/** Does this character have a key for a given bar's VIP room? */
export function canEnterVIPRoom(
  loadout: CharacterGatingLoadout,
  barTheme: BarType,
): VIPCheck {
  const has = loadout.inventoryKeys.some((k) => k.forBarTheme === barTheme);
  return has
    ? { canEnter: true, reason: 'has_key' }
    : { canEnter: false, reason: 'missing_key', requiredKeyTheme: barTheme };
}

/**
 * Bar-theme mastery gates (design doc §3.1.C): Tier 4+ bars of a theme
 * only render on the map after mastery Tier 3 (15 clears) of that theme.
 * Below that, the bar shows as grayed silhouette on the map.
 */
export const MASTERY_TIER_FOR_THEME_UNLOCK = 3;
export const CLEARS_FOR_MASTERY_TIER_3 = 15;

export function barThemeUnlocked(
  loadout: CharacterGatingLoadout,
  barTheme: BarType,
): boolean {
  const tier = loadout.barMasteryTiers[barTheme] ?? 0;
  return tier >= MASTERY_TIER_FOR_THEME_UNLOCK;
}
