// Monthly Crawl Pass — spec §5.10:
//   "Monthly Crawl Pass: Fortnite-style seasonal pass. 50 tiers. All
//    rewards are cosmetic. Earned XP tracks through normal play. ~$9.50
//    to unlock, returns more coins than it costs if completed."
//
// Pure XP-to-tier math. Purchase + premium-reward gating lives in the
// edge layer (RevenueCat receipt verification); this module knows only
// the public progression curve.
//
// NOTE: Per §3 ethics, Crawl Pass rewards MUST be cosmetic-only. This
// module does not encode rewards — that's a content-config concern
// — but the TIER_COUNT and XP_PER_TIER are the progression spine.

export const CRAWL_PASS_RULES = Object.freeze({
  TIER_COUNT: 50,
  /**
   * XP required per tier. Fixed 10,000 → 50 tiers = 500,000 XP for a
   * full-completion season. A casual player at ~2,000 XP/day completes
   * ~80% in a month; a dedicated player finishes.
   */
  XP_PER_TIER: 10_000,
});

export function tierFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0) {
    throw new RangeError(`xp must be >= 0, got ${xp}`);
  }
  const raw = Math.floor(xp / CRAWL_PASS_RULES.XP_PER_TIER);
  return Math.min(raw, CRAWL_PASS_RULES.TIER_COUNT);
}

export function xpRequiredForTier(tier: number): number {
  if (!Number.isInteger(tier) || tier < 0) {
    throw new RangeError(`tier must be >= 0 integer, got ${tier}`);
  }
  return tier * CRAWL_PASS_RULES.XP_PER_TIER;
}

export function progressIntoTier(xp: number): { tier: number; xpIntoTier: number; xpToNext: number } {
  const tier = tierFromXp(xp);
  if (tier >= CRAWL_PASS_RULES.TIER_COUNT) {
    return { tier: CRAWL_PASS_RULES.TIER_COUNT, xpIntoTier: 0, xpToNext: 0 };
  }
  const intoTier = xp - tier * CRAWL_PASS_RULES.XP_PER_TIER;
  return {
    tier,
    xpIntoTier: intoTier,
    xpToNext: CRAWL_PASS_RULES.XP_PER_TIER - intoTier,
  };
}

export interface CrawlPassState {
  seasonId: string;
  xpEarned: number;
  premiumUnlocked: boolean;
  claimedFreeTiers: readonly number[];
  claimedPremiumTiers: readonly number[];
}

export function freshCrawlPass(seasonId: string): CrawlPassState {
  return {
    seasonId,
    xpEarned: 0,
    premiumUnlocked: false,
    claimedFreeTiers: [],
    claimedPremiumTiers: [],
  };
}

export function addCrawlPassXp(state: CrawlPassState, xp: number): CrawlPassState {
  if (xp <= 0) return state;
  return { ...state, xpEarned: state.xpEarned + xp };
}

/**
 * Can this tier's free reward be claimed? Tier must be <= current tier
 * and not already claimed.
 */
export function canClaimFreeTier(state: CrawlPassState, tier: number): boolean {
  return tier <= tierFromXp(state.xpEarned) && !state.claimedFreeTiers.includes(tier);
}

export function canClaimPremiumTier(state: CrawlPassState, tier: number): boolean {
  if (!state.premiumUnlocked) return false;
  return tier <= tierFromXp(state.xpEarned) && !state.claimedPremiumTiers.includes(tier);
}

export interface ClaimResult {
  state: CrawlPassState;
  tierClaimed: number;
  track: 'free' | 'premium';
}

export function claimFreeTier(state: CrawlPassState, tier: number): ClaimResult {
  if (!canClaimFreeTier(state, tier)) {
    throw new Error(`Cannot claim free tier ${tier}`);
  }
  return {
    state: { ...state, claimedFreeTiers: [...state.claimedFreeTiers, tier] },
    tierClaimed: tier,
    track: 'free',
  };
}

export function claimPremiumTier(state: CrawlPassState, tier: number): ClaimResult {
  if (!canClaimPremiumTier(state, tier)) {
    throw new Error(`Cannot claim premium tier ${tier}`);
  }
  return {
    state: { ...state, claimedPremiumTiers: [...state.claimedPremiumTiers, tier] },
    tierClaimed: tier,
    track: 'premium',
  };
}

export function unlockPremium(state: CrawlPassState): CrawlPassState {
  if (state.premiumUnlocked) return state;
  return { ...state, premiumUnlocked: true };
}
