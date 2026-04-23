// Rhythm input classifier — spec §5.3.
//
//   "Marker slides left-to-right over ~1.2 seconds.
//    Green zone (40%-60% of bar): +50% damage (Good hit)
//    Gold zone (47%-53% of bar): +100% damage (PERFECT)
//    Outside green zone: 50% damage (miss timing)"
//
//   "Rhythm is optional — if they don't tap, it auto-resolves as a
//    timing miss. Accessibility is preserved; skill expression is
//    rewarded."
//
//   "The AFK resolver uses the same damage formulas but treats every
//    rhythm input as 'Ok' (100% damage)."
//
// So: a TAP in gold zone = perfect, tap in green = good, tap elsewhere
// = miss, no-tap-rhythm-active = miss, AFK/auto mode = ok.

import type { RhythmQuality } from './damage';

export const RHYTHM_WINDOW_MS = 1200;

export const RHYTHM_ZONES = Object.freeze({
  /** Perfect (gold) zone — hit anywhere here for 2.0x damage. */
  PERFECT_MIN: 0.47,
  PERFECT_MAX: 0.53,
  /** Good (green) zone — hit anywhere here for 1.5x damage. */
  GOOD_MIN: 0.40,
  GOOD_MAX: 0.60,
});

export interface RhythmResult {
  quality: RhythmQuality;
  /** Normalized tap position in [0, 1], or null for no tap / AFK. */
  position: number | null;
  /** Deviation from the center of the perfect zone, in ms. Positive = late. */
  deviationMs: number | null;
}

/**
 * Classify a player's rhythm tap.
 *
 * @param tapMs  Time of tap in milliseconds from the start of the rhythm
 *               window. `null` = player did not tap (rhythm input skipped).
 * @param isAfk  True if resolving a defender / auto-fight turn — always 'ok'.
 * @param windowMs Length of the full rhythm window. Default 1200ms.
 */
export function classifyRhythmTap(
  tapMs: number | null,
  isAfk: boolean = false,
  windowMs: number = RHYTHM_WINDOW_MS,
): RhythmResult {
  if (isAfk) {
    return { quality: 'ok', position: null, deviationMs: null };
  }
  if (tapMs === null) {
    // Active player who didn't tap: miss per spec "auto-resolves as a
    // timing miss". ok is reserved for AFK.
    return { quality: 'miss', position: null, deviationMs: null };
  }
  if (!Number.isFinite(tapMs) || tapMs < 0 || tapMs > windowMs) {
    // Out-of-window tap — treat as miss.
    return { quality: 'miss', position: tapMs / windowMs, deviationMs: null };
  }
  const pos = tapMs / windowMs;
  const centerMs = 0.5 * windowMs;
  const deviation = tapMs - centerMs;
  let quality: RhythmQuality;
  if (pos >= RHYTHM_ZONES.PERFECT_MIN && pos <= RHYTHM_ZONES.PERFECT_MAX) {
    quality = 'perfect';
  } else if (pos >= RHYTHM_ZONES.GOOD_MIN && pos <= RHYTHM_ZONES.GOOD_MAX) {
    quality = 'good';
  } else {
    quality = 'miss';
  }
  return { quality, position: pos, deviationMs: deviation };
}

/**
 * Lenience modifier. Given a skill that grants extra rhythm lenience
 * (e.g. a passive that "widens the perfect window"), return adjusted
 * zone boundaries. Keeps the core function above pure and simple.
 */
export interface LenienceAdjusted {
  perfectMin: number;
  perfectMax: number;
  goodMin: number;
  goodMax: number;
}

export function adjustZones(extraLeniencePct: number = 0): LenienceAdjusted {
  const half = Math.max(0, Math.min(0.5, extraLeniencePct));
  return {
    perfectMin: Math.max(0, RHYTHM_ZONES.PERFECT_MIN - half / 2),
    perfectMax: Math.min(1, RHYTHM_ZONES.PERFECT_MAX + half / 2),
    goodMin: Math.max(0, RHYTHM_ZONES.GOOD_MIN - half / 2),
    goodMax: Math.min(1, RHYTHM_ZONES.GOOD_MAX + half / 2),
  };
}

export function classifyWithLenience(
  tapMs: number | null,
  extraLeniencePct: number,
  windowMs: number = RHYTHM_WINDOW_MS,
): RhythmResult {
  if (tapMs === null) {
    return { quality: 'miss', position: null, deviationMs: null };
  }
  if (!Number.isFinite(tapMs) || tapMs < 0 || tapMs > windowMs) {
    return { quality: 'miss', position: tapMs / windowMs, deviationMs: null };
  }
  const z = adjustZones(extraLeniencePct);
  const pos = tapMs / windowMs;
  const centerMs = 0.5 * windowMs;
  let quality: RhythmQuality;
  if (pos >= z.perfectMin && pos <= z.perfectMax) quality = 'perfect';
  else if (pos >= z.goodMin && pos <= z.goodMax) quality = 'good';
  else quality = 'miss';
  return { quality, position: pos, deviationMs: tapMs - centerMs };
}
