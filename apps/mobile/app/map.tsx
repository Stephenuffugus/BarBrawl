// Stylized Pokemon-town overworld with a camera that follows the player.
// 9×7 visible tile viewport, edge-clamped to stay within the map.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { getClass } from '@barbrawl/game-core';
import { Tilemap } from '@/components/Tilemap';
import { PlayerSprite, type Direction } from '@/components/PlayerSprite';
import { DPad } from '@/components/DPad';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import {
  OVERWORLD_MAP, TILES, tileAt, TILE_LOGICAL, MAP_COLS, MAP_ROWS,
} from '@/design/tiles';
import { useGameStore } from '@/state/game-store';

const VIEWPORT_COLS = 9;
const VIEWPORT_ROWS = 7;
// Camera tile size — slightly smaller than TILE_LOGICAL so 9×7 fits a
// 390-wide phone with margin.
const VIEWPORT_TILE = 40;

const SPAWN_COL = 5;
const SPAWN_ROW = 7;

type DoorTile = ReturnType<typeof asDoor>;
function asDoor(t: ReturnType<typeof tileAt>) {
  if (!t) return null;
  const def = TILES[t];
  return def.kind === 'door' ? { ...def, tileId: t } : null;
}

/** Renders a 9×7 tile window of the map centered on the player. */
function CameraViewport({
  col, row, dir, step,
}: { col: number; row: number; dir: Direction; step: number }) {
  // Camera origin = top-left tile of viewport. Clamp so we don't show
  // off-map space.
  const camCol = Math.max(0, Math.min(MAP_COLS - VIEWPORT_COLS, col - Math.floor(VIEWPORT_COLS / 2)));
  const camRow = Math.max(0, Math.min(MAP_ROWS - VIEWPORT_ROWS, row - Math.floor(VIEWPORT_ROWS / 2)));

  const viewportW = VIEWPORT_COLS * VIEWPORT_TILE;
  const viewportH = VIEWPORT_ROWS * VIEWPORT_TILE;
  const tilemapScale = VIEWPORT_TILE / TILE_LOGICAL; // shrinks tilemap to viewport tile size

  return (
    <View style={{
      width: viewportW,
      height: viewportH,
      borderColor: UI.border, borderWidth: PIXEL,
      backgroundColor: UI.bg,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Tilemap shifted by camera origin */}
      <View style={{
        position: 'absolute',
        left: -camCol * VIEWPORT_TILE,
        top: -camRow * VIEWPORT_TILE,
        transform: [{ scale: tilemapScale }],
        transformOrigin: 'top left' as never,
      }}>
        <Tilemap />
      </View>
      {/* Player rendered relative to camera origin */}
      <View style={{
        position: 'absolute',
        left: (col - camCol) * VIEWPORT_TILE,
        top: (row - camRow) * VIEWPORT_TILE,
        width: VIEWPORT_TILE,
        height: VIEWPORT_TILE,
      }}>
        <PlayerSprite col={0} row={0} direction={dir} step={step} tileSize={VIEWPORT_TILE} />
      </View>
    </View>
  );
}

export default function MapScreen() {
  const [col, setCol] = useState(SPAWN_COL);
  const [row, setRow] = useState(SPAWN_ROW);
  const [dir, setDir] = useState<Direction>('down');
  const [step, setStep] = useState(0);
  const claimedBars = useGameStore((s) => s.claimedBars);
  const claimedById = useMemo(
    () => Object.fromEntries(claimedBars.map((b) => [b.barId, b])),
    [claimedBars],
  );

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
    setStep((s) => s + 1);
  }, [col, row]);

  const enterDoor = useCallback(() => {
    if (!adjacentDoor) return;
    router.push({
      pathname: '/preview',
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
        <PixelText size={11} color={UI.textDim}>{claimedById && Object.keys(claimedById).length > 0 ? `${Object.keys(claimedById).length} CLAIMED` : `${col},${row}`}</PixelText>
      </View>

      {/* Map viewport — camera follows player, edge-clamped */}
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <CameraViewport col={col} row={row} dir={dir} step={step} />
      </View>

      {/* Door prompt */}
      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        {adjacentDoor ? (() => {
          const claim = adjacentDoor.barId ? claimedById[adjacentDoor.barId] : undefined;
          const defenderCls = claim?.defenderClassId ? getClass(claim.defenderClassId) : null;
          return (
            <Panel
              style={claim ? { borderColor: UI.cursor, borderWidth: PIXEL } : undefined}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <PixelText size={12} color={UI.cursor}>▶ {adjacentDoor.label}</PixelText>
                {claim ? (
                  <PixelText size={9} color={UI.hpFull}>YOURS</PixelText>
                ) : null}
              </View>
              {claim ? (
                <PixelText size={10} color={UI.text} style={{ marginTop: 4 }}>
                  {defenderCls
                    ? `Defender: ${defenderCls.name}`
                    : 'Undefended — tap A to station a fighter.'}
                </PixelText>
              ) : (
                <PixelText size={10} color={UI.textDim} style={{ marginTop: 4 }}>
                  Tap A or press ENTER to challenge.
                </PixelText>
              )}
            </Panel>
          );
        })() : (
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
