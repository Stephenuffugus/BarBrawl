import React from 'react';
import { View } from 'react-native';
import { CLASS_ACCENT } from '@/design/palette';
import { TILE_LOGICAL } from '@/design/tiles';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerSpriteProps {
  col: number;
  row: number;
  direction: Direction;
  /** Class accent color for the trainer's hat / scarf. */
  accentClassId?: keyof typeof CLASS_ACCENT;
  /** Override tile size if rendering at a non-default scale. */
  tileSize?: number;
}

/**
 * 16×16-style "trainer" sprite drawn with stacked Views — quick stand-in
 * for the real Pokemon Red trainer art. Rotates suggestion of direction
 * via a 4-cell hint dot. Real frames swap in via PixelGrid + sprite art
 * later.
 */
export function PlayerSprite({
  col, row, direction, accentClassId = 'brewer', tileSize = TILE_LOGICAL,
}: PlayerSpriteProps) {
  const accent = CLASS_ACCENT[accentClassId];
  const x = col * tileSize;
  const y = row * tileSize;

  // Dot offsets per direction — rough "facing" indicator.
  const dot = {
    up:    { left: tileSize / 2 - 2, top: 8 },
    down:  { left: tileSize / 2 - 2, top: tileSize - 14 },
    left:  { left: 8, top: tileSize / 2 - 2 },
    right: { left: tileSize - 14, top: tileSize / 2 - 2 },
  }[direction];

  return (
    <View
      style={{
        position: 'absolute',
        left: x, top: y,
        width: tileSize, height: tileSize,
        zIndex: 10,
      }}
    >
      {/* body */}
      <View style={{
        position: 'absolute',
        left: tileSize / 4, top: tileSize / 4,
        width: tileSize / 2, height: tileSize / 2,
        backgroundColor: '#181828',
        borderColor: '#000', borderWidth: 2,
      }} />
      {/* hat / accent strip */}
      <View style={{
        position: 'absolute',
        left: tileSize / 4, top: tileSize / 4 - 2,
        width: tileSize / 2, height: 4,
        backgroundColor: accent,
      }} />
      {/* direction dot */}
      <View style={{
        position: 'absolute',
        ...dot,
        width: 4, height: 4,
        backgroundColor: '#f8f8f8',
      }} />
    </View>
  );
}
