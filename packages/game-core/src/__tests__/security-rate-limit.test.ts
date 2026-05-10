import {
  tryConsume, tryConsumeRoute, InMemoryBucketStore, DEFAULT_LIMITS,
} from '../security';

describe('token bucket', () => {
  it('allows up to capacity, then rejects', async () => {
    const store = new InMemoryBucketStore();
    let now = 1_000_000;
    const config = { capacity: 3, refillPerSec: 1 };

    for (let i = 0; i < 3; i++) {
      const r = await tryConsume(store, 'u1', 'r', config, { now: () => now });
      expect(r.allowed).toBe(true);
    }
    const denied = await tryConsume(store, 'u1', 'r', config, { now: () => now });
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it('refills over time', async () => {
    const store = new InMemoryBucketStore();
    let now = 1_000_000;
    const config = { capacity: 2, refillPerSec: 2 }; // 2 tokens / sec

    await tryConsume(store, 'u', 'r', config, { now: () => now });
    await tryConsume(store, 'u', 'r', config, { now: () => now });
    let r = await tryConsume(store, 'u', 'r', config, { now: () => now });
    expect(r.allowed).toBe(false);

    now += 1000; // 1 second later → 2 tokens back
    r = await tryConsume(store, 'u', 'r', config, { now: () => now });
    expect(r.allowed).toBe(true);
  });

  it('isolates buckets per (user, route)', async () => {
    const store = new InMemoryBucketStore();
    const now = () => 1_000_000;
    const config = { capacity: 1, refillPerSec: 0.1 };

    const a = await tryConsume(store, 'u1', 'r1', config, { now });
    const b = await tryConsume(store, 'u2', 'r1', config, { now });
    const c = await tryConsume(store, 'u1', 'r2', config, { now });
    const d = await tryConsume(store, 'u1', 'r1', config, { now });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    expect(c.allowed).toBe(true);
    expect(d.allowed).toBe(false);
  });

  it('honors token cost > 1', async () => {
    const store = new InMemoryBucketStore();
    const now = () => 1_000_000;
    const config = { capacity: 5, refillPerSec: 1 };

    const r = await tryConsume(store, 'u', 'r', config, { now, cost: 4 });
    expect(r.allowed).toBe(true);

    const denied = await tryConsume(store, 'u', 'r', config, { now, cost: 4 });
    expect(denied.allowed).toBe(false);
  });

  it('tryConsumeRoute uses DEFAULT_LIMITS', async () => {
    const store = new InMemoryBucketStore();
    let now = 1_000_000;
    // battle.action: capacity 4, 2/sec
    const config = DEFAULT_LIMITS['battle.action']!;
    expect(config.capacity).toBe(4);
    for (let i = 0; i < 4; i++) {
      const r = await tryConsumeRoute(store, 'u', 'battle.action', { now: () => now });
      expect(r.allowed).toBe(true);
    }
    const denied = await tryConsumeRoute(store, 'u', 'battle.action', { now: () => now });
    expect(denied.allowed).toBe(false);
  });

  it('reports remaining tokens', async () => {
    const store = new InMemoryBucketStore();
    const now = () => 1_000_000;
    const config = { capacity: 5, refillPerSec: 1 };

    const r = await tryConsume(store, 'u', 'r', config, { now });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
  });
});
