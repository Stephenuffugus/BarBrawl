import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { gainsForLevels } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';

const HOLD_MS = 1400;

export interface LevelUpFlashProps {
  /** Increment to trigger. */
  levelsGained: number;
  /** Resulting new level after the gain. */
  newLevel: number;
}

/**
 * Brief level-up celebration overlay. Mounts when levelsGained > 0 and
 * animates a scaled "LEVEL UP!" with the per-level gains. Caller should
 * key this on a counter that bumps once per level-up event so the
 * effect re-runs naturally.
 */
export function LevelUpFlash({ levelsGained, newLevel }: LevelUpFlashProps) {
  const [t, setT] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (levelsGained <= 0) return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      setT(Math.min(1, elapsed / HOLD_MS));
      if (elapsed < HOLD_MS) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      setT(0);
    };
  }, [levelsGained, newLevel]);

  if (levelsGained <= 0 || t >= 1) return null;
  const gains = gainsForLevels(levelsGained);

  // Scale: starts large, settles to 1.0; opacity fades out at end.
  const scale = t < 0.3 ? 0.5 + t * 1.67 : 1.0;
  const opacity = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
        zIndex: 250,
      }}
    >
      <View style={{
        opacity,
        alignItems: 'center',
        backgroundColor: '#101018',
        borderColor: UI.cursor, borderWidth: PIXEL,
        paddingHorizontal: 24, paddingVertical: 16,
        transform: [{ scale }],
      }}>
        <PixelText size={20} color={UI.cursor} style={{ letterSpacing: 4 }}>
          LEVEL UP
        </PixelText>
        <PixelText size={36} color={UI.text} style={{ letterSpacing: 2, marginTop: 4 }}>
          LV {newLevel}
        </PixelText>
        <View style={{ width: 160, height: PIXEL, backgroundColor: UI.cursor, marginTop: 8 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Stat label="HP" value={gains.hp} />
          <Stat label="ATK" value={gains.atk} />
          <Stat label="DEF" value={gains.def} />
          <Stat label="SPD" value={gains.spd} />
        </View>
        <PixelText size={11} color={UI.cursor} style={{ marginTop: 8 }}>
          +{gains.skillPoints} SKILL POINT{gains.skillPoints === 1 ? '' : 'S'}
        </PixelText>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <PixelText size={9} color={UI.textDim}>{label}</PixelText>
      <PixelText size={14} color={UI.hpFull}>+{value}</PixelText>
    </View>
  );
}
