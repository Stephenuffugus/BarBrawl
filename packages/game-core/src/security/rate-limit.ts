// Token-bucket rate limiter.
//
// Each (key, route) pair gets its own bucket. Buckets refill linearly at
// `refillPerSec` and cap at `capacity`. Each `try` consumes 1 token (or
// the supplied `cost`). Returns `allowed` + remaining + retryAfterMs.
//
// Storage is pluggable: in-memory by default, but the same shape works
// over Redis/Postgres for production.
//
// Spec §8.3 — POST /battle/action: "1 per 500ms". This is the implementation.

export interface RateLimitConfig {
  /** Bucket capacity (max tokens). */
  capacity: number;
  /** Tokens added per second. */
  refillPerSec: number;
}

export interface BucketState {
  tokens: number;
  /** Last refill timestamp in ms. */
  updatedAtMs: number;
}

export interface BucketStore {
  get(key: string): BucketState | undefined | Promise<BucketState | undefined>;
  set(key: string, state: BucketState): void | Promise<void>;
}

export class InMemoryBucketStore implements BucketStore {
  private readonly map = new Map<string, BucketState>();
  get(key: string): BucketState | undefined { return this.map.get(key); }
  set(key: string, state: BucketState): void { this.map.set(key, state); }
  size(): number { return this.map.size; }
  clear(): void { this.map.clear(); }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Ms until at least 1 token is available. 0 if allowed=true. */
  retryAfterMs: number;
}

export interface TryConsumeOptions {
  /** Caller-supplied clock for determinism in tests. */
  now?: () => number;
  /** Token cost — default 1. Heavy actions can charge more. */
  cost?: number;
}

/** Default config buckets keyed by route. Spec-derived. */
export const DEFAULT_LIMITS: Readonly<Record<string, RateLimitConfig>> = Object.freeze({
  // 1 per 500ms = 2/sec, with 4 burst capacity for connection retries.
  'battle.action': { capacity: 4, refillPerSec: 2 },
  // 1/sec for battle-start (no spamming bar-runs).
  'battle.start': { capacity: 2, refillPerSec: 1 },
  // 1 per 5s for battle-end (caller really only ends once).
  'battle.end':   { capacity: 1, refillPerSec: 0.2 },
  // 1 per 30s for character-create (idempotent on server).
  'character.create': { capacity: 1, refillPerSec: 1 / 30 },
  // 5/sec generic for cheap reads.
  'read': { capacity: 10, refillPerSec: 5 },
});

/**
 * Try to consume tokens from the bucket for (userId, route).
 * `allowed = false` returns retryAfterMs the caller should send to the client.
 */
export async function tryConsume(
  store: BucketStore,
  userId: string,
  route: string,
  config: RateLimitConfig,
  opts: TryConsumeOptions = {},
): Promise<RateLimitResult> {
  const now = (opts.now ?? Date.now)();
  const cost = opts.cost ?? 1;
  const key = `${userId}:${route}`;

  const prior = await store.get(key);
  const tokens = prior
    ? Math.min(
        config.capacity,
        prior.tokens + ((now - prior.updatedAtMs) / 1000) * config.refillPerSec,
      )
    : config.capacity;

  if (tokens >= cost) {
    const next = { tokens: tokens - cost, updatedAtMs: now };
    await store.set(key, next);
    return { allowed: true, remaining: Math.floor(next.tokens), retryAfterMs: 0 };
  }

  // Not enough tokens — calculate when caller can retry.
  const need = cost - tokens;
  const retryAfterMs = Math.ceil((need / config.refillPerSec) * 1000);
  // Persist the partial refill so a later call benefits.
  await store.set(key, { tokens, updatedAtMs: now });
  return { allowed: false, remaining: 0, retryAfterMs };
}

/** Convenience: route-aware limiter using DEFAULT_LIMITS as fallback. */
export async function tryConsumeRoute(
  store: BucketStore,
  userId: string,
  route: string,
  opts: TryConsumeOptions = {},
): Promise<RateLimitResult> {
  const config = DEFAULT_LIMITS[route] ?? DEFAULT_LIMITS['read']!;
  return tryConsume(store, userId, route, config, opts);
}
