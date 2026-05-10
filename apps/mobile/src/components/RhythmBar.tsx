import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  RHYTHM_WINDOW_MS, RHYTHM_ZONES, classifyRhythmTap, type RhythmResult,
} from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { playSfx } from '@/audio/sfx';
import { PixelText } from './PixelText';

const HOLD_MS = 450; // post-resolve pause before firing onResolve

export interface RhythmBarProps {
  /** Total bar width in logical px. */
  width?: number;
  /** Callback fired ~HOLD_MS after the marker stops, with the result. */
  onResolve: (result: RhythmResult) => void;
  /** Optional caption above the bar. */
  caption?: string;
}

/**
 * 1.2-second sliding-marker rhythm input. Tap anywhere on the bar (or the
 * surrounding tap area) to commit. If the window elapses without a tap,
 * resolves as 'miss' per spec.
 *
 * Layout: a black void bar with three zones rendered as inset blocks:
 *   - Outside green: red rim (miss zone)
 *   - 40-60%: green band (good zone)
 *   - 47-53%: gold band (perfect zone)
 * The marker is a tall thin yellow column that slides L→R over 1200ms.
 *
 * Visual feedback on tap: marker freezes, color shifts to result color,
 * a banner ("PERFECT!" / "GOOD!" / "MISS!") fades in, then onResolve fires.
 */
export function RhythmBar({ width = 280, onResolve, caption }: RhythmBarProps) {
  const [pos, setPos] = useState(0);
  const [resolved, setResolved] = useState<RhythmResult | null>(null);
  const startMs = useRef(0);
  const rafId = useRef<number | null>(null);

  // Drive the marker.
  useEffect(() => {
    startMs.current = performance.now();
    const tick = (now: number) => {
      if (resolved) return;
      const elapsed = now - startMs.current;
      const p = Math.min(1, elapsed / RHYTHM_WINDOW_MS);
      setPos(p);
      if (p >= 1) {
        const r = classifyRhythmTap(null);
        setResolved(r);
        return;
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire the callback after the result holds briefly.
  useEffect(() => {
    if (!resolved) return;
    const t = setTimeout(() => onResolve(resolved), HOLD_MS);
    return () => clearTimeout(t);
  }, [resolved, onResolve]);

  const onTap = useCallback(() => {
    if (resolved) return;
    const elapsed = performance.now() - startMs.current;
    const r = classifyRhythmTap(elapsed);
    setResolved(r);
    playSfx(r.quality === 'perfect' ? 'perfect'
          : r.quality === 'good'    ? 'good'
          : r.quality === 'miss'    ? 'miss'
                                    : 'menu_select');
  }, [resolved]);

  const markerLeft = Math.max(0, Math.min(width - PIXEL * 2, pos * width - PIXEL));
  const markerColor =
    resolved?.quality === 'perfect' ? UI.cursor :
    resolved?.quality === 'good'    ? UI.hpFull :
    resolved?.quality === 'miss'    ? UI.hpLow :
                                      UI.cursor;

  // Zone band positions (as logical px from left).
  const goodLeft = RHYTHM_ZONES.GOOD_MIN * width;
  const goodWidth = (RHYTHM_ZONES.GOOD_MAX - RHYTHM_ZONES.GOOD_MIN) * width;
  const perfLeft = RHYTHM_ZONES.PERFECT_MIN * width;
  const perfWidth = (RHYTHM_ZONES.PERFECT_MAX - RHYTHM_ZONES.PERFECT_MIN) * width;

  const banner =
    resolved?.quality === 'perfect' ? 'PERFECT!' :
    resolved?.quality === 'good'    ? 'GOOD!' :
    resolved?.quality === 'miss'    ? 'MISS!' :
                                      null;

  return (
    <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel="Tap to commit rhythm">
      <View style={{ alignItems: 'center', gap: 4 }}>
        {caption ? (
          <PixelText size={11} color={UI.text}>{caption}</PixelText>
        ) : null}
        <View
          style={{
            width,
            height: PIXEL * 6,
            backgroundColor: UI.bg,
            borderColor: UI.border,
            borderWidth: 1,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* miss zone background (red, behind everything) */}
          <View style={{
            position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
            backgroundColor: '#3a0808', opacity: 0.5,
          }} />
          {/* good zone */}
          <View style={{
            position: 'absolute', left: goodLeft, top: 0, width: goodWidth, height: '100%',
            backgroundColor: '#0c2a0c',
          }} />
          {/* perfect zone */}
          <View style={{
            position: 'absolute', left: perfLeft, top: 0, width: perfWidth, height: '100%',
            backgroundColor: '#3a2a08',
          }} />
          {/* marker */}
          <View style={{
            position: 'absolute', left: markerLeft, top: -2, bottom: -2,
            width: PIXEL * 2, backgroundColor: markerColor,
          }} />
        </View>
        <View style={{ height: 18, justifyContent: 'center' }}>
          {banner ? (
            <PixelText size={14} color={markerColor}>{banner}</PixelText>
          ) : (
            <PixelText size={10} color={UI.textDim}>TAP IN THE GOLD</PixelText>
          )}
        </View>
      </View>
    </Pressable>
  );
}
