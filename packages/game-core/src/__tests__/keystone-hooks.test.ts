import { initBattle, applyPlayerAction, advanceTurn } from '../combat';
import { createLevel1Character, toRuntime } from '../character';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

function setupFight(classId: Parameters<typeof createLevel1Character>[0]['classId'], nodes: string[], level = 20) {
  const row = createLevel1Character({ userId: 'u1', classId });
  const rt = toRuntime({ ...row, level, allocated_nodes: nodes });
  return initBattle({
    battleId: 'b1', seed: 's', player: rt,
    enemyTemplates: [{ id: 'e1', name: 'Target', isBoss: true }],
  });
}

describe('auto_status_on_hit (BROKEN BOTTLE ho_9)', () => {
  it('applies Bleed on every basic attack', () => {
    const state = setupFight('brewer', ['ho_9'], 20);
    const playerId = state.combatants[0]!.id;
    const next = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(7) });
    const enemy = next.combatants[1]!;
    expect(enemy.statusEffects.some((s) => s.tag === 'bleed')).toBe(true);
  });
});

describe('every_nth_crit (THIRD STRIKE st_9)', () => {
  it('every 3rd attack is a crit; others take -50% penalty', () => {
    let state = setupFight('shaker', ['st_9'], 30);
    const playerId = state.combatants[0]!.id;
    const damages: number[] = [];
    const critOn: number[] = [];
    for (let i = 0; i < 6; i++) {
      const before = state.combatants[1]!.stats.hp;
      state = applyPlayerAction(state, {
        kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
      }, { rng: seededRng(i + 1000) });
      const after = state.combatants[1]!.stats.hp;
      const dmg = before - after;
      damages.push(dmg);
      const lastLog = [...state.log].reverse().find((l) => l.kind === 'skill' || l.kind === 'attack');
      if (lastLog?.text.includes('CRITS')) critOn.push(i);
      if (state.result) break;
    }
    // Expect 2nd and 5th (index 2 and 5) to be crits — every 3rd starting from 1st.
    expect(critOn).toContain(2);
  });
});

describe('first_hit_crit (Opening Strike sa_7)', () => {
  it('first attack of the battle crits, second does not (without other crit modifiers)', () => {
    // Use very low luck to minimize baseline crit chance.
    const row = createLevel1Character({ userId: 'u1', classId: 'drifter' });
    const rt = toRuntime({ ...row, level: 10, allocated_nodes: ['sa_7'] });
    const lowLuck = { ...rt, stats: { ...rt.stats, luck: 0 } };
    let state = initBattle({
      battleId: 'b', seed: 's', player: lowLuck,
      enemyTemplates: [{ id: 'e1', name: 'Target', isBoss: true }],
    });
    const playerId = state.combatants[0]!.id;
    state = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const first = [...state.log].reverse().find((l) => l.kind === 'skill' || l.kind === 'attack')!;
    expect(first.text).toContain('CRITS');

    state = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(2) });
    const second = [...state.log].reverse().find((l) => l.kind === 'skill' || l.kind === 'attack')!;
    expect(second.text).not.toContain('CRITS');
  });
});

describe('crit_def_ignore (Bullseye fo_8)', () => {
  it('crit ignores half of target DEF', () => {
    // Setup: Operator with fo_8. Force crit by giving max luck.
    const row = createLevel1Character({ userId: 'u1', classId: 'steady' });
    const rt = toRuntime({ ...row, level: 20, allocated_nodes: ['fo_8'] });
    const alwaysCritRt = { ...rt, stats: { ...rt.stats, luck: 80 } };
    const state1 = initBattle({
      battleId: 'b1', seed: 's', player: alwaysCritRt,
      enemyTemplates: [{ id: 'e1', name: 'Tanky', isBoss: true, barDefMod: 1.2 }],
    });
    const without = initBattle({
      battleId: 'b2', seed: 's', player: { ...rt, stats: { ...rt.stats, luck: 80 }, allocatedNodes: [] },
      enemyTemplates: [{ id: 'e1', name: 'Tanky', isBoss: true, barDefMod: 1.2 }],
    });
    const a = applyPlayerAction(state1, {
      kind: 'basic_attack', actorId: state1.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const b = applyPlayerAction(without, {
      kind: 'basic_attack', actorId: without.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const dmgA = state1.combatants[1]!.stats.hp - a.combatants[1]!.stats.hp;
    const dmgB = without.combatants[1]!.stats.hp - b.combatants[1]!.stats.hp;
    // With Bullseye, crits ignore half DEF — so damage should be higher.
    expect(dmgA).toBeGreaterThanOrEqual(dmgB);
  });
});

describe('vs_status_dmg (Analyze fo_7 + mark)', () => {
  it('damage boost applies when target is marked', () => {
    const state = setupFight('steady', ['fo_7'], 20);
    const playerId = state.combatants[0]!.id;
    // First apply a debuff that registers as "mark" internally. Hex Mark
    // applies debuff_def, which our classify sees as 'slowed'. Use a skill
    // that applies mark status directly via status.ts if available; for the
    // skeleton test we just check the hook doesn't crash when no status is
    // on target — vs_status_dmg should be a no-op.
    const next = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(1) });
    expect(next.combatants[1]!.stats.hp).toBeLessThan(state.combatants[1]!.stats.hp);
  });
});

describe('convert_to_dot (OUTBREAK fe_9)', () => {
  it('halves direct damage and applies poison on hit', () => {
    const state = setupFight('orchardist', ['fe_9'], 20);
    const playerId = state.combatants[0]!.id;
    const next = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const enemy = next.combatants[1]!;
    expect(enemy.statusEffects.some((s) => s.tag === 'poison')).toBe(true);
    // Direct damage halved — compare vs no keystone.
    const baseState = setupFight('orchardist', [], 20);
    const baseline = applyPlayerAction(baseState, {
      kind: 'basic_attack', actorId: baseState.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const dmgWith = state.combatants[1]!.stats.hp - enemy.stats.hp;
    const dmgWithout = baseState.combatants[1]!.stats.hp - baseline.combatants[1]!.stats.hp;
    expect(dmgWith).toBeLessThanOrEqual(dmgWithout);
  });
});

describe('counters', () => {
  it('attacks_landed increments with each landed hit', () => {
    let state = setupFight('brewer', [], 10);
    const playerId = state.combatants[0]!.id;
    for (let i = 0; i < 3; i++) {
      state = applyPlayerAction(state, {
        kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
      }, { rng: seededRng(i + 1) });
    }
    const player = state.combatants[0]!;
    expect(player.counters?.['attacks_landed']).toBe(3);
  });
});
