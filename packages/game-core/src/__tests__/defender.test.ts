import {
  DEFENDER_RULES,
  stationAsDefender,
  decayDefender,
  accrueCoins,
  awardPassiveXP,
  canStationAnother,
  recallCooldownExpired,
  collapseDefender,
} from '../progression';
import { createLevel1Character, toRuntime } from '../character';

function makeRuntime(classId: Parameters<typeof createLevel1Character>[0]['classId'], level = 10) {
  const row = createLevel1Character({ userId: 'u1', classId });
  return toRuntime({ ...row, level });
}

describe('DEFENDER_RULES (spec §5.5 constants)', () => {
  it('enforces the 7-per-account cap', () => {
    expect(DEFENDER_RULES.MAX_STATIONED_PER_ACCOUNT).toBe(7);
  });
  it('caps daily coins at 75 account-wide', () => {
    expect(DEFENDER_RULES.MAX_COINS_PER_DAY).toBe(75);
  });
  it('coins per hour is 2', () => {
    expect(DEFENDER_RULES.COINS_PER_HOUR).toBe(2);
  });
  it('passive XP fraction is 15%', () => {
    expect(DEFENDER_RULES.PASSIVE_XP_FRACTION).toBe(0.15);
  });
});

describe('stationAsDefender', () => {
  it('captures stats + loadout at station time', () => {
    const rt = makeRuntime('brewer', 20);
    const now = new Date('2026-04-23T20:00:00Z');
    const snap = stationAsDefender({
      character: rt,
      barId: 'bar_xyz',
      now,
      equippedSkillNodes: ['ho_3'],
      equippedItems: { weapon: 'item_1' },
    });
    expect(snap.bar_id).toBe('bar_xyz');
    expect(snap.stationed_at).toBe(now.toISOString());
    expect(snap.current_hp).toBe(rt.stats.hp);
    expect(snap.max_hp).toBe(rt.stats.maxHp);
    expect(snap.stats_snapshot.atk).toBe(rt.stats.atk);
    expect(snap.loadout_snapshot.equipped_skill_nodes).toEqual(['ho_3']);
    expect(snap.coins_accrued).toBe(0);
    expect(snap.xp_accrued).toBe(0);
  });
});

describe('decayDefender (5% max HP per day)', () => {
  it('0 hours = no decay', () => {
    const rt = makeRuntime('brewer');
    const snap = stationAsDefender({ character: rt, barId: 'b' });
    expect(decayDefender(snap, 0)).toEqual(snap);
  });

  it('24 hours = 5% max HP loss', () => {
    const rt = makeRuntime('brewer');
    const snap = stationAsDefender({ character: rt, barId: 'b' });
    const after = decayDefender(snap, 24);
    const expectedLoss = Math.ceil(snap.max_hp * 0.05);
    expect(after.current_hp).toBe(snap.current_hp - expectedLoss);
  });

  it('clamps at 0 (never goes negative)', () => {
    const rt = makeRuntime('brewer');
    const snap = stationAsDefender({ character: rt, barId: 'b' });
    const after = decayDefender(snap, 24 * 30); // 30 days — far more than max HP covers
    expect(after.current_hp).toBe(0);
  });
});

describe('accrueCoins', () => {
  it('10 hours = 20 coins if under cap', () => {
    const rt = makeRuntime('brewer');
    const snap = stationAsDefender({ character: rt, barId: 'b' });
    const { snapshot, gained } = accrueCoins(snap, 10, 0);
    expect(gained).toBe(20);
    expect(snapshot.coins_accrued).toBe(20);
  });

  it('honors the 75/day account cap', () => {
    const rt = makeRuntime('brewer');
    const snap = stationAsDefender({ character: rt, barId: 'b' });
    const { gained } = accrueCoins(snap, 24, 70); // already 70 today
    expect(gained).toBe(5); // 75 - 70 cap remaining
  });

  it('no gain once cap is reached', () => {
    const rt = makeRuntime('brewer');
    const snap = stationAsDefender({ character: rt, barId: 'b' });
    const { gained } = accrueCoins(snap, 24, 75);
    expect(gained).toBe(0);
  });
});

describe('awardPassiveXP (15%)', () => {
  it('grants 15% of attacker XP', () => {
    const rt = makeRuntime('brewer');
    const snap = stationAsDefender({ character: rt, barId: 'b' });
    const after = awardPassiveXP(snap, 1000);
    expect(after.xp_accrued).toBe(150);
  });

  it('stacks on prior accrual', () => {
    const rt = makeRuntime('brewer');
    const snap = { ...stationAsDefender({ character: rt, barId: 'b' }), xp_accrued: 50 };
    const after = awardPassiveXP(snap, 200);
    expect(after.xp_accrued).toBe(50 + 30);
  });
});

describe('canStationAnother', () => {
  it('allows up to 7', () => {
    for (let i = 0; i < 7; i++) expect(canStationAnother(i)).toBe(true);
  });
  it('refuses at 7', () => {
    expect(canStationAnother(7)).toBe(false);
  });
});

describe('recallCooldownExpired', () => {
  it('true after 1+ hours', () => {
    const now = new Date('2026-04-23T20:00:00Z');
    const lastRecall = new Date('2026-04-23T18:30:00Z');
    expect(recallCooldownExpired(lastRecall, now)).toBe(true);
  });
  it('false within the 1-hour window', () => {
    const now = new Date('2026-04-23T20:00:00Z');
    const lastRecall = new Date('2026-04-23T19:30:00Z');
    expect(recallCooldownExpired(lastRecall, now)).toBe(false);
  });
});

describe('collapseDefender', () => {
  it('returns accrued coins + xp + character_id for payout', () => {
    const rt = makeRuntime('brewer');
    const snap = stationAsDefender({ character: rt, barId: 'b' });
    const withEarnings = { ...snap, coins_accrued: 50, xp_accrued: 120 };
    expect(collapseDefender(withEarnings)).toEqual({
      coins: 50, xp: 120, character_id: snap.character_id,
    });
  });
});
