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
import { ClaimMarker } from '@/components/ClaimMarker';
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

/** Find the (col, row) of the door tile leading to a given barId. */
function findDoorOf(barId: string): { col: number; row: number } | null {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const t = tileAt(OVERWORLD_MAP, c, r);
      if (!t) continue;
      const def = TILES[t];
      if (def.kind === 'door' && def.barId === barId) {
        return { col: c, row: r };
      }
    }
  }
  return null;
}

/** Renders a 9×7 tile window of the map centered on the player.
 *  Camera tweens smoothly over CAM_TWEEN_MS instead of snapping. */
const CAM_TWEEN_MS = 140;
const CameraViewport = React.memo(function CameraViewport({
  col, row, dir, step, claimedBarIds,
}: { col: number; row: number; dir: Direction; step: number; claimedBarIds: readonly string[] }) {
  // Target camera (top-left tile of the viewport in tile units, fractional
  // during transition). Clamped to map.
  const targetCol = Math.max(0, Math.min(MAP_COLS - VIEWPORT_COLS, col - Math.floor(VIEWPORT_COLS / 2)));
  const targetRow = Math.max(0, Math.min(MAP_ROWS - VIEWPORT_ROWS, row - Math.floor(VIEWPORT_ROWS / 2)));

  const [camCol, setCamCol] = React.useState(targetCol);
  const [camRow, setCamRow] = React.useState(targetRow);
  const startRef = React.useRef<{ from: { c: number; r: number }; to: { c: number; r: number }; t0: number } | null>(null);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (camCol === targetCol && camRow === targetRow) return;
    startRef.current = {
      from: { c: camCol, r: camRow },
      to: { c: targetCol, r: targetRow },
      t0: performance.now(),
    };
    const tick = (now: number) => {
      const start = startRef.current;
      if (!start) return;
      const t = Math.min(1, (now - start.t0) / CAM_TWEEN_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const cc = start.from.c + (start.to.c - start.from.c) * eased;
      const cr = start.from.r + (start.to.r - start.from.r) * eased;
      setCamCol(cc);
      setCamRow(cr);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCol, targetRow]);

  const viewportW = VIEWPORT_COLS * VIEWPORT_TILE;
  const viewportH = VIEWPORT_ROWS * VIEWPORT_TILE;
  const tilemapScale = VIEWPORT_TILE / TILE_LOGICAL;

  // Door positions for claimed bars — recomputed only when the claimed set
  // changes, not on every camera-tween frame. Markers below read from this.
  const claimedDoors = useMemo(
    () =>
      claimedBarIds
        .map((barId) => ({ barId, door: findDoorOf(barId) }))
        .filter((d): d is { barId: string; door: { col: number; row: number } } => d.door !== null),
    [claimedBarIds],
  );

  return (
    <View style={{
      width: viewportW,
      height: viewportH,
      borderColor: UI.border, borderWidth: PIXEL,
      backgroundColor: UI.bg,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <View style={{
        position: 'absolute',
        left: -camCol * VIEWPORT_TILE,
        top: -camRow * VIEWPORT_TILE,
        transform: [{ scale: tilemapScale }],
        transformOrigin: 'top left' as never,
      }}>
        <Tilemap />
      </View>
      {/* Pulsing rings over claimed bar doors */}
      {claimedDoors.map(({ barId, door }) => (
        <ClaimMarker
          key={barId}
          size={VIEWPORT_TILE}
          left={(door.col - camCol) * VIEWPORT_TILE}
          top={(door.row - camRow) * VIEWPORT_TILE}
        />
      ))}
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
});

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
  // Stable array of claimed ids so the memoized CameraViewport doesn't see a
  // fresh prop reference on every render.
  const claimedBarIds = useMemo(() => Object.keys(claimedById), [claimedById]);

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
        tier: String(adjacentDoor.tier ?? 1),
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
        <PixelText size={14} color={UI.text}>WALK THE WILD</PixelText>
        <PixelText size={11} color={UI.textDim}>{claimedBarIds.length > 0 ? `${claimedBarIds.length} CLAIMED` : `${col},${row}`}</PixelText>
      </View>

      {/* Map viewport — camera follows player, edge-clamped */}
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <CameraViewport
          col={col} row={row} dir={dir} step={step}
          claimedBarIds={claimedBarIds}
        />
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
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {adjacentDoor.tier ? (
                    <PixelText size={9} color={UI.hpHalf}>T{adjacentDoor.tier}</PixelText>
                  ) : null}
                  {claim ? (
                    <PixelText size={9} color={UI.hpFull}>YOURS</PixelText>
                  ) : null}
                </View>
              </View>
              {claim ? (
                <PixelText size={10} color={UI.text} style={{ marginTop: 4 }}>
                  {defenderCls
                    ? `Caretaker: ${defenderCls.name}`
                    : 'Untended — tap A to station a caretaker.'}
                </PixelText>
              ) : (
                <PixelText size={10} color={UI.textDim} style={{ marginTop: 4 }}>
                  Tap A or press ENTER to soothe.
                </PixelText>
              )}
            </Panel>
          );
        })() : (
          <Panel>
            <PixelText size={11} color={UI.textDim}>
              Walk to a place — gardens are gates with leafy trim.
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
