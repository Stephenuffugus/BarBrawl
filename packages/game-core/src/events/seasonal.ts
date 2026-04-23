// Seasonal challenges — spec §5.10:
//   "Pub Crawl Week (2× XP at Irish Pubs), Craft Beer Festival (breweries
//    drop exclusive cosmetics), Sober October (2× XP for Steady class)."
//
// Spec's class references use old names (Steady); we translate to the
// current reskin (Operator) — DB IDs preserved.

import type { BarType, ClassId } from '../types';

export type SeasonalModifier =
  | { kind: 'xp_multiplier_by_bar_type'; barType: BarType; multiplier: number }
  | { kind: 'xp_multiplier_by_class'; classId: ClassId; multiplier: number }
  | { kind: 'exclusive_cosmetic_drops'; barType: BarType; cosmeticIds: readonly string[] }
  | { kind: 'gold_multiplier'; multiplier: number };

export interface SeasonalChallenge {
  id: string;
  name: string;
  description: string;
  /** Wall-clock ISO start/end. */
  startsAt: string;
  endsAt: string;
  modifier: SeasonalModifier;
}

/**
 * Catalog of known seasonal templates. Actual active instances are
 * minted at scheduling time with specific dates.
 */
export const SEASONAL_TEMPLATES: readonly Omit<SeasonalChallenge, 'startsAt' | 'endsAt'>[] = Object.freeze([
  {
    id: 'pub_crawl_week',
    name: 'Pub Crawl Week',
    description: '2× XP at Irish pubs.',
    modifier: { kind: 'xp_multiplier_by_bar_type', barType: 'pub', multiplier: 2 },
  },
  {
    id: 'brewery_fest',
    name: 'Brewery Fest',
    description: 'Breweries drop exclusive cosmetics.',
    modifier: {
      kind: 'exclusive_cosmetic_drops',
      barType: 'brewery',
      cosmeticIds: ['cos_brewer_mug_frame', 'cos_hoppy_badge', 'cos_beer_foam_pfp'],
    },
  },
  {
    id: 'operators_month',
    name: "Operator's Month",
    // Spec §5.10 originally used "Sober October" + "Steady class" naming. Renamed
    // per the class reskin decision — mechanics unchanged.
    description: '2× XP for The Operator (all venues).',
    modifier: { kind: 'xp_multiplier_by_class', classId: 'steady', multiplier: 2 },
  },
  {
    id: 'wine_weekend',
    name: 'Wine Weekend',
    description: 'Double gold at wine bars.',
    modifier: { kind: 'xp_multiplier_by_bar_type', barType: 'wine', multiplier: 2 },
  },
  {
    id: 'neon_nights',
    name: 'Neon Nights',
    description: '2× XP at nightclubs.',
    modifier: { kind: 'xp_multiplier_by_bar_type', barType: 'nightclub', multiplier: 2 },
  },
  {
    id: 'bouncer_week',
    name: 'Bouncer Week',
    description: '2× XP for The Bouncer.',
    modifier: { kind: 'xp_multiplier_by_class', classId: 'brewer', multiplier: 2 },
  },
  {
    id: 'gamblers_night',
    name: "Gambler's Night",
    description: '2× gold everywhere (Gambler-themed event).',
    modifier: { kind: 'gold_multiplier', multiplier: 2 },
  },
]);

/** Is a challenge currently active? */
export function isChallengeActive(c: SeasonalChallenge, now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= new Date(c.startsAt).getTime() && t <= new Date(c.endsAt).getTime();
}

/** Filter a list of challenges down to those currently active. */
export function activeChallenges(
  all: readonly SeasonalChallenge[],
  now: Date = new Date(),
): readonly SeasonalChallenge[] {
  return all.filter((c) => isChallengeActive(c, now));
}

/**
 * Compute the combined multipliers from a set of active challenges
 * against a specific context. Multipliers compound multiplicatively
 * so stacking two 2x events = 4x.
 */
export interface ChallengeContext {
  barType: BarType;
  classId: ClassId;
}

export interface CombinedMultipliers {
  xpMultiplier: number;
  goldMultiplier: number;
  exclusiveCosmeticIds: readonly string[];
}

export function combinedChallengeEffects(
  challenges: readonly SeasonalChallenge[],
  ctx: ChallengeContext,
): CombinedMultipliers {
  let xp = 1;
  let gold = 1;
  const cosmetics: string[] = [];
  for (const c of challenges) {
    const m = c.modifier;
    switch (m.kind) {
      case 'xp_multiplier_by_bar_type':
        if (m.barType === ctx.barType) xp *= m.multiplier;
        break;
      case 'xp_multiplier_by_class':
        if (m.classId === ctx.classId) xp *= m.multiplier;
        break;
      case 'gold_multiplier':
        gold *= m.multiplier;
        break;
      case 'exclusive_cosmetic_drops':
        if (m.barType === ctx.barType) cosmetics.push(...m.cosmeticIds);
        break;
    }
  }
  return { xpMultiplier: xp, goldMultiplier: gold, exclusiveCosmeticIds: cosmetics };
}
