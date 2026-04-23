import type { AnointmentDef } from './types';
import type { ClassId } from '../types';

// Class anointments — the Legendary-only guaranteed affix that makes a
// Legendary a BUILD item, not a stat bump (Borderlands BL3 pattern).
//
// Each anointment references a specific skill-tree node (nodeRef) — it
// modifies that node's behavior or interacts with that class's resource.
// Three per class at launch; add more as content cycles add new builds.

const operator: readonly AnointmentDef[] = [
  {
    id: 'op_focus_gen_on_crit',
    classId: 'steady',
    name: 'Sniper\'s Drift',
    effectText: 'Crits generate +2 Focus instead of +1.',
    nodeRef: 'fo_5', // Laser Focus
  },
  {
    id: 'op_analyze_spread',
    classId: 'steady',
    name: 'Cold Analysis',
    effectText: 'Analyze also marks all enemies in the same room.',
    nodeRef: 'fo_7', // Analyze
  },
  {
    id: 'op_recall_carryover',
    classId: 'steady',
    name: 'Continuous Memory',
    effectText: 'Perfect Recall XP bonus also applies to gold.',
    nodeRef: 'cl_9', // PERFECT RECALL
  },
];

const bouncer: readonly AnointmentDef[] = [
  {
    id: 'bo_grit_low_hp',
    classId: 'brewer',
    name: 'Last Call',
    effectText: 'Grit generation +50% while HP < 30%.',
    nodeRef: 'ba_8', // Cornered
  },
  {
    id: 'bo_bleed_spread',
    classId: 'brewer',
    name: 'Broken Bottle Shards',
    effectText: 'Bleed DoTs spread to the next enemy hit.',
    nodeRef: 'ho_9', // BROKEN BOTTLE keystone
  },
  {
    id: 'bo_dodge_bank',
    classId: 'brewer',
    name: 'Counterweight',
    effectText: 'Each dodge banks +3 Grit.',
    nodeRef: 'fm_5', // Slip & Counter
  },
];

const hexwright: readonly AnointmentDef[] = [
  {
    id: 'hx_curse_crit_detonate',
    classId: 'vintner',
    name: 'Scarring Hex',
    effectText: 'Crits on cursed enemies detonate one stack for 2x.',
    nodeRef: 'tn_8', // Harbinger
  },
  {
    id: 'hx_debuff_stack_extra',
    classId: 'vintner',
    name: 'Whispered Binding',
    effectText: 'Max Curse Stacks per enemy +2.',
    nodeRef: 'tn_5', // Marked For Pain
  },
  {
    id: 'hx_heal_on_curse',
    classId: 'vintner',
    name: 'Shared Wound',
    effectText: 'Applying a curse heals you 2% max HP.',
    nodeRef: 'ar_5', // Renewed Will
  },
];

const duelist: readonly AnointmentDef[] = [
  {
    id: 'du_tempo_cap',
    classId: 'shaker',
    name: 'Open Bout',
    effectText: 'Tempo cap raised from 5 to 8.',
    nodeRef: 'st_8', // Stored Intent
  },
  {
    id: 'du_perfect_crit',
    classId: 'shaker',
    name: 'Pointed Response',
    effectText: 'Perfect rhythm hits automatically crit.',
    nodeRef: 'st_3', // Surgical Strike
  },
  {
    id: 'du_feint_swap',
    classId: 'shaker',
    name: 'Two-Step',
    effectText: 'Fake-Out also swaps cooldowns of your 3 skills.',
    nodeRef: 'gn_3', // Fake-Out
  },
];

const medic: readonly AnointmentDef[] = [
  {
    id: 'me_reserve_to_atk',
    classId: 'orchardist',
    name: 'Dark Practice',
    effectText: 'Reserve converts to +1 ATK per 5 HP stored.',
    nodeRef: 'or_8', // Constant Care
  },
  {
    id: 'me_overheal_shield',
    classId: 'orchardist',
    name: 'Field Reinforcement',
    effectText: 'Overheal above max HP grants a shield for that amount.',
    nodeRef: 'or_6', // Full Workup
  },
  {
    id: 'me_dot_extends',
    classId: 'orchardist',
    name: 'Lingering Remedy',
    effectText: 'Your DoTs ignore Cleanse effects.',
    nodeRef: 'fe_6', // Bitter Bloom
  },
];

const ghost: readonly AnointmentDef[] = [
  {
    id: 'gh_dodge_momentum',
    classId: 'drifter',
    name: 'Silk Skin',
    effectText: 'Dodges grant +20% Momentum vs next target.',
    nodeRef: 'sa_5', // Untouchable
  },
  {
    id: 'gh_crit_mult_boost',
    classId: 'drifter',
    name: 'Ghost\'s Edge',
    effectText: 'Crit multiplier becomes 2.5x (from 1.8x).',
    nodeRef: 'sa_3', // Adrenaline
  },
  {
    id: 'gh_spd_trade_free',
    classId: 'drifter',
    name: 'Weightless',
    effectText: 'SPD-trade half-actions cost no SPD.',
    nodeRef: 'hy_5', // Flow State
  },
];

const gambler: readonly AnointmentDef[] = [
  {
    id: 'ga_allin_double',
    classId: 'gambler',
    name: 'House Bones',
    effectText: 'All-In win bonus increased from 2x to 3x.',
    nodeRef: 'di_6', // All In
  },
  {
    id: 'ga_perfect_chain_free',
    classId: 'gambler',
    name: 'Dealer\'s Grace',
    effectText: 'Missed rhythm does not reset your chain.',
    nodeRef: 'ca_5', // Blackjack
  },
  {
    id: 'ga_luck_crit_scale',
    classId: 'gambler',
    name: 'Loaded Edge',
    effectText: 'Crit chance gains +1% per point of LUCK over 20.',
    nodeRef: 'hu_5', // Stacked Odds
  },
];

export const ANOINTMENTS: readonly AnointmentDef[] = Object.freeze([
  ...operator,
  ...bouncer,
  ...hexwright,
  ...duelist,
  ...medic,
  ...ghost,
  ...gambler,
]);

export const ANOINTMENTS_BY_CLASS: Readonly<Record<ClassId, readonly AnointmentDef[]>> =
  Object.freeze({
    steady: operator,
    brewer: bouncer,
    vintner: hexwright,
    shaker: duelist,
    orchardist: medic,
    drifter: ghost,
    gambler,
  });

export function anointmentsFor(classId: ClassId): readonly AnointmentDef[] {
  return ANOINTMENTS_BY_CLASS[classId];
}
