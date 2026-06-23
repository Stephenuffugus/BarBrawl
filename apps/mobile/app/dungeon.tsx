// Bar-interior dungeon walk. Pokemon-style top-down crawl through 3 rooms.
// Walking onto an exit door advances to the next room. Final room has a
// boss tile that triggers /battle.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ClassId } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { DPad } from '@/components/DPad';
import type { Direction } from '@/components/PlayerSprite';
import { UI, BAR_PALETTES, CLASS_ACCENT, type BarThemeId } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import {
  ROOMS, ROOM_COUNT, INTERIOR_COLS, INTERIOR_ROWS, INTERIOR_TILES,
  INTERIOR_PALETTE, findEntry, type InteriorTile,
} from '@/design/dungeon';
import { useGameStore } from '@/state/game-store';
import { playSfx } from '@/audio/sfx';

const PATROL_XP = 25;

const TILE_PX = 28; // 12*28 = 336px, fits a 390-wide phone with margin

function isBarTheme(s: string | undefined): s is BarThemeId {
  return !!s && s in BAR_PALETTES;
}

export default function DungeonScreen() {
  const params = useLocalSearchParams<{ barId?: string; theme?: string; label?: string; tier?: string; secondary?: string; vip?: string }>();
  const theme: BarThemeId = isBarTheme(params.theme) ? params.theme : 'dive';
  const label = params.label?.trim() || 'A nameless bar';

  const [roomIdx, setRoomIdx] = useState(0);
  const room = ROOMS[roomIdx]!;
  const spawn = findEntry(room);
  const [col, setCol] = useState(spawn.col);
  const [row, setRow] = useState(spawn.row);
  const [dir, setDir] = useState<Direction>('right');
  const [step, setStep] = useState(0);
  const [defeatedPatrols, setDefeatedPatrols] = useState<Set<string>>(new Set());
  const awardXp = useGameStore((s) => s.awardXp);
  const activeClassId = useGameStore((s) => s.active().class_id) as ClassId;

  // Reset position on room change.
  useEffect(() => {
    const e = findEntry(ROOMS[roomIdx]!);
    setCol(e.col);
    setRow(e.row);
  }, [roomIdx]);

  const advanceRoom = useCallback(() => {
    if (roomIdx + 1 < ROOM_COUNT) {
      setRoomIdx(roomIdx + 1);
    }
  }, [roomIdx]);

  const triggerBattle = useCallback(() => {
    router.replace({
      pathname: '/battle',
      params: {
        barId: params.barId ?? '',
        theme, label,
        tier: params.tier ?? '1',
        ...(params.secondary ? { secondary: params.secondary } : {}),
        ...(params.vip ? { vip: params.vip } : {}),
      },
    });
  }, [params.barId, params.tier, params.secondary, params.vip, theme, label]);

  const isDefeated = useCallback((c: number, r: number) =>
    defeatedPatrols.has(`${roomIdx}:${c}:${r}`),
  [defeatedPatrols, roomIdx]);

  const tryMove = useCallback((d: Direction) => {
    setDir(d);
    const dCol = d === 'left' ? -1 : d === 'right' ? 1 : 0;
    const dRow = d === 'up' ? -1 : d === 'down' ? 1 : 0;
    const nc = col + dCol;
    const nr = row + dRow;
    if (nc < 0 || nc >= INTERIOR_COLS || nr < 0 || nr >= INTERIOR_ROWS) return;
    const t = room[nr]?.[nc];
    if (!t) return;
    const def = INTERIOR_TILES[t];
    // Defeated patrols are walkable.
    if (!def.passable && !(t === 'patrol' && isDefeated(nc, nr))) return;
    setCol(nc);
    setRow(nr);
    setStep((s) => s + 1);
    if (def.effect === 'advance') {
      setTimeout(advanceRoom, 200);
    } else if (def.effect === 'battle') {
      setTimeout(triggerBattle, 200);
    }
  }, [col, row, room, advanceRoom, triggerBattle, isDefeated]);

  const adjacentPatrol = useMemo(() => {
    const around: [number, number][] = [
      [col, row - 1], [col, row + 1], [col - 1, row], [col + 1, row],
    ];
    for (const [c, r] of around) {
      if (room[r]?.[c] === 'patrol' && !isDefeated(c, r)) return { col: c, row: r };
    }
    return null;
  }, [col, row, room, isDefeated]);

  const onEngage = useCallback(() => {
    if (!adjacentPatrol) return;
    const key = `${roomIdx}:${adjacentPatrol.col}:${adjacentPatrol.row}`;
    setDefeatedPatrols((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    awardXp(activeClassId, PATROL_XP);
    playSfx('hit');
  }, [adjacentPatrol, roomIdx, awardXp, activeClassId]);

  // Web keyboard.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': tryMove('up'); break;
        case 'ArrowDown': case 's': case 'S': tryMove('down'); break;
        case 'ArrowLeft': case 'a': case 'A': tryMove('left'); break;
        case 'ArrowRight': case 'd': case 'D': tryMove('right'); break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tryMove]);

  const accent = CLASS_ACCENT[useGameStore.getState().active().class_id as keyof typeof CLASS_ACCENT];
  const palette = INTERIOR_PALETTE[theme];

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ LEAVE</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>{label.toUpperCase()}</PixelText>
        <PixelText size={11} color={UI.textDim}>RM {roomIdx + 1}/{ROOM_COUNT}</PixelText>
      </View>

      {/* Room grid */}
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <View style={{
          width: INTERIOR_COLS * TILE_PX,
          height: INTERIOR_ROWS * TILE_PX,
          position: 'relative',
          borderColor: UI.border, borderWidth: PIXEL,
        }}>
          {room.map((rowArr, r) => rowArr.map((tile, c) => (
            <TileView
              key={`${r}-${c}`}
              tile={tile === 'patrol' && isDefeated(c, r) ? 'floor' : tile}
              col={c}
              row={r}
              palette={palette}
              isAdjacent={adjacentPatrol?.col === c && adjacentPatrol?.row === r}
            />
          )))}
          {/* Player overlay (animated) */}
          <PlayerOverlay
            col={col}
            row={row}
            direction={dir}
            tilePx={TILE_PX}
            accent={accent}
            step={step}
          />
        </View>
      </View>

      {/* Hint / patrol engage */}
      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        {adjacentPatrol ? (
          <Panel style={{ borderColor: UI.hpHalf, borderWidth: PIXEL }}>
            <PixelText size={11} color={UI.hpHalf}>
              ▶ SOMETHING WILD BLOCKS YOUR PATH
            </PixelText>
            <PixelText size={10} color={UI.textDim} style={{ marginTop: 4 }}>
              Tap CALM to soothe it aside. +{PATROL_XP} XP.
            </PixelText>
            <Pressable
              onPress={onEngage}
              style={{
                alignItems: 'center', paddingVertical: 8, marginTop: 8,
                borderColor: UI.cursor, borderWidth: PIXEL,
                backgroundColor: UI.bg,
              }}
            >
              <PixelText size={13} color={UI.cursor}>▶ CALM</PixelText>
            </Pressable>
          </Panel>
        ) : (
          <Panel>
            <PixelText size={11} color={UI.textDim}>
              {roomIdx + 1 === ROOM_COUNT
                ? 'A figure waits in the back. Step onto the gold tile.'
                : 'Find the door on the right wall. Push past the patrons in your way.'}
            </PixelText>
          </Panel>
        )}
      </View>

      {/* DPad */}
      <View style={{ alignItems: 'center', paddingBottom: 24 }}>
        <DPad onMove={tryMove} />
      </View>
    </View>
  );
}

