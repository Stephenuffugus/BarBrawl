import type { SkillNode, Tree } from '../types';

// Matches the v6 prototype's tree shape (§5.2):
//   Tier 1:  [small]  [small]
//   Tier 2:  [small]  [active]   — requires Tier 1
//   Tier 3:      [notable]       — requires Tier 2 active
//   Tier 4:  [small]  [active]   — requires Notable
//   Tier 5:      [notable]       — requires Tier 4
//   Tier 6:      [keystone]      — requires Tier 5
//
// Config is 9-tuple of [name, effect, desc], matching prototype order.
// Coordinates for SVG layout are stable for UI consistency across all 21 trees.

export type NodeConfig = readonly [name: string, effect: string, desc: string];
export type TreeConfig = readonly [
  NodeConfig, NodeConfig, NodeConfig,
  NodeConfig, NodeConfig, NodeConfig,
  NodeConfig, NodeConfig, NodeConfig,
];

function node(
  id: string,
  cfg: NodeConfig,
  rest: Omit<SkillNode, 'id' | 'name' | 'effect' | 'desc' | 'req'> & { req?: readonly string[] },
): SkillNode {
  const base = {
    id,
    name: cfg[0],
    effect: cfg[1],
    desc: cfg[2],
    type: rest.type,
    tier: rest.tier,
    x: rest.x,
    y: rest.y,
  } satisfies Omit<SkillNode, 'req'>;
  return rest.req === undefined ? base : { ...base, req: rest.req };
}

export function makeTree(prefix: string, cfg: TreeConfig): Tree {
  const [c1, c2, c3, c4, c5, c6, c7, c8, c9] = cfg;
  return Object.freeze([
    node(`${prefix}_1`, c1, { type: 'small',    tier: 1, x: 60,  y: 50 }),
    node(`${prefix}_2`, c2, { type: 'small',    tier: 1, x: 160, y: 50 }),
    node(`${prefix}_3`, c3, { type: 'active',   tier: 2, x: 110, y: 130, req: [`${prefix}_1`, `${prefix}_2`] }),
    node(`${prefix}_4`, c4, { type: 'small',    tier: 2, x: 30,  y: 140, req: [`${prefix}_1`] }),
    node(`${prefix}_5`, c5, { type: 'notable',  tier: 3, x: 110, y: 220, req: [`${prefix}_3`] }),
    node(`${prefix}_6`, c6, { type: 'active',   tier: 4, x: 60,  y: 310, req: [`${prefix}_5`] }),
    node(`${prefix}_7`, c7, { type: 'small',    tier: 4, x: 170, y: 310, req: [`${prefix}_5`] }),
    node(`${prefix}_8`, c8, { type: 'notable',  tier: 5, x: 110, y: 400, req: [`${prefix}_6`, `${prefix}_7`] }),
    node(`${prefix}_9`, c9, { type: 'keystone', tier: 6, x: 110, y: 500, req: [`${prefix}_8`] }),
  ]);
}
