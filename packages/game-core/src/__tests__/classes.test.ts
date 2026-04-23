import { CLASSES, CLASS_BY_ID, getClass } from '../classes';
import { TREES, NODE_BY_ID, ALL_TREE_IDS } from '../trees';
import { CLASSES as CLASS_LIST } from '../classes';

describe('CLASSES registry', () => {
  it('has all 7 classes', () => {
    expect(CLASSES).toHaveLength(7);
  });

  it('preserves spec §8 DB class_ids', () => {
    const ids = new Set(CLASSES.map((c) => c.id));
    expect(ids).toEqual(new Set([
      'steady', 'brewer', 'vintner', 'shaker',
      'orchardist', 'drifter', 'gambler',
    ]));
  });

  it('gives every class a distinct resource kind', () => {
    const resources = CLASSES.map((c) => c.resource.kind);
    expect(new Set(resources).size).toBe(CLASSES.length);
  });

  it('gives every class a distinct action economy kind (except Operator=standard)', () => {
    const kinds = CLASSES.filter((c) => c.id !== 'steady').map((c) => c.actionEconomy.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(CLASS_BY_ID['steady']?.actionEconomy.kind).toBe('standard');
  });

  it('preserves spec §5.1 stat spreads', () => {
    expect(CLASS_BY_ID['steady']?.baseStats).toEqual({ hp: 110, atk: 11, def: 11, spd: 11, luck: 11 });
    expect(CLASS_BY_ID['brewer']?.baseStats).toEqual({ hp: 130, atk: 12, def: 14, spd: 7, luck: 6 });
    expect(CLASS_BY_ID['vintner']?.baseStats).toEqual({ hp: 85, atk: 8, def: 6, spd: 12, luck: 15 });
    expect(CLASS_BY_ID['shaker']?.baseStats).toEqual({ hp: 95, atk: 11, def: 8, spd: 13, luck: 13 });
    expect(CLASS_BY_ID['orchardist']?.baseStats).toEqual({ hp: 115, atk: 9, def: 10, spd: 10, luck: 11 });
    expect(CLASS_BY_ID['drifter']?.baseStats).toEqual({ hp: 100, atk: 10, def: 8, spd: 14, luck: 13 });
  });

  it('gives the Gambler the highest luck in the roster', () => {
    const luck = CLASSES.map((c) => ({ id: c.id, luck: c.baseStats.luck }));
    const max = luck.reduce((a, b) => (b.luck > a.luck ? b : a));
    expect(max.id).toBe('gambler');
  });

  it('every class declares exactly 3 trees', () => {
    for (const c of CLASSES) {
      expect(c.treeIds).toHaveLength(3);
      for (const tid of c.treeIds) {
        expect(c.treeDisplayNames[tid]).toBeTruthy();
      }
    }
  });

  it('getClass throws on unknown id', () => {
    expect(() => getClass('nonexistent')).toThrow(RangeError);
  });
});

describe('skill tree registry', () => {
  it('has all 21 trees ported (7 classes × 3 trees)', () => {
    expect(ALL_TREE_IDS).toHaveLength(21);
    for (const id of ALL_TREE_IDS) {
      expect(TREES[id]).toBeDefined();
      expect(TREES[id]).toHaveLength(9);
    }
  });

  it("every class's declared treeIds exist in the registry", () => {
    for (const c of CLASS_LIST) {
      for (const tid of c.treeIds) {
        expect(TREES[tid]).toBeDefined();
      }
    }
  });

  it('every ported tree has exactly 9 nodes', () => {
    for (const tree of Object.values(TREES)) {
      expect(tree).toHaveLength(9);
    }
  });

  it('every tree ends in a keystone at tier 6', () => {
    for (const [id, tree] of Object.entries(TREES)) {
      const last = tree[tree.length - 1];
      expect(last?.type).toBe('keystone');
      expect(last?.tier).toBe(6);
      // Label the tree when it fails so debugging is easy.
      if (last?.type !== 'keystone') throw new Error(`tree ${id} bad keystone`);
    }
  });

  it('every node has a unique id', () => {
    const seen = new Set<string>();
    for (const tree of Object.values(TREES)) {
      for (const n of tree) {
        expect(seen.has(n.id)).toBe(false);
        seen.add(n.id);
      }
    }
  });

  it('NODE_BY_ID covers every node from every ported tree', () => {
    let count = 0;
    for (const tree of Object.values(TREES)) count += tree.length;
    expect(NODE_BY_ID.size).toBe(count);
  });

  it('all required-node references point to existing nodes in the same tree', () => {
    for (const [treeId, tree] of Object.entries(TREES)) {
      const idsInTree = new Set(tree.map((n) => n.id));
      for (const node of tree) {
        for (const r of node.req ?? []) {
          if (!idsInTree.has(r)) {
            throw new Error(`tree ${treeId} node ${node.id} requires missing ${r}`);
          }
        }
      }
    }
  });

  it('has 189 total skill nodes across all trees (21 × 9)', () => {
    let count = 0;
    for (const tree of Object.values(TREES)) count += tree.length;
    expect(count).toBe(189);
  });

  it('every tree has exactly one keystone', () => {
    for (const [treeId, tree] of Object.entries(TREES)) {
      const keystones = tree.filter((n) => n.type === 'keystone');
      if (keystones.length !== 1) {
        throw new Error(`tree ${treeId} has ${keystones.length} keystones, expected 1`);
      }
    }
  });

  it('every tree has exactly two active nodes', () => {
    for (const [treeId, tree] of Object.entries(TREES)) {
      const actives = tree.filter((n) => n.type === 'active');
      if (actives.length !== 2) {
        throw new Error(`tree ${treeId} has ${actives.length} actives, expected 2`);
      }
    }
  });
});
