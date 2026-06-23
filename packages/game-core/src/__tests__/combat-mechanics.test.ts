import {
  initBattle,
  applyPlayerAction,
  SKILL_ACTIONS,
} from '../combat';
import { deriveEffectiveStats } from '../combat/status';
import { computeHookAdjustments } from '../combat/keystone-hooks';
import { createLevel1Character, toRuntime } from '../character';
import type { Combatant } from '../combat';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

function setupFight(
  classId: Parameters<typeof createLevel1Character>[0]['classId'],
  nodes: string[] = [],
  level = 20,
) {
  const row = createLevel1Character({ userId: 'u1', classId });
  const rt = toRuntime({ ...row, level, allocated_nodes: nodes });
  const state = initBattle({
    battleId: 'b1', seed: 's', player: rt,
    enemyTemplates: [{ id: 'e1', name: 'Target', isBoss: true }],
  });
  return { state, playerId: state.combatants[0]!.id };
}

// ─── (a) Ghost SPD buff as a real speed status tag ────────────────────

describe('Ghost SPD buff (buff_spd) — real speed status tag', () => {
  it('Quickening (sa_3) applies a buff_spd status, not a dodge proxy', () => {
    const { state, playerId } = setupFight('drifter', [], 20);
    const next = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1',
      skillNodeId: 'sa_3', rhythm: 'ok',
    }, { rng: seededRng(1) });
    const player = next.combatants[0]!;
    expect(player.statusEffects.some((s) => s.tag === 'buff_spd')).toBe(true);
  });

  it('sa_3 action carries a buff_spd buff in the registry (no dodge_up proxy)', () => {
    const action = SKILL_ACTIONS['sa_3']!;
    expect(action.kind).toBe('buff');
    if (action.kind === 'buff') {
      expect(action.buffs.some((b) => b.tag === 'buff_spd')).toBe(true);
      expect(action.buffs.some((b) => b.tag === 'dodge_up')).toBe(false);
    }
  });

  it('buff_spd raises effective SPD by its magnitude pct', () => {
    const { state } = setupFight('drifter', [], 20);
    const base = state.combatants[0]!;
    const baseSpd = deriveEffectiveStats(base).spd;
    const buffed: Combatant = {
      ...base,
      statusEffects: [
        { id: 's1', tag: 'buff_spd', turnsLeft: 2, magnitude: 100, label: 'spd +100' },
      ],
    };
    const buffedSpd = deriveEffectiveStats(buffed).spd;
    // +100% SPD doubles the effective speed.
    expect(buffedSpd).toBe(Math.floor(baseSpd * 2));
    expect(buffedSpd).toBeGreaterThan(baseSpd);
  });
});

// ─── (b) HOUSE EDGE coin-flip keystone (di_9) — real 2x / 0x ──────────

describe('HOUSE EDGE keystone (di_9) — real 2x/0x coin-flip', () => {
  it('won flip (<0.5) doubles damage; lost flip (>=0.5) whiffs for 0', () => {
    const baseRow = createLevel1Character({ userId: 'u1', classId: 'gambler' });
    // Reference fighter WITHOUT di_9 for a damage baseline.
    const refState = initBattle({
      battleId: 'b0', seed: 's',
      player: toRuntime({ ...baseRow, level: 20, allocated_nodes: [] }),
      enemyTemplates: [{ id: 'e1', name: 'Target', isBoss: true }],
    });
    const refHit = applyPlayerAction(refState, {
      kind: 'basic_attack', actorId: refState.combatants[0]!.id, targetId: 'e1', rhythm: 'ok',
    }, { rng: () => 0.5 }); // 0.5 = no crit
    const baselineDmg = refState.combatants[1]!.stats.hp - refHit.combatants[1]!.stats.hp;
    expect(baselineDmg).toBeGreaterThan(0);

    const { state, playerId } = setupFight('gambler', ['di_9'], 20);

    // RNG draw order in resolveSingleAttack: variance first, THEN the di_9
    // coin flip (crit is forced by all_crit and uses its own () => 0 rng).
    // WIN: variance=0.5 (neutral), coin=0.1 (< 0.5 → win).
    const winRolls = [0.5, 0.1];
    let wi = 0;
    const winRng = () => winRolls[Math.min(wi++, winRolls.length - 1)]!;
    const won = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: winRng });
    const wonDmg = state.combatants[1]!.stats.hp - won.combatants[1]!.stats.hp;
    expect(won.log.some((l) => l.text.includes('HOUSE EDGE flips true'))).toBe(true);
    // 2x scaling — clearly above a normal hit.
    expect(wonDmg).toBeGreaterThan(baselineDmg);

    // LOSE: variance=0.5 (neutral), coin=0.9 (>= 0.5 → whiff for 0).
    const lostRolls = [0.5, 0.9];
    let li = 0;
    const lostRng = () => lostRolls[Math.min(li++, lostRolls.length - 1)]!;
    const lost = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: lostRng });
    const lostDmg = state.combatants[1]!.stats.hp - lost.combatants[1]!.stats.hp;
    expect(lost.log.some((l) => l.text.includes('HOUSE EDGE flips wrong'))).toBe(true);
    expect(lostDmg).toBe(0);
  });

  it('a lost flip applies no status-on-hit (whiff is a true miss)', () => {
    const { state, playerId } = setupFight('gambler', ['di_9'], 20);
    // ho-style bleed isn't on gambler, so use Roll of the Dice has none either;
    // verify the enemy takes no damage and no DoT lands on a whiff.
    const lostRng = () => 0.9; // every draw loses
    const lost = applyPlayerAction(state, {
      kind: 'basic_attack', actorId: playerId, targetId: 'e1', rhythm: 'ok',
    }, { rng: lostRng });
    expect(lost.combatants[1]!.stats.hp).toBe(state.combatants[1]!.stats.hp);
    expect(lost.combatants[1]!.statusEffects.length).toBe(state.combatants[1]!.statusEffects.length);
  });

  it('computeHookAdjustments returns 2x scale on win, whiff on loss', () => {
    const row = createLevel1Character({ userId: 'u1', classId: 'gambler' });
    const rt = toRuntime({ ...row, level: 20, allocated_nodes: ['di_9'] });
    const actor: Combatant = {
      id: 'p', kind: 'player', name: 'P', stats: rt.stats,
      statusEffects: [], allocatedNodes: ['di_9'],
    };
    const target: Combatant = {
      id: 'e', kind: 'enemy', name: 'E', stats: rt.stats, statusEffects: [],
    };
    const ctxBase = {
      actor, target, attackIndex: 0,
      targetCursed: false, targetMarked: false, targetSlowed: false,
      targetBleeding: false, targetBurning: false, targetPoisoned: false,
      targetStunned: false, willCrit: false,
    };
    const win = computeHookAdjustments({ ...ctxBase, coinFlip: 0.2 });
    expect(win.coinFlipWon).toBe(true);
    expect(win.forceWhiff).toBe(false);
    expect(win.damageScale).toBe(2);

    const loss = computeHookAdjustments({ ...ctxBase, coinFlip: 0.8 });
    expect(loss.forceWhiff).toBe(true);
    expect(loss.coinFlipWon).toBe(false);
  });
});

