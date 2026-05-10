import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';

export interface HpBarProps {
  hp: number;
  maxHp: number;
  /** Total bar width in cells (each PIXEL wide). Default 32. */
  widthCells?: number;
  showNumbers?: boolean;
  label?: string;
  /** ms to interpolate from previous hp to new hp. 0 disables. */
  drainMs?: number;
}

/**
 * Pixel-grid HP bar with an animated drain. When the `hp` prop drops, the
 * displayed value tweens to the new value over `drainMs` (default 250ms)
 * giving the satisfying "Pokemon health bar drain" feel.
 *
 * Color tiers: green > 50%, amber > 25%, red below.
 */
export function HpBar({
  hp, maxHp, widthCells = 32, showNumbers = true, label, drainMs = 250,
}: HpBarProps) {
  const [display, setDisplay] = useState(hp);
  const prev = useRef(hp);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (drainMs <= 0 || hp === prev.current) {
      setDisplay(hp);
      prev.current = hp;
      return;
    }
    const start = performance.now();
    const from = prev.current;
    const to = hp;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / drainMs);
      const eased = easeOutCubic(t);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) rafId.current = requestAnimationFrame(tick);
      else prev.current = to;
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [hp, drainMs]);

  const pct = Math.max(0, Math.min(1, maxHp > 0 ? display / maxHp : 0));
  const filledCells = Math.ceil(widthCells * pct);
  const barColor = pct > 0.5 ? UI.hpFull : pct > 0.25 ? UI.hpHalf : UI.hpLow;

  return (
    <View>
      {label ? (
        <PixelText size={11} color={UI.text} style={{ marginBottom: 2 }}>
          {label}
        </PixelText>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PixelText size={10} color={UI.textDim} style={{ marginRight: 4 }}>HP</PixelText>
        <View style={{
          width: widthCells * PIXEL,
          height: PIXEL * 3,
          borderColor: UI.border,
          borderWidth: 1,
          backgroundColor: UI.bg,
          flexDirection: 'row',
        }}>
          <View style={{
            width: filledCells * PIXEL,
            height: '100%',
            backgroundColor: barColor,
          }} />
        </View>
        {showNumbers ? (
          <PixelText size={10} color={UI.text} style={{ marginLeft: 6 }}>
            {Math.max(0, display)}/{maxHp}
          </PixelText>
        ) : null}
      </View>
    </View>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
