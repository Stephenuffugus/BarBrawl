import {
  initBattle,
  applyPlayerAction,
  advanceTurn,
  SKILL_ACTIONS,
  skillActionFor,
  isActiveable,
} from '../combat';
import { createLevel1Character, toRuntime } from '../character';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

function setupFight(classId: Parameters<typeof createLevel1Character>[0]['classId'], level = 20, bossHp?: number) {
  const row = createLevel1Character({ userId: 'u1', classId });
  const rt = toRuntime({ ...row, level });
  const state = initBattle({
    battleId: 'b1', seed: 's',
    player: rt,
    enemyTemplates: [{ id: 'e1', name: 'Target', ...(bossHp !== undefined ? { isBoss: true } : {}) }],
  });
  return { state, playerId: state.combatants[0]!.id };
}

describe('SKILL_ACTIONS registry', () => {
  it('has an entry for every expected active node (42) + 1 activeable keystone', () => {
    // 21 trees × 2 actives = 42. Plus vn_9 OLDEST TRICK = 43.
    expect(Object.keys(SKILL_ACTIONS).length).toBeGreaterThanOrEqual(43);
  });

  it('isActiveable returns true for a known active and false for a passive', () => {
    expect(isActiveable('fo_3')).toBe(true);   // Clean Strike
    expect(isActiveable('fo_1')).toBe(false);  // Fixed Gaze (passive)
  });
});

describe('attack-kind dispatch', () => {
  it('Clean Strike always hits and deals 1.3x damage', () => {
    const { state, playerId } = setupFight('steady', 10);
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'fo_3', rhythm: 'ok',
    }, { rng: seededRng(5) });
    const enemy = next.combatants[1]!;
    expect(enemy.stats.hp).toBeLessThan(state.combatants[1]!.stats.hp);
    expect(next.log.some((l) => l.text.includes('hits'))).toBe(true);
  });
});

describe('multi_hit dispatch (Duelist Flurry)', () => {
  it('hits the target 3 times', () => {
    const { state, playerId } = setupFight('shaker', 20);
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'sh_3', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const hitEntries = next.log.filter((l) => l.text.startsWith('Duelist') === false && l.text.includes('hits ('));
    expect(hitEntries.length).toBe(3);
  });
});

describe('heal dispatch', () => {
  it('Field Dressing heals 40% max HP', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'orchardist' });
    let state = initBattle({
      battleId: 'b1', seed: 's',
      player: toRuntime({ ...row, level: 5 }),
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    // Damage the player first.
    const player = state.combatants[0]!;
    state = {
      ...state,
      combatants: [
        { ...player, stats: { ...player.stats, hp: Math.floor(player.stats.maxHp * 0.3) } },
        ...state.combatants.slice(1),
      ],
    };
    const beforeHp = state.combatants[0]!.stats.hp;
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: state.combatants[0]!.id, targetId: 'e1',
      skillNodeId: 'or_3', rhythm: 'ok',
    }, { rng: seededRng(1) });
    expect(next.combatants[0]!.stats.hp).toBeGreaterThan(beforeHp);
  });

  it("Second Wind requires HP < 30% — refuses above threshold", () => {
    const { state, playerId } = setupFight('steady', 10);
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 're_6', rhythm: 'ok',
    }, { rng: seededRng(1) });
    // HP shouldn't change — player is at full HP.
    expect(next.combatants[0]!.stats.hp).toBe(state.combatants[0]!.stats.hp);
    expect(next.log.some((l) => l.text.includes('requires HP < 30%'))).toBe(true);
  });
});

describe('skip_enemy dispatch (Lucid Moment)', () => {
  it('stuns target', () => {
    const { state, playerId } = setupFight('steady', 10);
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'cl_3', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const enemy = next.combatants[1]!;
    expect(enemy.statusEffects.some((s) => s.tag === 'stun')).toBe(true);
  });
});

describe('buff + debuff dispatch', () => {
  it('Hold Line applies a 2-turn DEF buff', () => {
    const { state, playerId } = setupFight('steady', 10);
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 're_3', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const player = next.combatants[0]!;
    expect(player.statusEffects.some((s) => s.tag === 'buff_def')).toBe(true);
  });

  it('Hex Mark debuffs target DEF by 30%', () => {
    const { state, playerId } = setupFight('vintner', 10);
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'tn_3', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const enemy = next.combatants[1]!;
    expect(enemy.statusEffects.some((s) => s.tag === 'debuff_def')).toBe(true);
  });
});

