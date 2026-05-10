import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

export interface ShakeFlashProps {
  /** Increment this value to trigger a hit animation. */
  hitToken: number;
  /** Set true for a stronger shake (crit). */
  strong?: boolean;
  children: ReactNode;
}

const SHAKE_MS = 220;
const SHAKE_OFFSET = 6;

/**
 * Wraps a child node and shakes/flashes it when `hitToken` changes. Caller
 * increments hitToken (e.g. counter++) to trigger one hit animation. Pure
 * RAF-driven — works on web + native.
 *
 * Effects:
 *   - X/Y translate jitter for SHAKE_MS (stronger if strong=true)
 *   - Brief white tint overlay during the first ~80ms of the shake
 */
export function ShakeFlash({ hitToken, strong = false, children }: ShakeFlashProps) {
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [flash, setFlash] = useState(false);
  const startedAt = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const lastToken = useRef<number>(hitToken);

  useEffect(() => {
    if (hitToken === lastToken.current) return;
    lastToken.current = hitToken;
    startedAt.current = performance.now();
    setFlash(true);

    const amplitude = strong ? SHAKE_OFFSET * 2 : SHAKE_OFFSET;
    const tick = (now: number) => {
      const elapsed = now - (startedAt.current ?? now);
      if (elapsed >= SHAKE_MS) {
        setTx(0); setTy(0); setFlash(false);
        return;
      }
      // Decaying jitter — amplitude shrinks linearly.
      const decay = 1 - elapsed / SHAKE_MS;
      const jitterX = (Math.random() - 0.5) * 2 * amplitude * decay;
      const jitterY = (Math.random() - 0.5) * 2 * amplitude * decay;
      setTx(jitterX);
      setTy(jitterY);
      if (elapsed < 80) setFlash(true); else setFlash(false);
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [hitToken, strong]);

  return (
    <View style={{ transform: [{ translateX: tx }, { translateY: ty }] }}>
      <View>{children}</View>
      {flash ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
            backgroundColor: '#ffffff',
            opacity: 0.55,
          }}
        />
      ) : null}
    </View>
  );
}
