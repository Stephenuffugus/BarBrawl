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

/**
 * A pulsing gold ring rendered over a claimed bar tile. Indicates the
 * player owns this bar. Pulses opacity over a 1.6s loop via setInterval —
 * cheap, no RAF needed for this slow tempo.
 */
export function ClaimMarker({ size, left, top }: ClaimMarkerProps) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 8), 200);
    return () => clearInterval(id);
  }, []);
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
}
