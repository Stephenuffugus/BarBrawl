// Bar interior tile catalog + 3-room layouts. Each room is a 12×8 grid.
// Player spawns on an entry door, walks to the exit door to advance.
// Final room contains the boss tile; stepping on it triggers /battle.

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
  table: { passable: false },
  bar:   { passable: false },
  // Patrols block tiles until defeated. The dungeon screen prompts the
  // player to engage when standing adjacent.
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

/** Three escalating rooms — entry on left, exit/boss on right.
 *  P = patrol patron (blocks tile until engaged). */
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

/** Theme tints used to color interior tiles per bar. */
export const INTERIOR_PALETTE: Record<BarThemeId, { floor: string; wall: string; accent: string }> = {
  dive:      { floor: '#3d2510', wall: '#1a0f08', accent: '#a06028' },
  pub:       { floor: '#1d402a', wall: '#0a1a14', accent: '#5da870' },
  sports:    { floor: '#1c2860', wall: '#0a0e22', accent: '#4870c8' },
  cocktail:  { floor: '#421860', wall: '#1a0a28', accent: '#9050d0' },
  wine:      { floor: '#400820', wall: '#180810', accent: '#902848' },
  brewery:   { floor: '#403018', wall: '#180e08', accent: '#c89048' },
  nightclub: { floor: '#400860', wall: '#080820', accent: '#e000a0' },
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
