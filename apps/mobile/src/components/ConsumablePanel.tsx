import React from 'react';
import { Pressable, View } from 'react-native';
import { Consumables } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from './PixelText';
import { Panel } from './Panel';

const RARITY_COLOR: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export interface ConsumablePanelProps {
  /** consumables from the active character (id → count). */
  pack: Readonly<Record<string, number>>;
  onPick: (consumableId: string) => void;
  onCancel: () => void;
}

/**
 * In-battle item menu. Lists every consumable the player still has stock
 * of, with rarity color + remaining count + brief effect line. Tap a row →
 * onPick(id). Bottom row is "BACK".
 */
export function ConsumablePanel({ pack, onPick, onCancel }: ConsumablePanelProps) {
  const ids = Object.keys(pack).filter((id) => pack[id]! > 0);
  return (
    <Panel style={{ minHeight: 132 }}>
      <PixelText size={11} color={UI.textDim} style={{ marginBottom: 4 }}>
        Pick an item
      </PixelText>
      {ids.length === 0 ? (
        <PixelText size={11} color={UI.textDim}>
          No consumables in your pack.
        </PixelText>
      ) : null}
      {ids.slice(0, 4).map((id) => {
        const def = Consumables.getConsumable(id);
        const rColor = RARITY_COLOR[def.rarity] ?? UI.textDim;
        return (
          <Pressable
            key={id}
            onPress={() => onPick(id)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
          >
            <PixelText size={14} color={rColor} style={{ width: 16 }}>▶</PixelText>
            <View style={{ flex: 1 }}>
              <PixelText size={12} color={UI.text}>{def.name}</PixelText>
              <PixelText size={9} color={UI.textDim}>{def.description}</PixelText>
            </View>
            <PixelText size={11} color={UI.cursor} style={{ marginLeft: 6 }}>
              ×{pack[id]}
            </PixelText>
          </Pressable>
        );
      })}
      <View style={{ height: 1, backgroundColor: UI.borderDark, marginVertical: 6 }} />
      <Pressable onPress={onCancel} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
        <PixelText size={14} color={UI.textDim} style={{ width: 16 }}>◀</PixelText>
        <PixelText size={13} color={UI.textDim}>BACK</PixelText>
      </Pressable>
      <View style={{ minHeight: PIXEL * 2 }} />
    </Panel>
  );
}
