// HMAC-SHA256 request signing.
//
// Runs in browser, Node 20+, and Deno via WebCrypto (globalThis.crypto.subtle).
// No third-party deps. The same signed envelope verifies on every runtime,
// which is what we need: client signs, edge function verifies.
//
// Signing surface = `${method}\n${path}\n${ts}\n${nonce}\n${bodyHash}`.
// bodyHash is sha256 of the raw request body (or empty string for GET).
//
// Verifier checks:
//   1. Signature matches.            (HMAC)
//   2. Timestamp within skew window. (replay window)
//   3. Nonce hasn't been seen.       (caller-provided NonceStore)
//
// Spec §10 ("server-authoritative, anti-cheat") — every state-changing
// edge function MUST call verifySignedRequest.

const SUBTLE: SubtleCrypto = (() => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error('WebCrypto unavailable; require Node 20+, modern browser, or Deno.');
  }
  return c.subtle;
})();

const TEXT_ENCODER = new TextEncoder();

/** Default replay window — 5 minutes either side of server clock. */
export const DEFAULT_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

export interface SignedEnvelope {
  /** ISO-8601 timestamp the client signed at. */
  ts: string;
  /** Random per-request nonce (uuid v4 or any opaque string). */
  nonce: string;
  /** base64url HMAC signature. */
  sig: string;
}

export interface SignInput {
  method: string;
  path: string;
  body: string;
  ts: string;
  nonce: string;
}

export interface VerifyInput extends SignInput {
  sig: string;
}

/* ─── primitives ─────────────────────────────────────────────────── */

async function importKey(secret: string): Promise<CryptoKey> {
  return SUBTLE.importKey(
    'raw',
    TEXT_ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!);
  // btoa is available in Node 20+, browsers, Deno.
  const b64 = (globalThis as { btoa?: (s: string) => string }).btoa
    ? (globalThis as { btoa: (s: string) => string }).btoa(bin)
    : Buffer.from(arr).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  if ((globalThis as { atob?: (s: string) => string }).atob) {
    const bin = (globalThis as { atob: (s: string) => string }).atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/** Constant-time equality for two base64url strings of the same length. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === 'string' ? TEXT_ENCODER.encode(data) : data;
  const digest = await SUBTLE.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i]!.toString(16).padStart(2, '0');
  return hex;
}

async function bodyHash(body: string): Promise<string> {
  return body.length === 0 ? '' : sha256Hex(body);
}

function canonicalString(input: SignInput, bh: string): string {
  return `${input.method.toUpperCase()}\n${input.path}\n${input.ts}\n${input.nonce}\n${bh}`;
}

/* ─── public API ─────────────────────────────────────────────────── */

/**
 * Sign a request. Caller composes the envelope into request headers
 * (X-BB-Timestamp, X-BB-Nonce, X-BB-Signature).
 */
export async function signRequest(secret: string, input: SignInput): Promise<string> {
  const key = await importKey(secret);
  const bh = await bodyHash(input.body);
  const msg = TEXT_ENCODER.encode(canonicalString(input, bh));
  const sig = await SUBTLE.sign('HMAC', key, msg);
  return bytesToBase64Url(sig);
}

export interface VerifyOptions {
  /** Server's authoritative clock — defaults to Date.now(). */
  now?: () => number;
  /** Replay window in ms — defaults to 5 min. */
  skewMs?: number;
  /** Optional nonce store. If supplied, verify will mark+reject replays. */
  nonceStore?: NonceStore;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'bad_signature' | 'timestamp_skew' | 'replay' | 'malformed' };

/**
 * Verify a signed request. Returns a discriminated union — never throws.
 * On `ok: true` the nonce (if a store was supplied) has been consumed.
 */
export async function verifyRequest(
  secret: string,
  input: VerifyInput,
  opts: VerifyOptions = {},
): Promise<VerifyResult> {
  const skew = opts.skewMs ?? DEFAULT_TIMESTAMP_SKEW_MS;
  const now = (opts.now ?? Date.now)();

  // Timestamp parse + skew.
  const tsMs = Date.parse(input.ts);
  if (!Number.isFinite(tsMs)) return { ok: false, reason: 'malformed' };
  if (Math.abs(now - tsMs) > skew) return { ok: false, reason: 'timestamp_skew' };

  // Signature.
  const expected = await signRequest(secret, {
    method: input.method, path: input.path,
    body: input.body, ts: input.ts, nonce: input.nonce,
  });
  if (!constantTimeEqual(expected, input.sig)) return { ok: false, reason: 'bad_signature' };

  // Replay check (only if store supplied; in-process verify is allowed
  // without one for unit tests / synchronous flows).
  if (opts.nonceStore) {
    const seen = await opts.nonceStore.checkAndStore(input.nonce, tsMs + skew);
    if (seen) return { ok: false, reason: 'replay' };
  }

  return { ok: true };
}

/* ─── nonce store ────────────────────────────────────────────────── */

/**
 * Storage interface for replay-attack protection. Implementations:
 * - In-memory (tests + dev)
 * - Redis / Upstash with TTL = skewMs (production)
 * - Postgres table with btree on (nonce) + cleanup job
 *
 * `checkAndStore` returns true if the nonce was ALREADY seen (caller
 * must reject), false if it was newly stored (caller proceeds).
 */
export interface NonceStore {
  checkAndStore(nonce: string, expiresAtMs: number): boolean | Promise<boolean>;
}

/** In-memory store. Use for tests and local dev only. */
export class InMemoryNonceStore implements NonceStore {
  private readonly seen = new Map<string, number>();

  checkAndStore(nonce: string, expiresAtMs: number): boolean {
    this.gc();
    if (this.seen.has(nonce)) return true;
    this.seen.set(nonce, expiresAtMs);
    return false;
  }

  private gc(): void {
    const now = Date.now();
    for (const [k, exp] of this.seen) {
      if (exp < now) this.seen.delete(k);
    }
  }

  size(): number { return this.seen.size; }
  clear(): void { this.seen.clear(); }
}