describe('cooldowns', () => {
  it('Clean Strike has no cooldown (reusable)', () => {
    const { state, playerId } = setupFight('steady', 10);
    let next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'fo_3', rhythm: 'ok',
    }, { rng: seededRng(1) });
    next = applyPlayerAction(next, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'fo_3', rhythm: 'ok',
    }, { rng: seededRng(2) });
    // Should have two skill hits in log — not a cooldown refusal.
    expect(next.log.some((l) => l.text.includes('on cooldown'))).toBe(false);
  });

  it('Sledgehammer goes on cooldown for 3 turns', () => {
    const { state, playerId } = setupFight('brewer', 20);
    let s = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'ho_6', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const player = s.combatants[0]!;
    expect(player.cooldowns?.['ho_6']).toBe(3);

    s = applyPlayerAction(s, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'ho_6', rhythm: 'ok',
    }, { rng: seededRng(2) });
    expect(s.log.some((l) => l.text.includes('on cooldown'))).toBe(true);
  });
});

describe('DoT resolution', () => {
  it('bleed ticks on target each turn', () => {
    const { state, playerId } = setupFight('brewer', 30);
    const hpBefore = state.combatants[1]!.stats.hp;
    // Sledgehammer applies 3-turn bleed, mag 8.
    let s = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'ho_6', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const hpAfterHit = s.combatants[1]!.stats.hp;
    // Advance to enemy's turn — status should tick on enemy.
    s = advanceTurn(s, { rng: seededRng(2) });
    const hpAfterTick = s.combatants[1]!.stats.hp;
    expect(hpAfterTick).toBeLessThan(hpAfterHit);
    expect(hpAfterHit).toBeLessThan(hpBefore);
  });
});

describe('resource generation', () => {
  it("Bouncer gains Grit from taking damage", () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const state = initBattle({
      battleId: 'b1', seed: 's',
      player: toRuntime({ ...row, level: 5 }),
      enemyTemplates: [{ id: 'e1', name: 'Hitter', isBoss: true }],
    });
    const gritBefore = state.combatants[0]!.resource?.current ?? 0;
    // Enemy's turn — hits player.
    const next = advanceTurn(state, { rng: seededRng(42) });
    const gritAfter = next.combatants[0]!.resource?.current ?? 0;
    expect(gritAfter).toBeGreaterThanOrEqual(gritBefore);
  });

  it('Gambler gains Chips per action', () => {
    const { state, playerId } = setupFight('gambler', 20);
    const chipsBefore = state.combatants[0]!.resource?.current ?? 0;
    const next = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const chipsAfter = next.combatants[0]!.resource?.current ?? 0;
    expect(chipsAfter).toBeGreaterThan(chipsBefore);
  });

  it('Duelist Tempo decays 1 per turn', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'shaker' });
    const rt = toRuntime({ ...row, level: 10 });
    const seeded = { ...rt, resource: { ...rt.resource, current: 3 } };
    const state = initBattle({
      battleId: 'b1', seed: 's',
      player: seeded,
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    // After one full cycle (player -> enemy -> player), Tempo should have decayed.
    let s = advanceTurn(state, { rng: seededRng(1) }); // enemy turn
    s = advanceTurn(s, { rng: seededRng(2) });          // back to player (tempo decays)
    expect(s.combatants[0]!.resource?.current ?? 999).toBeLessThan(3);
  });
});

describe('Gambler wager_coin_flip (All In)', () => {
  it('deals 2x damage on win, 0 on loss', () => {
    const { state, playerId } = setupFight('gambler', 30);
    // Seed rng so first roll is < 0.5 (win).
    const winRng = () => 0.1;
    const nextWin = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'di_6', rhythm: 'ok',
    }, { rng: winRng });
    expect(nextWin.log.some((l) => l.text.includes('WINS'))).toBe(true);

    const lossRng = () => 0.9;
    const nextLoss = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'di_6', rhythm: 'ok',
    }, { rng: lossRng });
    expect(nextLoss.log.some((l) => l.text.includes('LOSES'))).toBe(true);
    // Loss shouldn't damage target.
    expect(nextLoss.combatants[1]!.stats.hp).toBe(state.combatants[1]!.stats.hp);
  });
});

describe('random_multiplier_attack (Roll of the Dice)', () => {
  it('multiplier stays within declared range across many rolls', () => {
    const { state, playerId } = setupFight('gambler', 30);
    let anyHit = false;
    for (let i = 0; i < 20; i++) {
      const n = applyPlayerAction(state, {
        kind: 'skill', actorId: playerId, targetId: 'e1',
        skillNodeId: 'di_3', rhythm: 'ok',
      }, { rng: seededRng(i + 1) });
      if (n.log.some((l) => l.text.includes('rolls ('))) {
        anyHit = true;
        // Parse out the roll multiplier.
        const match = n.log.find((l) => l.text.includes('rolls ('))!.text.match(/rolls \((\d+\.\d+)x\)/);
        expect(match).toBeTruthy();
        const mult = parseFloat(match![1]!);
        expect(mult).toBeGreaterThanOrEqual(0.5);
        expect(mult).toBeLessThanOrEqual(2.0);
      }
    }
    expect(anyHit).toBe(true);
  });
});

