import type { ClassId, ResourceKind } from '../types';
import type { ClassResourceRules } from './skill-schema';

// Per-class resource generation rules. The combat engine hooks into events
// (turn_start, crit_landed, damage_taken, perfect_rhythm, dodge, overheal,
// action_taken) and calls the appropriate gain.

export const CLASS_RESOURCE_RULES: Readonly<Record<ClassId, ClassResourceRules>> = Object.freeze({
  steady: {
    kind: 'focus',
    events: [
      { on: 'turn_start', amount: 1 },
      { on: 'crit_landed', amount: 2 },
    ],
  },
  brewer: {
    kind: 'grit',
    events: [
      // +1 Grit per 10 HP damage absorbed.
      { on: 'damage_taken', perHpUnit: 10, amount: 1 },
    ],
  },
  vintner: {
    kind: 'curseStacks',
    // Curse Stacks are applied to enemies, not self. Engine writes these
    // directly via debuff resolution; no self-events here.
    events: [],
  },
  shaker: {
    kind: 'tempo',
    events: [
      { on: 'perfect_rhythm', amount: 1 },
    ],
    decayPerTurn: 1,
  },
  orchardist: {
    kind: 'reserve',
    events: [
      // +1 Reserve per point of overheal.
      { on: 'overheal', amount: 1 },
    ],
  },
  drifter: {
    kind: 'momentum',
    events: [
      { on: 'dodge', amount: 1 },
    ],
  },
  gambler: {
    kind: 'chips',
    events: [
      { on: 'action_taken', amount: 1 },
      { on: 'crit_landed', amount: 3 },
    ],
  },
});

export function rulesFor(classId: ClassId): ClassResourceRules {
  return CLASS_RESOURCE_RULES[classId];
}

/** Clamp a resource to [0, cap]. */
export function clampResource(current: number, cap: number): number {
  return Math.max(0, Math.min(cap, Math.floor(current)));
}

/** Returns resource kind if the event matches; otherwise null. */
export function gainFromEvent(
  classId: ClassId,
  event: 'turn_start' | 'crit_landed' | 'action_taken' | 'perfect_rhythm' | 'dodge' | 'overheal',
  magnitude = 1,
): { kind: ResourceKind; amount: number } | null {
  const rules = rulesFor(classId);
  for (const e of rules.events) {
    if (e.on === event && 'amount' in e) {
      return { kind: rules.kind, amount: e.amount * (event === 'overheal' ? magnitude : 1) };
    }
  }
  return null;
}

/** damage_taken variant needs perHpUnit math. */
export function gainFromDamage(classId: ClassId, hpDamage: number): { kind: ResourceKind; amount: number } | null {
  const rules = rulesFor(classId);
  for (const e of rules.events) {
    if (e.on === 'damage_taken' && 'perHpUnit' in e && 'amount' in e) {
      const amount = Math.floor(hpDamage / e.perHpUnit) * e.amount;
      if (amount > 0) return { kind: rules.kind, amount };
    }
  }
  return null;
}
