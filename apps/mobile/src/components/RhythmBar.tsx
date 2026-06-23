import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  RHYTHM_WINDOW_MS, RHYTHM_ZONES, classifyRhythmTap, type RhythmResult,
} from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { playSfx } from '@/audio/sfx';
import { PixelText } from './PixelText';

const HOLD_MS = 150; // BALANCE: post-resolve pause before firing onResolve (was 450 — felt sluggish)

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

  // Keyboard support for web players: Spacebar / Enter commits the tap.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onTap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTap]);

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
    <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel="Tap, or press Space/Enter, to commit rhythm">
      <View style={{ alignItems: 'center', gap: 6 }}>
        {caption ? (
          <PixelText size={11} color={UI.text}>{caption}</PixelText>
        ) : null}
        {/* Big, obvious call to action while the window is open. */}
        {!resolved ? (
          <PixelText size={18} color={UI.cursor}>▶ TAP! ◀</PixelText>
        ) : (
          <PixelText size={18} color={markerColor}>{banner}</PixelText>
        )}
        <View
          style={{
            width,
            height: PIXEL * 8,
            backgroundColor: UI.bg,
            borderColor: UI.cursor,
            borderWidth: 3,
            position: 'relative',
            overflow: 'hidden',
            // Glowing button-like shadow so it reads as pressable.
            shadowColor: UI.cursor,
            shadowOpacity: 0.7,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          }}
        >
          {/* miss zone background (dim red, behind everything) */}
          <View style={{
            position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
            backgroundColor: '#5a0c0c', opacity: 0.55,
          }} />
          {/* good zone — bright GBC green */}
          <View style={{
            position: 'absolute', left: goodLeft, top: 0, width: goodWidth, height: '100%',
            backgroundColor: UI.hpFull,
          }} />
          {/* perfect zone — bright gold, the bullseye */}
          <View style={{
            position: 'absolute', left: perfLeft, top: 0, width: perfWidth, height: '100%',
            backgroundColor: UI.cursor,
          }} />
          {/* marker — wide bright column with a glow halo */}
          <View style={{
            position: 'absolute', left: markerLeft - PIXEL, top: -4, bottom: -4,
            width: PIXEL * 4, backgroundColor: markerColor, opacity: 0.4,
          }} />
          <View style={{
            position: 'absolute', left: markerLeft, top: -4, bottom: -4,
            width: PIXEL * 2, backgroundColor: UI.text,
            borderColor: markerColor, borderWidth: 1,
            shadowColor: markerColor, shadowOpacity: 0.9,
            shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
          }} />
        </View>
        <View style={{ height: 18, justifyContent: 'center' }}>
          {resolved ? null : (
            <PixelText size={10} color={UI.textDim}>HIT THE GOLD — TAP OR PRESS SPACE</PixelText>
          )}
        </View>
      </View>
    </Pressable>
  );
}