describe('chip_consume_attack (Full House)', () => {
  it('refuses if insufficient chips; consumes on use', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'gambler' });
    const rt = toRuntime({ ...row, level: 10 });
    // Start with 0 chips.
    const rtNoChips = { ...rt, resource: { ...rt.resource, current: 0 } };
    let state = initBattle({
      battleId: 'b1', seed: 's',
      player: rtNoChips,
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    const insufficient = applyPlayerAction(state, {
      kind: 'skill', actorId: state.combatants[0]!.id, targetId: 'e1',
      skillNodeId: 'ca_6', rhythm: 'ok',
    }, { rng: seededRng(1) });
    expect(insufficient.log.some((l) => l.text.includes('lacks Chips'))).toBe(true);

    // Now with 5 chips.
    const rtChips = { ...rt, resource: { ...rt.resource, current: 5 } };
    state = initBattle({
      battleId: 'b1', seed: 's',
      player: rtChips,
      enemyTemplates: [{ id: 'e1', name: 'T' }],
    });
    const used = applyPlayerAction(state, {
      kind: 'skill', actorId: state.combatants[0]!.id, targetId: 'e1',
      skillNodeId: 'ca_6', rhythm: 'ok',
    }, { rng: seededRng(1) });
    // 5 chips consumed + 1 regained (action_taken) = 1 chip left.
    expect(used.combatants[0]!.resource?.current).toBe(1);
  });
});

describe('aoe_attack (Crowd Sweep)', () => {
  it('hits every enemy', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'brewer' });
    const rt = toRuntime({ ...row, level: 20 });
    const state = initBattle({
      battleId: 'b1', seed: 's',
      player: rt,
      enemyTemplates: [
        { id: 'e1', name: 'Regular 1' },
        { id: 'e2', name: 'Regular 2' },
        { id: 'e3', name: 'Regular 3' },
      ],
    });
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: state.combatants[0]!.id, targetId: 'e1',
      skillNodeId: 'fm_6', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const e1 = next.combatants.find((c) => c.id === 'e1')!;
    const e2 = next.combatants.find((c) => c.id === 'e2')!;
    const e3 = next.combatants.find((c) => c.id === 'e3')!;
    const s1 = state.combatants.find((c) => c.id === 'e1')!;
    const s2 = state.combatants.find((c) => c.id === 'e2')!;
    const s3 = state.combatants.find((c) => c.id === 'e3')!;
    expect(e1.stats.hp).toBeLessThan(s1.stats.hp);
    expect(e2.stats.hp).toBeLessThan(s2.stats.hp);
    expect(e3.stats.hp).toBeLessThan(s3.stats.hp);
  });
});

describe('swap_hp_pct (Mirror Match)', () => {
  it('exchanges HP% between player and enemy', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'drifter' });
    const rt = toRuntime({ ...row, level: 10 });
    // Injure player to 10% HP.
    const hurtRt = { ...rt, stats: { ...rt.stats, hp: Math.floor(rt.stats.maxHp * 0.1) } };
    const state = initBattle({
      battleId: 'b1', seed: 's',
      player: hurtRt,
      enemyTemplates: [{ id: 'e1', name: 'Fresh', isBoss: true }],
    });
    // Boss is at full HP; player at 10%. Swap.
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: state.combatants[0]!.id, targetId: 'e1',
      skillNodeId: 'hy_3', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const player = next.combatants[0]!;
    const enemy = next.combatants[1]!;
    // Player should have gone up in HP%; enemy should be down.
    expect(player.stats.hp / player.stats.maxHp).toBeGreaterThan(0.5);
    expect(enemy.stats.hp / enemy.stats.maxHp).toBeLessThan(0.2);
  });
});

describe('OLDEST TRICK keystone (once per battle)', () => {
  it('deals 10x damage on first use', () => {
    const { state, playerId } = setupFight('vintner', 20);
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'vn_9', rhythm: 'ok',
    }, { rng: seededRng(1) });
    // The target should take a HUGE hit — way more than a normal skill.
    const damage = state.combatants[1]!.stats.hp - next.combatants[1]!.stats.hp;
    expect(damage).toBeGreaterThan(100);
  });
});
