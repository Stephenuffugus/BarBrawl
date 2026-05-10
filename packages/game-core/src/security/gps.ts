// GPS-spoof heuristics. Browser geolocation is easy to fake — these
// scoring rules surface anomalies. Caller decides whether to reject the
// fix outright, downgrade to a "challenge me" state, or just log.
//
// Heuristics implemented (cheap, deterministic, no extra deps):
//   1. Speed-of-travel: distance/Δt vs realistic ceiling (default 200 m/s
//      catches everything short of an aeroplane at street level).
//   2. Teleport: any single jump > TELEPORT_METERS regardless of Δt.
//   3. Accuracy radius: low-quality fixes (>200m radius) get flagged.
//   4. Timestamp sanity: future-dated or stale fixes.
//
// Spec §10 — geo cheating is the #1 attack vector for a location-based
// game. Stack these with server-side checks (bar proximity, daily-clear
// counter) before awarding rewards.

import { haversineMeters, type LatLng } from '../geo';

export interface GpsFix {
  lat: number;
  lng: number;
  /** Reported accuracy radius in meters (lower = better). Optional. */
  accuracyMeters?: number;
  /** Reported timestamp from the device (epoch ms). */
  timestampMs: number;
}

export interface GpsThresholds {
  /** Max ground speed before flagging. Default 200 m/s = 720 km/h.
   *  Above commercial-aviation cruise → impossible at street level. */
  maxMetersPerSecond: number;
  /** Single-jump distance that's "obviously teleporting" regardless of Δt. */
  teleportMeters: number;
  /** Accuracy radius above which the fix is "low confidence". */
  maxAccuracyMeters: number;
  /** How far ahead of server clock a device timestamp can be. */
  maxFutureSkewMs: number;
  /** How stale a fix can be before it's rejected. */
  maxStaleMs: number;
}

export const DEFAULT_GPS_THRESHOLDS: GpsThresholds = {
  maxMetersPerSecond: 200,
  teleportMeters: 5000,
  maxAccuracyMeters: 200,
  maxFutureSkewMs: 30 * 1000,
  maxStaleMs: 60 * 1000,
};

export type GpsFlag =
  | 'speed_exceeded'
  | 'teleport'
  | 'low_accuracy'
  | 'future_timestamp'
  | 'stale_timestamp'
  | 'invalid_coords';

export interface GpsScore {
  ok: boolean;
  flags: readonly GpsFlag[];
  /** 0 = normal, 1 = highly suspicious. Used by callers for graded response. */
  suspicion: number;
}

function isFiniteCoord(loc: LatLng): boolean {
  return Number.isFinite(loc.lat) && Number.isFinite(loc.lng) &&
    loc.lat >= -90 && loc.lat <= 90 && loc.lng >= -180 && loc.lng <= 180;
}

export interface ScoreOptions {
  /** Server clock — defaults to Date.now(). */
  now?: () => number;
  thresholds?: Partial<GpsThresholds>;
  /** The previous accepted fix from this user, if any. */
  previous?: GpsFix;
}

/**
 * Score a single GPS fix in context. Pure — caller passes the previous
 * fix from their session/db. Suspicion is a sum of weighted flag costs:
 *   teleport = 0.6, speed = 0.5, low_accuracy = 0.2,
 *   stale = 0.3, future = 0.4, invalid_coords = 1.0.
 */
export function scoreFix(fix: GpsFix, opts: ScoreOptions = {}): GpsScore {
  const now = (opts.now ?? Date.now)();
  const t: GpsThresholds = { ...DEFAULT_GPS_THRESHOLDS, ...opts.thresholds };
  const flags: GpsFlag[] = [];
  let suspicion = 0;

  if (!isFiniteCoord(fix)) {
    return { ok: false, flags: ['invalid_coords'], suspicion: 1 };
  }

  if (fix.timestampMs > now + t.maxFutureSkewMs) {
    flags.push('future_timestamp');
    suspicion += 0.4;
  }
  if (fix.timestampMs < now - t.maxStaleMs) {
    flags.push('stale_timestamp');
    suspicion += 0.3;
  }
  if (fix.accuracyMeters !== undefined && fix.accuracyMeters > t.maxAccuracyMeters) {
    flags.push('low_accuracy');
    suspicion += 0.2;
  }

  if (opts.previous && isFiniteCoord(opts.previous)) {
    const meters = haversineMeters(fix, opts.previous);
    const dtSec = Math.max(0.001, (fix.timestampMs - opts.previous.timestampMs) / 1000);
    if (meters > t.teleportMeters) {
      flags.push('teleport');
      suspicion += 0.6;
    } else if (meters / dtSec > t.maxMetersPerSecond) {
      flags.push('speed_exceeded');
      suspicion += 0.5;
    }
  }

  return {
    ok: suspicion < 0.5 && !flags.includes('invalid_coords'),
    flags,
    suspicion: Math.min(1, suspicion),
  };
}

/**
 * Sliding window check: feed the last N fixes from the user, get an
 * aggregate score. Useful for "consistently glitchy" detection that a
 * single fix would miss.
 */
export function scoreWindow(
  fixes: readonly GpsFix[],
  opts: Omit<ScoreOptions, 'previous'> = {},
): GpsScore {
  if (fixes.length === 0) return { ok: true, flags: [], suspicion: 0 };
  const flags = new Set<GpsFlag>();
  let totalSuspicion = 0;

  let prev = fixes[0]!;
  const first = scoreFix(prev, opts);
  for (const f of first.flags) flags.add(f);
  totalSuspicion += first.suspicion;

  for (let i = 1; i < fixes.length; i++) {
    const fix = fixes[i]!;
    const score = scoreFix(fix, { ...opts, previous: prev });
    for (const f of score.flags) flags.add(f);
    totalSuspicion += score.suspicion;
    prev = fix;
  }

  const avg = totalSuspicion / fixes.length;
  return {
    ok: avg < 0.4 && !flags.has('invalid_coords'),
    flags: [...flags],
    suspicion: Math.min(1, avg),
  };
}
