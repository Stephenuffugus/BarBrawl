import type { Tree, TreeBundle } from '../types';
import { focusTree, clarityTree, resolveTree } from './operator';
import { hopsTree, barleyTree, foamTree } from './bouncer';
import { tanninTree, vintageTree, aerationTree } from './hexwright';
import { shakenTree, stirredTree, garnishTree } from './duelist';
import { orchardTree, fermentTree, harvestTree } from './medic';
import { indicaTree, sativaTree, hybridTree } from './ghost';
import { diceTree, cardsTree, houseTree } from './gambler';

// Registry of every tree by its DB-stable key. UI and combat engine look
// nodes up by TREES[treeId] or NODE_BY_ID.get(nodeId).

export const TREES: TreeBundle = Object.freeze({
  // Operator
  focus: focusTree, clarity: clarityTree, resolve: resolveTree,
  // Bouncer
  hops: hopsTree, barley: barleyTree, foam: foamTree,
  // Hexwright
  tannin: tanninTree, vintage: vintageTree, aeration: aerationTree,
  // Duelist
  shaken: shakenTree, stirred: stirredTree, garnish: garnishTree,
  // Medic
  orchard: orchardTree, ferment: fermentTree, harvest: harvestTree,
  // Ghost
  indica: indicaTree, sativa: sativaTree, hybrid: hybridTree,
  // Gambler (new content)
  dice: diceTree, cards: cardsTree, house: houseTree,
});

export function getTree(treeId: string): Tree {
  const t = TREES[treeId];
  if (!t) throw new RangeError(`Unknown tree id: ${treeId}`);
  return t;
}

export const NODE_BY_ID = (() => {
  const map = new Map<string, Tree[number]>();
  for (const tree of Object.values(TREES)) {
    for (const node of tree) {
      if (map.has(node.id)) {
        throw new Error(`Duplicate skill node id: ${node.id}`);
      }
      map.set(node.id, node);
    }
  }
  return map;
})();

// All 21 trees now populated. Use this array if you need a stable iteration
// order — class order matches CLASSES order in classes.ts.
export const ALL_TREE_IDS: readonly string[] = Object.freeze([
  'focus', 'clarity', 'resolve',
  'hops', 'barley', 'foam',
  'tannin', 'vintage', 'aeration',
  'shaken', 'stirred', 'garnish',
  'orchard', 'ferment', 'harvest',
  'indica', 'sativa', 'hybrid',
  'dice', 'cards', 'house',
]);
