// Roster screen — pick which of your 7 characters is active. Active class
// is read by battle, tree, and rewards screens.

import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { getClass } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { HpBar } from '@/components/HpBar';
import { UI, CLASS_ACCENT } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';

export default function RosterScreen() {
  const { roster, activeIdx, setActive } = useGameStore();

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>YOUR ROSTER</PixelText>
        <PixelText size={11} color={UI.textDim}>{activeIdx + 1}/{roster.length}</PixelText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32 }}>
        {roster.map((char, idx) => {
          const cls = getClass(char.class_id);
          const isActive = idx === activeIdx;
          const accent = CLASS_ACCENT[char.class_id as keyof typeof CLASS_ACCENT];
          // Approximate HP pool from base stats + per-level scaling.
          const hp = cls.baseStats.hp + (char.level - 1) * 6;
          return (
            <Pressable
              key={char.class_id}
              onPress={() => setActive(idx)}
              style={{ marginBottom: 8 }}
            >
              <Panel
                style={{
                  borderColor: isActive ? UI.cursor : UI.border,
                  borderWidth: isActive ? PIXEL : 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* class accent block */}
                  <View style={{
                    width: 36, height: 36,
                    backgroundColor: accent,
                    borderColor: UI.border, borderWidth: 2,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PixelText size={20} color={UI.bg}>{cls.icon}</PixelText>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <PixelText size={14} color={isActive ? UI.cursor : UI.text}>
                        {cls.name}
                      </PixelText>
                      <PixelText size={11} color={UI.textDim}>LV {char.level}</PixelText>
                    </View>
                    <PixelText size={9} color={UI.textDim} style={{ marginTop: 2 }}>
                      {cls.tagline}
                    </PixelText>
                    <View style={{ marginTop: 6 }}>
                      <HpBar hp={hp} maxHp={hp} widthCells={20} showNumbers={false} />
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Stat label="ATK" value={cls.baseStats.atk} />
                  <Stat label="DEF" value={cls.baseStats.def} />
                  <Stat label="SPD" value={cls.baseStats.spd} />
                  <Stat label="LCK" value={cls.baseStats.luck} />
                  <Stat label="SP" value={Math.max(0, char.level - char.allocated_nodes.length)} highlight />
                </View>

                {isActive ? (
                  <PixelText size={10} color={UI.cursor} style={{ marginTop: 8 }}>
                    ▶ ACTIVE — {char.allocated_nodes.length} nodes allocated
                  </PixelText>
                ) : null}
              </Panel>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 36 }}>
      <PixelText size={9} color={UI.textDim}>{label}</PixelText>
      <PixelText size={12} color={highlight ? UI.cursor : UI.text}>{value}</PixelText>
    </View>
  );
}
