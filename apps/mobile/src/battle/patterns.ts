// Per-attack rhythm patterns. Each attack/skill plays a short sequence of
// timed beats; nailing them all = full damage, fumbling = partial (you still
// land the hit). Derived from the skill's action kind so it feels diegetic:
// Flurry (a 3-hit skill) is a 3-tap combo; a heavy slam is one slow big beat.

import { Combat } from '@barbrawl/game-core';

export interface ComboBeat {
  /** Beat time within the track, ms from start. */
  atMs: number;
  /** Half-width of the "good" window, ms. Perfect window is half of this. */
  goodMs: number;
}

export interface ComboPattern {
  totalMs: number;
  beats: ComboBeat[];
  /** Short label shown above the track, e.g. "x3 COMBO". */
  name: string;
}

function build(n: number, opts: { lead?: number; gap?: number; goodMs?: number; name?: string } = {}): ComboPattern {
  const lead = opts.lead ?? 480;
  const gap = opts.gap ?? 420;
  const goodMs = opts.goodMs ?? 180;
  const beats: ComboBeat[] = Array.from({ length: n }, (_, i) => ({ atMs: lead + i * gap, goodMs }));
  const last = beats[beats.length - 1]!;
  return {
    totalMs: last.atMs + Math.max(380, goodMs + 160),
    beats,
    name: opts.name ?? (n === 1 ? 'STRIKE' : `x${n} COMBO`),
  };
}

/** One slow, wide, satisfying beat — for heavy slams / wind-ups. */
function heavy(name = 'WIND-UP'): ComboPattern {
  return { totalMs: 1450, beats: [{ atMs: 950, goodMs: 280 }], name };
}

/** The basic SOOTHE attack: a single clean beat. */
export function patternForBasic(): ComboPattern {
  return build(1, { lead: 560, goodMs: 220, name: 'STRIKE' });
}

/** Derive a pattern from a skill node's action kind. */
export function patternForSkill(nodeId: string): ComboPattern {
  const a = Combat.skillActionFor(nodeId) as { kind?: string; hits?: number; multiplier?: number } | undefined;
  if (!a) return build(2, { name: 'x2 COMBO' });
  switch (a.kind) {
    case 'multi_hit':
      return build(Math.min(5, Math.max(2, a.hits ?? 3)), { gap: 360, goodMs: 165 });
    case 'aoe_attack':
    case 'aoe_skip':
    case 'apply_all_statuses':
      return build(3, { gap: 400, goodMs: 175, name: 'x3 SWEEP' });
    case 'attack':
      return (a.multiplier ?? 1) >= 1.8 ? heavy('HEAVY') : build(2, { goodMs: 185 });
    case 'charge':
      return heavy('CHARGE');
    case 'random_multiplier_attack':
    case 'wager_coin_flip':
      return build(1, { lead: 520, goodMs: 200, name: 'GAMBLE' });
    default:
      // heals / buffs / debuffs / block / dodge / utility
      return build(2, { gap: 440, goodMs: 200, name: 'FOCUS' });
  }
}
