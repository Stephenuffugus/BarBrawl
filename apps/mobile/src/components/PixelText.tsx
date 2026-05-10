import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { PIXEL_FONT } from '@/design/scale';
import { UI } from '@/design/palette';

export interface PixelTextProps extends TextProps {
  size?: number;       // logical px (multiplied internally for crispness)
  color?: string;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * Pixel-flavored text. Uses Courier monospace + uppercase + letter-spacing
 * to approximate 8-bit bitmap fonts. Will swap to a real bitmap font when
 * we ship asset bundles.
 */
export function PixelText({ size = 14, color = UI.text, bold = true, style, children, ...rest }: PixelTextProps) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: PIXEL_FONT.family,
          fontSize: size,
          color,
          fontWeight: bold ? PIXEL_FONT.weight : '400',
          letterSpacing: PIXEL_FONT.letterSpacing,
          textTransform: 'uppercase',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
