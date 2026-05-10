import {
  signRequest, verifyRequest, constantTimeEqual, sha256Hex,
  InMemoryNonceStore, DEFAULT_TIMESTAMP_SKEW_MS,
} from '../security';

const SECRET = 'test-secret-must-be-stable';

describe('HMAC signRequest / verifyRequest', () => {
  it('round-trips a signed request', async () => {
    const input = {
      method: 'POST',
      path: '/battle/action',
      body: JSON.stringify({ action: 'attack' }),
      ts: '2026-05-10T12:00:00.000Z',
      nonce: 'abc-123',
    };
    const sig = await signRequest(SECRET, input);
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no padding

    const now = () => Date.parse(input.ts);
    const v = await verifyRequest(SECRET, { ...input, sig }, { now });
    expect(v.ok).toBe(true);
  });

  it('rejects a tampered body', async () => {
    const input = {
      method: 'POST', path: '/battle/action',
      body: '{"action":"attack"}',
      ts: '2026-05-10T12:00:00.000Z', nonce: 'n1',
    };
    const sig = await signRequest(SECRET, input);
    const now = () => Date.parse(input.ts);
    const v = await verifyRequest(SECRET,
      { ...input, body: '{"action":"flee"}', sig }, { now });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('bad_signature');
  });

  it('rejects a wrong secret', async () => {
    const input = {
      method: 'POST', path: '/x', body: '', ts: '2026-05-10T12:00:00.000Z', nonce: 'n2',
    };
    const sig = await signRequest(SECRET, input);
    const now = () => Date.parse(input.ts);
    const v = await verifyRequest('different-secret', { ...input, sig }, { now });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('bad_signature');
  });

  it('rejects timestamp outside skew window', async () => {
    const ts = '2026-05-10T12:00:00.000Z';
    const input = { method: 'GET', path: '/p', body: '', ts, nonce: 'n3' };
    const sig = await signRequest(SECRET, input);
    const now = () => Date.parse(ts) + DEFAULT_TIMESTAMP_SKEW_MS + 1000;
    const v = await verifyRequest(SECRET, { ...input, sig }, { now });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('timestamp_skew');
  });

  it('rejects malformed timestamps', async () => {
    const input = { method: 'GET', path: '/p', body: '', ts: 'not-a-date', nonce: 'n4' };
    const sig = await signRequest(SECRET, input);
    const v = await verifyRequest(SECRET, { ...input, sig });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('malformed');
  });

  it('detects replays via nonce store', async () => {
    const input = {
      method: 'POST', path: '/battle/start', body: '{}',
      ts: '2026-05-10T12:00:00.000Z', nonce: 'replay-me',
    };
    const sig = await signRequest(SECRET, input);
    const now = () => Date.parse(input.ts);
    const store = new InMemoryNonceStore();

    const first = await verifyRequest(SECRET, { ...input, sig }, { now, nonceStore: store });
    expect(first.ok).toBe(true);

    const second = await verifyRequest(SECRET, { ...input, sig }, { now, nonceStore: store });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('replay');
  });
});

describe('constantTimeEqual', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeEqual('abcdef', 'abcdef')).toBe(true);
  });
  it('returns false for unequal lengths', () => {
    expect(constantTimeEqual('a', 'ab')).toBe(false);
  });
  it('returns false for differing strings of equal length', () => {
    expect(constantTimeEqual('abcd', 'abce')).toBe(false);
  });
});

describe('sha256Hex', () => {
  it('matches the standard hash for a known input', async () => {
    // sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(await sha256Hex('abc'))
      .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
