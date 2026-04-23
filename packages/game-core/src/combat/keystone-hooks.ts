import type { Combatant } from './types';
import type { AppliedStatus, PassiveEffect } from './skill-schema';
import { passiveFor } from './passive-effects';

// Combat hooks for passive effects that fire DURING attack resolution
// rather than modifying stats. Called from resolveSingleAttack.
//
// Keystones that behave as hooks:
//   - auto_status_on_hit   : BROKEN BOTTLE (ho_9) applies Bleed every hit
//   - every_nth_crit       : THIRD STRIKE (st_9) every 3rd attack crits,
//                            non-crits -50%
//   - first_hit_crit       : Opening Strike (sa_7) first hit crits
//   - convert_to_dot       : OUTBREAK (fe_9) halves direct dmg → DoT
//   - crit_def_ignore      : Bullseye (fo_8) crits ignore 50% DEF
//   - vs_status_dmg        : Analyze (+10% vs marked), Marked For Pain
//                            (+25% vs cursed), Sitting Duck (vs slowed)

export interface HookResult {
  /** Additional statuses to apply to target on hit. */
  extraStatuses: AppliedStatus[];
  /** Damage scale applied to final damage (1.0 = no change). */
  damageScale: number;
  /** Force a crit regardless of roll. */
  forceCrit: boolean;
  /** Force non-crit regardless of roll. */
  forceNonCrit: boolean;
  /** Additional DEF-ignore fraction on top of any passed in. */
  extraDefIgnore: number;
  /** Non-crit damage penalty (0..1). Multiplied with final damage on non-crit. */
  nonCritPenalty: number;
  /** Whether to convert this attack to pure DoT (OUTBREAK). */
  convertToDot: boolean;
  /** DoT magnitude when convertToDot is true. */
  dotMagnitudeOverride?: number;
}

function empty(): HookResult {
  return {
    extraStatuses: [],
    damageScale: 1,
    forceCrit: false,
    forceNonCrit: false,
    extraDefIgnore: 0,
    nonCritPenalty: 1,
    convertToDot: false,
  };
}

export interface HookContext {
  actor: Combatant;
  target: Combatant;
  /** Count of attacks landed by this actor so far this battle. */
  attackIndex: number;
  /** Is target currently cursed? (has mark/curse status). */
  targetCursed: boolean;
  targetMarked: boolean;
  targetSlowed: boolean;
  targetBleeding: boolean;
  targetBurning: boolean;
  targetPoisoned: boolean;
  targetStunned: boolean;
  /** Whether a crit is about to land (before hooks). */
  willCrit: boolean;
}

export function computeHookAdjustments(ctx: HookContext): HookResult {
  const r = empty();
  for (const nodeId of ctx.actor.allocatedNodes ?? []) {
    const p = passiveFor(nodeId);
    if (!p) continue;
    applyHook(r, p, nodeId, ctx);
  }
  return r;
}

function applyHook(r: HookResult, p: PassiveEffect, _nodeId: string, ctx: HookContext) {
  switch (p.kind) {
    case 'auto_status_on_hit':
      r.extraStatuses.push({ tag: p.tag, turns: p.turns, magnitude: p.magnitude });
      break;

    case 'every_nth_crit':
      // attackIndex is 0-based for attacks landed. The NEXT attack is
      // attackIndex+1. Every Nth starting from N means (index+1) % N === 0.
      if ((ctx.attackIndex + 1) % p.n === 0) {
        r.forceCrit = true;
      } else {
        // Non-crits take the penalty.
        r.nonCritPenalty = Math.min(r.nonCritPenalty, p.nonCritPenalty);
      }
      break;

    case 'first_hit_crit':
      if (ctx.attackIndex === 0) {
        r.forceCrit = true;
      }
      break;

    case 'convert_to_dot':
      r.convertToDot = true;
      r.damageScale *= p.directScale;
      // DoT magnitude comes from scaled damage baseline — resolver decides.
      break;

    case 'crit_def_ignore':
      if (ctx.willCrit || r.forceCrit) {
        r.extraDefIgnore = Math.max(r.extraDefIgnore, p.value);
      }
      break;

    case 'vs_status_dmg': {
      const tagHit = (
        (p.tag === 'curse' && ctx.targetCursed) ||
        (p.tag === 'mark' && ctx.targetMarked) ||
        (p.tag === 'slow' && ctx.targetSlowed) ||
        (p.tag === 'bleed' && ctx.targetBleeding) ||
        (p.tag === 'burn' && ctx.targetBurning) ||
        (p.tag === 'poison' && ctx.targetPoisoned) ||
        (p.tag === 'stun' && ctx.targetStunned)
      );
      if (tagHit) {
        r.damageScale *= 1 + p.value / 100;
      }
      break;
    }
  }
}

/** Classify target's current status effects into boolean flags. */
export function classifyTargetStatus(target: Combatant): Pick<
  HookContext,
  'targetCursed' | 'targetMarked' | 'targetSlowed' | 'targetBleeding' | 'targetBurning' | 'targetPoisoned' | 'targetStunned'
> {
  let cursed = false, marked = false, slowed = false;
  let bleeding = false, burning = false, poisoned = false, stunned = false;
  for (const s of target.statusEffects) {
    // Status tags in schema.tag form (the schema's StatusEffectTag) are stored
    // on StatusEffect via the `tag` field of applyStatuses. Our internal tags
    // collapse some variants (see status.ts toInternalTag). Approximations:
    if (s.tag === 'mark')       { marked = true; cursed = true; /* mark tag reused for curse */ }
    if (s.tag === 'debuff_def') { slowed = true; /* slow collapses to debuff_def internally */ }
    if (s.tag === 'bleed')      bleeding = true;
    if (s.tag === 'burn')       burning = true;
    if (s.tag === 'poison')     poisoned = true;
    if (s.tag === 'stun')       stunned = true;
  }
  return {
    targetCursed: cursed,
    targetMarked: marked,
    targetSlowed: slowed,
    targetBleeding: bleeding,
    targetBurning: burning,
    targetPoisoned: poisoned,
    targetStunned: stunned,
  };
}
