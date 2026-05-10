import {
  validateNomination,
  nameSimilarity,
  normalizeBarName,
  createClaim,
  verifyClaim,
  approveClaim,
  rejectClaim,
  CLAIM_TTL_MS,
} from '../bars';

const NYC = { lat: 40.7128, lng: -74.006 };
const NEAR_NYC = { lat: 40.7129, lng: -74.0061 }; // ~14m away
const FAR = { lat: 41.0, lng: -74.0 };            // ~30km away

describe('normalizeBarName', () => {
  it('lowercases, trims, collapses whitespace, strips punctuation', () => {
    expect(normalizeBarName("  Joe's   PUB!  ")).toBe('joes pub');
  });
});

describe('nameSimilarity', () => {
  it('returns 1 for identical normalized names', () => {
    expect(nameSimilarity("Joe's Pub", 'joes pub')).toBe(1);
  });
  it('returns high score for very similar names', () => {
    expect(nameSimilarity("Joe's Pub", "Joe's Pub & Grill")).toBeGreaterThan(0.6);
  });
  it('returns low score for distinct names', () => {
    expect(nameSimilarity('The Rusty Nail', 'Mission Blackout')).toBeLessThan(0.3);
  });
});

describe('validateNomination', () => {
  const valid = {
    barName: 'The Rusty Nail',
    address: '123 Main St',
    barType: 'dive',
    location: NYC,
  };

  it('accepts a clean submission', () => {
    const r = validateNomination(valid);
    expect(r.ok).toBe(true);
  });

  it('rejects empty bar name', () => {
    const r = validateNomination({ ...valid, barName: '   ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bar_name_empty');
  });

  it('rejects unknown bar type', () => {
    const r = validateNomination({ ...valid, barType: 'speakeasy' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_bar_type');
  });

  it('rejects invalid coordinates', () => {
    const r = validateNomination({ ...valid, location: { lat: 91, lng: 0 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_location');
  });

  it('flags duplicate by proximity + name similarity', () => {
    const r = validateNomination(valid, [
      { id: 'b1', name: 'Rusty Nail', location: NEAR_NYC, source: 'bar' as const },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'duplicate') {
      expect(r.match.id).toBe('b1');
      expect(r.distanceMeters).toBeLessThan(50);
    }
  });

  it('does not flag a duplicate name far away', () => {
    const r = validateNomination(valid, [
      { id: 'b2', name: 'The Rusty Nail', location: FAR, source: 'bar' as const },
    ]);
    expect(r.ok).toBe(true);
  });

  it('does not flag a different name in the same place', () => {
    const r = validateNomination(valid, [
      { id: 'b3', name: 'Mission Blackout', location: NEAR_NYC, source: 'bar' as const },
    ]);
    expect(r.ok).toBe(true);
  });
});

describe('owner claim flow', () => {
  const NOW = 1_000_000;
  const tokenGen = () => 'tok-fixed-1';

  it('creates a pending claim from valid input', () => {
    const r = createClaim(
      { barId: 'bar-1', claimantId: 'u-1', evidenceText: 'I own this bar.', method: 'email' },
      { tokenGen, now: () => NOW },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.claim.status).toBe('pending');
      expect(r.claim.challengeToken).toBe('tok-fixed-1');
    }
  });

  it('rejects claims with no evidence', () => {
    const r = createClaim(
      { barId: 'bar-1', claimantId: 'u-1', method: 'email' },
      { tokenGen, now: () => NOW },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing_evidence');
  });

  it('rejects a duplicate pending claim', () => {
    const r = createClaim(
      { barId: 'bar-1', claimantId: 'u-1', evidenceText: 'mine', method: 'email' },
      { tokenGen, now: () => NOW, existingClaims: [{ status: 'pending' }] },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('duplicate_pending');
  });

  it('verifies claim with matching token', () => {
    const created = createClaim(
      { barId: 'b', claimantId: 'u', evidenceText: 'mine', method: 'email' },
      { tokenGen, now: () => NOW },
    );
    if (!created.ok) throw new Error('precondition');
    const v = verifyClaim(created.claim, 'tok-fixed-1', NOW + 1000);
    expect(v.ok).toBe(true);
    expect(v.next.status).toBe('verified');
  });

  it('rejects token mismatch', () => {
    const created = createClaim(
      { barId: 'b', claimantId: 'u', evidenceText: 'mine', method: 'email' },
      { tokenGen, now: () => NOW },
    );
    if (!created.ok) throw new Error('precondition');
    const v = verifyClaim(created.claim, 'wrong-token', NOW + 1000);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('token_mismatch');
  });

  it('expires after TTL', () => {
    const created = createClaim(
      { barId: 'b', claimantId: 'u', evidenceText: 'mine', method: 'email' },
      { tokenGen, now: () => NOW },
    );
    if (!created.ok) throw new Error('precondition');
    const v = verifyClaim(created.claim, 'tok-fixed-1', NOW + CLAIM_TTL_MS + 1);
    expect(v.ok).toBe(false);
    expect(v.next.status).toBe('expired');
  });

  it('approves only verified claims', () => {
    const created = createClaim(
      { barId: 'b', claimantId: 'u', evidenceText: 'mine', method: 'email' },
      { tokenGen, now: () => NOW },
    );
    if (!created.ok) throw new Error('precondition');
    expect(approveClaim(created.claim).ok).toBe(false); // still pending
    const v = verifyClaim(created.claim, 'tok-fixed-1', NOW + 1000);
    expect(approveClaim(v.next).ok).toBe(true);
  });

  it('rejects a claim from pending or verified', () => {
    const created = createClaim(
      { barId: 'b', claimantId: 'u', evidenceText: 'mine', method: 'email' },
      { tokenGen, now: () => NOW },
    );
    if (!created.ok) throw new Error('precondition');
    expect(rejectClaim(created.claim).ok).toBe(true);
    const v = verifyClaim(created.claim, 'tok-fixed-1', NOW + 1000);
    expect(rejectClaim(v.next).ok).toBe(true);
  });
});
