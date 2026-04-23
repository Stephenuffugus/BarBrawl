import { initBattle, applyPlayerAction, advanceTurn } from '../combat';
import { createLevel1Character, toRuntime } from '../character';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

describe('Bouncer absorb-to-bank', () => {
  it('absorb sets bonus_actions_pending counter', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: toRuntime({ ...row, level: 10 }),
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    const next = applyPlayerAction(state, {
      kind: 'absorb', actorId: state.combatants[0]!.id,
    }, { rng: seededRng(1) });
    expect(next.combatants[0]!.counters?.['bonus_actions_pending']).toBe(1);
    expect(next.log.some((l) => l.text.includes('braces'))).toBe(true);
  });

  it('next turn after absorb grants an extra action via advanceTurn', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: toRuntime({ ...row, level: 10 }),
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    let s = applyPlayerAction(state, {
      kind: 'absorb', actorId: state.combatants[0]!.id,
    }, { rng: seededRng(1) });
    // Enemy takes their turn.
    s = advanceTurn(s, { rng: seededRng(2) });
    // Back to player: advanceTurn should NOT advance since bonus is banked.
    s = advanceTurn(s, { rng: seededRng(3) });
    // Player should still be the active combatant; counter consumed.
    expect(s.activeCombatantIndex).toBe(0);
    expect(s.log.some((l) => l.text.includes('bonus action'))).toBe(true);
    expect(s.combatants[0]!.counters?.['bonus_actions_pending']).toBeUndefined();
  });
});

describe('Ghost SPD-trade', () => {
  it('halves SPD and grants an immediate bonus action counter', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'drifter' });
    const rt = toRuntime({ ...row, level: 10 });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: rt,
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    const spdBefore = state.combatants[0]!.stats.spd;
    const next = applyPlayerAction(state, {
      kind: 'spd_trade', actorId: state.combatants[0]!.id,
    }, { rng: seededRng(1) });
    expect(next.combatants[0]!.stats.spd).toBe(Math.floor(spdBefore / 2));
    expect(next.combatants[0]!.counters?.['immediate_bonus_action']).toBe(1);
  });

  it('immediate bonus action keeps the player active on next advanceTurn', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'drifter' });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: toRuntime({ ...row, level: 10 }),
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    let s = applyPlayerAction(state, {
      kind: 'spd_trade', actorId: state.combatants[0]!.id,
    }, { rng: seededRng(1) });
    s = advanceTurn(s, { rng: seededRng(2) });
    // advanceTurn should see the immediate counter and not pass turn.
    expect(s.activeCombatantIndex).toBe(0);
    expect(s.combatants[0]!.counters?.['immediate_bonus_action']).toBeUndefined();
  });
});

describe('Duelist 3-perfect streak bonus', () => {
  it('chain of 3 perfects banks a bonus action', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'shaker' });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: toRuntime({ ...row, level: 20 }),
      enemyTemplates: [{ id: 'e1', name: 'T', isBoss: true }],
    });
    let s = state;
    for (let i = 0; i < 3; i++) {
      s = applyPlayerAction(s, {
        kind: 'basic_attack', actorId: s.combatants[0]!.id, targetId: 'e1', rhythm: 'perfect',
      }, { rng: seededRng(i + 1) });
      if (s.result) break;
    }
    expect(s.combatants[0]!.counters?.['bonus_actions_pending']).toBe(1);
    expect(s.combatants[0]!.counters?.['perfect_streak']).toBe(0);
  });

  it('missed rhythm resets the streak', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'shaker' });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: toRuntime({ ...row, level: 20 }),
      enemyTemplates: [{ id: 'e1', name: 'T', isBoss: true }],
    });
    let s = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: state.combatants[0]!.id, targetId: 'e1', rhythm: 'perfect',
    }, { rng: seededRng(1) });
    s = applyPlayerAction(s, {
      kind: 'basic_attack', actorId: s.combatants[0]!.id, targetId: 'e1', rhythm: 'perfect',
    }, { rng: seededRng(2) });
    s = applyPlayerAction(s, {
      kind: 'basic_attack', actorId: s.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(3) });
    expect(s.combatants[0]!.counters?.['perfect_streak']).toBe(0);
    expect(s.combatants[0]!.counters?.['bonus_actions_pending']).toBeUndefined();
  });

  it('only applies to Duelist class', () => {
    // Same sequence on a Bouncer should NOT grant the bonus.
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: toRuntime({ ...row, level: 20 }),
      enemyTemplates: [{ id: 'e1', name: 'T', isBoss: true }],
    });
    let s = state;
    for (let i = 0; i < 3; i++) {
      s = applyPlayerAction(s, {
        kind: 'basic_attack', actorId: s.combatants[0]!.id, targetId: 'e1', rhythm: 'perfect',
      }, { rng: seededRng(i + 1) });
      if (s.result) break;
    }
    expect(s.combatants[0]!.counters?.['bonus_actions_pending']).toBeUndefined();
  });
});
