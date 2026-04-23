import {
  respecCostGold,
  respecTokensFromLevelUp,
  applyRespec,
  RESPEC_RULES,
} from '../progression';

describe('respecCostGold (spec §5.2)', () => {
  it('level 10 = 100 gold (spec example)', () => {
    expect(respecCostGold(10)).toBe(100);
  });
  it('level 100 = 10,000 gold (spec example)', () => {
    expect(respecCostGold(100)).toBe(10_000);
  });
  it('scales quadratically (level^2) at higher levels', () => {
    expect(respecCostGold(500)).toBe(250_000);
    expect(respecCostGold(1000)).toBe(1_000_000);
  });
  it('rejects invalid levels', () => {
    expect(() => respecCostGold(0)).toThrow(RangeError);
    expect(() => respecCostGold(-1)).toThrow(RangeError);
  });
});

describe('respecTokensFromLevelUp', () => {
  it('grants 5 tokens at level 10', () => {
    expect(respecTokensFromLevelUp(9, 10)).toBe(5);
  });
  it('grants 0 tokens when not crossing a milestone', () => {
    expect(respecTokensFromLevelUp(11, 15)).toBe(0);
  });
  it('grants 10 tokens for crossing two milestones in one jump', () => {
    expect(respecTokensFromLevelUp(8, 21)).toBe(10);
  });
  it('handles identical or descending levels', () => {
    expect(respecTokensFromLevelUp(10, 10)).toBe(0);
    expect(respecTokensFromLevelUp(15, 10)).toBe(0);
  });
  it('uses the spec constants', () => {
    expect(RESPEC_RULES.TOKEN_GRANT_INTERVAL).toBe(10);
    expect(RESPEC_RULES.TOKENS_PER_GRANT).toBe(5);
  });
});

describe('applyRespec', () => {
  const baseInput = {
    level: 10,
    allocatedNodes: ['fo_1', 'fo_2', 're_1'],
    goldBalance: 500,
    tokenBalance: 2,
  };

  it('gold path: charges level*100 and clears nodes', () => {
    const r = applyRespec({ ...baseInput, useToken: false });
    if (!r.ok) throw new Error('expected ok');
    expect(r.goldSpent).toBe(100);
    expect(r.goldBalance).toBe(400);
    expect(r.allocatedNodes).toEqual([]);
    expect(r.skillPointsAvailable).toBe(10);
  });

  it('token path: consumes 1 token, no gold', () => {
    const r = applyRespec({ ...baseInput, useToken: true });
    if (!r.ok) throw new Error('expected ok');
    expect(r.tokensSpent).toBe(1);
    expect(r.tokenBalance).toBe(1);
    expect(r.goldSpent).toBe(0);
  });

  it('refuses when insufficient gold', () => {
    const r = applyRespec({ ...baseInput, goldBalance: 50, useToken: false });
    if (r.ok) throw new Error('expected error');
    expect(r.reason).toBe('insufficient_gold');
    expect(r.costGold).toBe(100);
  });

  it('refuses when out of tokens', () => {
    const r = applyRespec({ ...baseInput, tokenBalance: 0, useToken: true });
    if (r.ok) throw new Error('expected error');
    expect(r.reason).toBe('insufficient_tokens');
  });

  it('refuses when already blank', () => {
    const r = applyRespec({ ...baseInput, allocatedNodes: [], useToken: false });
    if (r.ok) throw new Error('expected error');
    expect(r.reason).toBe('already_blank');
  });
});
