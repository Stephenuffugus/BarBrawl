// Consumable crafting — spec §5.8:
//   "Sources: daily login rewards, quest completion, random battle drops,
//    crafting (combine rare loot into consumables)."
//
// Each consumable has a recipe listing how many items of each (rarity,
// slot?) are needed. Crafting consumes those items and produces the
// consumable. Pure — caller persists the inventory/consumable deltas.

import type { Rarity, Item, ItemSlot } from '../loot/types';
import type { ConsumableDef } from './types';
import { getConsumable } from './catalog';

export interface RecipeIngredient {
  rarity: Rarity;
  /** If set, item must be from this slot. */
  slot?: ItemSlot;
  count: number;
}

export interface Recipe {
  consumableId: string;
  /** Human-readable hint — same as ConsumableDef.description otherwise. */
  label: string;
  ingredients: readonly RecipeIngredient[];
}

export const RECIPES: readonly Recipe[] = Object.freeze([
  {
    consumableId: 'small_brew',
    label: 'Combine 2 common items into a Small Brew.',
    ingredients: [{ rarity: 'common', count: 2 }],
  },
  {
    consumableId: 'house_special',
    label: 'Combine 3 uncommon items into a House Special.',
    ingredients: [{ rarity: 'uncommon', count: 3 }],
  },
  {
    consumableId: 'shot_of_courage',
    label: 'Combine 2 uncommon weapons into a Shot of Courage.',
    ingredients: [{ rarity: 'uncommon', slot: 'weapon', count: 2 }],
  },
  {
    consumableId: 'iron_tonic',
    label: 'Combine 2 uncommon outfits into an Iron Tonic.',
    ingredients: [{ rarity: 'uncommon', slot: 'outfit', count: 2 }],
  },
  {
    consumableId: 'focus_vial',
    label: 'Transmute 1 rare item into a Focus Vial.',
    ingredients: [{ rarity: 'rare', count: 1 }],
  },
  {
    consumableId: 'emergency_elixir',
    label: 'Distill 1 epic item (or 3 rare) into an Emergency Elixir.',
    ingredients: [{ rarity: 'epic', count: 1 }],
  },
  {
    // Alt recipe for the same consumable. RECIPE_BY_ID dedupes via _alt suffix.
    consumableId: 'emergency_elixir',
    label: 'Alt: Distill 3 rare items into an Emergency Elixir.',
    ingredients: [{ rarity: 'rare', count: 3 }],
  },
  {
    consumableId: 'palette_cleanser',
    label: 'Combine 2 common items into a Palette Cleanser.',
    ingredients: [{ rarity: 'common', count: 2 }],
  },
]);

export const RECIPE_BY_ID: Readonly<Record<string, Recipe>> = Object.freeze(
  RECIPES.reduce<Record<string, Recipe>>((acc, r) => {
    // Keyed by the recipe position (consumableId may repeat for alt recipes).
    const key = r.consumableId + (acc[r.consumableId] ? '_alt' : '');
    acc[key] = r;
    return acc;
  }, {}),
);

// ─── Recipe resolution ─────────────────────────────────────────────

export interface CraftCandidate {
  recipe: Recipe;
  consumable: ConsumableDef;
  itemsToConsume: readonly string[];
}

export interface CraftError {
  reason: 'not_enough_items' | 'unknown_recipe' | 'double_use';
  detail: string;
}

/**
 * Try to craft a recipe from the given inventory. Returns either the
 * candidate (with the specific item IDs to consume) or a reason.
 *
 * Selection picks the LOWEST-ilvl items first so players don't accidentally
 * grind up their best rares. Strategy is deliberate — UI should also show
 * a preview.
 */
export function tryCraft(
  recipe: Recipe,
  inventory: readonly Item[],
): { ok: true; candidate: CraftCandidate } | { ok: false; error: CraftError } {
  const used = new Set<string>();
  const toConsume: string[] = [];

  for (const ing of recipe.ingredients) {
    const pool = inventory
      .filter((it) => !used.has(it.id))
      .filter((it) => it.rarity === ing.rarity)
      .filter((it) => (ing.slot ? it.slot === ing.slot : true))
      // ilvl ascending, so worst items go first.
      .sort((a, b) => a.ilvl - b.ilvl);
    if (pool.length < ing.count) {
      return {
        ok: false,
        error: {
          reason: 'not_enough_items',
          detail: `Need ${ing.count} ${ing.rarity}${ing.slot ? ' ' + ing.slot : ''} items, have ${pool.length}.`,
        },
      };
    }
    for (let i = 0; i < ing.count; i++) {
      const pick = pool[i]!;
      used.add(pick.id);
      toConsume.push(pick.id);
    }
  }

  return {
    ok: true,
    candidate: {
      recipe,
      consumable: getConsumable(recipe.consumableId),
      itemsToConsume: toConsume,
    },
  };
}

/**
 * List all recipes the player can currently afford from their inventory.
 * Useful for crafting UI.
 */
export function availableRecipes(inventory: readonly Item[]): readonly CraftCandidate[] {
  const out: CraftCandidate[] = [];
  for (const r of RECIPES) {
    const res = tryCraft(r, inventory);
    if (res.ok) out.push(res.candidate);
  }
  return out;
}

/**
 * Execute a craft: returns the remaining inventory and the consumable ID
 * to add to the player's consumable stash (stored as +1 count).
 *
 * Caller handles DB writes. The returned inventory preserves non-consumed
 * items' order; consumed ones are removed.
 */
export interface CraftResult {
  consumableId: string;
  remainingInventory: readonly Item[];
  consumedItemIds: readonly string[];
}

export function commitCraft(
  candidate: CraftCandidate,
  inventory: readonly Item[],
): CraftResult {
  const consumed = new Set(candidate.itemsToConsume);
  return {
    consumableId: candidate.consumable.id,
    remainingInventory: inventory.filter((it) => !consumed.has(it.id)),
    consumedItemIds: candidate.itemsToConsume,
  };
}
