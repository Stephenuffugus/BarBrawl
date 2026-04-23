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
  dive: [
    { name: 'Sticky Floor',     modifier: 'Enemies -10% SPD',         enemies: 1, icon: '🍺' },
    { name: 'Dart Corner',      modifier: '+15% crit for everyone',    enemies: 2, icon: '🎯' },
    { name: 'Pool Table',       modifier: 'Random knockback',          enemies: 2, icon: '🎱' },
    { name: 'Bathroom Brawl',   modifier: 'Tight space, +20% dmg all', enemies: 1, icon: '🚽' },
    { name: 'Back Alley',       modifier: 'Surprise attack advantage', enemies: 3, icon: '🗑️' },
    { name: 'Boss: Main Bar',   modifier: 'All-out final fight',       enemies: 0, isBoss: true, icon: '💀' },
  ],
  pub: [
    { name: 'Snug',             modifier: 'Cramped, +15% dmg',         enemies: 1, icon: '🪑' },
    { name: 'Fireplace',        modifier: 'Warm buffs, +10% HP',       enemies: 2, icon: '🔥' },
    { name: 'Dart Board',       modifier: 'Precision zone, +20% crit', enemies: 2, icon: '🎯' },
    { name: 'Trad Music Corner',modifier: 'Rhythm-based bonus',        enemies: 2, icon: '🎻' },
    { name: 'Boss: The Bar',    modifier: 'Showdown at the bar',       enemies: 0, isBoss: true, icon: '💀' },
  ],
  sports: [
    { name: 'TV Corner',        modifier: 'Distracted enemies -10% acc', enemies: 2, icon: '📺' },
    { name: 'Wing Station',     modifier: 'Greasy floor, -5% SPD all',  enemies: 2, icon: '🍗' },
    { name: 'Bar',              modifier: 'Crowded, AoE bonus',         enemies: 3, icon: '🍻' },
    { name: 'Patio',            modifier: 'Open space, +10% SPD',       enemies: 2, icon: '☀️' },
    { name: "Boss: Owner's Booth", modifier: 'Boss has entourage',      enemies: 0, isBoss: true, icon: '💀' },
  ],
  cocktail: [
    { name: 'Main Bar',         modifier: 'Status effects +1 turn',    enemies: 2, icon: '🍸' },
    { name: 'Speakeasy Room',   modifier: 'Hidden bonuses random',     enemies: 2, icon: '🚪' },
    { name: 'Tasting Corner',   modifier: 'Debuffs +25% effect',       enemies: 1, icon: '🥃' },
    { name: 'VIP Booth',        modifier: 'Elite enemies, better loot', enemies: 2, icon: '💎' },
    { name: 'Boss: The Lounge', modifier: 'Boss crafts drinks mid-fight', enemies: 0, isBoss: true, icon: '💀' },
  ],
  wine: [
    { name: 'Tasting Bar',      modifier: 'Slow turns, +20% skill dmg', enemies: 2, icon: '🍷' },
    { name: 'Cellar',           modifier: 'Dark, -10% acc for all',     enemies: 2, icon: '🕯️' },
    { name: 'Reserve Vault',    modifier: 'Buffs last +2 turns',        enemies: 1, icon: '🔐' },
    { name: 'Boss: Grand Cellar', modifier: 'Aged boss, scales with turns', enemies: 0, isBoss: true, icon: '💀' },
  ],
  brewery: [
    { name: 'Taproom',          modifier: 'Sample enemies, many regulars', enemies: 3, icon: '🍺' },
    { name: 'Brewing Floor',    modifier: 'Hot + humid, -5% DEF all',   enemies: 2, icon: '🌡️' },
    { name: 'Cold Storage',     modifier: 'Cold slows, +10% SPD for movers', enemies: 2, icon: '❄️' },
    { name: 'Barrel Room',      modifier: 'Stacked barrels, cover',    enemies: 2, icon: '🛢️' },
    { name: 'Bottling Line',    modifier: 'Conveyor moves all',        enemies: 2, icon: '⚙️' },
    { name: "Boss: Brewmaster's Office", modifier: 'Boss + 2 senior brewers', enemies: 0, isBoss: true, icon: '💀' },
  ],
  nightclub: [
    { name: 'Entry Line',       modifier: 'Bouncer enemies',           enemies: 2, icon: '🚪' },
    { name: 'Dance Floor',      modifier: 'Strobe, random miss chance', enemies: 3, icon: '🪩' },
    { name: 'Bar',              modifier: 'Loud, skills cost +1 turn', enemies: 2, icon: '🍾' },
    { name: 'VIP Section',      modifier: 'High-level defenders',      enemies: 2, icon: '💎' },
    { name: 'Bathroom Fight',   modifier: 'Tight, no dodge',           enemies: 1, icon: '🚽' },
    { name: 'DJ Booth',         modifier: 'Bass waves, rhythm matters', enemies: 2, icon: '🎧' },
    { name: 'Boss: DJ Booth Top', modifier: 'Boss drops beats (AoE)',  enemies: 0, isBoss: true, icon: '💀' },
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
