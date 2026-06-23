import React from 'react';
import { Image, Platform, type ImageStyle, type StyleProp } from 'react-native';
import { resolveSpriteAsset } from '@/design/spriteAssets';

export interface ImageSpriteProps {
  /**
   * Art key registered in `spriteAssets.ts`. If no asset is registered for the
   * key, `fallback` is rendered instead (or nothing if no fallback is given).
   */
  spriteKey: string;
  /** Rendered size in logical px (square). */
  size: number;
  /**
   * Rendered when no image asset is registered for `spriteKey`. Typically the
   * procedural <PixelGrid /> placeholder. Lets a single component swap between
   * real art and placeholder transparently.
   */
  fallback?: React.ReactNode;
  /** Optional extra style merged onto the <Image>. */
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

/**
 * Renders a sprite from a registered image asset with crisp, nearest-neighbour
 * (pixelated) scaling so pixel art does not blur when upscaled to integer
 * multiples.
 *
 * - On web we set `imageRendering: 'pixelated'` (RN-web passes style through to
 *   the underlying <img>), which is the only reliable way to disable smoothing
 *   in a browser.
 * - On native, RN's <Image> already does nearest-neighbour for small bitmaps at
 *   integer scale; we keep `resizeMode="stretch"` so an N×N source maps exactly
 *   onto the target box.
 *
 * Graceful fallback: when `resolveSpriteAsset(spriteKey)` is undefined (no art
 * dropped in yet) this renders `fallback` instead, so the game always shows
 * SOMETHING. With zero registered assets, every ImageSprite shows its fallback.
 */
export function ImageSprite({
  spriteKey,
  size,
  fallback = null,
  style,
  accessibilityLabel,
}: ImageSpriteProps) {
  const source = resolveSpriteAsset(spriteKey);

  if (!source) {
    return <>{fallback}</>;
  }

  // `imageRendering` is web-only; it is not in RN's ImageStyle type, so we
  // attach it via a platform-guarded plain object cast.
  const pixelated =
    Platform.OS === 'web'
      ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle)
      : null;

  return (
    <Image
      source={source}
      // `stretch` maps the source bitmap exactly onto the size box so integer
      // upscales stay sharp (combined with pixelated rendering on web).
      resizeMode="stretch"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, pixelated, style]}
    />
  );
}
