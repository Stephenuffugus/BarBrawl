// Bar nomination + owner-claim flow. Spec §5.11.
//
// Two related but separate workflows:
//
// (A) Nomination: any user submits a real-world bar. We validate name +
//     coordinates + type. Server-side dedup against existing bars.bar
//     and bar_nominations rejects pop-ups already in the system.
//
// (B) Owner claim: a user asserts ownership of an EXISTING bar (or a
//     just-approved nomination). They submit evidence + a one-time
//     challenge token. The token is delivered out-of-band (email to a
//     domain matching the venue, postcard to the address, manual review)
//     and echoed back to verify possession. Status flow:
//       pending → verified → approved (admin)
//                          \→ rejected (admin)
//                          \→ expired (TTL)
//
// All functions here are pure data transforms + validators. Caller does
// the DB read/write and challenge dispatch.
//
// Coupled to: supabase/migrations/20260510000001 (bar_owner_claims) and
// the existing bar_nominations table from migration ...000002.

import { haversineMeters, type LatLng } from '../geo';

/* ─── Nomination ─────────────────────────────────────────────── */

export const BAR_TYPES = ['dive','pub','sports','cocktail','wine','brewery','nightclub'] as const;
export type BarType = typeof BAR_TYPES[number];

export interface NominationInput {
  barName: string;
  address: string;
  barType: string;
  location: LatLng;
  photoUrl?: string;
}

/**
 * Existing entry the new submission could be a duplicate of. Sourced from
 * either bars or bar_nominations. The dedup check uses name fuzz + 100m
 * proximity as a "same place" heuristic.
 */
export interface KnownPlace {
  id: string;
  name: string;
  location: LatLng;
  source: 'bar' | 'nomination';
}

export type NominationError =
  | 'bar_name_empty'
  | 'address_empty'
  | 'invalid_bar_type'
  | 'invalid_location'
  | 'duplicate';

export interface NominationDuplicate {
  ok: false;
  reason: 'duplicate';
  match: KnownPlace;
  distanceMeters: number;
}

export type NominationValidation =
  | { ok: true; normalized: NominationInput }
  | { ok: false; reason: Exclude<NominationError, 'duplicate'> }
  | NominationDuplicate;

/** Same-place radius for dedup. 100m matches the proximity rule. */
export const NOMINATION_DEDUP_RADIUS_METERS = 100;

/** Fuzzy name match cutoff — any pair with ≥0.7 similarity is "same name". */
export const NOMINATION_NAME_SIMILARITY = 0.7;

export function normalizeBarName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]+/g, '');
}

/**
 * Bigram Sørensen-Dice similarity. Cheap, dependency-free, good enough
 * for "Joe's Pub" vs "Joes Pub" vs "Joe's pub & grill".
 */
export function nameSimilarity(a: string, b: string): number {
  const aN = normalizeBarName(a);
  const bN = normalizeBarName(b);
  if (aN.length < 2 || bN.length < 2) return aN === bN ? 1 : 0;
  const aBigrams = bigrams(aN);
  const bBigrams = bigrams(bN);
  let intersection = 0;
  const bMap = new Map<string, number>();
  for (const g of bBigrams) bMap.set(g, (bMap.get(g) ?? 0) + 1);
  for (const g of aBigrams) {
    const remaining = bMap.get(g) ?? 0;
    if (remaining > 0) {
      intersection++;
      bMap.set(g, remaining - 1);
    }
  }
  return (2 * intersection) / (aBigrams.length + bBigrams.length);
}

function bigrams(s: string): readonly string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

export function validateNomination(
  input: NominationInput,
  existing: readonly KnownPlace[] = [],
): NominationValidation {
  if (!input.barName?.trim()) return { ok: false, reason: 'bar_name_empty' };
  if (!input.address?.trim()) return { ok: false, reason: 'address_empty' };
  if (!BAR_TYPES.includes(input.barType as BarType)) {
    return { ok: false, reason: 'invalid_bar_type' };
  }
  if (!isFiniteLatLng(input.location)) {
    return { ok: false, reason: 'invalid_location' };
  }

  // Dedup: walk the existing list once.
  for (const p of existing) {
    if (!isFiniteLatLng(p.location)) continue;
    const dist = haversineMeters(input.location, p.location);
    if (dist > NOMINATION_DEDUP_RADIUS_METERS) continue;
    const sim = nameSimilarity(input.barName, p.name);
    if (sim >= NOMINATION_NAME_SIMILARITY) {
      return { ok: false, reason: 'duplicate', match: p, distanceMeters: dist };
    }
  }

  return {
    ok: true,
    normalized: {
      ...input,
      barName: input.barName.trim(),
      address: input.address.trim(),
    },
  };
}

