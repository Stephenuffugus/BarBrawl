// Tile catalog for the overworld. Each tile is rendered as a single
// colored square (or layered squares) at TILE_PX × PIXEL size. We keep
// the data simple for v1 — real tile art is a Phase 14 polish pass.

import { PIXEL, TILE_PX } from './scale';

export const TILE_LOGICAL = TILE_PX * PIXEL; // 64 logical px per tile

export type TileId =
  | 'grass'
  | 'street'
  | 'sidewalk'
  | 'wall'
  | 'door_dive'
  | 'door_pub'
  | 'door_nightclub'
  | 'door_brewery'
  | 'bar_dive'
  | 'bar_pub'
  | 'bar_nightclub'
  | 'bar_brewery'
  | 'sign';

export interface TileDef {
  /** Top fill color. */
  fill: string;
  /** Optional accent (drawn as inset). */
  accent?: string;
  /** Solid tiles block movement; passable tiles allow it. */
  passable: boolean;
  /** Tag categorization for game logic ('door' triggers entry). */
  kind?: 'door';
  /** If kind === 'door', which bar this leads to (UI display + theming). */
  barId?: string;
  /** Display name when standing adjacent to a door. */
  label?: string;
  /** Bar theme tint for the door + battle context. */
  theme?: 'dive' | 'pub' | 'nightclub' | 'brewery';
  /** Bar tier 1-6. Tier 4+ requires the matching Resistance Mark. */
  tier?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const TILES: Readonly<Record<TileId, TileDef>> = {
  grass:    { fill: '#1d402a', accent: '#0a1a14', passable: true },
  street:   { fill: '#28282e', accent: '#1a1a20', passable: true },
  sidewalk: { fill: '#5a5a64', accent: '#3a3a44', passable: true },
  wall:     { fill: '#2a1810', accent: '#1a0e08', passable: false },

  bar_dive:      { fill: '#3d2510', accent: '#a06028', passable: false },
  bar_pub:       { fill: '#1d402a', accent: '#5da870', passable: false },
  bar_nightclub: { fill: '#400860', accent: '#e000a0', passable: false },
  bar_brewery:   { fill: '#403018', accent: '#c89048', passable: false },

  door_dive:      { fill: '#a06028', accent: '#f8c878', passable: true,
                    kind: 'door', barId: 'b-rusty-nail',     label: "The Rusty Nail",     theme: 'dive', tier: 1 },
  door_pub:       { fill: '#5da870', accent: '#c8f0a0', passable: true,
                    kind: 'door', barId: 'b-greens',         label: "Green's Pub",        theme: 'pub',  tier: 3 },
  door_nightclub: { fill: '#e000a0', accent: '#f870f0', passable: true,
                    kind: 'door', barId: 'b-mission-blackout', label: 'Mission Blackout', theme: 'nightclub', tier: 5 },
  door_brewery:   { fill: '#c89048', accent: '#f8e0a0', passable: true,
                    kind: 'door', barId: 'b-hop-yard',       label: 'Hop Yard Brewery',   theme: 'brewery', tier: 4 },

  sign: { fill: '#403028', accent: '#c89048', passable: false },
};

/** Tilemap layout. 'G' grass, '.' street, ',' sidewalk, '#' wall.
 *  '1' '2' '3' '4' = bar buildings; 'a' 'b' 'c' 'd' = their doors. */
export const OVERWORLD_MAP: readonly string[] = [
  'GGGGGGGGGGGG',
  'GGG#11#GGGGG',
  'GGG#aa#GGGGG',
  'GGG,,,,GGGGG',
  'GG,,,,,,GGGG',
  'G,,......,,G',
  'G,........,G',
  'G,........,G',
  'G,........,G',
  'G,,......,,G',
  'GG,,,,,,,,GG',
  'GG#22#GG#33#',
  'GG#bb#GG#cc#',
  'GGGGGGGGGGGG',
  'GGGGG#44#GGG',
  'GGGGG#dd#GGG',
  'GGGGGGGGGGGG',
  'GGGGGGGGGGGG',
];

/** Resolve map character → TileId. */
export function tileAt(map: readonly string[], col: number, row: number): TileId | null {
  const r = map[row];
  if (!r) return null;
  const ch = r.charAt(col);
  switch (ch) {
    case 'G': return 'grass';
    case '.': return 'street';
    case ',': return 'sidewalk';
    case '#': return 'wall';
    case '1': return 'bar_dive';
    case '2': return 'bar_pub';
    case '3': return 'bar_nightclub';
    case '4': return 'bar_brewery';
    case 'a': return 'door_dive';
    case 'b': return 'door_pub';
    case 'c': return 'door_nightclub';
    case 'd': return 'door_brewery';
    default:  return null;
  }
}

export const MAP_COLS = OVERWORLD_MAP[0]!.length;
export const MAP_ROWS = OVERWORLD_MAP.length;
