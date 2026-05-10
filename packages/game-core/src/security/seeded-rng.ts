// Seeded RNG. Mulberry32 — fast, well-distributed, deterministic, 32-bit
// state, public domain. Same seed → same stream on every runtime.
//
// Used by the battle validator (re-derive a battle from its stored seed)
// and by anywhere else we need replayable randomness server-side.

function hashStringToInt(s: string): number {
  let h = 2166136261 >>> 0; // FNV-1a 32-bit offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Returns a (() => number) RNG in [0,1). Accepts a string seed. */
export function seededRng(seed: string | number): () => number {
  let a = typeof seed === 'string' ? hashStringToInt(seed) : (seed >>> 0);
  return function mulberry32(): number {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
