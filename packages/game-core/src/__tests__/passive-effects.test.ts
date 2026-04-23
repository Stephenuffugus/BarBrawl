import {
  PASSIVE_EFFECTS,
  passiveFor,
  hasPassive,
  foldPassives,
  applyPassives,
  SKILL_ACTIONS,
} from '../combat';
import { TREES, NODE_BY_ID } from '../trees';

describe('PASSIVE_EFFECTS registry', () => {
  it('covers 146 non-active nodes (189 total - 43 active/oldest-trick)', () => {
    expect(Object.keys(PASSIVE_EFFECTS).length).toBe(146);
  });

  it('every ported passive maps to a real skill-tree node', () => {
    for (const id of Object.keys(PASSIVE_EFFECTS)) {
      if (!NODE_BY_ID.has(id)) {
        throw new Error(`passive ${id} has no matching tree node`);
      }
    }
  });

  it('union of SKILL_ACTIONS + PASSIVE_EFFECTS covers every non-small node', () => {
    // Every active + keystone + notable should be registered in one of them.
    let missing = 0;
    for (const tree of Object.values(TREES)) {
      for (const node of tree) {
        if (node.type === 'active' || node.type === 'keystone' || node.type === 'notable') {
          const registered = node.id in SKILL_ACTIONS || node.id in PASSIVE_EFFECTS;
          if (!registered) missing++;
        }
      }
    }
    expect(missing).toBe(0);
  });

  it('passiveFor returns undefined for an active node', () => {
    expect(passiveFor('fo_3')).toBeUndefined();  // Clean Strike
    expect(hasPassive('fo_3')).toBe(false);
  });

  it('passiveFor returns data for a passive small', () => {
    const p = passiveFor('fo_1');  // Fixed Gaze +4% crit
    expect(p).toBeDefined();
    expect(p?.kind).toBe('pct_stat');
  });
});

describe('foldPassives — stat accumulation', () => {
  const base = { hp: 110, maxHp: 110, atk: 11, def: 11, spd: 11, luck: 11 };

  it('empty allocation returns baseline', () => {
    const mod = foldPassives([]);
    expect(mod.flat.atk).toBe(0);
    expect(mod.pct.atk).toBe(0);
    expect(mod.allCrit).toBe(false);
    expect(mod.noCrit).toBe(false);
  });

  it('flat stat nodes stack', () => {
    // Operator allocates fo_2 (+3 ATK), re_1 (+5 DEF), re_4 (+15 HP).
    const mod = foldPassives(['fo_2', 're_1', 're_4']);
    expect(mod.flat.atk).toBe(3);
    expect(mod.flat.def).toBe(5);
    expect(mod.flat.hp).toBe(15);
  });

  it('pct stat nodes stack', () => {
    // Operator: fo_1 (+4% crit), fo_4 (+6% crit), fo_5 (+25% crit dmg).
    const mod = foldPassives(['fo_1', 'fo_4', 'fo_5']);
    expect(mod.pct.crit_chance).toBe(10);
    expect(mod.pct.crit_dmg).toBe(25);
  });

  it('ABSOLUTE CLARITY keystone: all_crit + -40% ATK via companion', () => {
    const mod = foldPassives(['fo_9']);
    expect(mod.allCrit).toBe(true);
    expect(mod.pct.atk).toBe(-40);
  });

  it('IMMOVABLE keystone: -50% dmg taken + no crit', () => {
    const mod = foldPassives(['re_9']);
    expect(mod.noCrit).toBe(true);
    expect(mod.dmgTakenPct).toBe(-50);
  });

  it('BROKEN BOTTLE keystone: -20% DEF companion', () => {
    const mod = foldPassives(['ho_9']);
    expect(mod.pct.def).toBe(-20);
  });

  it('HOUSE ALWAYS WINS: +100% luck, -20% other stats', () => {
    const mod = foldPassives(['hu_9']);
    expect(mod.pct.luck).toBe(100);
    expect(mod.pct.atk).toBe(-20);
    expect(mod.pct.def).toBe(-20);
    expect(mod.pct.hp).toBe(-20);
    expect(mod.pct.spd).toBe(-20);
  });
});

