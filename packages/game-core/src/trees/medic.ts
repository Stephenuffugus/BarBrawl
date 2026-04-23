import { makeTree } from './tree-factory';
import type { Tree } from '../types';

// Medic — "Orchardist" (DB id). Tree DB keys: orchard/ferment/harvest.
// Display names: Mend / Bitter Root / Triage.
//
// Porting source: v6 prototype TREES.orchard / .ferment / .harvest. Effects
// preserved. Apple/cider/farming metaphor replaced with field-medic framing.
// Bitter Root keeps a plant-adjacent feel because "toxins/DoTs from remedies
// gone wrong" reads medically, not as cider.

export const orchardTree: Tree = makeTree('or', [
  ['Patched Up',        '+6 HP',                            'Closed the small ones.'],
  ['Gentle Touch',      'Heal 1% HP/turn',                  'A hand on the shoulder.'],
  ['Field Dressing',    'Active: Heal 40% HP',              'Clean. Cover. Move.'],
  ['Reinforced Frame',  '+15 HP',                           'Braced and holding.'],
  ['Skilled Hands',     'Heals +30%',                       'You have done this a thousand times.'],
  ['Full Workup',       'Active: Heal + cleanse + buff',    'Everything at once, nothing missed.'],
  ['Triage Allies',     'Heals allies 15%',                 'Worst first. Everyone lives.'],
  ['Constant Care',     'Regen +100%',                      'You do not stop.'],
  ['LIFELINE',          'KEYSTONE: 5% HP/turn. Cannot crit.', 'Healer first. Everything else after.'],
]);

export const fermentTree: Tree = makeTree('fe', [
  ['Caustic Oil',       '+3 DoT dmg',                       'Small bottle, slow burn.'],
  ['Fester',            '+1 turn DoT',                      'It stays with them.'],
  ['Septic Strike',     'Active: 5% HP/turn for 5 turns',   'Slow. Certain.'],
  ['Contagion',         'DoTs 20% spread',                  'It jumps.'],
  ['Crumble',           'DoT enemies -25% DEF',             'Inside-out.'],
  ['Bitter Bloom',      'Active: Apply all DoTs stacking',  'All of it, all at once.'],
  ['Deeper Infection',  'DoTs +25% dmg',                    'It finds the bone.'],
  ['Gangrene',          'DoTs last until target dies',      'There is no clean ending.'],
  ['OUTBREAK',          'KEYSTONE: All attacks DoT. Direct halved.', 'No one leaves clean.'],
]);

export const harvestTree: Tree = makeTree('hr', [
  ['Tough Skin',        '-5% dmg taken',                    'Years of the job.'],
  ['Emergency Reserve', '+10 HP',                           'What you hid in your coat.'],
  ['Antitoxin',         'Active: Immune DoT 3 turns',       'Ahead of the damage.'],
  ['Extra Kits',        '+3 consumable slots',              'Every pocket.'],
  ['Pre-Flight Check',  '+20% HP each battle start',        'You checked everything.'],
  ['Crash Cart',        'Active: +50% HP + cleanse + 3t immune', 'All hands. Now.'],
  ['Stocked Bag',       'Consumables +50% effect',          'Good supplier.'],
  ['Guardian Instinct', '50% negate killing blow',          'Something pulled you back.'],
  ['CODE BLUE',         'KEYSTONE: Revive 1/day full HP. -50% gold.', 'They brought you back. You stay.'],
]);
