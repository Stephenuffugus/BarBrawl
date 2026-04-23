import type {
  BattleState, BattleLogEntry, Combatant, PlayerAction,
} from './types';
import type { SkillAction, AppliedStatus } from './skill-schema';
import { computeDamage, type RhythmQuality } from '../math/damage';
import { skillActionFor } from './skill-actions';
import { applyStatuses, tickStatuses, deriveEffectiveStats, logStatusTick } from './status';
import { gainFromEvent, gainFromDamage, clampResource, rulesFor } from './resources';
import { foldPassives } from './passive-resolver';
import { computeHookAdjustments, classifyTargetStatus } from './keystone-hooks';
import { getConsumable } from '../consumables';
import type { ClassId } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────

function replaceAt<T>(arr: readonly T[], idx: number, next: T): T[] {
  const copy = arr.slice();
  copy[idx] = next;
  return copy;
}

function findIndex(state: BattleState, id: string): number {
  return state.combatants.findIndex((c) => c.id === id);
}

function appendLog(state: BattleState, ...entries: BattleLogEntry[]): BattleLogEntry[] {
  return [...state.log, ...entries];
}

function rhythmWithDefault(r?: RhythmQuality): RhythmQuality {
  return r ?? 'ok';
}

function evaluateResult(state: BattleState): BattleState['result'] | undefined {
  const player = state.combatants.find((c) => c.kind === 'player');
  if (!player || player.stats.hp <= 0) return 'loss';
  const enemiesAlive = state.combatants.some(
    (c) => (c.kind === 'enemy' || c.kind === 'boss') && c.stats.hp > 0,
  );
  if (!enemiesAlive) return 'win';
  return undefined;
}

function advanceIndex(state: BattleState): number {
  const n = state.combatants.length;
  let i = state.activeCombatantIndex;
  for (let step = 0; step < n; step++) {
    i = (i + 1) % n;
    if (state.combatants[i]!.stats.hp > 0) return i;
  }
  return state.activeCombatantIndex;
}

// ─── resource & cooldown plumbing ────────────────────────────────────

function resourceGain(
  combatant: Combatant,
  event: 'turn_start' | 'crit_landed' | 'action_taken' | 'perfect_rhythm' | 'dodge' | 'overheal',
  magnitude = 1,
): Combatant {
  if (!combatant.classId || !combatant.resource) return combatant;
  const gain = gainFromEvent(combatant.classId, event, magnitude);
  if (!gain) return combatant;
  return {
    ...combatant,
    resource: {
      ...combatant.resource,
      current: clampResource(combatant.resource.current + gain.amount, combatant.resource.cap),
    },
  };
}

function resourceGainFromDamage(combatant: Combatant, hpDamage: number): Combatant {
  if (!combatant.classId || !combatant.resource) return combatant;
  const gain = gainFromDamage(combatant.classId, hpDamage);
  if (!gain) return combatant;
  return {
    ...combatant,
    resource: {
      ...combatant.resource,
      current: clampResource(combatant.resource.current + gain.amount, combatant.resource.cap),
    },
  };
}

function decayTempo(combatant: Combatant): Combatant {
  if (!combatant.classId || !combatant.resource) return combatant;
  const rules = rulesFor(combatant.classId as ClassId);
  if (!rules.decayPerTurn) return combatant;
  return {
    ...combatant,
    resource: {
      ...combatant.resource,
      current: clampResource(combatant.resource.current - rules.decayPerTurn, combatant.resource.cap),
    },
  };
}

function tickCooldowns(combatant: Combatant): Combatant {
  const cds = combatant.cooldowns ?? {};
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(cds)) {
    if (v > 1) next[k] = v - 1;
  }
  return { ...combatant, cooldowns: next };
}

function setCooldown(combatant: Combatant, nodeId: string, turns: number): Combatant {
  if (turns <= 0) return combatant;
  return {
    ...combatant,
    cooldowns: { ...(combatant.cooldowns ?? {}), [nodeId]: turns },
  };
}

