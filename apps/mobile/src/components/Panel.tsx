import React, { type ReactNode } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';

export interface PanelProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inside-shadow line offset; PS-style nested panel. */
  inset?: boolean;
}

/**
 * White-bordered panel with black fill. PS1-literal chrome — a 1-pixel
 * outline around a black box, with an optional inner shadow line.
 */
export function Panel({ children, style, inset }: PanelProps) {
  return (
    <View
      style={[
        {
          backgroundColor: UI.panelFill,
          borderColor: UI.border,
          borderWidth: PIXEL,
          padding: PIXEL * 2,
        },
        inset && {
          borderTopColor: UI.borderDark,
          borderLeftColor: UI.borderDark,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
