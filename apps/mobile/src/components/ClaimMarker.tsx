import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { UI } from '@/design/palette';

export interface ClaimMarkerProps {
  /** Pixel size of the marker square (matches the tile size in viewport units). */
  size: number;
  /** Top-left in viewport-local px. */
  left: number;
  top: number;
}

// A single shared 200ms clock drives every marker's pulse phase, instead of
// one setInterval per marker. The interval only runs while at least one
// marker is mounted (subscriber count > 0). Behavior is identical to the
// previous per-marker timer: phase advances (p + 1) % 8 every 200ms.
let sharedPhase = 0;
let sharedTimer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(phase: number) => void>();

function subscribePhase(cb: (phase: number) => void): () => void {
  subscribers.add(cb);
  if (sharedTimer === null) {
    sharedTimer = setInterval(() => {
      sharedPhase = (sharedPhase + 1) % 8;
      subscribers.forEach((s) => s(sharedPhase));
    }, 200);
  }
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && sharedTimer !== null) {
      clearInterval(sharedTimer);
      sharedTimer = null;
    }
  };
}

/**
 * A pulsing gold ring rendered over a claimed bar tile. Indicates the
 * player owns this bar. Pulses opacity over a 1.6s loop driven by a single
 * shared 200ms clock (one timer total, not one per marker).
 */
export const ClaimMarker = React.memo(function ClaimMarker({ size, left, top }: ClaimMarkerProps) {
  const [phase, setPhase] = useState(sharedPhase);
  useEffect(() => subscribePhase(setPhase), []);
  // Opacity wave 0.4 → 1.0 → 0.4 over 8 ticks (1.6s).
  const opacity = 0.4 + 0.6 * Math.abs(Math.sin((phase / 8) * Math.PI));
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left, top,
        width: size, height: size,
        borderColor: UI.cursor,
        borderWidth: 2,
        opacity,
      }}
    />
  );
});