function hasCooldown(combatant: Combatant, nodeId: string): boolean {
  return (combatant.cooldowns?.[nodeId] ?? 0) > 0;
}

// ─── damage resolution ─────────────────────────────────────────────

interface ResolveAttackOptions {
  actorIdx: number;
  targetIdx: number;
  multiplier: number;
  rhythm: RhythmQuality;
  rng: () => number;
  guaranteedHit?: boolean;
  guaranteedCrit?: boolean;
  defIgnore?: number;
  critMultiplierOverride?: number;
  statusOnHit?: readonly AppliedStatus[];
  labelPrefix?: string;
}

function resolveSingleAttack(state: BattleState, opts: ResolveAttackOptions): BattleState {
  const actor = state.combatants[opts.actorIdx]!;
  const target = state.combatants[opts.targetIdx]!;
  if (target.stats.hp <= 0) return state; // target already dead, skip

  // Passive-modifier aware effective stats.
  const enemyCount = state.combatants.filter(
    (c) => (c.kind === 'enemy' || c.kind === 'boss') && c.stats.hp > 0,
  ).length;
  const actorEff = deriveEffectiveStats(actor, { enemyCount });
  const targetEff = deriveEffectiveStats(target, { enemyCount });
  const variance = Math.floor((opts.rng() - 0.5) * 10);

  // Pull actor's passive keystones to adjust crit behavior.
  const actorMod = foldPassives(actor.allocatedNodes ?? [], {
    hpPct: actor.stats.maxHp > 0 ? actor.stats.hp / actor.stats.maxHp : 1,
    enemyCount,
    ...(actor.level !== undefined ? { level: actor.level } : {}),
  });

  // Combat hooks from keystones (auto-status, every-nth-crit, first-hit-crit,
  // convert-to-dot, crit-def-ignore, vs-status-dmg).
  const attacksLanded = actor.counters?.['attacks_landed'] ?? 0;
  const targetStatus = classifyTargetStatus(target);
  // Pre-roll willCrit (rough) for crit_def_ignore gating — exact crit is
  // rolled below, but hooks need to know beforehand. We approximate using
  // the same formula.
  const preCritChance = actorEff.luck / 80 +
    (actorMod.allCrit ? 1 : opts.guaranteedCrit ? 1 : actorMod.noCrit ? -1 : 0);
  const willCritPre = preCritChance >= 1;
  const hooks = computeHookAdjustments({
    actor, target,
    attackIndex: attacksLanded,
    ...targetStatus,
    willCrit: willCritPre,
  });

  // Crit policy: hook forceCrit > allCrit > guaranteedCrit > forceNonCrit > noCrit > default roll.
  let critBuff = 0;
  if (hooks.forceCrit) critBuff = 1;
  else if (actorMod.allCrit) critBuff = 1;
  else if (opts.guaranteedCrit) critBuff = 1;
  else if (hooks.forceNonCrit) critBuff = -1;
  else if (actorMod.noCrit) critBuff = -1;
  const critMult = actorMod.critMultOverride ?? opts.critMultiplierOverride;

  const defIgnore = (opts.defIgnore ?? 0) + hooks.extraDefIgnore;
  const defAfterIgnore = Math.max(0, targetEff.def * (1 - defIgnore));

  const critRng = (opts.guaranteedCrit || actorMod.allCrit || hooks.forceCrit) ? () => 0 : opts.rng;
  const res = computeDamage({
    attackerAtk: actorEff.atk,
    attackerLevel: 1,
    attackerLuck: actorEff.luck,
    skillMultiplier: opts.multiplier,
    rhythm: opts.rhythm,
    defenderDef: defAfterIgnore,
    variance,
    critBuff,
    ...(critMult !== undefined ? { critMultiplier: critMult } : {}),
    rng: critRng,
  });

  // Apply dmg_taken passive pct reduction to the target.
  const targetMod = foldPassives(target.allocatedNodes ?? [], {
    hpPct: target.stats.maxHp > 0 ? target.stats.hp / target.stats.maxHp : 1,
    enemyCount,
    ...(target.level !== undefined ? { level: target.level } : {}),
  });
  const damageTakenMult = 1 + targetMod.dmgTakenPct / 100;
  // Apply hook damage scale + non-crit penalty on non-crit.
  let scaledDamage = res.damage * hooks.damageScale;
  if (!res.crit) scaledDamage *= hooks.nonCritPenalty;
  const finalDamage = Math.max(1, Math.floor(scaledDamage * damageTakenMult));

  // OUTBREAK / convert_to_dot: half the direct damage, convert the rest to
  // a poison DoT applied to the target.
  const autoStatuses: AppliedStatus[] = [...hooks.extraStatuses];
  if (hooks.convertToDot) {
    // Apply a 3-turn poison for roughly the halved damage / 3 per turn.
    const perTurn = Math.max(1, Math.floor(finalDamage / 3));
    autoStatuses.push({ tag: 'poison', turns: 3, magnitude: perTurn });
  }

  const prefix = opts.labelPrefix ?? (res.crit ? 'CRITS' : 'hits');
  const entry: BattleLogEntry = {
    turn: state.turn, actorId: actor.id, kind: 'skill',
    text: `${actor.name} ${prefix} ${target.name} for ${finalDamage}${opts.rhythm === 'perfect' ? ' (perfect!)' : ''}`,
  };

  let newHp = Math.max(0, target.stats.hp - finalDamage);
  let revived = false;
  // Auto-revive check: only applies to players with the pending marker.
  if (newHp === 0 && target.kind === 'player') {
    const revivePending = target.counters?.['revive_pending_hp'];
    if (revivePending && revivePending > 0) {
      newHp = revivePending;
      revived = true;
    }
  }
  let nextTarget: Combatant = { ...target, stats: { ...target.stats, hp: newHp } };
  if (revived) {
    // Consume the marker.
    const { revive_pending_hp: _consumed, ...rest } = nextTarget.counters ?? {};
    nextTarget = { ...nextTarget, counters: rest };
  }
  if (opts.statusOnHit && opts.statusOnHit.length > 0 && newHp > 0) {
    nextTarget = applyStatuses(nextTarget, opts.statusOnHit);
  }
  if (autoStatuses.length > 0 && newHp > 0) {
    nextTarget = applyStatuses(nextTarget, autoStatuses);
  }
  let working: BattleState = {
    ...state,
    combatants: replaceAt(state.combatants, opts.targetIdx, nextTarget),
    log: appendLog(state, entry),
  };

  // Bump attacks_landed counter on the attacker.
  const bumpedActor: Combatant = {
    ...working.combatants[opts.actorIdx]!,
    counters: {
      ...(working.combatants[opts.actorIdx]!.counters ?? {}),
      attacks_landed: attacksLanded + 1,
      ...(res.crit ? { crits_landed: (working.combatants[opts.actorIdx]!.counters?.['crits_landed'] ?? 0) + 1 } : {}),
    },
  };
  working = { ...working, combatants: replaceAt(working.combatants, opts.actorIdx, bumpedActor) };

  // Resource gains on attacker: crit + perfect-rhythm + action.
  if (actor.kind === 'player') {
    let a = working.combatants[opts.actorIdx]!;
    a = resourceGain(a, 'action_taken');
    if (res.crit) a = resourceGain(a, 'crit_landed');
    if (opts.rhythm === 'perfect') a = resourceGain(a, 'perfect_rhythm');
    working = { ...working, combatants: replaceAt(working.combatants, opts.actorIdx, a) };
  }

  // Resource gain on target (for damage-taken classes like Bouncer).
  if (finalDamage > 0) {
    const t = working.combatants[opts.targetIdx]!;
    const withGrit = resourceGainFromDamage(t, finalDamage);
    working = { ...working, combatants: replaceAt(working.combatants, opts.targetIdx, withGrit) };
  }

  if (newHp === 0) {
    working = {
      ...working,
      log: appendLog(working, {
        turn: state.turn, actorId: target.id, kind: 'defeat',
        text: `${target.name} is defeated.`,
      }),
    };
  } else if (revived) {
    working = {
      ...working,
      log: appendLog(working, {
        turn: state.turn, actorId: target.id, kind: 'info',
        text: `${target.name} is saved by Emergency Elixir (${newHp} HP).`,
      }),
    };
  }
  return working;
}