function TileView({
  tile, col, row, palette, isAdjacent,
}: {
  tile: InteriorTile;
  col: number;
  row: number;
  palette: { floor: string; wall: string; accent: string };
  isAdjacent?: boolean;
}) {
  let bg = palette.floor;
  let inset: string | null = null;
  if (tile === 'wall') bg = palette.wall;
  if (tile === 'table') { bg = palette.floor; inset = '#000'; }
  if (tile === 'bar') { bg = palette.floor; inset = palette.accent; }
  if (tile === 'entry') { bg = palette.floor; inset = palette.accent; }
  if (tile === 'exit') { bg = palette.accent; inset = '#000'; }
  if (tile === 'boss') { bg = '#f8b800'; inset = '#000'; }
  if (tile === 'patrol') { bg = palette.floor; inset = '#e63946'; }

  return (
    <View
      style={{
        position: 'absolute',
        left: col * TILE_PX,
        top: row * TILE_PX,
        width: TILE_PX,
        height: TILE_PX,
        backgroundColor: bg,
      }}
    >
      {inset ? (
        <View style={{
          position: 'absolute',
          left: 4, top: 4, right: 4, bottom: 4,
          backgroundColor: inset,
          opacity: tile === 'wall' ? 0.6 : 1,
        }} />
      ) : null}
      {isAdjacent && tile === 'patrol' ? (
        <View style={{
          position: 'absolute', top: -8, left: TILE_PX / 2 - 4,
          width: 8, height: 8,
          backgroundColor: UI.cursor,
        }} />
      ) : null}
    </View>
  );
}

function PlayerOverlay({
  col, row, direction, tilePx, accent, step,
}: {
  col: number; row: number; direction: Direction; tilePx: number; accent: string; step: number;
}) {
  const stepping = step % 2 === 1;
  const bodyTop = 4 + (stepping ? 2 : 0);
  const legShift = stepping
    ? (direction === 'left' ? -2 : direction === 'right' ? 2 : 0)
    : 0;
  const dot = {
    up:    { left: tilePx / 2 - 2, top: 6 },
    down:  { left: tilePx / 2 - 2, top: tilePx - 12 },
    left:  { left: 6, top: tilePx / 2 - 2 },
    right: { left: tilePx - 12, top: tilePx / 2 - 2 },
  }[direction];

  return (
    <View style={{
      position: 'absolute',
      left: col * tilePx,
      top: row * tilePx,
      width: tilePx,
      height: tilePx,
      zIndex: 10,
    }}>
      <View style={{
        position: 'absolute',
        left: 4, top: bodyTop,
        width: tilePx - 8, height: tilePx - 8,
        backgroundColor: '#181828',
        borderColor: '#000', borderWidth: 2,
      }} />
      <View style={{
        position: 'absolute',
        left: 4, top: bodyTop - 2,
        width: tilePx - 8, height: 4,
        backgroundColor: accent,
      }} />
      <View style={{
        position: 'absolute',
        left: tilePx / 2 - 2 + legShift,
        top: bodyTop + tilePx - 8,
        width: 4, height: 3,
        backgroundColor: '#000',
      }} />
      <View style={{
        position: 'absolute',
        ...dot,
        width: 4, height: 4,
        backgroundColor: '#f8f8f8',
      }} />
    </View>
  );
}
