import React from 'react';
import { Pressable, View } from 'react-native';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';
import type { Direction } from './PlayerSprite';

export interface DPadProps {
  onMove: (dir: Direction) => void;
  onAction?: () => void;
}

const BTN_SIZE = 48;

/**
 * On-screen DPAD for overworld movement. 4 directional buttons in a + pattern,
 * plus an A button below for "interact / enter".
 */
export function DPad({ onMove, onAction }: DPadProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ width: BTN_SIZE * 3, height: BTN_SIZE * 3, position: 'relative' }}>
        <ArrowBtn dir="up"    style={{ left: BTN_SIZE, top: 0 }}        onPress={() => onMove('up')}    />
        <ArrowBtn dir="left"  style={{ left: 0, top: BTN_SIZE }}        onPress={() => onMove('left')}  />
        <ArrowBtn dir="right" style={{ left: BTN_SIZE * 2, top: BTN_SIZE }} onPress={() => onMove('right')} />
        <ArrowBtn dir="down"  style={{ left: BTN_SIZE, top: BTN_SIZE * 2 }} onPress={() => onMove('down')}  />
      </View>
      {onAction ? (
        <Pressable
          onPress={onAction}
          style={{
            width: BTN_SIZE + 12,
            height: BTN_SIZE + 12,
            borderRadius: (BTN_SIZE + 12) / 2,
            backgroundColor: UI.cursor,
            borderColor: UI.border,
            borderWidth: PIXEL,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PixelText size={16} color={UI.bg}>A</PixelText>
        </Pressable>
      ) : null}
    </View>
  );
}

const ARROW = { up: '▲', down: '▼', left: '◀', right: '▶' } as const;

function ArrowBtn({
  dir, style, onPress,
}: { dir: Direction; style: object; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          position: 'absolute',
          width: BTN_SIZE,
          height: BTN_SIZE,
          backgroundColor: UI.panelFill,
          borderColor: UI.border,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <PixelText size={20} color={UI.text}>{ARROW[dir]}</PixelText>
    </Pressable>
  );
}