// ─── SkillAction dispatcher ──────────────────────────────────────────

interface DispatchOptions {
  actorIdx: number;
  targetIdx: number;
  action: SkillAction;
  rhythm: RhythmQuality;
  rng: () => number;
  nodeId: string;
}

function resolveSkillAction(state: BattleState, opts: DispatchOptions): BattleState {
  const { action, actorIdx, targetIdx, rhythm, rng, nodeId } = opts;
  const actor = state.combatants[actorIdx]!;

  // Cooldown gate.
  if ('cooldown' in action && action.cooldown && hasCooldown(actor, nodeId)) {
    return {
      ...state,
      log: appendLog(state, {
        turn: state.turn, actorId: actor.id, kind: 'info',
        text: `${actor.name}'s skill is on cooldown.`,
      }),
    };
  }

  let working = state;

  switch (action.kind) {
    case 'attack': {
      working = resolveSingleAttack(working, {
        actorIdx, targetIdx,
        multiplier: action.multiplier,
        rhythm, rng,
        ...(action.guaranteedHit !== undefined ? { guaranteedHit: action.guaranteedHit } : {}),
        ...(action.guaranteedCrit !== undefined ? { guaranteedCrit: action.guaranteedCrit } : {}),
        ...(action.defIgnore !== undefined ? { defIgnore: action.defIgnore } : {}),
        ...(action.critMultiplierOverride !== undefined ? { critMultiplierOverride: action.critMultiplierOverride } : {}),
        ...(action.statusOnHit ? { statusOnHit: action.statusOnHit } : {}),
      });
      break;
    }
    case 'multi_hit': {
      for (let h = 0; h < action.hits; h++) {
        const latestActor = working.combatants[actorIdx]!;
        if (latestActor.stats.hp <= 0) break;
        const latestTarget = working.combatants[targetIdx]!;
        if (latestTarget.stats.hp <= 0) break;
        working = resolveSingleAttack(working, {
          actorIdx, targetIdx,
          multiplier: action.multiplierPerHit,
          rhythm, rng,
          labelPrefix: `hits (${h + 1}/${action.hits})`,
        });
      }
      if (action.selfDebuff) {
        const a = working.combatants[actorIdx]!;
        working = {
          ...working,
          combatants: replaceAt(working.combatants, actorIdx, applyStatuses(a, [action.selfDebuff])),
        };
      }
      break;
    }
    case 'aoe_attack': {
      for (let i = 0; i < working.combatants.length; i++) {
        const c = working.combatants[i]!;
        if (c.kind === 'enemy' || c.kind === 'boss') {
          if (c.stats.hp > 0) {
            working = resolveSingleAttack(working, {
              actorIdx, targetIdx: i,
              multiplier: action.multiplier,
              rhythm, rng,
              ...(action.statusOnHit ? { statusOnHit: action.statusOnHit } : {}),
              labelPrefix: 'sweeps',
            });
          }
        }
      }
      break;
    }
    case 'heal': {
      const a = working.combatants[actorIdx]!;
      if (action.condition === 'hp_below_30' && a.stats.hp > a.stats.maxHp * 0.3) {
        working = {
          ...working,
          log: appendLog(working, { turn: state.turn, actorId: a.id, kind: 'info',
            text: `${a.name}'s skill requires HP < 30%.` }),
        };
        break;
      }
      const amount = Math.floor(a.stats.maxHp * action.healPct);
      const overheal = Math.max(0, (a.stats.hp + amount) - a.stats.maxHp);
      const newHp = Math.min(a.stats.maxHp, a.stats.hp + amount);
      let newA: Combatant = { ...a, stats: { ...a.stats, hp: newHp } };
      if (action.cleanse) newA = { ...newA, statusEffects: [] };
      if (action.selfBuffs) newA = applyStatuses(newA, action.selfBuffs);
      // Medic overheal → Reserve.
      if (overheal > 0) newA = resourceGain(newA, 'overheal', overheal);
      working = {
        ...working,
        combatants: replaceAt(working.combatants, actorIdx, newA),
        log: appendLog(working, { turn: state.turn, actorId: a.id, kind: 'skill',
          text: `${a.name} heals for ${amount}${action.cleanse ? ' (cleansed)' : ''}${overheal > 0 ? ` (banked ${overheal})` : ''}.` }),
      };
      if (action.targetRule === 'all_allies') {
        for (let i = 0; i < working.combatants.length; i++) {
          if (i === actorIdx) continue;
          const c = working.combatants[i]!;
          if (c.kind === 'player' && c.stats.hp > 0) {
            const healed = Math.min(c.stats.maxHp, c.stats.hp + Math.floor(c.stats.maxHp * action.healPct));
            working = {
              ...working,
              combatants: replaceAt(working.combatants, i, { ...c, stats: { ...c.stats, hp: healed } }),
            };
          }
        }
      }
      break;
    }
    case 'skip_enemy': {
      const target = working.combatants[targetIdx]!;
      working = {
        ...working,
        combatants: replaceAt(working.combatants, targetIdx,
          applyStatuses(target, [{ tag: 'stun', turns: 1, magnitude: 1 }])),
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} skips ${target.name}'s next turn.` }),
      };
      break;
    }
    case 'buff': {
      const applyTo: number[] = action.targetRule === 'all_allies'
        ? working.combatants.map((c, i) => c.kind === 'player' && c.stats.hp > 0 ? i : -1).filter((i) => i >= 0)
        : [actorIdx];
      for (const i of applyTo) {
        const c = working.combatants[i]!;
        working = {
          ...working,
          combatants: replaceAt(working.combatants, i, applyStatuses(c, action.buffs)),
        };
      }
      working = {
        ...working,
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} buffs ${action.targetRule === 'all_allies' ? 'the party' : 'themselves'}.` }),
      };
      break;
    }
    case 'debuff': {
      const target = working.combatants[targetIdx]!;
      working = {
        ...working,
        combatants: replaceAt(working.combatants, targetIdx, applyStatuses(target, action.debuffs)),
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} applies debuffs to ${target.name}.` }),
      };
      break;
    }
    case 'dodge_boost': {
      working = {
        ...working,
        combatants: replaceAt(working.combatants, actorIdx, applyStatuses(actor,
          [{ tag: 'dodge_up', turns: action.turns, magnitude: action.dodgePct }])),
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} readies to dodge.` }),
      };
      break;
    }
    case 'block': {
      const statuses: AppliedStatus[] = [];
      if (action.hitsBlocked > 0) statuses.push({ tag: 'block', turns: action.hitsBlocked, magnitude: 1 });
      if (action.reflectPct) statuses.push({ tag: 'reflect', turns: 3, magnitude: action.reflectPct });
      working = {
        ...working,
        combatants: replaceAt(working.combatants, actorIdx, applyStatuses(actor, statuses)),
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} braces.` }),
      };
      break;
    }
    case 'charge': {
      working = {
        ...working,
        combatants: replaceAt(working.combatants, actorIdx, applyStatuses(actor, [
          { tag: 'charge', turns: action.chargeTurns, magnitude: action.releaseMultiplier * 100 },
        ])),
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} winds up (${action.chargeTurns} turn${action.chargeTurns > 1 ? 's' : ''}).` }),
      };
      break;
    }
    case 'apply_all_statuses': {
      const target = working.combatants[targetIdx]!;
      let nextTarget = applyStatuses(target, action.statusesToApply);
      // Attack component.
      working = {
        ...working,
        combatants: replaceAt(working.combatants, targetIdx, nextTarget),
      };
      working = resolveSingleAttack(working, {
        actorIdx, targetIdx, multiplier: action.multiplier, rhythm, rng,
        labelPrefix: 'unleashes on',
      });
      break;
    }
    case 'wager_coin_flip': {
      const win = rng() < 0.5;
      const mult = win ? action.winMultiplier : action.lossMultiplier;
      working = {
        ...working,
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} ${win ? 'WINS' : 'LOSES'} the wager.` }),
      };
      if (mult > 0) {
        working = resolveSingleAttack(working, {
          actorIdx, targetIdx, multiplier: mult, rhythm, rng,
        });
      }
      // Double Down: chipCost 999 = burn all chips on loss.
      if (!win && action.chipCost === 999 && actor.resource) {
        const a = working.combatants[actorIdx]!;
        if (a.resource) {
          working = {
            ...working,
            combatants: replaceAt(working.combatants, actorIdx,
              { ...a, resource: { ...a.resource, current: 0 } }),
          };
        }
      }
      break;
    }
    case 'chip_consume_attack': {
      if (!actor.resource || actor.resource.current < action.chipCost) {
        working = {
          ...working,
          log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'info',
            text: `${actor.name} lacks Chips for this skill.` }),
        };
        break;
      }
      const newA: Combatant = {
        ...actor,
        resource: { ...actor.resource, current: actor.resource.current - action.chipCost },
      };
      working = { ...working, combatants: replaceAt(working.combatants, actorIdx, newA) };
      working = resolveSingleAttack(working, {
        actorIdx, targetIdx, multiplier: action.multiplier, rhythm, rng,
        labelPrefix: 'goes all-in on',
      });
      break;
    }
    case 'random_multiplier_attack': {
      const roll = action.minMultiplier + rng() * (action.maxMultiplier - action.minMultiplier);
      working = resolveSingleAttack(working, {
        actorIdx, targetIdx, multiplier: Number(roll.toFixed(2)), rhythm, rng,
        labelPrefix: `rolls (${roll.toFixed(2)}x)`,
      });
      break;
    }
    case 'aoe_skip': {
      for (let i = 0; i < working.combatants.length; i++) {
        const c = working.combatants[i]!;
        if ((c.kind === 'enemy' || c.kind === 'boss') && c.stats.hp > 0 && rng() * 100 < action.skipChance) {
          working = {
            ...working,
            combatants: replaceAt(working.combatants, i,
              applyStatuses(c, [{ tag: 'stun', turns: 1, magnitude: 1 }])),
          };
        }
      }
      working = {
        ...working,
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} sends the room into a haze.` }),
      };
      break;
    }
    case 'reveal_and_nerf': {
      const target = working.combatants[targetIdx]!;
      working = {
        ...working,
        combatants: replaceAt(working.combatants, targetIdx, applyStatuses(target, [
          { tag: 'debuff_crit', turns: action.turns, magnitude: action.critReductionPct },
        ])),
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} reads ${target.name}'s tells.` }),
      };
      break;
    }
    case 'swap_hp_pct': {
      const target = working.combatants[targetIdx]!;
      const playerPct = actor.stats.hp / actor.stats.maxHp;
      const enemyPct = target.stats.hp / target.stats.maxHp;
      const newPlayerHp = Math.max(1, Math.floor(actor.stats.maxHp * enemyPct));
      const newEnemyHp = Math.max(1, Math.floor(target.stats.maxHp * playerPct));
      working = {
        ...working,
        combatants: replaceAt(
          replaceAt(working.combatants, actorIdx, { ...actor, stats: { ...actor.stats, hp: newPlayerHp } }),
          targetIdx, { ...target, stats: { ...target.stats, hp: newEnemyHp } },
        ),
        log: appendLog(working, { turn: state.turn, actorId: actor.id, kind: 'skill',
          text: `${actor.name} swaps HP% with ${target.name}.` }),
      };
      break;
    }
    case 'random_from_pool': {
      const picked = action.pool[Math.floor(rng() * action.pool.length)];
      if (!picked) break;
      working = resolveSkillAction(working, { actorIdx, targetIdx, action: picked, rhythm, rng, nodeId });
      break;
    }
  }

  // Cooldown set.
  if ('cooldown' in action && action.cooldown) {
    const a = working.combatants[actorIdx]!;
    working = { ...working, combatants: replaceAt(working.combatants, actorIdx, setCooldown(a, nodeId, action.cooldown)) };
  }

  working = { ...working };
  const result = evaluateResult(working);
  return result ? { ...working, result } : working;
}

