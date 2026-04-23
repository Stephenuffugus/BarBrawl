import { initBattle, applyPlayerAction } from '../combat';
import { createLevel1Character, toRuntime } from '../character';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

describe('passive effects integrate into live combat', () => {
  it('Bouncer with ho_4 (+8% ATK) hits harder than one without', () => {
    const rowNoPassive = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const rtNoPassive = toRuntime({ ...rowNoPassive, level: 10 });

    const rowPassive = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const rtPassive = toRuntime({ ...rowPassive, level: 10, allocated_nodes: ['ho_4'] });

    const state1 = initBattle({
      battleId: 'b1', seed: 's', player: rtNoPassive,
      enemyTemplates: [{ id: 'e1', name: 'Target' }],
    });
    const state2 = initBattle({
      battleId: 'b2', seed: 's', player: rtPassive,
      enemyTemplates: [{ id: 'e1', name: 'Target' }],
    });
    // Apply the same basic attack with the same seeded rng to both.
    const next1 = applyPlayerAction(state1, {
      kind: 'basic_attack', actorId: state1.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(123) });
    const next2 = applyPlayerAction(state2, {
      kind: 'basic_attack', actorId: state2.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(123) });

    const dmg1 = state1.combatants[1]!.stats.hp - next1.combatants[1]!.stats.hp;
    const dmg2 = state2.combatants[1]!.stats.hp - next2.combatants[1]!.stats.hp;
    expect(dmg2).toBeGreaterThan(dmg1);
  });

  it('Fresh Shift (ho_5) conditional +20% ATK fires when HP>80%', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const rt = toRuntime({ ...row, level: 10, allocated_nodes: ['ho_5'] });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: rt,
      enemyTemplates: [{ id: 'e1', name: 'Target' }],
    });
    // Player is at 100% HP — condition active.
    const next = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: state.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(42) });
    // Compare against same setup without Fresh Shift.
    const rtBase = toRuntime({ ...row, level: 10 });
    const stateBase = initBattle({
      battleId: 'b2', seed: 's', player: rtBase,
      enemyTemplates: [{ id: 'e1', name: 'Target' }],
    });
    const nextBase = applyPlayerAction(stateBase, {
      kind: 'basic_attack', actorId: stateBase.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(42) });
    const dmgWith = state.combatants[1]!.stats.hp - next.combatants[1]!.stats.hp;
    const dmgWithout = stateBase.combatants[1]!.stats.hp - nextBase.combatants[1]!.stats.hp;
    expect(dmgWith).toBeGreaterThan(dmgWithout);
  });

  it('ABSOLUTE CLARITY keystone makes every hit a crit', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'steady' });
    const rt = toRuntime({ ...row, level: 30, allocated_nodes: ['fo_9'] });
    const state = initBattle({
      battleId: 'b1', seed: 's', player: rt,
      enemyTemplates: [{ id: 'e1', name: 'Durable', isBoss: true }],
    });
    // Over 6 swings, every log line should say CRITS.
    let s = state;
    let critHits = 0;
    let totalHits = 0;
    for (let i = 0; i < 6; i++) {
      s = applyPlayerAction(s, {
        kind: 'basic_attack', actorId: s.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
      }, { rng: seededRng(i + 100) });
      const lastSkill = [...s.log].reverse().find((l) => l.kind === 'skill' || l.kind === 'attack');
      if (lastSkill) {
        totalHits++;
        if (lastSkill.text.includes('CRITS')) critHits++;
      }
      if (s.result) break;
    }
    expect(totalHits).toBeGreaterThan(0);
    expect(critHits).toBe(totalHits);
  });

  it('IMMOVABLE keystone prevents crits', () => {
    // Give the player high luck then equip IMMOVABLE (no_crit). Swing many
    // times with favorable rng; no crit should land.
    const row = createLevel1Character({ userId: 'u1', classId: 'steady' });
    const rt = toRuntime({
      ...row, level: 30, allocated_nodes: ['re_9'],
      // Inject very high luck to make crits likely without the keystone.
    });
    // Override luck to 80 (would be 100% crit without keystone).
    const boosted = { ...rt, stats: { ...rt.stats, luck: 80 } };
    const state = initBattle({
      battleId: 'b1', seed: 's', player: boosted,
      enemyTemplates: [{ id: 'e1', name: 'Target', isBoss: true }],
    });
    let s = state;
    let critHits = 0;
    for (let i = 0; i < 20; i++) {
      s = applyPlayerAction(s, {
        kind: 'basic_attack', actorId: s.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
      }, { rng: seededRng(i + 1) });
      const lastSkill = [...s.log].reverse().find((l) => l.kind === 'skill' || l.kind === 'attack');
      if (lastSkill?.text.includes('CRITS')) critHits++;
      if (s.result) break;
    }
    expect(critHits).toBe(0);
  });

  it('Stoic (-5% dmg taken) reduces incoming damage', () => {
    const rowBase = createLevel1Character({ userId: 'u1', classId: 'steady' });
    const rtBase = toRuntime({ ...rowBase, level: 10 });
    const rtStoic = toRuntime({ ...rowBase, level: 10, allocated_nodes: ['re_2'] });

    // Strong enemy attacking a fresh player.
    const setupFor = (rt: typeof rtBase) => initBattle({
      battleId: 'b', seed: 's', player: rt,
      enemyTemplates: [{ id: 'e1', name: 'Heavy', isBoss: true, barAtkMod: 1.4 }],
    });
    // Use deterministic sequence: advance enemy turn (enemy attacks player).
    const advance = (state: ReturnType<typeof setupFor>) => {
      // First advance goes to enemy, they attack. Second wraps back to player.
      const s1 = require('../combat').advanceTurn(state, { rng: seededRng(777) });
      return s1;
    };
    const s1 = advance(setupFor(rtBase));
    const s2 = advance(setupFor(rtStoic));

    const baseDmg = rtBase.stats.maxHp - s1.combatants[0]!.stats.hp;
    const stoicDmg = rtStoic.stats.maxHp - s2.combatants[0]!.stats.hp;
    expect(stoicDmg).toBeLessThan(baseDmg);
  });
});
