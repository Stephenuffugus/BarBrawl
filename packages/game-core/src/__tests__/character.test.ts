import {
  createLevel1Character,
  createStarterRoster,
  toRuntime,
} from '../character';
import { CLASSES } from '../classes';

describe('createLevel1Character', () => {
  it('returns a row with class-matched base stats via toRuntime', () => {
    for (const cls of CLASSES) {
      const row = createLevel1Character({ userId: 'u1', classId: cls.id });
      expect(row.class_id).toBe(cls.id);
      expect(row.level).toBe(1);
      expect(row.xp).toBe(0);
      expect(row.allocated_nodes).toEqual([]);
      expect(row.mastery).toEqual({});
      expect(row.inventory).toEqual([]);

      const runtime = toRuntime(row);
      expect(runtime.stats.hp).toBe(cls.baseStats.hp);
      expect(runtime.stats.atk).toBe(cls.baseStats.atk);
      expect(runtime.stats.def).toBe(cls.baseStats.def);
      expect(runtime.stats.spd).toBe(cls.baseStats.spd);
      expect(runtime.stats.luck).toBe(cls.baseStats.luck);
      expect(runtime.resource.kind).toBe(cls.resource.kind);
      expect(runtime.resource.current).toBe(0);
    }
  });

  it('defaults display name to class name but accepts override', () => {
    const autoNamed = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    expect(autoNamed.name).toBe('The Bouncer');
    const custom = createLevel1Character({ userId: 'u1', classId: 'brewer', name: 'Vinny' });
    expect(custom.name).toBe('Vinny');
  });

  it('rejects unknown classId at runtime', () => {
    expect(() => createLevel1Character({ userId: 'u1', classId: 'ninja' as never })).toThrow();
  });
});

describe('createStarterRoster', () => {
  it('creates all 7 characters', () => {
    const roster = createStarterRoster('u1');
    expect(roster).toHaveLength(7);
    const ids = new Set(roster.map((r) => r.class_id));
    expect(ids).toEqual(new Set(['steady','brewer','vintner','shaker','orchardist','drifter','gambler']));
  });

  it('all starter rows belong to the same user', () => {
    const roster = createStarterRoster('u1');
    expect(roster.every((r) => r.user_id === 'u1')).toBe(true);
  });
});

describe('toRuntime stat scaling', () => {
  it('applies per-level gains from spec §5.6', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'steady' });
    const leveled = { ...row, level: 11 };
    const rt = toRuntime(leveled);
    // Base steady: 110/11/11/11/11. At level 11: +60 HP, +20 ATK, +10 DEF, +5 SPD.
    expect(rt.stats.hp).toBe(170);
    expect(rt.stats.atk).toBe(31);
    expect(rt.stats.def).toBe(21);
    expect(rt.stats.spd).toBe(16);
    expect(rt.stats.luck).toBe(11); // LUCK doesn't scale per level
  });

  it('maxHp equals hp on fresh creation', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const rt = toRuntime(row);
    expect(rt.stats.hp).toBe(rt.stats.maxHp);
  });

  it('honors stats override (for defender snapshots)', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'drifter' });
    const rt = toRuntime(row, {
      stats: { hp: 50, maxHp: 200, atk: 99, def: 1, spd: 1, luck: 1 },
    });
    expect(rt.stats.hp).toBe(50);
    expect(rt.stats.maxHp).toBe(200);
  });
});