// ─── public API ──────────────────────────────────────────────────────

export interface ApplyOptions {
  rng: () => number;
}

export function applyPlayerAction(
  state: BattleState,
  action: PlayerAction,
  opts: ApplyOptions,
): BattleState {
  if (state.result) return state;
  const actorIdx = findIndex(state, action.actorId);
  if (actorIdx < 0) throw new RangeError(`Actor ${action.actorId} not in battle`);
  const actor = state.combatants[actorIdx]!;

  if (action.kind === 'flee') {
    return {
      ...state,
      result: 'flee',
      log: appendLog(state, {
        turn: state.turn, actorId: actor.id, kind: 'flee',
        text: `${actor.name} flees the fight.`,
      }),
    };
  }

  if (action.kind === 'consumable') {
    if (!action.consumableId) throw new RangeError('consumable requires consumableId');
    return applyConsumable(state, actorIdx, action.consumableId);
  }

  if (action.kind === 'skill') {
    if (!action.skillNodeId) throw new RangeError('skill action requires skillNodeId');
    if (!action.targetId) throw new RangeError('skill action requires targetId');
    const targetIdx = findIndex(state, action.targetId);
    if (targetIdx < 0) throw new RangeError(`Target ${action.targetId} not in battle`);
    const sa = skillActionFor(action.skillNodeId);
    if (!sa) {
      // Unregistered node — fall back to a basic-multiplier skill attack.
      return resolveSingleAttack(state, {
        actorIdx, targetIdx, multiplier: 1.4,
        rhythm: rhythmWithDefault(action.rhythm), rng: opts.rng,
      });
    }
    return resolveSkillAction(state, {
      actorIdx, targetIdx, action: sa,
      rhythm: rhythmWithDefault(action.rhythm), rng: opts.rng,
      nodeId: action.skillNodeId,
    });
  }

  // basic_attack — plain melee hit.
  if (!action.targetId) throw new RangeError('basic_attack requires targetId');
  const targetIdx = findIndex(state, action.targetId);
  if (targetIdx < 0) throw new RangeError(`Target ${action.targetId} not in battle`);
  const after = resolveSingleAttack(state, {
    actorIdx, targetIdx, multiplier: 1.0,
    rhythm: rhythmWithDefault(action.rhythm), rng: opts.rng,
  });
  const result = evaluateResult(after);
  return result ? { ...after, result } : after;
}

