import React, { useMemo } from 'react';
import { View } from 'react-native';
import { OVERWORLD_MAP, TILES, tileAt, TILE_LOGICAL, MAP_COLS, MAP_ROWS } from '@/design/tiles';

export interface TilemapProps {
  /** Logical px size per tile. Default = TILE_LOGICAL (64). */
  size?: number;
}

/**
 * Renders OVERWORLD_MAP as a grid of colored View tiles. Each tile is a
 * 64×64 logical block with a 1-cell outer accent ring. Passable tiles
 * are slightly different shade than walls.
 *
 * This is intentionally minimal — Phase 14 will replace each tile with a
 * 16×16 sprite via PixelGrid. The grid math is what matters today.
 */
export function Tilemap({ size = TILE_LOGICAL }: TilemapProps) {
  const cells = useMemo(() => {
    const out: { col: number; row: number; tile: keyof typeof TILES }[] = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const t = tileAt(OVERWORLD_MAP, c, r);
        if (t) out.push({ col: c, row: r, tile: t });
      }
    }
    return out;
  }, []);

  return (
    <View
      style={{
        width: MAP_COLS * size,
        height: MAP_ROWS * size,
        position: 'relative',
        backgroundColor: TILES.grass.fill,
      }}
    >
      {cells.map(({ col, row, tile }) => {
        const def = TILES[tile];
        return (
          <View
            key={`${col}-${row}`}
            style={{
              position: 'absolute',
              left: col * size,
              top: row * size,
              width: size,
              height: size,
              backgroundColor: def.fill,
            }}
          >
            {def.accent ? (
              <View style={{
                position: 'absolute',
                left: 4, top: 4, right: 4, bottom: 4,
                backgroundColor: def.accent,
                opacity: tile.startsWith('door_') ? 1 : 0.4,
              }} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
