// Overgrown-garden interior tile catalog + 3-room layouts. Each room is a
// 12×8 grid. The warden spawns on an entry gate, walks to the exit gate to
// press deeper. The final clearing holds the untamed guardian; stepping
// onto it begins the soothing.

import type { BarThemeId } from './palette';

export const INTERIOR_COLS = 12;
export const INTERIOR_ROWS = 8;

export type InteriorTile = 'floor' | 'wall' | 'entry' | 'exit' | 'boss' | 'table' | 'bar' | 'patrol';

export interface InteriorTileDef {
  passable: boolean;
  /** What happens when the player walks onto this tile. */
  effect?: 'advance' | 'battle';
}

export const INTERIOR_TILES: Readonly<Record<InteriorTile, InteriorTileDef>> = {
  floor: { passable: true },
  wall:  { passable: false },
  entry: { passable: true },
  exit:  { passable: true, effect: 'advance' },
  boss:  { passable: true, effect: 'battle' },
  table: { passable: false }, // raised planter bed
  bar:   { passable: false }, // potting bench / glasshouse counter
  // Wild growth blocks tiles until soothed. The dungeon screen prompts the
  // warden to tend it when standing adjacent.
  patrol: { passable: false },
};

/** Map ASCII chars to tile IDs. Layout per room. */
function decodeRoom(s: string): InteriorTile[][] {
  const lines = s.replace(/^\n/, '').replace(/\n$/, '').split('\n');
  if (lines.length !== INTERIOR_ROWS) {
    throw new Error(`Room must have ${INTERIOR_ROWS} rows`);
  }
  return lines.map((line) => {
    if (line.length !== INTERIOR_COLS) {
      throw new Error(`Room row "${line}" has length ${line.length}, want ${INTERIOR_COLS}`);
    }
    const out: InteriorTile[] = [];
    for (const ch of line) {
      switch (ch) {
        case '#': out.push('wall'); break;
        case '.': out.push('floor'); break;
        case '<': out.push('entry'); break;
        case '>': out.push('exit'); break;
        case 'B': out.push('boss'); break;
        case 'T': out.push('table'); break;
        case '=': out.push('bar'); break;
        case 'P': out.push('patrol'); break;
        default:  out.push('floor');
      }
    }
    return out;
  });
}

/** Three escalating clearings — entry gate on left, exit/guardian on right.
 *  P = wild growth (blocks tile until soothed). */
export const ROOMS: readonly InteriorTile[][][] = [
  decodeRoom(`
############
<...........
<...T..T....
<......P....
............
....T.PT....
............
###########>
`),
  decodeRoom(`
############
<....=======
<....=......
<...P=......
......P.....
.T..........
.......P....
###########>
`),
  decodeRoom(`
############
<...........
<....TTT....
<....TTT....
....P..P....
............
.....B......
############
`),
];

export const ROOM_COUNT = ROOMS.length;

/** Theme tints used to color interior tiles per garden site (floor =
 *  mossy earth, wall = hedge/glass, accent = blossom/foliage). */
export const INTERIOR_PALETTE: Record<BarThemeId, { floor: string; wall: string; accent: string }> = {
  dive:      { floor: '#2e4a22', wall: '#152610', accent: '#7bbf52' }, // Wild Meadow
  pub:       { floor: '#1d402a', wall: '#0a1a14', accent: '#8fd27a' }, // Cottage Garden
  sports:    { floor: '#26451c', wall: '#101f0c', accent: '#9fd24a' }, // Community Park
  cocktail:  { floor: '#3a2046', wall: '#170a20', accent: '#d87ac0' }, // Rose Garden
  wine:      { floor: '#3a2818', wall: '#16100a', accent: '#d09a5a' }, // Old Orchard
  brewery:   { floor: '#1e3a30', wall: '#0a1a14', accent: '#5fd0a0' }, // Greenhouse
  nightclub: { floor: '#241846', wall: '#0c0822', accent: '#7c5ad8' }, // Moonlit Grove
};

/** Find the entry tile in a room (player spawn). */
export function findEntry(room: InteriorTile[][]): { col: number; row: number } {
  for (let r = 0; r < room.length; r++) {
    const row = room[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'entry') return { col: c, row: r };
    }
  }
  return { col: 1, row: 1 };
}