// ─── (c) Hexwright Reserve / Hoarded Power stack scaling (vn_6) ───────

describe('Hexwright Unleash (vn_6) — charge stack scaling', () => {
  it('registry: vn_6 consumes charges and scales per stack', () => {
    const action = SKILL_ACTIONS['vn_6']!;
    expect(action.kind).toBe('attack');
    if (action.kind === 'attack') {
      expect(action.consumeCharges).toBe(true);
      expect(action.chargeScalingPerStack).toBeGreaterThan(0);
    }
  });

  it('deals more damage with banked charge stacks and consumes them', () => {
    // Baseline: Unleash with zero charges.
    const { state: base, playerId: bp } = setupFight('vintner', [], 30);
    const baseHit = applyPlayerAction(base, {
      kind: 'skill', actorId: bp, targetId: 'e1', skillNodeId: 'vn_6', rhythm: 'ok',
    }, { rng: () => 0.5 });
    const baseDmg = base.combatants[1]!.stats.hp - baseHit.combatants[1]!.stats.hp;

    // With 2 banked charge stacks.
    const { state, playerId } = setupFight('vintner', [], 30);
    const player = state.combatants[0]!;
    const charged = {
      ...state,
      combatants: [
        {
          ...player,
          statusEffects: [
            { id: 'c1', tag: 'charge' as const, turnsLeft: 5, magnitude: 150, label: 'charge' },
            { id: 'c2', tag: 'charge' as const, turnsLeft: 5, magnitude: 150, label: 'charge' },
          ],
        },
        ...state.combatants.slice(1),
      ],
    };
    const chargedHit = applyPlayerAction(charged, {
      kind: 'skill', actorId: playerId, targetId: 'e1', skillNodeId: 'vn_6', rhythm: 'ok',
    }, { rng: () => 0.5 });
    const chargedDmg = charged.combatants[1]!.stats.hp - chargedHit.combatants[1]!.stats.hp;

    // 2 stacks × 1.5 = +3.0 on top of 2.5 base (2.5 → 5.5), so clearly more.
    expect(chargedDmg).toBeGreaterThan(baseDmg);
    // Charges consumed on release.
    expect(chargedHit.combatants[0]!.statusEffects.some((s) => s.tag === 'charge')).toBe(false);
    expect(chargedHit.log.some((l) => l.text.includes('Hoarded Power'))).toBe(true);
  });

  it('Gather Will (vn_3) banks a charge status the actor can later unleash', () => {
    const { state, playerId } = setupFight('vintner', [], 30);
    const charged = applyPlayerAction(state, {
      kind: 'skill', actorId: playerId, targetId: 'e1', skillNodeId: 'vn_3', rhythm: 'ok',
    }, { rng: () => 0.5 });
    expect(charged.combatants[0]!.statusEffects.some((s) => s.tag === 'charge')).toBe(true);
  });
});
