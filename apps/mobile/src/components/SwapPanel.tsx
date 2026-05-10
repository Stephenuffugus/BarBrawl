import React from 'react';
import { Pressable, View } from 'react-native';
import { getClass, type ClassId } from '@barbrawl/game-core';
import type { ReserveChar } from '@/battle/setup';
import { UI, CLASS_ACCENT } from '@/design/palette';
import { PixelText } from './PixelText';
import { Panel } from './Panel';

export interface SwapPanelProps {
  reserves: readonly ReserveChar[];
  onPick: (classId: ClassId) => void;
  onCancel: () => void;
}

/**
 * In-battle SWAP submenu — lists swappable reserves with their HP %.
 * Tapping one rotates the active player. Costs the turn.
 */
export function SwapPanel({ reserves, onPick, onCancel }: SwapPanelProps) {
  return (
    <Panel style={{ minHeight: 132 }}>
      <PixelText size={11} color={UI.textDim} style={{ marginBottom: 4 }}>
        Swap in (costs your turn)
      </PixelText>
      {reserves.length === 0 ? (
        <PixelText size={11} color={UI.textDim}>
          No backup brought into this fight.
        </PixelText>
      ) : null}
      {reserves.map((r) => {
        const cls = getClass(r.classId);
        const accent = CLASS_ACCENT[r.classId as keyof typeof CLASS_ACCENT];
        const hpPct = r.maxHp > 0 ? r.startingHp / r.maxHp : 0;
        const hpColor = hpPct > 0.5 ? UI.hpFull : hpPct > 0.25 ? UI.hpHalf : UI.hpLow;
        return (
          <Pressable
            key={r.classId}
            onPress={() => onPick(r.classId)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
          >
            <PixelText size={14} color={UI.cursor} style={{ width: 16 }}>▶</PixelText>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{
                width: 16, height: 16,
                backgroundColor: accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <PixelText size={10} color={UI.bg}>{cls.icon}</PixelText>
              </View>
              <PixelText size={12} color={UI.text}>{cls.name}</PixelText>
            </View>
            <PixelText size={10} color={hpColor}>{r.startingHp}/{r.maxHp}</PixelText>
          </Pressable>
        );
      })}
      <View style={{ height: 1, backgroundColor: UI.borderDark, marginVertical: 6 }} />
      <Pressable onPress={onCancel} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
        <PixelText size={14} color={UI.textDim} style={{ width: 16 }}>◀</PixelText>
        <PixelText size={13} color={UI.textDim}>BACK</PixelText>
      </Pressable>
    </Panel>
  );
}
