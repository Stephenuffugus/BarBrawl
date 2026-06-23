import React, { useMemo } from 'react';
import { View } from 'react-native';
import { colorAt, type TilePalette, BAR_PALETTES, type BarThemeId } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import type { PixelSprite } from '@/design/sprites';
import { resolveSpriteAsset } from '@/design/spriteAssets';
import { ImageSprite } from './ImageSprite';

export interface PixelGridProps {
  sprite: PixelSprite;
  /** Per-bar tile palette key. Defaults to 'dive'. */
  theme?: BarThemeId;
  /** Class accent color (replaces "@" cells). */
  accent?: string;
  /** Override default PIXEL scale for this sprite (e.g. boss bigger). */
  pixelSize?: number;
  tint?: string; // optional flat tint overlay (e.g. for damage flash)
  /**
   * Optional art key. When a real image is registered for this key in
   * `spriteAssets.ts`, the image is rendered instead of the procedural grid
   * (at the same on-screen size). Omit it, or leave the key unregistered, to
   * keep the placeholder. Existing call sites that don't pass this are
   * unaffected.
   */
  spriteKey?: string;
}

/**
 * Renders a sprite string as an absolutely-positioned grid of color blocks.
 * Each "pixel" is a flat View, sized by PIXEL (or pixelSize override).
 *
 * Performance note: a 32x32 sprite is 1024 cells. We dedupe transparent
 * cells (don't render them at all) and group runs of the same color into
 * single wider Views to keep the React tree small.
 */
export function PixelGrid({ sprite, theme = 'dive', accent = '#f8b800', pixelSize = PIXEL, tint, spriteKey }: PixelGridProps) {
  const palette: TilePalette = BAR_PALETTES[theme];
  const side = sprite.size * pixelSize;

  // Build run-length runs for each row to reduce React node count.
  const runs = useMemo(() => {
    const result: { x: number; y: number; w: number; color: string }[] = [];
    for (let y = 0; y < sprite.size; y++) {
      const row = sprite.rows[y]!;
      let x = 0;
      while (x < sprite.size) {
        const ch = row.charAt(x);
        const color = colorAt(ch, palette, accent);
        if (color === null) { x++; continue; }
        let w = 1;
        while (x + w < sprite.size && row.charAt(x + w) === ch) w++;
        result.push({ x, y, w, color });
        x += w;
      }
    }
    return result;
  }, [sprite, palette, accent]);

  // Prefer registered drop-in art when it exists. The image is rendered into
  // the same logical box the placeholder grid would occupy (size × pixelSize),
  // so swapping art in never shifts layout. Falls through to the grid otherwise.
  if (resolveSpriteAsset(spriteKey)) {
    return (
      <View style={{ width: side, height: side, position: 'relative' }}>
        <ImageSprite spriteKey={spriteKey!} size={side} />
        {tint ? (
          <View style={{
            position: 'absolute', left: 0, top: 0, width: side, height: side,
            backgroundColor: tint, opacity: 0.5,
          }} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ width: side, height: side, position: 'relative' }}>
      {runs.map((r, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: r.x * pixelSize,
            top: r.y * pixelSize,
            width: r.w * pixelSize,
            height: pixelSize,
            backgroundColor: r.color,
          }}
        />
      ))}
      {tint ? (
        <View style={{
          position: 'absolute', left: 0, top: 0, width: side, height: side,
          backgroundColor: tint, opacity: 0.5,
        }} />
      ) : null}
    </View>
  );
}
