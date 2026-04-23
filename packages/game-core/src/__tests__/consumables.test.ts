import { initBattle, applyPlayerAction } from '../combat';
import { createLevel1Character, toRuntime } from '../character';
import { CONSUMABLES, getConsumable } from '../consumables';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

describe('CONSUMABLES catalog', () => {
  it('contains all 7 spec §5.8 consumables', () => {
    const ids = new Set(CONSUMABLES.map((c) => c.id));
    expect(ids).toEqual(new Set([
      'small_brew', 'house_special', 'shot_of_courage', 'iron_tonic',
      'focus_vial', 'emergency_elixir', 'palette_cleanser',
    ]));
  });

  it('getConsumable throws on unknown id', () => {
    expect(() => getConsumable('nonexistent')).toThrow(RangeError);
  });
});

function setupHurtFight() {
  const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
  const rt = toRuntime({ ...row, level: 10 });
  // Injure player to 20% HP.
  const hurt = { ...rt, stats: { ...rt.stats, hp: Math.floor(rt.stats.maxHp * 0.2) } };
  return initBattle({
    battleId: 'b1', seed: 's', player: hurt,
    enemyTemplates: [{ id: 'e1', name: 'T' }],
  });
}

describe('Small Brew — heal_pct 30%', () => {
  it('heals 30% of max HP', () => {
    const state = setupHurtFight();
    const player = state.combatants[0]!;
    const before = player.stats.hp;
    const next = applyPlayerAction(state, {
      kind: 'consumable', actorId: player.id, consumableId: 'small_brew',
    }, { rng: seededRng(1) });
    const after = next.combatants[0]!.stats.hp;
    const gained = after - before;
    expect(gained).toBe(Math.floor(player.stats.maxHp * 0.30));
  });

  it("doesn't exceed max HP", () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const rt = toRuntime({ ...row, level: 10 });
    const full = { ...rt, stats: { ...rt.stats, hp: rt.stats.maxHp } };
    const state = initBattle({
      battleId: 'b1', seed: 's', player: full,
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    const next = applyPlayerAction(state, {
      kind: 'consumable', actorId: state.combatants[0]!.id, consumableId: 'small_brew',
    }, { rng: seededRng(1) });
    expect(next.combatants[0]!.stats.hp).toBe(rt.stats.maxHp);
  });
});

describe('House Special — heal_pct 70%', () => {
  it('heals 70% of max HP', () => {
    const state = setupHurtFight();
    const player = state.combatants[0]!;
    const before = player.stats.hp;
    const next = applyPlayerAction(state, {
      kind: 'consumable', actorId: player.id, consumableId: 'house_special',
    }, { rng: seededRng(1) });
    const gained = next.combatants[0]!.stats.hp - before;
    expect(gained).toBe(Math.floor(player.stats.maxHp * 0.70));
  });
});

describe('Shot of Courage — +40% ATK, 3 turns', () => {
  it('applies buff_atk status with magnitude 40 and 3 turns', () => {
    const state = setupHurtFight();
    const next = applyPlayerAction(state, {
      kind: 'consumable', actorId: state.combatants[0]!.id, consumableId: 'shot_of_courage',
    }, { rng: seededRng(1) });
    const player = next.combatants[0]!;
    const buff = player.statusEffects.find((s) => s.tag === 'buff_atk');
    expect(buff).toBeDefined();
    expect(buff?.magnitude).toBe(40);
    expect(buff?.turnsLeft).toBe(3);
  });
});

describe('Iron Tonic — +50% DEF, 3 turns', () => {
  it('applies buff_def', () => {
    const state = setupHurtFight();
    const next = applyPlayerAction(state, {
      kind: 'consumable', actorId: state.combatants[0]!.id, consumableId: 'iron_tonic',
    }, { rng: seededRng(1) });
    const buff = next.combatants[0]!.statusEffects.find((s) => s.tag === 'buff_def');
    expect(buff?.magnitude).toBe(50);
  });
});

describe('Palette Cleanser — cleanse', () => {
  it('removes debuffs but preserves buffs', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const rt = toRuntime({ ...row, level: 10 });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: rt,
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    // Apply Shot of Courage (buff) then a debuff via Hex Mark skill.
    let s = applyPlayerAction(state, {
      kind: 'consumable', actorId: state.combatants[0]!.id, consumableId: 'shot_of_courage',
    }, { rng: seededRng(1) });
    // Manually inject a debuff for test.
    const withDebuff = {
      ...s,
      combatants: s.combatants.map((c, i) => i === 0 ? {
        ...c,
        statusEffects: [...c.statusEffects,
          { id: 'dbuf', tag: 'debuff_def' as const, turnsLeft: 3, magnitude: 30, label: 'debuff' }],
      } : c),
    };
    const cleansed = applyPlayerAction(withDebuff, {
      kind: 'consumable', actorId: withDebuff.combatants[0]!.id, consumableId: 'palette_cleanser',
    }, { rng: seededRng(2) });
    const statuses = cleansed.combatants[0]!.statusEffects;
    expect(statuses.some((s) => s.tag === 'debuff_def')).toBe(false);
    expect(statuses.some((s) => s.tag === 'buff_atk')).toBe(true); // buff preserved
  });
});

describe('Emergency Elixir — auto_revive', () => {
  it('records a revive-pending counter on the player', () => {
    const state = setupHurtFight();
    const next = applyPlayerAction(state, {
      kind: 'consumable', actorId: state.combatants[0]!.id, consumableId: 'emergency_elixir',
    }, { rng: seededRng(1) });
    const player = next.combatants[0]!;
    expect(player.counters?.['revive_pending_hp']).toBeGreaterThan(0);
    expect(next.log.some((l) => l.text.includes('Emergency Elixir'))).toBe(true);
  });
});
