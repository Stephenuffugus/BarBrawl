import {
  AFFIX_POOL,
  affixesEligible,
  ANOINTMENTS,
  ANOINTMENTS_BY_CLASS,
  anointmentsFor,
  ITEM_BASES,
  basesForSlot,
  rollItem,
  rollRarity,
  ilvlFromBarTier,
  RARITY_DROP_RATES,
  RARITY_ORDER,
  AFFIX_SLOTS_BY_RARITY,
  TIER_ILVL_GATES,
} from '../loot';
import { NODE_BY_ID } from '../trees';

// Seeded RNG — linear-congruential. Pure, deterministic for distribution tests.
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

let idCounter = 0;
const stableIdGen = () => `item_${idCounter++}`;
beforeEach(() => { idCounter = 0; });

describe('AFFIX_POOL', () => {
  it('contains 4 tiers per concept (20 concepts × 4 = 80 affixes)', () => {
    expect(AFFIX_POOL.length).toBe(80);
  });

  it('tier ilvl gates ascend strictly', () => {
    expect(TIER_ILVL_GATES[1]).toBeLessThan(TIER_ILVL_GATES[2]);
    expect(TIER_ILVL_GATES[2]).toBeLessThan(TIER_ILVL_GATES[3]);
    expect(TIER_ILVL_GATES[3]).toBeLessThan(TIER_ILVL_GATES[4]);
  });

  it('affixesEligible filters by slot and ilvl', () => {
    const low = affixesEligible({ slot: 'weapon', ilvl: 1 });
    const hi  = affixesEligible({ slot: 'weapon', ilvl: 80 });
    expect(hi.length).toBeGreaterThan(low.length);
    // At low ilvl, only T1 should be eligible.
    expect(low.every((a) => a.tier === 1)).toBe(true);
  });

  it('affixesEligible honors tag filter', () => {
    const pre = affixesEligible({ slot: 'weapon', ilvl: 80, tag: 'prefix' });
    expect(pre.every((a) => a.tag === 'prefix')).toBe(true);
  });
});

describe('ANOINTMENTS', () => {
  it('has at least 3 per class', () => {
    for (const [cls, pool] of Object.entries(ANOINTMENTS_BY_CLASS)) {
      if (pool.length < 3) throw new Error(`class ${cls} has ${pool.length} anointments`);
    }
  });

  it('references real skill-tree nodes', () => {
    for (const a of ANOINTMENTS) {
      if (!NODE_BY_ID.has(a.nodeRef)) {
        throw new Error(`anointment ${a.id} references unknown node ${a.nodeRef}`);
      }
    }
  });

  it('has unique IDs', () => {
    const ids = new Set(ANOINTMENTS.map((a) => a.id));
    expect(ids.size).toBe(ANOINTMENTS.length);
  });

  it('anointmentsFor returns class-matching pool', () => {
    const bouncer = anointmentsFor('brewer');
    expect(bouncer.every((a) => a.classId === 'brewer')).toBe(true);
  });
});

describe('ITEM_BASES', () => {
  it('covers all 4 active slots (mark pool intentionally empty)', () => {
    expect(basesForSlot('weapon').length).toBeGreaterThan(0);
    expect(basesForSlot('outfit').length).toBeGreaterThan(0);
    expect(basesForSlot('footwear').length).toBeGreaterThan(0);
    expect(basesForSlot('trinket').length).toBeGreaterThan(0);
  });

  it('has unique base IDs', () => {
    const ids = new Set(ITEM_BASES.map((b) => b.id));
    expect(ids.size).toBe(ITEM_BASES.length);
  });
});

describe('rollRarity', () => {
  it('returns a valid rarity', () => {
    const r = rollRarity(() => 0.5);
    expect(RARITY_ORDER).toContain(r);
  });

  it('common at low roll, legendary at very-high roll', () => {
    // 0 -> falls in first bucket (common).
    expect(rollRarity(() => 0)).toBe('common');
    // 0.999999 -> falls in last bucket (legendary).
    expect(rollRarity(() => 0.999999)).toBe('legendary');
  });

  it('drop rates approximate spec §5.9 over 100k rolls (±0.5%)', () => {
    const rng = seededRng(42);
    const tally: Record<string, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    const N = 100_000;
    for (let i = 0; i < N; i++) {
      tally[rollRarity(rng)]!++;
    }
    for (const r of RARITY_ORDER) {
      const actual = tally[r]! / N;
      const expected = RARITY_DROP_RATES[r];
      expect(Math.abs(actual - expected)).toBeLessThan(0.005);
    }
  });
});