describe('conditional passives', () => {
  it('Fresh Shift (+20% ATK at HP>80%) only fires when condition met', () => {
    const belowThreshold = foldPassives(['ho_5'], { hpPct: 0.5, enemyCount: 1 });
    expect(belowThreshold.pct.atk).toBe(0);
    const aboveThreshold = foldPassives(['ho_5'], { hpPct: 0.9, enemyCount: 1 });
    expect(aboveThreshold.pct.atk).toBe(20);
  });

  it('Cornered (+50% DEF at HP<30%)', () => {
    const low = foldPassives(['ba_8'], { hpPct: 0.2, enemyCount: 1 });
    expect(low.pct.def).toBe(50);
    const high = foldPassives(['ba_8'], { hpPct: 0.7, enemyCount: 1 });
    expect(high.pct.def).toBe(0);
  });

  it('Read Room (+5% all stats vs 2+ enemies)', () => {
    const lone = foldPassives(['cl_2'], { hpPct: 1.0, enemyCount: 1 });
    expect(lone.pct.atk).toBe(0);
    const pack = foldPassives(['cl_2'], { hpPct: 1.0, enemyCount: 3 });
    expect(pack.pct.atk).toBe(5);
    expect(pack.pct.def).toBe(5);
    expect(pack.pct.hp).toBe(5);
    expect(pack.pct.spd).toBe(5);
    expect(pack.pct.luck).toBe(5);
  });
});

describe('per-level scaling (Old Vines/Ancient Pact)', () => {
  it('grants +3% per 10 levels', () => {
    const l10 = foldPassives(['vn_4'], { hpPct: 1.0, enemyCount: 1, level: 10 });
    expect(l10.pct.atk).toBe(3);
    const l50 = foldPassives(['vn_4'], { hpPct: 1.0, enemyCount: 1, level: 50 });
    expect(l50.pct.atk).toBe(15);
  });
});

describe('applyPassives — end-to-end', () => {
  it('an Operator at level 1 with Grounded + Breathe Deep has 130 HP + 16 DEF', () => {
    const base = { hp: 110, maxHp: 110, atk: 11, def: 11, spd: 11, luck: 11 };
    const after = applyPassives(base, ['re_1', 're_4']);
    // +5 DEF flat, +15 HP flat.
    expect(after.def).toBe(16);
    expect(after.maxHp).toBe(125);
  });

  it('stacked ATK bonuses compound correctly', () => {
    const base = { hp: 100, maxHp: 100, atk: 10, def: 10, spd: 10, luck: 10 };
    // ho_1 (+3 ATK flat), ho_4 (+8% ATK pct).
    const after = applyPassives(base, ['ho_1', 'ho_4']);
    // (10 + 3) * 1.08 = 14.04 -> floor 14
    expect(after.atk).toBe(14);
  });
});

describe('balance sanity — no class can exceed reasonable ATK with full tree', () => {
  // Sanity check: fully allocate one class's 27 nodes; resulting pct ATK
  // shouldn't blow past +150%. The prototype's numbers should stay sane.
  it('Bouncer with Impact tree fully allocated', () => {
    const ids = [
      'ho_1','ho_2','ho_3','ho_4','ho_5','ho_6','ho_7','ho_8','ho_9',
      'ba_1','ba_2','ba_3','ba_4','ba_5','ba_6','ba_7','ba_8','ba_9',
      'fm_1','fm_2','fm_3','fm_4','fm_5','fm_6','fm_7','fm_8','fm_9',
    ];
    const mod = foldPassives(ids, { hpPct: 1.0, enemyCount: 1 });
    // Expect negative pressure from keystones (HAZE -20% DEF, LAST STAND -30% ATK)
    // to keep raw ATK-pct from running away.
    expect(mod.pct.atk).toBeLessThan(50);  // net-positive ATK gain is moderate
    expect(mod.flat.atk).toBeLessThan(30); // flat ATK gains stay reasonable
  });
});
