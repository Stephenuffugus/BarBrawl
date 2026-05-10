import { initBattle } from '../combat/init';
import type { PlayerAction } from '../combat/types';
import { applyPlayerAction, advanceTurn } from '../combat/turn';
import { createLevel1Character, toRuntime } from '../character';
import { validateBattleLog, replayBattle, seededRng, MAX_ACTIONS } from '../security';

function buildOperatorBattle() {
  const row = createLevel1Character({ userId: 'user-x', classId: 'steady', name: 'TestOp' });
  const runtime = toRuntime(row);
  const initial = initBattle({
    battleId: 'b1',
    seed: 'seed-deterministic-1',
    player: runtime,
    enemyTemplates: [{ id: 'e1', name: 'Drunk', barAtkMod: 1, barDefMod: 1 }],
  });
  return { initial };
}

describe('replayBattle determinism', () => {
  it('reproduces identical state from the same seed + actions', () => {
    const { initial } = buildOperatorBattle();
    const actions: PlayerAction[] = [
      { kind: 'basic_attack', actorId: initial.combatants[0]!.id, targetId: 'e1', rhythm: 'good' },
      { kind: 'basic_attack', actorId: initial.combatants[0]!.id, targetId: 'e1', rhythm: 'perfect' },
      { kind: 'basic_attack', actorId: initial.combatants[0]!.id, targetId: 'e1', rhythm: 'good' },
    ];
    const a = replayBattle(initial, actions);
    const b = replayBattle(initial, actions);
    expect(a.combatants[0]!.stats.hp).toBe(b.combatants[0]!.stats.hp);
    expect(a.combatants[1]!.stats.hp).toBe(b.combatants[1]!.stats.hp);
    expect(a.result).toBe(b.result);
  });
});

describe('validateBattleLog', () => {
  function runLive(initial: ReturnType<typeof buildOperatorBattle>['initial']) {
    let state = initial;
    const actions: PlayerAction[] = [];
    let i = 0;
    while (!state.result && i < 50) {
      const rng = seededRng(`${state.seed}:${i}`);
      const action: PlayerAction = {
        kind: 'basic_attack',
        actorId: initial.combatants[0]!.id,
        targetId: 'e1',
        rhythm: 'perfect',
      };
      actions.push(action);
      state = applyPlayerAction(state, action, { rng });
      if (!state.result) state = advanceTurn(state, { rng });
      i++;
    }
    return { final: state, actions };
  }

  it('accepts an honest battle replay', () => {
    const { initial } = buildOperatorBattle();
    const { final, actions } = runLive(initial);
    expect(final.result).toBeDefined();

    const v = validateBattleLog({
      initialState: initial,
      actions,
      claimedFinal: final,
    });
    expect(v.ok).toBe(true);
  });

  it('rejects a forged result mismatch', () => {
    const { initial } = buildOperatorBattle();
    const { final, actions } = runLive(initial);
    const flipped: 'win' | 'loss' | 'flee' = final.result === 'win' ? 'loss' : 'win';
    const forged = { ...final, result: flipped };

    const v = validateBattleLog({
      initialState: initial,
      actions,
      claimedFinal: forged,
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('result_mismatch');
  });

  it('rejects a forged HP claim', () => {
    const { initial } = buildOperatorBattle();
    const { final, actions } = runLive(initial);
    const playerIdx = final.combatants.findIndex((c) => c.kind === 'player');
    const tampered = {
      ...final,
      combatants: final.combatants.map((c, i) =>
        i === playerIdx ? { ...c, stats: { ...c.stats, hp: c.stats.maxHp } } : c,
      ),
    };

    const v = validateBattleLog({
      initialState: initial,
      actions,
      claimedFinal: tampered,
    });
    if (final.combatants[playerIdx]!.stats.hp !== final.combatants[playerIdx]!.stats.maxHp) {
      expect(v.ok).toBe(false);
      expect(v.reason).toBe('hp_mismatch');
    }
  });

  it('rejects an action log over MAX_ACTIONS', () => {
    const { initial } = buildOperatorBattle();
    const massive: PlayerAction[] = Array.from({ length: MAX_ACTIONS + 1 }, () => ({
      kind: 'basic_attack',
      actorId: initial.combatants[0]!.id,
      targetId: 'e1',
      rhythm: 'good',
    }));
    const v = validateBattleLog({
      initialState: initial,
      actions: massive,
      claimedFinal: initial,
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('log_overflow');
  });

  it('reports no_result_yet when log is too short to finish', () => {
    const { initial } = buildOperatorBattle();
    const v = validateBattleLog({
      initialState: initial,
      actions: [],
      claimedFinal: initial,
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('no_result_yet');
  });
});