describe('ilvlFromBarTier', () => {
  it('scales with tier', () => {
    const rng = () => 0;
    expect(ilvlFromBarTier(1, rng)).toBeLessThan(ilvlFromBarTier(3, rng));
    expect(ilvlFromBarTier(3, rng)).toBeLessThan(ilvlFromBarTier(6, rng));
  });
});

describe('rollItem', () => {
  it('produces a common item with 0 affixes', () => {
    const rng = seededRng(1);
    const it = rollItem({
      slot: 'weapon',
      barTier: 1,
      rarityOverride: 'common',
      rng,
      itemIdGen: stableIdGen,
    });
    expect(it.rarity).toBe('common');
    expect(it.prefixes.length + it.suffixes.length).toBe(0);
  });

  it('produces rarity-appropriate affix counts', () => {
    for (const rarity of RARITY_ORDER) {
      const rng = seededRng(rarity.length * 13 + 7);
      const it = rollItem({
        slot: 'weapon',
        barTier: 6,
        rarityOverride: rarity,
        rng,
        itemIdGen: stableIdGen,
      });
      const count = it.prefixes.length + it.suffixes.length;
      expect(count).toBeLessThanOrEqual(AFFIX_SLOTS_BY_RARITY[rarity]);
    }
  });

  it('legendary with classContext attaches an anointment', () => {
    const rng = seededRng(99);
    const it = rollItem({
      slot: 'weapon',
      barTier: 6,
      rarityOverride: 'legendary',
      classContext: 'brewer',
      rng,
      itemIdGen: stableIdGen,
    });
    expect(it.rarity).toBe('legendary');
    expect(it.anointment).toBeDefined();
    expect(it.anointment?.classId).toBe('brewer');
  });

  it('legendary without classContext has no anointment', () => {
    const rng = seededRng(100);
    const it = rollItem({
      slot: 'weapon',
      barTier: 6,
      rarityOverride: 'legendary',
      rng,
      itemIdGen: stableIdGen,
    });
    expect(it.anointment).toBeUndefined();
  });

  it('starts unbound (null boundToUserId)', () => {
    const rng = seededRng(3);
    const it = rollItem({
      slot: 'outfit',
      barTier: 3,
      rng,
      itemIdGen: stableIdGen,
    });
    expect(it.boundToUserId).toBeNull();
    expect(it.chainAssetId).toBeNull();
  });

  it('higher barTier → higher ilvl → more high-tier affix rolls over N items', () => {
    const LOW = [];
    const HI = [];
    for (let i = 0; i < 1000; i++) {
      LOW.push(rollItem({
        slot: 'weapon',
        barTier: 1,
        rarityOverride: 'epic',
        rng: seededRng(i * 3 + 1),
        itemIdGen: stableIdGen,
      }));
      HI.push(rollItem({
        slot: 'weapon',
        barTier: 6,
        rarityOverride: 'epic',
        rng: seededRng(i * 3 + 2),
        itemIdGen: stableIdGen,
      }));
    }
    const maxTierLow = Math.max(...LOW.flatMap((i) => [...i.prefixes, ...i.suffixes]).map((a) => a.tier));
    const maxTierHi  = Math.max(...HI .flatMap((i) => [...i.prefixes, ...i.suffixes]).map((a) => a.tier));
    expect(maxTierHi).toBeGreaterThanOrEqual(maxTierLow);
  });

  it('generates deterministic output from the same seed', () => {
    const a = rollItem({
      slot: 'weapon',
      barTier: 4,
      rarityOverride: 'rare',
      rng: seededRng(777),
      itemIdGen: () => 'fixed',
    });
    const b = rollItem({
      slot: 'weapon',
      barTier: 4,
      rarityOverride: 'rare',
      rng: seededRng(777),
      itemIdGen: () => 'fixed',
    });
    expect(a).toEqual(b);
  });

  it('never produces duplicate-concept affixes on a single item', () => {
    for (let seed = 0; seed < 200; seed++) {
      const it = rollItem({
        slot: 'weapon',
        barTier: 6,
        rarityOverride: 'epic',
        rng: seededRng(seed),
        itemIdGen: stableIdGen,
      });
      const concepts = [...it.prefixes, ...it.suffixes]
        .map((a) => a.affixId.replace(/_t\d+$/, ''));
      expect(new Set(concepts).size).toBe(concepts.length);
    }
  });
});
