// Inventory screen — every rolled drop persists in the store. Tap an
// item to expand. Rarity-tinted borders, slot/ilvl/affixes/anointment.

import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { getClass, Gating, type ClassId, type Loot } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';

const RARITY_COLOR: Record<Loot.Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const SLOT_LABEL: Record<Loot.ItemSlot, string> = {
  weapon: 'WEAPON',
  outfit: 'OUTFIT',
  footwear: 'FOOTWEAR',
  trinket: 'TRINKET',
  mark: 'MARK',
};

const SLOT_FILTERS: readonly (Loot.ItemSlot | 'all')[] = [
  'all', 'weapon', 'outfit', 'footwear', 'trinket', 'mark',
];

export default function InventoryScreen() {
  const { inventory, gold, roster, activeIdx, equipped, equipItem, marks } = useGameStore();
  const activeChar = roster[activeIdx]!;
  const activeCls = getClass(activeChar.class_id);
  const charEquipped = equipped[activeChar.class_id] ?? {};

  const [filter, setFilter] = useState<Loot.ItemSlot | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visible = filter === 'all'
    ? inventory
    : inventory.filter((it) => it.slot === filter);

  const onEquip = (item: Loot.Item) => {
    equipItem(activeChar.class_id as ClassId, item);
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>INVENTORY</PixelText>
        <PixelText size={11} color={UI.cursor}>{gold} G</PixelText>
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <PixelText size={10} color={UI.textDim}>EQUIPPING FOR</PixelText>
        <PixelText size={13} color={UI.text} style={{ marginTop: 2 }}>
          {activeCls.name}
        </PixelText>
      </Panel>

      {marks.length > 0 ? (
        <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
          <PixelText size={10} color={UI.textDim}>RESISTANCE MARKS · {marks.length}/7</PixelText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {marks.map((id) => {
              const def = Gating.RESISTANCE_MARK_BY_ID[id];
              if (!def) return null;
              return (
                <View key={id} style={{
                  paddingHorizontal: 6, paddingVertical: 4,
                  borderColor: UI.cursor, borderWidth: 1,
                  backgroundColor: UI.bg,
                }}>
                  <PixelText size={9} color={UI.cursor}>{def.against.toUpperCase()}</PixelText>
                  <PixelText size={8} color={UI.text}>{def.name}</PixelText>
                </View>
              );
            })}
          </View>
        </Panel>
      ) : null}

      {/* Slot filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
        style={{ flexGrow: 0, marginBottom: 8 }}
      >
        {SLOT_FILTERS.map((slot) => (
          <Pressable
            key={slot}
            onPress={() => setFilter(slot)}
            style={{
              paddingHorizontal: 10, paddingVertical: 6,
              borderColor: filter === slot ? UI.cursor : UI.borderDark,
              borderWidth: PIXEL,
              backgroundColor: filter === slot ? UI.panelFill : UI.bg,
            }}
          >
            <PixelText size={10} color={filter === slot ? UI.cursor : UI.textDim}>
              {slot === 'all' ? 'ALL' : SLOT_LABEL[slot]}
            </PixelText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32, gap: 8 }}>
        {visible.length === 0 ? (
          <Panel>
            <PixelText size={11} color={UI.textDim}>
              No drops yet. Win a bar to fill the stash.
            </PixelText>
          </Panel>
        ) : null}
        {visible.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
          >
            <ItemCard
              item={item}
              expanded={expandedId === item.id}
              equipped={charEquipped[item.slot] === item.id}
              onEquip={() => onEquip(item)}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ItemCard({ item, expanded, equipped, onEquip }: {
  item: Loot.Item; expanded: boolean; equipped: boolean; onEquip: () => void;
}) {
  const rColor = RARITY_COLOR[item.rarity];
  return (
    <Panel style={{ borderColor: rColor, borderWidth: PIXEL }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <PixelText size={11} color={rColor}>
          {item.rarity.toUpperCase()} · {SLOT_LABEL[item.slot]}
          {equipped ? ' · EQUIPPED' : ''}
        </PixelText>
        <PixelText size={11} color={UI.textDim}>iLVL {item.ilvl}</PixelText>
      </View>
      <PixelText size={15} color={UI.text} style={{ marginTop: 4 }}>
        {item.displayName}
      </PixelText>
      <PixelText size={10} color={UI.textDim} style={{ marginTop: 2 }}>
        {item.implicitText}
      </PixelText>

      {expanded ? (
        <View style={{ marginTop: 8, gap: 2 }}>
          {item.prefixes.map((a) => (
            <PixelText key={a.affixId} size={10} color={UI.text}>· {a.effectText}</PixelText>
          ))}
          {item.suffixes.map((a) => (
            <PixelText key={a.affixId} size={10} color={UI.text}>· {a.effectText}</PixelText>
          ))}
          {item.anointment ? (
            <View style={{ marginTop: 6, padding: 6, backgroundColor: '#2a1a08' }}>
              <PixelText size={9} color={UI.cursor}>ANOINTMENT</PixelText>
              <PixelText size={10} color={UI.cursor} style={{ marginTop: 2 }}>
                {item.anointment.effectText}
              </PixelText>
            </View>
          ) : null}
        </View>
      ) : item.prefixes.length + item.suffixes.length > 0 ? (
        <PixelText size={9} color={UI.textDim} style={{ marginTop: 4 }}>
          {item.prefixes.length + item.suffixes.length} affix{item.prefixes.length + item.suffixes.length === 1 ? '' : 'es'} — tap to view
        </PixelText>
      ) : null}

      {expanded && !equipped ? (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onEquip(); }}
          style={{
            alignItems: 'center', paddingVertical: 6, marginTop: 8,
            borderColor: UI.cursor, borderWidth: 2,
            backgroundColor: UI.bg,
          }}
        >
          <PixelText size={12} color={UI.cursor}>▶ EQUIP</PixelText>
        </Pressable>
      ) : null}
    </Panel>
  );
}
