import React from 'react';
import { View } from 'react-native';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';

export interface HpBarProps {
  hp: number;
  maxHp: number;
  /** Total bar width in logical px. Default 32 cells * PIXEL. */
  widthCells?: number;
  showNumbers?: boolean;
  label?: string;
}

/**
 * Pixel-grid HP bar. Width is a count of "cells" (each PIXEL wide).
 * Color shifts: green > 50%, amber > 25%, red below.
 *
 * The bar is a 1-px black border with a 4-px-tall green/amber/red fill
 * and per-cell tick marks every 4 cells for legibility.
 */
export function HpBar({ hp, maxHp, widthCells = 32, showNumbers = true, label }: HpBarProps) {
  const pct = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0));
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
            {hp}/{maxHp}
          </PixelText>
        ) : null}
      </View>
    </View>
  );
}
