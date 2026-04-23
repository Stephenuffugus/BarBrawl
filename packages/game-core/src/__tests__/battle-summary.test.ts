import { buildBattleSummary } from '../progression';
import { initBattle, applyPlayerAction } from '../combat';
import { createLevel1Character, toRuntime } from '../character';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

describe('buildBattleSummary', () => {
  function setup() {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const rt = toRuntime({ ...row, level: 20 });
    return initBattle({
      battleId: 'b1', seed: 's', player: rt,
      enemyTemplates: [
        { id: 'e1', name: 'Regular' },
        { id: 'boss', name: 'Big', isBoss: true },
      ],
    });
  }

  it('records won=false when battle still in progress', () => {
    const state = setup();
    const summary = buildBattleSummary(state, {
      barType: 'dive', barLevel: 10, playerLevel: 20,
      consumablesUsed: 0, roomsCleared: 1, goldEarned: 0,
    });
    expect(summary.won).toBe(false);
  });

  it('detects won + boss defeated when battle ends', () => {
    let state = setup();
    const playerId = state.combatants[0]!.id;
    // Hammer e1 and boss down.
    for (let i = 0; i < 60 && !state.result; i++) {
      const target = state.combatants.find((c) => c.stats.hp > 0 && (c.kind === 'enemy' || c.kind === 'boss'));
      if (!target) break;
      state = applyPlayerAction(state, {
        kind: 'basic_attack', actorId: playerId, targetId: target.id, rhythm: 'perfect',
      }, { rng: seededRng(i + 1) });
    }
    expect(state.result).toBe('win');
    const summary = buildBattleSummary(state, {
      barType: 'dive', barLevel: 10, playerLevel: 20,
      consumablesUsed: 0, roomsCleared: 2, goldEarned: 35,
    });
    expect(summary.won).toBe(true);
    expect(summary.bossDefeated).toBe(true);
    expect(summary.perfectHits).toBeGreaterThan(0);
    expect(summary.biggestHit).toBeGreaterThan(0);
  });

  it('carries over external context fields', () => {
    const state = setup();
    const summary = buildBattleSummary(state, {
      barType: 'cocktail', barLevel: 30, playerLevel: 20,
      consumablesUsed: 2, roomsCleared: 5, goldEarned: 120,
    });
    expect(summary.barType).toBe('cocktail');
    expect(summary.barLevel).toBe(30);
    expect(summary.consumablesUsed).toBe(2);
    expect(summary.roomsCleared).toBe(5);
    expect(summary.goldEarned).toBe(120);
  });

  it('endedHpPct reflects player HP at end of battle', () => {
    const state = setup();
    // Damage player to 30%.
    const player = state.combatants[0]!;
    const damaged = {
      ...state,
      combatants: state.combatants.map((c, i) => i === 0
        ? { ...c, stats: { ...c.stats, hp: Math.floor(player.stats.maxHp * 0.3) } }
        : c),
    };
    const summary = buildBattleSummary(damaged, {
      barType: 'dive', barLevel: 10, playerLevel: 20,
      consumablesUsed: 0, roomsCleared: 2, goldEarned: 0,
    });
    expect(summary.endedHpPct).toBeCloseTo(0.3, 1);
  });
});
