// Equipment slot screen for the active character. Shows all 5 slots,
// what's currently equipped (with unequip), and a CTA to find an item
// for empty slots.

import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { getClass, type ClassId, type Loot } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI, CLASS_ACCENT } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';
import { computeEffectiveStats } from '@/state/effective-stats';
import { playSfx } from '@/audio/sfx';

const SLOTS: readonly Loot.ItemSlot[] = ['weapon', 'outfit', 'footwear', 'trinket', 'mark'];

const SLOT_LABEL: Record<Loot.ItemSlot, string> = {
  weapon: 'WEAPON',
  outfit: 'OUTFIT',
  footwear: 'FOOTWEAR',
  trinket: 'TRINKET',
  mark: 'MARK',
};

const SLOT_ICON: Record<Loot.ItemSlot, string> = {
  weapon: '⚔', outfit: '🜸', footwear: '👞', trinket: '◆', mark: '✦',
};

const RARITY_COLOR: Record<Loot.Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export default function EquipScreen() {
  const { roster, activeIdx, equipped, inventory, unequipSlot } = useGameStore();
  const active = roster[activeIdx]!;
  const cls = getClass(active.class_id);
  const accent = CLASS_ACCENT[active.class_id as keyof typeof CLASS_ACCENT];
  const charEquipped = equipped[active.class_id] ?? {};
  const stats = computeEffectiveStats(active.class_id as ClassId, active.level, charEquipped, inventory);

  const [expandedSlot, setExpandedSlot] = useState<Loot.ItemSlot | null>(null);

  const equippedItemFor = (slot: Loot.ItemSlot): Loot.Item | null => {
    const id = charEquipped[slot];
    return id ? (inventory.find((it) => it.id === id) ?? null) : null;
  };

  const onUnequip = (slot: Loot.ItemSlot) => {
    unequipSlot(active.class_id as ClassId, slot);
    setExpandedSlot(null);
    playSfx('menu_move');
  };

  const onFind = (slot: Loot.ItemSlot) => {
    router.push({ pathname: '/inventory', params: { slot } });
    playSfx('menu_select');
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>EQUIPMENT</PixelText>
        <PixelText size={11} color={UI.cursor}>
          {Object.keys(charEquipped).length}/{SLOTS.length}
        </PixelText>
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 40, height: 40,
            backgroundColor: accent,
            borderColor: UI.border, borderWidth: 2,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <PixelText size={22} color={UI.bg}>{cls.icon}</PixelText>
          </View>
          <View style={{ flex: 1 }}>
            <PixelText size={14} color={UI.text}>{cls.name}</PixelText>
            <PixelText size={10} color={UI.textDim}>
              LV {active.level} · {active.allocated_nodes.length} nodes
            </PixelText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <Stat label="HP" value={stats.hp} />
          <Stat label="ATK" value={stats.atk} />
          <Stat label="DEF" value={stats.def} />
          <Stat label="SPD" value={stats.spd} />
          <Stat label="LCK" value={stats.luck} />
        </View>
      </Panel>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32, gap: 6 }}>
        {SLOTS.map((slot) => {
          const item = equippedItemFor(slot);
          const expanded = expandedSlot === slot;
          const rColor = item ? RARITY_COLOR[item.rarity] : UI.borderDark;
          return (
            <Panel
              key={slot}
              style={{
                borderColor: item ? rColor : UI.borderDark,
                borderWidth: item ? PIXEL : 2,
              }}
            >
              <Pressable onPress={() => setExpandedSlot(expanded ? null : slot)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 32, height: 32,
                    borderColor: item ? rColor : UI.borderDark,
                    borderWidth: 2,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: UI.bg,
                  }}>
                    <PixelText size={18} color={item ? rColor : UI.textDim}>
                      {SLOT_ICON[slot]}
                    </PixelText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelText size={11} color={UI.textDim}>{SLOT_LABEL[slot]}</PixelText>
                    {item ? (
                      <>
                        <PixelText size={13} color={UI.text} style={{ marginTop: 2 }}>
                          {item.displayName}
                        </PixelText>
                        <PixelText size={9} color={rColor} style={{ marginTop: 2 }}>
                          {item.rarity.toUpperCase()} · iLVL {item.ilvl}
                        </PixelText>
                      </>
                    ) : (
                      <PixelText size={11} color={UI.textDim} style={{ marginTop: 2 }}>
                        Empty — tap to find one.
                      </PixelText>
                    )}
                  </View>
                </View>
              </Pressable>

              {expanded ? (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {item ? (
                    <>
                      <PixelText size={10} color={UI.textDim}>
                        {item.implicitText}
                      </PixelText>
                      {item.prefixes.map((a) => (
                        <PixelText key={a.affixId} size={10} color={UI.text}>
                          · {a.effectText}
                        </PixelText>
                      ))}
                      {item.suffixes.map((a) => (
                        <PixelText key={a.affixId} size={10} color={UI.text}>
                          · {a.effectText}
                        </PixelText>
                      ))}
                      {item.anointment ? (
                        <View style={{ padding: 6, backgroundColor: '#2a1a08' }}>
                          <PixelText size={9} color={UI.cursor}>ANOINTMENT</PixelText>
                          <PixelText size={10} color={UI.cursor}>
                            {item.anointment.effectText}
                          </PixelText>
                        </View>
                      ) : null}
                      <Pressable
                        onPress={() => onUnequip(slot)}
                        style={{
                          alignItems: 'center', paddingVertical: 6,
                          borderColor: UI.hpHalf, borderWidth: 2,
                        }}
                      >
                        <PixelText size={11} color={UI.hpHalf}>UNEQUIP</PixelText>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => onFind(slot)}
                      style={{
                        alignItems: 'center', paddingVertical: 8,
                        borderColor: UI.cursor, borderWidth: PIXEL,
                      }}
                    >
                      <PixelText size={11} color={UI.cursor}>
                        ▶ FIND A {SLOT_LABEL[slot]}
                      </PixelText>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </Panel>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 36 }}>
      <PixelText size={9} color={UI.textDim}>{label}</PixelText>
      <PixelText size={13} color={UI.text}>{value}</PixelText>
    </View>
  );
}
