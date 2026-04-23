import {
  SEASONAL_TEMPLATES,
  isChallengeActive,
  activeChallenges,
  combinedChallengeEffects,
  type SeasonalChallenge,
  CRAWL_PASS_RULES,
  tierFromXp,
  xpRequiredForTier,
  progressIntoTier,
  freshCrawlPass,
  addCrawlPassXp,
  canClaimFreeTier,
  canClaimPremiumTier,
  claimFreeTier,
  claimPremiumTier,
  unlockPremium,
} from '../events';

describe('SEASONAL_TEMPLATES', () => {
  it('covers key class and venue events', () => {
    const ids = new Set(SEASONAL_TEMPLATES.map((t) => t.id));
    expect(ids.has('pub_crawl_week')).toBe(true);
    expect(ids.has('brewery_fest')).toBe(true);
    expect(ids.has('operators_month')).toBe(true);
  });

  it("no template uses the pre-reskin name 'Sober October'", () => {
    for (const t of SEASONAL_TEMPLATES) {
      expect(t.name.toLowerCase()).not.toContain('sober');
    }
  });
});

function makeChallenge(template: typeof SEASONAL_TEMPLATES[number], startsAt: string, endsAt: string): SeasonalChallenge {
  return { ...template, startsAt, endsAt };
}

describe('isChallengeActive', () => {
  const c = makeChallenge(SEASONAL_TEMPLATES[0]!, '2026-04-20T00:00:00Z', '2026-04-27T00:00:00Z');

  it('false before start', () => {
    expect(isChallengeActive(c, new Date('2026-04-19T23:00:00Z'))).toBe(false);
  });
  it('true during window', () => {
    expect(isChallengeActive(c, new Date('2026-04-23T12:00:00Z'))).toBe(true);
  });
  it('false after end', () => {
    expect(isChallengeActive(c, new Date('2026-04-28T00:00:00Z'))).toBe(false);
  });
});

describe('combinedChallengeEffects', () => {
  it('stacks XP multipliers multiplicatively', () => {
    const pubCrawl = makeChallenge(SEASONAL_TEMPLATES.find((t) => t.id === 'pub_crawl_week')!,
      '2026-04-20T00:00:00Z', '2026-04-27T00:00:00Z');
    const opsMonth = makeChallenge(SEASONAL_TEMPLATES.find((t) => t.id === 'operators_month')!,
      '2026-04-20T00:00:00Z', '2026-04-27T00:00:00Z');
    const effects = combinedChallengeEffects([pubCrawl, opsMonth], {
      barType: 'pub', classId: 'steady',
    });
    expect(effects.xpMultiplier).toBe(4); // 2 × 2
  });

  it('misses apply no bonus', () => {
    const pubCrawl = makeChallenge(SEASONAL_TEMPLATES.find((t: typeof SEASONAL_TEMPLATES[number]) => t.id === 'pub_crawl_week')!,
      '2026-04-20T00:00:00Z', '2026-04-27T00:00:00Z');
    const effects = combinedChallengeEffects([pubCrawl], {
      barType: 'dive', classId: 'brewer',
    });
    expect(effects.xpMultiplier).toBe(1);
  });

  it('accumulates exclusive cosmetic drops', () => {
    const fest = makeChallenge(SEASONAL_TEMPLATES.find((t: typeof SEASONAL_TEMPLATES[number]) => t.id === 'brewery_fest')!,
      '2026-04-20T00:00:00Z', '2026-04-27T00:00:00Z');
    const effects = combinedChallengeEffects([fest], {
      barType: 'brewery', classId: 'orchardist',
    });
    expect(effects.exclusiveCosmeticIds.length).toBeGreaterThan(0);
  });
});

describe('activeChallenges', () => {
  it('filters a list by now', () => {
    const active = makeChallenge(SEASONAL_TEMPLATES[0]!, '2026-04-20T00:00:00Z', '2026-04-27T00:00:00Z');
    const past = makeChallenge(SEASONAL_TEMPLATES[1]!, '2026-03-01T00:00:00Z', '2026-03-08T00:00:00Z');
    const list = activeChallenges([active, past], new Date('2026-04-23T00:00:00Z'));
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe(active.id);
  });
});

// ─── Crawl Pass ─────────────────────────────────────────────────────

describe('Crawl Pass tier math', () => {
  it('50 tiers, 10k XP each', () => {
    expect(CRAWL_PASS_RULES.TIER_COUNT).toBe(50);
    expect(CRAWL_PASS_RULES.XP_PER_TIER).toBe(10_000);
  });

  it('tierFromXp maps correctly', () => {
    expect(tierFromXp(0)).toBe(0);
    expect(tierFromXp(9_999)).toBe(0);
    expect(tierFromXp(10_000)).toBe(1);
    expect(tierFromXp(125_000)).toBe(12);
  });

  it('caps at TIER_COUNT', () => {
    expect(tierFromXp(10_000_000)).toBe(50);
  });

  it('xpRequiredForTier inverse', () => {
    expect(xpRequiredForTier(0)).toBe(0);
    expect(xpRequiredForTier(25)).toBe(250_000);
    expect(xpRequiredForTier(50)).toBe(500_000);
  });

  it('progressIntoTier computes fractional progress', () => {
    const p = progressIntoTier(55_500);
    expect(p.tier).toBe(5);
    expect(p.xpIntoTier).toBe(5_500);
    expect(p.xpToNext).toBe(4_500);
  });

  it('progress at max tier returns 0/0', () => {
    const p = progressIntoTier(600_000);
    expect(p.tier).toBe(50);
    expect(p.xpToNext).toBe(0);
  });
});

describe('CrawlPassState lifecycle', () => {
  it('fresh pass = zero state', () => {
    const s = freshCrawlPass('2026-apr');
    expect(s.xpEarned).toBe(0);
    expect(s.premiumUnlocked).toBe(false);
    expect(s.claimedFreeTiers).toEqual([]);
  });

  it('addCrawlPassXp accumulates', () => {
    let s = freshCrawlPass('2026-apr');
    s = addCrawlPassXp(s, 500);
    s = addCrawlPassXp(s, 2500);
    expect(s.xpEarned).toBe(3000);
  });

  it('canClaimFreeTier requires tier achieved + not claimed', () => {
    let s = freshCrawlPass('2026-apr');
    s = addCrawlPassXp(s, 25_000); // tier 2
    expect(canClaimFreeTier(s, 2)).toBe(true);
    expect(canClaimFreeTier(s, 5)).toBe(false);
    const after = claimFreeTier(s, 2).state;
    expect(canClaimFreeTier(after, 2)).toBe(false); // already claimed
  });

  it('premium tiers require unlockPremium', () => {
    let s = freshCrawlPass('2026-apr');
    s = addCrawlPassXp(s, 25_000);
    expect(canClaimPremiumTier(s, 2)).toBe(false);
    s = unlockPremium(s);
    expect(canClaimPremiumTier(s, 2)).toBe(true);
    const claimed = claimPremiumTier(s, 2);
    expect(claimed.track).toBe('premium');
  });

  it('claim throws when ineligible', () => {
    const s = freshCrawlPass('2026-apr');
    expect(() => claimFreeTier(s, 1)).toThrow();
    expect(() => claimPremiumTier(s, 1)).toThrow();
  });
});
