// Roster screen — pick which of your 7 characters is active. Active class
// is read by battle, tree, preview, and rewards screens.

import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { getClass, type ClassId, type Loot } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { HpBar } from '@/components/HpBar';
import { UI, CLASS_ACCENT } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';
import { computeEffectiveStats } from '@/state/effective-stats';

const SLOT_SHORT: Record<Loot.ItemSlot, string> = {
  weapon: 'WPN', outfit: 'FIT', footwear: 'FT', trinket: 'TRK', mark: 'MRK',
};

export default function RosterScreen() {
  const { roster, activeIdx, setActive, equipped, inventory } = useGameStore();

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
          const charEquipped = equipped[char.class_id] ?? {};
          const stats = computeEffectiveStats(
            char.class_id as ClassId, char.level, charEquipped, inventory,
          );
          const equippedCount = Object.keys(charEquipped).length;
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
                      <HpBar hp={stats.hp} maxHp={stats.hp} widthCells={20} showNumbers={false} />
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Stat label="ATK" value={stats.atk} bumped={stats.atk > cls.baseStats.atk + (char.level - 1) * 2} />
                  <Stat label="DEF" value={stats.def} bumped={stats.def > cls.baseStats.def + (char.level - 1)} />
                  <Stat label="SPD" value={stats.spd} bumped={stats.spd > Math.floor(cls.baseStats.spd + (char.level - 1) * 0.5)} />
                  <Stat label="LCK" value={stats.luck} bumped={stats.luck > cls.baseStats.luck} />
                  <Stat label="SP" value={Math.max(0, char.level - char.allocated_nodes.length)} highlight />
                </View>

                {/* Equipped slot indicator */}
                {equippedCount > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                    {(Object.keys(charEquipped) as Loot.ItemSlot[]).map((slot) => (
                      <View key={slot} style={{
                        paddingHorizontal: 4, paddingVertical: 2,
                        backgroundColor: UI.bg, borderColor: UI.cursor, borderWidth: 1,
                      }}>
                        <PixelText size={8} color={UI.cursor}>{SLOT_SHORT[slot]}</PixelText>
                      </View>
                    ))}
                  </View>
                ) : null}

                {isActive ? (
                  <PixelText size={10} color={UI.cursor} style={{ marginTop: 8 }}>
                    ▶ ACTIVE — {char.allocated_nodes.length} nodes · {equippedCount}/5 slots
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

function Stat({ label, value, highlight, bumped }: { label: string; value: number; highlight?: boolean; bumped?: boolean }) {
  const color = highlight ? UI.cursor : bumped ? UI.hpFull : UI.text;
  return (
    <View style={{ alignItems: 'center', minWidth: 36 }}>
      <PixelText size={9} color={UI.textDim}>{label}</PixelText>
      <PixelText size={12} color={color}>{value}{bumped ? '+' : ''}</PixelText>
    </View>
  );
}
