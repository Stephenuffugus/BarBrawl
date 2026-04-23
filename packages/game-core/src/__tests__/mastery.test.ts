import {
  MASTERY_TIERS,
  bonusesForBarType,
  masteryBonuses,
  nextMasteryTier,
} from '../progression';
import { createLevel1Character, toRuntime } from '../character';

describe('MASTERY_TIERS (spec §5.7)', () => {
  it('has 4 tiers matching spec thresholds', () => {
    expect(MASTERY_TIERS.map((t) => t.conquersRequired)).toEqual([1, 5, 15, 30]);
  });

  it('highest tier bonus is +30 HP +2 ATK +3 DEF', () => {
    const t4 = MASTERY_TIERS[3]!.bonus;
    expect(t4.hp).toBe(30);
    expect(t4.atk).toBe(2);
    expect(t4.def).toBe(3);
    expect(t4.title).toBe('Master');
  });
});

describe('bonusesForBarType', () => {
  it('0 conquers = no bonus', () => {
    expect(bonusesForBarType(0)).toEqual({ hp: 0, atk: 0, def: 0, titles: [] });
  });

  it('1 conquer unlocks tier 1 (+1 HP)', () => {
    expect(bonusesForBarType(1)).toEqual({ hp: 1, atk: 0, def: 0, titles: [] });
  });

  it('5 conquers stacks tier 1 + tier 2 (+6 HP, +1 DEF)', () => {
    expect(bonusesForBarType(5)).toEqual({ hp: 6, atk: 0, def: 1, titles: [] });
  });

  it('15 conquers stacks tiers 1+2+3 (+21 HP, +1 ATK, +3 DEF)', () => {
    expect(bonusesForBarType(15)).toEqual({ hp: 21, atk: 1, def: 3, titles: [] });
  });

  it('30+ conquers reaches Master tier: +51 HP, +3 ATK, +6 DEF, title Master', () => {
    const b = bonusesForBarType(30);
    expect(b.hp).toBe(51);
    expect(b.atk).toBe(3);
    expect(b.def).toBe(6);
    expect(b.titles).toEqual(['Master']);
  });

  it('50 conquers = same bonus as 30 (no tier 5)', () => {
    expect(bonusesForBarType(50)).toEqual(bonusesForBarType(30));
  });
});

describe('masteryBonuses across multiple bar types', () => {
  it('sums across types', () => {
    const b = masteryBonuses({ dive: 5, brewery: 15, cocktail: 30 });
    // dive=5: +6 HP, +1 DEF
    // brewery=15: +21 HP, +1 ATK, +3 DEF
    // cocktail=30: +51 HP, +3 ATK, +6 DEF
    expect(b.hp).toBe(6 + 21 + 51);
    expect(b.atk).toBe(0 + 1 + 3);
    expect(b.def).toBe(1 + 3 + 6);
    expect(b.titles).toEqual(['Master of cocktail']);
  });

  it('empty mastery = zeros', () => {
    expect(masteryBonuses({})).toEqual({ hp: 0, atk: 0, def: 0, titles: [] });
  });
});

describe('nextMasteryTier progress hinting', () => {
  it('returns 1 as next target for a new track', () => {
    expect(nextMasteryTier(0)?.target).toBe(1);
  });
  it('returns 15 when between 5 and 15', () => {
    expect(nextMasteryTier(7)?.target).toBe(15);
  });
  it('returns null when maxed', () => {
    expect(nextMasteryTier(100)).toBeNull();
  });
});

describe('toRuntime applies mastery bonuses to base stats', () => {
  it('mastery buffs stack onto character stats', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const leveled = { ...row, mastery: { dive: 30, pub: 15 } };
    const rt = toRuntime(leveled);
    // Bouncer base: 130/12/14/7/6
    // Mastery: dive=30 (+51 HP +3 ATK +6 DEF) + pub=15 (+21 HP +1 ATK +3 DEF)
    //        = +72 HP +4 ATK +9 DEF
    expect(rt.stats.hp).toBe(130 + 72);
    expect(rt.stats.atk).toBe(12 + 4);
    expect(rt.stats.def).toBe(14 + 9);
  });
});