export function advanceTurn(state: BattleState, opts: ApplyOptions): BattleState {
  if (state.result) return state;
  const nextIdx = advanceIndex(state);
  const nextActor = state.combatants[nextIdx]!;

  // Tick status on the incoming actor.
  const tick = tickStatuses(nextActor);
  let working: BattleState = {
    ...state,
    activeCombatantIndex: nextIdx,
    combatants: replaceAt(state.combatants, nextIdx, tick.combatant),
    log: [...state.log, ...logStatusTick(state, nextActor, tick)],
  };

  // Decay + cooldown tick.
  const actorAfter = working.combatants[nextIdx]!;
  const decayed = tickCooldowns(decayTempo(actorAfter));
  working = { ...working, combatants: replaceAt(working.combatants, nextIdx, decayed) };

  // Turn-start resource gain.
  const withTurnStart = resourceGain(working.combatants[nextIdx]!, 'turn_start');
  working = { ...working, combatants: replaceAt(working.combatants, nextIdx, withTurnStart) };

  const result = evaluateResult(working);
  if (result) return { ...working, result };

  // Enemy AI: basic attack on player unless stunned.
  if ((nextActor.kind === 'enemy' || nextActor.kind === 'boss')) {
    const player = working.combatants.find((c) => c.kind === 'player' && c.stats.hp > 0);
    if (player && !tick.stunActive) {
      working = applyPlayerAction(
        working,
        { kind: 'basic_attack', actorId: nextActor.id, targetId: player.id, rhythm: 'ok' },
        opts,
      );
    } else if (tick.stunActive) {
      working = {
        ...working,
        log: appendLog(working, { turn: state.turn, actorId: nextActor.id, kind: 'status',
          text: `${nextActor.name} is stunned and skips turn.` }),
      };
    }
  }

  if (nextActor.kind === 'player') {
    working = { ...working, turn: working.turn + 1 };
  }

  const finalResult = evaluateResult(working);
  return finalResult ? { ...working, result: finalResult } : working;
}