function isFiniteLatLng(loc: LatLng): boolean {
  return Number.isFinite(loc.lat) && Number.isFinite(loc.lng) &&
    loc.lat >= -90 && loc.lat <= 90 && loc.lng >= -180 && loc.lng <= 180;
}

/* ─── Owner claim ──────────────────────────────────────────── */

export type ChallengeMethod = 'email' | 'phone' | 'postcard' | 'manual';

export type ClaimStatus = 'pending' | 'verified' | 'approved' | 'rejected' | 'expired';

export interface ClaimInput {
  barId: string;
  claimantId: string;
  evidenceUrl?: string;
  evidenceText?: string;
  method: ChallengeMethod;
}

export type ClaimError =
  | 'missing_evidence'
  | 'invalid_method'
  | 'duplicate_pending';

export interface ClaimRecord {
  barId: string;
  claimantId: string;
  evidenceUrl?: string;
  evidenceText?: string;
  challengeMethod: ChallengeMethod;
  challengeToken: string;
  status: ClaimStatus;
  createdAtMs: number;
}

export type ValidateClaim =
  | { ok: true; claim: ClaimRecord }
  | { ok: false; reason: ClaimError };

export interface CreateClaimOptions {
  /** Token generator — production uses crypto.randomUUID(). */
  tokenGen: () => string;
  /** Clock — defaults to Date.now(). */
  now?: () => number;
  /** Existing in-flight claims for this bar by this claimant. */
  existingClaims?: readonly Pick<ClaimRecord, 'status'>[];
}

/** Produce a ClaimRecord ready to INSERT. Pure data shaping. */
export function createClaim(input: ClaimInput, opts: CreateClaimOptions): ValidateClaim {
  if (!input.evidenceUrl?.trim() && !input.evidenceText?.trim()) {
    return { ok: false, reason: 'missing_evidence' };
  }
  if (!(['email','phone','postcard','manual'] as const).includes(input.method)) {
    return { ok: false, reason: 'invalid_method' };
  }
  if (opts.existingClaims?.some((c) => c.status === 'pending' || c.status === 'verified')) {
    return { ok: false, reason: 'duplicate_pending' };
  }
  return {
    ok: true,
    claim: {
      barId: input.barId,
      claimantId: input.claimantId,
      ...(input.evidenceUrl ? { evidenceUrl: input.evidenceUrl.trim() } : {}),
      ...(input.evidenceText ? { evidenceText: input.evidenceText.trim() } : {}),
      challengeMethod: input.method,
      challengeToken: opts.tokenGen(),
      status: 'pending',
      createdAtMs: (opts.now ?? Date.now)(),
    },
  };
}

/**
 * State-machine transitions for a claim. Caller looks up the persisted
 * claim, calls one of these, and writes the result back.
 */
export function verifyClaim(
  claim: ClaimRecord,
  submittedToken: string,
  now: number = Date.now(),
): { ok: boolean; next: ClaimRecord; reason?: 'token_mismatch' | 'wrong_status' | 'expired' } {
  if (claim.status !== 'pending') {
    return { ok: false, next: claim, reason: 'wrong_status' };
  }
  if (now > claim.createdAtMs + CLAIM_TTL_MS) {
    return { ok: false, next: { ...claim, status: 'expired' }, reason: 'expired' };
  }
  if (claim.challengeToken !== submittedToken) {
    return { ok: false, next: claim, reason: 'token_mismatch' };
  }
  return { ok: true, next: { ...claim, status: 'verified' } };
}

export function approveClaim(claim: ClaimRecord): { ok: boolean; next: ClaimRecord; reason?: 'wrong_status' } {
  if (claim.status !== 'verified') return { ok: false, next: claim, reason: 'wrong_status' };
  return { ok: true, next: { ...claim, status: 'approved' } };
}

export function rejectClaim(claim: ClaimRecord): { ok: boolean; next: ClaimRecord; reason?: 'wrong_status' } {
  if (claim.status !== 'pending' && claim.status !== 'verified') {
    return { ok: false, next: claim, reason: 'wrong_status' };
  }
  return { ok: true, next: { ...claim, status: 'rejected' } };
}

/** 30 days. Long enough for postcard delivery + manual review. */
export const CLAIM_TTL_MS = 30 * 24 * 60 * 60 * 1000;
