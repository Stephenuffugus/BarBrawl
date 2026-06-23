import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { UI } from '@/design/palette';
import { PixelText } from './PixelText';

export interface VictoryFlashProps {
  /** Render only when active. Caller toggles by mounting/unmounting. */
  active: boolean;
}

/**
 * Brief gold-tint full-screen overlay with a scaled VICTORY pulse and
 * floating sparkles. ~800ms total. Caller mounts when battle.result === 'win'
 * and unmounts after routing to /rewards.
 */
export function VictoryFlash({ active }: VictoryFlashProps) {
  const [t, setT] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      setT(Math.min(1, elapsed / 800));
      if (elapsed < 800) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      setT(0);
    };
  }, [active]);

  if (!active) return null;

  // Tint: bright at 0, fades by t=1.
  const tintOpacity = (1 - t) * 0.35;
  // Pulse scale: starts at 0.4, peaks at 1.4 by t=0.4, settles at 1.0.
  const scale = t < 0.4 ? 0.4 + t * 2.5 : 1.4 - (t - 0.4) * 0.67;

  // Sparkles — 8 floating dots positioned in a ring.
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const dist = 80 + t * 60;
    return {
      key: i,
      left: Math.cos(angle) * dist,
      top: Math.sin(angle) * dist,
      opacity: 1 - t,
    };
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <View style={{
        position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
        backgroundColor: UI.cursor, opacity: tintOpacity,
      }} />
      <View style={{
        transform: [{ scale }],
        alignItems: 'center',
      }}>
        <PixelText size={42} color={UI.cursor} style={{ letterSpacing: 6 }}>
          TAMED
        </PixelText>
      </View>
      <View style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 0, height: 0,
      }}>
        {sparkles.map((s) => (
          <View
            key={s.key}
            style={{
              position: 'absolute',
              left: s.left, top: s.top,
              width: 6, height: 6,
              backgroundColor: UI.cursor,
              opacity: s.opacity,
            }}
          />
        ))}
      </View>
    </View>
  );
}