export function endBattle(
  state: BattleState,
  rewards: BattleState['rewards'],
): BattleState {
  return {
    ...state,
    rewards,
    log: appendLog(state, {
      turn: state.turn, actorId: 'system', kind: 'info',
      text: `Battle ended: ${state.result ?? 'unresolved'}.`,
    }),
  };
}

// ─── Consumable resolver ────────────────────────────────────────────

function applyConsumable(state: BattleState, actorIdx: number, consumableId: string): BattleState {
  const actor = state.combatants[actorIdx]!;
  const def = getConsumable(consumableId);
  const e = def.effect;
  let nextActor: Combatant = actor;
  let text = `${actor.name} uses ${def.name}.`;

  switch (e.kind) {
    case 'heal_pct': {
      const amount = Math.floor(actor.stats.maxHp * e.pct);
      const newHp = Math.min(actor.stats.maxHp, actor.stats.hp + amount);
      nextActor = { ...actor, stats: { ...actor.stats, hp: newHp } };
      text = `${actor.name} uses ${def.name} and heals for ${amount}.`;
      break;
    }
    case 'buff_self': {
      const tag = e.stat === 'atk' ? 'buff_atk'
                : e.stat === 'def' ? 'buff_def'
                : 'buff_crit';
      nextActor = applyStatuses(actor, [{ tag, turns: e.turns, magnitude: e.pct }]);
      text = `${actor.name} uses ${def.name} (+${e.pct}% ${e.stat} for ${e.turns} turns).`;
      break;
    }
    case 'cleanse': {
      nextActor = { ...actor, statusEffects: actor.statusEffects.filter((s) =>
        s.tag === 'buff_atk' || s.tag === 'buff_def') };
      text = `${actor.name} uses ${def.name} and cleanses debuffs.`;
      break;
    }
    case 'auto_revive': {
      // Store as a counter (clean, unambiguous). resolveSingleAttack reads
      // counters.revive_pending_hp on defeat and restores the combatant.
      const reviveTo = Math.floor(actor.stats.maxHp * e.hpPct);
      nextActor = {
        ...actor,
        counters: {
          ...(actor.counters ?? {}),
          revive_pending_hp: reviveTo,
        },
      };
      text = `${actor.name} uses ${def.name} (revive prepared for ${reviveTo} HP).`;
      break;
    }
  }

  return {
    ...state,
    combatants: replaceAt(state.combatants, actorIdx, nextActor),
    log: appendLog(state, {
      turn: state.turn, actorId: actor.id, kind: 'consumable', text,
    }),
  };
}
