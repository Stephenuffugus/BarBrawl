import type { Combatant, StatusEffect, BattleLogEntry, BattleState } from './types';
import type { AppliedStatus, StatusEffectTag } from './skill-schema';
import { foldPassives, applyModifier, type PassiveContext } from './passive-resolver';

// Status effect resolution. Two entry points:
//   - applyStatuses(target, applied[], turn) → new Combatant with new statuses
//   - tickStatuses(combatant, turn) → { combatant, dotDamage, expired[] }
//     called at the start of that combatant's turn.
//
// Status effects are additive by tag — re-applying "bleed" while one is
// active adds a second instance. The resolver sums magnitudes when
// computing effective stats (in deriveEffectiveStats below).

function nextStatusId(): string {
  return `st_${Math.random().toString(36).slice(2, 10)}`;
}

export function applyStatuses(target: Combatant, applied: readonly AppliedStatus[]): Combatant {
  if (applied.length === 0) return target;
  const additions: StatusEffect[] = applied.map((a) => ({
    id: nextStatusId(),
    tag: toInternalTag(a.tag),
    turnsLeft: a.turns,
    magnitude: a.magnitude,
    label: humanReadableTag(a.tag, a.magnitude),
  }));
  return { ...target, statusEffects: [...target.statusEffects, ...additions] };
}

/** Map schema tags to the internal tag set on StatusEffect. */
function toInternalTag(tag: StatusEffectTag): StatusEffect['tag'] {
  switch (tag) {
    case 'bleed':      return 'bleed';
    case 'burn':       return 'burn';
    case 'poison':     return 'poison';
    case 'stun':       return 'stun';
    case 'blind':      return 'mark'; // blind tracked as negative-mark for now
    case 'mark':       return 'mark';
    case 'curse':      return 'mark';
    case 'slow':       return 'debuff_def'; // approximate until SPD debuff lands
    case 'buff_atk':   return 'buff_atk';
    case 'buff_def':   return 'buff_def';
    case 'buff_crit':  return 'buff_atk'; // reuse atk slot; crit buff not yet distinct
    case 'debuff_atk': return 'debuff_def';
    case 'debuff_def': return 'debuff_def';
    case 'debuff_crit':return 'debuff_def';
    case 'dodge_up':   return 'buff_def';
    case 'block':      return 'buff_def';
    case 'immune_dot': return 'buff_def';
    case 'reflect':    return 'buff_def';
    case 'charge':     return 'buff_atk';
  }
}

function humanReadableTag(tag: StatusEffectTag, mag: number): string {
  return `${tag} ${mag > 0 ? '+' : ''}${mag}`;
}

export interface TickResult {
  combatant: Combatant;
  dotDamage: number;
  stunActive: boolean;
  expired: readonly StatusEffect[];
}

/**
 * Called at the start of a combatant's turn. Applies DoT damage, checks
 * stun (caller should skip the action if stunActive), and decrements
 * durations. Expired effects are returned for logging.
 */
export function tickStatuses(c: Combatant): TickResult {
  let dotDamage = 0;
  let stunActive = false;
  const remaining: StatusEffect[] = [];
  const expired: StatusEffect[] = [];

  for (const s of c.statusEffects) {
    if (s.tag === 'bleed' || s.tag === 'burn' || s.tag === 'poison') {
      dotDamage += s.magnitude;
    }
    if (s.tag === 'stun') {
      stunActive = true;
    }
    const turnsLeft = s.turnsLeft - 1;
    if (turnsLeft > 0) remaining.push({ ...s, turnsLeft });
    else expired.push(s);
  }

  const newHp = Math.max(0, c.stats.hp - dotDamage);
  const combatant: Combatant = {
    ...c,
    stats: { ...c.stats, hp: newHp },
    statusEffects: remaining,
  };
  return { combatant, dotDamage, stunActive, expired };
}

/**
 * Compute effective stats:
 *   1. Start with base stats from the Combatant.
 *   2. Apply PASSIVE_EFFECTS from allocatedNodes (conditional on hpPct,
 *      enemyCount, level, etc).
 *   3. Layer active status-effect buffs/debuffs on top.
 */
export function deriveEffectiveStats(
  c: Combatant,
  ctx: Partial<PassiveContext> = {},
): Combatant['stats'] {
  // Step 1-2: passives.
  const passiveCtx: PassiveContext = {
    hpPct: c.stats.maxHp > 0 ? c.stats.hp / c.stats.maxHp : 1,
    enemyCount: ctx.enemyCount ?? 1,
    ...(c.level !== undefined ? { level: c.level } : {}),
    ...(ctx.hasCurse !== undefined ? { hasCurse: ctx.hasCurse } : {}),
    ...(ctx.hasMark !== undefined ? { hasMark: ctx.hasMark } : {}),
    ...(ctx.stunned !== undefined ? { stunned: ctx.stunned } : {}),
  };
  const passiveMod = foldPassives(c.allocatedNodes ?? [], passiveCtx);
  const afterPassives = applyModifier(c.stats, passiveMod);

  // Step 3: status buffs/debuffs.
  let atkBuff = 0;
  let defBuff = 0;
  let defDebuff = 0;
  for (const s of c.statusEffects) {
    if (s.tag === 'buff_atk')   atkBuff   += s.magnitude;
    if (s.tag === 'buff_def')   defBuff   += s.magnitude;
    if (s.tag === 'debuff_def') defDebuff += s.magnitude;
  }
  const atk = Math.floor(afterPassives.atk * (1 + atkBuff / 100));
  const defBase = afterPassives.def * (1 + defBuff / 100);
  const def = Math.max(0, Math.floor(defBase * (1 - defDebuff / 100)));
  return { ...afterPassives, atk, def };
}

/** Logs status ticks on a state, mutating log. */
export function logStatusTick(
  state: BattleState,
  combatant: Combatant,
  result: TickResult,
): readonly BattleLogEntry[] {
  const entries: BattleLogEntry[] = [];
  if (result.dotDamage > 0) {
    entries.push({
      turn: state.turn, actorId: combatant.id, kind: 'status',
      text: `${combatant.name} takes ${result.dotDamage} DoT damage.`,
    });
  }
  for (const e of result.expired) {
    entries.push({
      turn: state.turn, actorId: combatant.id, kind: 'status',
      text: `${combatant.name}'s ${e.label} expired.`,
    });
  }
  return entries;
}
