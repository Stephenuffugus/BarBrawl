import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { Combat } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';

export interface ResourceBarProps {
  resource: Combat.CombatResource;
  /** Cells wide, each PIXEL. Default 22 to match the player HpBar. */
  widthCells?: number;
}

interface ResourceStyle {
  color: string;
  glowColor: string;
  label: string;
  /** Symbol shown at the head of the bar. */
  icon: string;
}

const STYLES: Record<Combat.CombatResource['kind'], ResourceStyle> = {
  focus:       { color: '#4895ef', glowColor: '#a0c8f8', label: 'FOCUS',  icon: '◎' },
  grit:        { color: '#DAA520', glowColor: '#f8e0a0', label: 'GRIT',   icon: '⛓' },
  curseStacks: { color: '#a040c0', glowColor: '#e0a8f8', label: 'CURSES', icon: '✺' },
  tempo:       { color: '#22c55e', glowColor: '#74e070', label: 'TEMPO',  icon: '♬' },
  reserve:     { color: '#ef4444', glowColor: '#f08080', label: 'RESERVE', icon: '✚' },
  momentum:    { color: '#5870b0', glowColor: '#a0c8f8', label: 'MOMENTUM', icon: '⫸' },
  chips:       { color: '#e04050', glowColor: '#f8c020', label: 'CHIPS',  icon: '◈' },
};

/**
 * Class-aware resource progress bar. Animated cell fill drains/grows to
 * match the prop value. At cap the bar glows (drop shadow + bright border).
 */
export function ResourceBar({ resource, widthCells = 22 }: ResourceBarProps) {
  const style = STYLES[resource.kind];

  // Animate the displayed value toward the current value over 200ms.
  const [display, setDisplay] = useState(resource.current);
  const prev = useRef(resource.current);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (resource.current === prev.current) return;
    const start = performance.now();
    const from = prev.current;
    const to = resource.current;
    const dur = 220;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafId.current = requestAnimationFrame(tick);
      else prev.current = to;
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
    // resource.current change is the only thing we react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.current]);

  const pct = resource.cap > 0 ? Math.max(0, Math.min(1, display / resource.cap)) : 0;
  const filledCells = Math.ceil(widthCells * pct);
  const atCap = display >= resource.cap;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <PixelText size={11} color={atCap ? style.glowColor : style.color} style={{ marginRight: 4, width: 12 }}>
        {style.icon}
      </PixelText>
      <View style={{
        width: widthCells * PIXEL,
        height: PIXEL * 2,
        borderColor: atCap ? style.glowColor : UI.border,
        borderWidth: 1,
        backgroundColor: UI.bg,
        flexDirection: 'row',
      }}>
        <View style={{
          width: filledCells * PIXEL,
          height: '100%',
          backgroundColor: atCap ? style.glowColor : style.color,
        }} />
      </View>
      <PixelText size={9} color={atCap ? style.glowColor : style.color} style={{ marginLeft: 6 }}>
        {Math.round(display)}/{resource.cap}{atCap ? ' ▲' : ''}
      </PixelText>
    </View>
  );
}
