// Bar room catalog + daily procgen — spec §5.4.
//
// "At midnight local time, the server picks 3-5 rooms from the bar's
// pool using a seed derived from (bar_id, date) — deterministic, so
// all players challenging the same bar that day get the same layout.
// The boss room is always last."
//
// Ported from docs/prototype/barbrawl-v6.jsx ROOMS_BY_TYPE.

import type { BarType } from '../types';

export interface RoomDef {
  name: string;
  modifier: string;
  enemies: number;
  icon: string;
  isBoss?: boolean;
}

export const ROOMS_BY_TYPE: Readonly<Record<BarType, readonly RoomDef[]>> = Object.freeze({
  // dive = Wild Meadow (keys are stable engine IDs; only names/icons reskinned)
  dive: [
    { name: 'Tangled Roots',    modifier: 'Enemies -10% SPD',         enemies: 1, icon: '🌱' },
    { name: 'Sunlit Clearing',  modifier: '+15% crit for everyone',    enemies: 2, icon: '☀️' },
    { name: 'Tumbleweed Patch', modifier: 'Random knockback',          enemies: 2, icon: '🌾' },
    { name: 'Thorn Thicket',    modifier: 'Tight space, +20% dmg all', enemies: 1, icon: '🌿' },
    { name: 'Hidden Hollow',    modifier: 'Surprise advantage',        enemies: 3, icon: '🍄' },
    { name: 'Heart of the Meadow', modifier: 'The wild makes its stand', enemies: 0, isBoss: true, icon: '🌻' },
  ],
  // pub = Cottage Garden
  pub: [
    { name: 'Herb Bed',         modifier: 'Cramped, +15% dmg',         enemies: 1, icon: '🌿' },
    { name: 'Sunny Patch',      modifier: 'Warm light, +10% HP',       enemies: 2, icon: '☀️' },
    { name: 'Trellis Walk',     modifier: 'Precision zone, +20% crit', enemies: 2, icon: '🪴' },
    { name: 'Wind Chimes',      modifier: 'Rhythm-based bonus',        enemies: 2, icon: '🎐' },
    { name: 'The Old Hedge',    modifier: 'The hedge has its keeper',  enemies: 0, isBoss: true, icon: '🌳' },
  ],
  // sports = Community Park
  sports: [
    { name: 'Picnic Lawn',      modifier: 'Distracted enemies -10% acc', enemies: 2, icon: '🧺' },
    { name: 'Muddy Trail',      modifier: 'Slippery ground, -5% SPD all', enemies: 2, icon: '🥾' },
    { name: 'Fountain Plaza',   modifier: 'Crowded, AoE bonus',         enemies: 3, icon: '⛲' },
    { name: 'Open Green',       modifier: 'Open space, +10% SPD',       enemies: 2, icon: '🌳' },
    { name: 'The Great Oak',    modifier: 'Guardian calls its saplings', enemies: 0, isBoss: true, icon: '🌳' },
  ],
  // cocktail = Rose Garden
  cocktail: [
    { name: 'Rose Arbor',       modifier: 'Status effects +1 turn',    enemies: 2, icon: '🌹' },
    { name: 'Secret Garden',    modifier: 'Hidden bonuses random',     enemies: 2, icon: '🌿' },
    { name: 'Thorn Maze',       modifier: 'Debuffs +25% effect',       enemies: 1, icon: '🥀' },
    { name: 'Royal Beds',       modifier: 'Elite enemies, better loot', enemies: 2, icon: '👑' },
    { name: 'The Rose Court',   modifier: 'The garden grows mid-fight', enemies: 0, isBoss: true, icon: '🌹' },
  ],
  // wine = Old Orchard
  wine: [
    { name: 'Blossom Row',      modifier: 'Slow turns, +20% skill dmg', enemies: 2, icon: '🌸' },
    { name: 'Root Cellar',      modifier: 'Dark, -10% acc for all',     enemies: 2, icon: '🕯️' },
    { name: 'Ancient Grove',    modifier: 'Buffs last +2 turns',        enemies: 1, icon: '🌳' },
    { name: 'The Eldest Tree',  modifier: 'Aged guardian, scales with turns', enemies: 0, isBoss: true, icon: '🌳' },
  ],
  // brewery = Greenhouse
  brewery: [
    { name: 'Seedling Trays',   modifier: 'Many sprouts underfoot',     enemies: 3, icon: '🌱' },
    { name: 'Humid Wing',       modifier: 'Hot + humid, -5% DEF all',   enemies: 2, icon: '💧' },
    { name: 'Cooling Room',     modifier: 'Cold slows, +10% SPD for movers', enemies: 2, icon: '❄️' },
    { name: 'Potting Benches',  modifier: 'Stacked pots, cover',        enemies: 2, icon: '🪴' },
    { name: 'Watering Lines',   modifier: 'Irrigation moves all',       enemies: 2, icon: '🚿' },
    { name: 'The Great Fern',   modifier: 'The greenhouse comes alive', enemies: 0, isBoss: true, icon: '🌿' },
  ],
  // nightclub = Moonlit Grove
  nightclub: [
    { name: 'Mossy Gate',       modifier: 'Warden enemies',            enemies: 2, icon: '🌙' },
    { name: 'Firefly Glade',    modifier: 'Flickering light, random miss', enemies: 3, icon: '✨' },
    { name: 'Whispering Reeds', modifier: 'Loud rush, skills cost +1 turn', enemies: 2, icon: '🌾' },
    { name: 'Sacred Pool',      modifier: 'High-level guardians',      enemies: 2, icon: '💧' },
    { name: 'Bramble Tunnel',   modifier: 'Tight, no dodge',           enemies: 1, icon: '🌿' },
    { name: 'Heart Tree',       modifier: 'Pulsing sap, rhythm matters', enemies: 2, icon: '🌳' },
    { name: 'The Grove Guardian', modifier: 'The grove answers its call (AoE)', enemies: 0, isBoss: true, icon: '🌳' },
  ],
});

/**
 * Deterministic PRNG seeded from (bar_id, date). Cheap LCG — matches the
 * style of the prototype. Determinism is the requirement; cryptographic
 * quality is not.
 */
function seedFromKeys(barId: string, dateKey: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (const s of [barId, dateKey]) {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h >>> 0;
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = items.slice();
  let state = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Generate today's 3-5 room sequence for a specific bar. Boss room is
 * always last. Determinism: same inputs → same output.
 *
 * @param dateKey YYYY-MM-DD local date string, e.g., '2026-04-23'.
 */
export function generateBarRun(
  barId: string,
  barType: BarType,
  dateKey: string,
): readonly RoomDef[] {
  const pool = ROOMS_BY_TYPE[barType] ?? ROOMS_BY_TYPE.dive;
  const normals = pool.filter((r) => !r.isBoss);
  const boss = pool.find((r) => r.isBoss);
  if (!boss) throw new Error(`Bar type ${barType} has no boss room`);
  const seed = seedFromKeys(barId, dateKey);
  // 3-5 rooms, deterministic from seed.
  const numRooms = 3 + (seed % 3);
  const shuffled = seededShuffle(normals, seed);
  const picked = shuffled.slice(0, Math.min(numRooms, normals.length));
  return Object.freeze([...picked, boss]);
}

/**
 * Helper for clients that just want today's date key in UTC.
 * Edge functions compute in local midnight per spec; this is the
 * default for tests and any UTC-based scheduling.
 */
export function todayDateKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
