import {
  RECIPES,
  tryCraft,
  availableRecipes,
  commitCraft,
} from '../consumables';
import { rollItem } from '../loot';
import type { Item } from '../loot';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

let nextItemId = 0;
const itemIdGen = () => `item_${++nextItemId}`;
beforeEach(() => { nextItemId = 0; });

function makeItems(
  count: number,
  opts: Parameters<typeof rollItem>[0]['rarityOverride'] extends infer R
    ? Partial<{ rarity: R; slot: 'weapon' | 'outfit' | 'footwear' | 'trinket' }>
    : never = {},
): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < count; i++) {
    out.push(rollItem({
      slot: opts.slot ?? 'weapon',
      barTier: 3,
      rarityOverride: opts.rarity ?? 'common',
      rng: seededRng(i + 1),
      itemIdGen,
    }));
  }
  return out;
}

describe('RECIPES', () => {
  it('has a recipe for every consumable in the catalog', () => {
    const recipeIds = new Set(RECIPES.map((r) => r.consumableId));
    const expected = ['small_brew', 'house_special', 'shot_of_courage',
      'iron_tonic', 'focus_vial', 'emergency_elixir', 'palette_cleanser'];
    for (const id of expected) {
      expect(recipeIds.has(id)).toBe(true);
    }
  });

  it('all recipes point at real consumables', () => {
    for (const r of RECIPES) {
      // emergency_elixir_alt is the key only; consumableId remains valid.
      expect(['small_brew', 'house_special', 'shot_of_courage',
              'iron_tonic', 'focus_vial', 'emergency_elixir',
              'palette_cleanser']).toContain(r.consumableId);
    }
  });
});

describe('tryCraft', () => {
  it('succeeds when inventory has enough of the right rarity', () => {
    const recipe = RECIPES.find((r) => r.consumableId === 'small_brew')!;
    const inv = makeItems(3, { rarity: 'common' });
    const res = tryCraft(recipe, inv);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.candidate.itemsToConsume.length).toBe(2);
    }
  });

  it('fails with clear reason when not enough items', () => {
    const recipe = RECIPES.find((r) => r.consumableId === 'house_special')!; // needs 3 uncommon
    const inv = makeItems(2, { rarity: 'uncommon' });
    const res = tryCraft(recipe, inv);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.reason).toBe('not_enough_items');
    }
  });

  it('respects slot filter', () => {
    const recipe = RECIPES.find((r) => r.consumableId === 'shot_of_courage')!; // 2 uncommon weapons
    const weaponInv = makeItems(3, { rarity: 'uncommon', slot: 'weapon' });
    const outfitInv = makeItems(3, { rarity: 'uncommon', slot: 'outfit' });
    expect(tryCraft(recipe, weaponInv).ok).toBe(true);
    expect(tryCraft(recipe, outfitInv).ok).toBe(false);
  });

  it('prefers lowest-ilvl items for consumption', () => {
    const recipe = RECIPES.find((r) => r.consumableId === 'small_brew')!;
    // Mix of ilvls.
    const items = [
      rollItem({ slot: 'weapon', barTier: 1, rarityOverride: 'common', rng: seededRng(1), itemIdGen }),
      rollItem({ slot: 'weapon', barTier: 6, rarityOverride: 'common', rng: seededRng(2), itemIdGen }),
      rollItem({ slot: 'weapon', barTier: 1, rarityOverride: 'common', rng: seededRng(3), itemIdGen }),
    ];
    const res = tryCraft(recipe, items);
    if (!res.ok) throw new Error('expected ok');
    // Candidate should pick the 2 lowest-ilvl items; tier-6 one preserved.
    const consumed = new Set(res.candidate.itemsToConsume);
    const survivor = items.find((i) => !consumed.has(i.id))!;
    const consumedItems = items.filter((i) => consumed.has(i.id));
    for (const c of consumedItems) {
      expect(c.ilvl).toBeLessThanOrEqual(survivor.ilvl);
    }
  });
});

describe('availableRecipes', () => {
  it('returns only currently-affordable recipes', () => {
    // 2 common items -> small_brew AND palette_cleanser are affordable;
    // everything else requires higher rarities.
    const inv = makeItems(2, { rarity: 'common' });
    const avail = availableRecipes(inv);
    const ids = new Set(avail.map((c) => c.consumable.id));
    expect(ids.has('small_brew')).toBe(true);
    expect(ids.has('house_special')).toBe(false);
  });
});

describe('commitCraft', () => {
  it('removes consumed items, returns the rest', () => {
    const recipe = RECIPES.find((r) => r.consumableId === 'small_brew')!;
    const inv = makeItems(5, { rarity: 'common' });
    const res = tryCraft(recipe, inv);
    if (!res.ok) throw new Error('expected ok');
    const committed = commitCraft(res.candidate, inv);
    expect(committed.remainingInventory.length).toBe(3);
    expect(committed.consumedItemIds.length).toBe(2);
    expect(committed.consumableId).toBe('small_brew');
  });

  it('does not double-consume an item if ingredient slots overlap', () => {
    const recipe = RECIPES.find((r) => r.consumableId === 'house_special')!;
    const inv = makeItems(3, { rarity: 'uncommon' });
    const res = tryCraft(recipe, inv);
    if (!res.ok) throw new Error('expected ok');
    expect(new Set(res.candidate.itemsToConsume).size).toBe(3);
  });
});
