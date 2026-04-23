import { initBattle, applyPlayerAction } from '../combat';
import { createLevel1Character, toRuntime } from '../character';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

describe('Emergency Elixir auto-revive', () => {
  it('saves a player from a killing blow, restoring to 50% HP', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'vintner' });
    const rt = toRuntime({ ...row, level: 3 });
    // Make player fragile: 1 HP, boss hits hard.
    const fragile = { ...rt, stats: { ...rt.stats, hp: 1, maxHp: 100 } };
    let state = initBattle({
      battleId: 'b1', seed: 's', player: fragile,
      enemyTemplates: [{ id: 'e1', name: 'Killer', isBoss: true, barAtkMod: 1.5 }],
    });
    // Player primes Elixir.
    state = applyPlayerAction(state, {
      kind: 'consumable', actorId: state.combatants[0]!.id, consumableId: 'emergency_elixir',
    }, { rng: seededRng(1) });

    // Enemy attack — should kill but Elixir saves.
    const enemyId = state.combatants[1]!.id;
    state = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: enemyId,
      targetId: state.combatants[0]!.id, rhythm: 'ok',
    }, { rng: seededRng(2) });

    const player = state.combatants[0]!;
    expect(player.stats.hp).toBeGreaterThan(0);
    expect(player.stats.hp).toBe(50); // 50% of maxHp 100
    expect(state.log.some((l) => l.text.includes('saved by Emergency Elixir'))).toBe(true);
    // Marker consumed.
    expect(player.counters?.['revive_pending_hp']).toBeUndefined();
  });

  it('does not revive a second time in the same battle', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'vintner' });
    const rt = toRuntime({ ...row, level: 3 });
    const fragile = { ...rt, stats: { ...rt.stats, hp: 1, maxHp: 100 } };
    let state = initBattle({
      battleId: 'b1', seed: 's', player: fragile,
      enemyTemplates: [{ id: 'e1', name: 'K', isBoss: true, barAtkMod: 1.5 }],
    });
    state = applyPlayerAction(state, {
      kind: 'consumable', actorId: state.combatants[0]!.id, consumableId: 'emergency_elixir',
    }, { rng: seededRng(1) });

    // First lethal hit.
    state = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: 'e1',
      targetId: state.combatants[0]!.id, rhythm: 'ok',
    }, { rng: seededRng(2) });
    // Second lethal sequence — should not save again.
    state = {
      ...state,
      combatants: state.combatants.map((c, i) => i === 0
        ? { ...c, stats: { ...c.stats, hp: 1 } }
        : c),
    };
    state = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: 'e1',
      targetId: state.combatants[0]!.id, rhythm: 'ok',
    }, { rng: seededRng(99) });
    expect(state.combatants[0]!.stats.hp).toBe(0);
    expect(state.result).toBe('loss');
  });
});
