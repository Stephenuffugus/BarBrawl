import type {
  AffixDef,
  AffixTag,
  Item,
  Rarity,
  RollContext,
  RolledAffix,
  ItemSlot,
} from './types';
import { AFFIX_SLOTS_BY_RARITY, RARITY_DROP_RATES, RARITY_ORDER } from './types';
import { basesForSlot, ITEM_BASE_BY_ID } from './bases';
import { affixesEligible } from './affixes';
import { anointmentsFor } from './anointments';

function weightedPick<T extends { weight?: number }>(
  items: readonly T[],
  weightOf: (t: T) => number,
  rng: () => number,
): T {
  const total = items.reduce((s, it) => s + weightOf(it), 0);
  if (total <= 0 || items.length === 0) {
    throw new Error('weightedPick: empty or zero-weight pool');
  }
  let roll = rng() * total;
  for (const it of items) {
    roll -= weightOf(it);
    if (roll <= 0) return it;
  }
  // Floating-point residual fallback.
  return items[items.length - 1]!;
}

export function rollRarity(rng: () => number): Rarity {
  const roll = rng();
  let acc = 0;
  for (const r of RARITY_ORDER) {
    acc += RARITY_DROP_RATES[r];
    if (roll < acc) return r;
  }
  return 'common';
}

/** Convert bar tier (1-6) to item level. Higher bars drop higher ilvl. */
export function ilvlFromBarTier(barTier: number, rng: () => number): number {
  const base = Math.max(1, barTier) * 15;
  const jitter = Math.floor(rng() * 5);
  return base + jitter;
}

function pickAffix(
  slot: ItemSlot,
  tag: AffixTag,
  ilvl: number,
  excluded: Set<string>,
  rng: () => number,
): AffixDef | null {
  const eligible = affixesEligible({ slot, tag, ilvl }).filter(
    // Exclude same concept (prefix of same id root twice is not allowed).
    (a) => !excluded.has(conceptOf(a)),
  );
  if (eligible.length === 0) return null;
  return weightedPick(eligible, (a) => a.weight, rng);
}

function conceptOf(a: AffixDef): string {
  // e.g. "of_might_t3" -> "of_might"
  return a.id.replace(/_t\d+$/, '');
}

function rollExplicitAffixes(
  slot: ItemSlot,
  ilvl: number,
  count: number,
  rng: () => number,
): readonly RolledAffix[] {
  const excluded = new Set<string>();
  const rolled: RolledAffix[] = [];
  let prefixCount = 0;
  let suffixCount = 0;
  const maxPrefix = Math.ceil(count / 2);
  const maxSuffix = Math.ceil(count / 2);

  for (let i = 0; i < count; i++) {
    // Balance prefixes and suffixes: prefer underrepresented side, but allow
    // either if only one side has eligible rolls.
    let tag: AffixTag =
      prefixCount < suffixCount
        ? 'prefix'
        : suffixCount < prefixCount
          ? 'suffix'
          : rng() < 0.5 ? 'prefix' : 'suffix';

    if (tag === 'prefix' && prefixCount >= maxPrefix) tag = 'suffix';
    if (tag === 'suffix' && suffixCount >= maxSuffix) tag = 'prefix';

    let affix = pickAffix(slot, tag, ilvl, excluded, rng);
    if (!affix) {
      // Fall back to the other tag if one side is exhausted.
      const other: AffixTag = tag === 'prefix' ? 'suffix' : 'prefix';
      affix = pickAffix(slot, other, ilvl, excluded, rng);
      if (!affix) break;
      tag = other;
    }
    excluded.add(conceptOf(affix));
    rolled.push({
      affixId: affix.id,
      tag: affix.tag,
      tier: affix.tier,
      name: affix.name,
      effectText: affix.effectText,
      effect: affix.effect,
    });
    if (affix.tag === 'prefix') prefixCount++; else suffixCount++;
  }

  return rolled;
}

function composeDisplayName(
  baseName: string,
  prefixes: readonly RolledAffix[],
  suffixes: readonly RolledAffix[],
): string {
  const pre = prefixes.map((p) => p.name).join(' ');
  const suf = suffixes.map((s) => s.name).join(' ');
  return [pre, baseName, suf].filter(Boolean).join(' ').trim();
}

export function rollItem(ctx: RollContext): Item {
  const pool = basesForSlot(ctx.slot);
  if (pool.length === 0) {
    throw new RangeError(`No bases defined for slot: ${ctx.slot}`);
  }
  const base = pool[Math.floor(ctx.rng() * pool.length)]!;
  const rarity: Rarity = ctx.rarityOverride ?? rollRarity(ctx.rng);
  const ilvl = ilvlFromBarTier(ctx.barTier, ctx.rng);
  const affixCount = AFFIX_SLOTS_BY_RARITY[rarity];
  const rolled = rollExplicitAffixes(ctx.slot, ilvl, affixCount, ctx.rng);
  const prefixes = rolled.filter((a) => a.tag === 'prefix');
  const suffixes = rolled.filter((a) => a.tag === 'suffix');

  let anointment = undefined;
  if (rarity === 'legendary' && ctx.classContext) {
    const pool = anointmentsFor(ctx.classContext);
    if (pool.length > 0) {
      anointment = pool[Math.floor(ctx.rng() * pool.length)]!;
    }
  }

  const item: Item = {
    id: ctx.itemIdGen(),
    baseId: base.id,
    slot: base.slot,
    displayName: composeDisplayName(base.name, prefixes, suffixes),
    rarity,
    ilvl,
    implicitText: base.implicitText,
    implicit: base.implicit,
    prefixes,
    suffixes,
    ...(anointment ? { anointment } : {}),
    boundToUserId: null,
    chainAssetId: null,
  };
  return item;
}

// Re-export for consumers that only need the base lookup.
export { ITEM_BASE_BY_ID };
