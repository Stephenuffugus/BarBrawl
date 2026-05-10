// Stylized Pokemon-town overworld. Player sprite walks tile-by-tile, bars
// are buildings, walking onto a door (or pressing A while adjacent) routes
// into the bar's battle. Replaces Mapbox/Leaflet for v1 demo — distribution-
// agnostic and gives the game its retro identity.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Tilemap } from '@/components/Tilemap';
import { PlayerSprite, type Direction } from '@/components/PlayerSprite';
import { DPad } from '@/components/DPad';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI } from '@/design/palette';
import {
  OVERWORLD_MAP, TILES, tileAt, TILE_LOGICAL, MAP_COLS, MAP_ROWS,
} from '@/design/tiles';

const SPAWN_COL = 5;
const SPAWN_ROW = 7;

type DoorTile = ReturnType<typeof asDoor>;
function asDoor(t: ReturnType<typeof tileAt>) {
  if (!t) return null;
  const def = TILES[t];
  return def.kind === 'door' ? { ...def, tileId: t } : null;
}

export default function MapScreen() {
  const [col, setCol] = useState(SPAWN_COL);
  const [row, setRow] = useState(SPAWN_ROW);
  const [dir, setDir] = useState<Direction>('down');

  // What door (if any) is the player standing on or adjacent to?
  const adjacentDoor: DoorTile = useMemo(() => {
    const here = asDoor(tileAt(OVERWORLD_MAP, col, row));
    if (here) return here;
    const around: [number, number][] = [
      [col, row - 1],
      [col, row + 1],
      [col - 1, row],
      [col + 1, row],
    ];
    for (const [c, r] of around) {
      const d = asDoor(tileAt(OVERWORLD_MAP, c, r));
      if (d) return d;
    }
    return null;
  }, [col, row]);

  const tryMove = useCallback((d: Direction) => {
    setDir(d);
    const dCol = d === 'left' ? -1 : d === 'right' ? 1 : 0;
    const dRow = d === 'up' ? -1 : d === 'down' ? 1 : 0;
    const nc = col + dCol;
    const nr = row + dRow;
    if (nc < 0 || nc >= MAP_COLS || nr < 0 || nr >= MAP_ROWS) return;
    const t = tileAt(OVERWORLD_MAP, nc, nr);
    if (!t) return;
    if (!TILES[t].passable) return;
    setCol(nc);
    setRow(nr);
  }, [col, row]);

  const enterDoor = useCallback(() => {
    if (!adjacentDoor) return;
    router.push({
      pathname: '/battle',
      params: {
        barId: adjacentDoor.barId ?? '',
        theme: adjacentDoor.theme ?? 'dive',
        label: adjacentDoor.label ?? 'Bar',
      },
    });
  }, [adjacentDoor]);

  // Keyboard nav on web (WASD + arrows + Enter for A).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': tryMove('up'); break;
        case 'ArrowDown': case 's': case 'S': tryMove('down'); break;
        case 'ArrowLeft': case 'a': case 'A': tryMove('left'); break;
        case 'ArrowRight': case 'd': case 'D': tryMove('right'); break;
        case 'Enter': case ' ': enterDoor(); break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tryMove, enterDoor]);

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>WALK THE STREETS</PixelText>
        <PixelText size={11} color={UI.textDim}>{col},{row}</PixelText>
      </View>

      {/* Map view, scrollable */}
      <ScrollView
        contentContainerStyle={{ alignItems: 'center', padding: 12 }}
        horizontal={false}
      >
        <View style={{
          // Limit display width so a tall map scrolls vertically inside
          width: MAP_COLS * (TILE_LOGICAL / 2),
          height: MAP_ROWS * (TILE_LOGICAL / 2),
          position: 'relative',
          // Scale the inner Tilemap by 0.5 to fit phone width.
          transform: [{ scale: 0.5 }],
          transformOrigin: 'top left' as never,
        }}>
          <Tilemap />
          <PlayerSprite col={col} row={row} direction={dir} />
        </View>
      </ScrollView>

      {/* Door prompt */}
      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        {adjacentDoor ? (
          <Panel>
            <PixelText size={12} color={UI.cursor}>▶ {adjacentDoor.label}</PixelText>
            <PixelText size={10} color={UI.textDim} style={{ marginTop: 4 }}>
              Tap A or press ENTER to challenge.
            </PixelText>
          </Panel>
        ) : (
          <Panel>
            <PixelText size={11} color={UI.textDim}>
              Walk to a building — bars are doors with neon trim.
            </PixelText>
          </Panel>
        )}
      </View>

      {/* DPad */}
      <View style={{ alignItems: 'center', paddingBottom: 24 }}>
        <DPad onMove={tryMove} onAction={enterDoor} />
      </View>
    </View>
  );
}
