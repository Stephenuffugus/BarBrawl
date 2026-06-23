// Post-battle rewards screen. Shows the latest loot drop, XP earned, and
// gold awarded. Reads the most-recent inventory item from the store
// (battle.tsx pushed it there on win).

import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Loot } from '@barbrawl/game-core';
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

export default function RewardsScreen() {
  const params = useLocalSearchParams<{ barId?: string; theme?: string; label?: string }>();
  const { inventory, gold, defenderForBar } = useGameStore();
  const latest = inventory[inventory.length - 1];
  const claim = params.barId ? defenderForBar(params.barId) : undefined;

  const goStation = () => {
    router.push({
      pathname: '/defender',
      params: {
        barId: params.barId ?? '',
        theme: params.theme ?? 'dive',
        label: params.label ?? 'Bar',
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <PixelText size={28} color={UI.cursor} style={{ letterSpacing: 4 }}>
          TAMED
        </PixelText>
        <View style={{ width: 200, height: PIXEL, backgroundColor: UI.cursor, marginTop: 8 }} />
        {params.label ? (
          <PixelText size={11} color={UI.textDim} style={{ marginTop: 8 }}>
            {params.label.toUpperCase()} IS CALM AGAIN
          </PixelText>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 10 }}>
        <Panel>
          <PixelText size={11} color={UI.textDim}>YOU EARNED</PixelText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <View>
              <PixelText size={11} color={UI.textDim}>EXPERIENCE</PixelText>
              <PixelText size={20} color={UI.hpFull}>+100 XP</PixelText>
            </View>
            <View>
              <PixelText size={11} color={UI.textDim}>GOLD</PixelText>
              <PixelText size={20} color={UI.cursor}>+50 G</PixelText>
            </View>
            <View>
              <PixelText size={11} color={UI.textDim}>TOTAL GOLD</PixelText>
              <PixelText size={20} color={UI.text}>{gold}</PixelText>
            </View>
          </View>
        </Panel>

        {latest ? <ItemPanel item={latest} /> : (
          <Panel>
            <PixelText size={11} color={UI.textDim}>No drops this run.</PixelText>
          </Panel>
        )}

        {/* Claim status */}
        {claim ? (
          <Panel style={{ borderColor: UI.cursor, borderWidth: PIXEL }}>
            <PixelText size={11} color={UI.cursor}>YOU'RE THE KEEPER</PixelText>
            <PixelText size={14} color={UI.text} style={{ marginTop: 4 }}>
              {claim.label}
            </PixelText>
            {claim.defenderClassId ? (
              <PixelText size={10} color={UI.hpFull} style={{ marginTop: 2 }}>
                Caretaker stationed.
              </PixelText>
            ) : (
              <PixelText size={10} color={UI.textDim} style={{ marginTop: 2 }}>
                Untended. Station a caretaker to gather while you're away.
              </PixelText>
            )}
          </Panel>
        ) : null}

        <Panel>
          <PixelText size={11} color={UI.textDim}>INVENTORY</PixelText>
          <PixelText size={14} color={UI.text} style={{ marginTop: 2 }}>
            {inventory.length} item{inventory.length === 1 ? '' : 's'}
          </PixelText>
        </Panel>
      </ScrollView>

      <View style={{ paddingHorizontal: 12, paddingBottom: 32, gap: 8 }}>
        {claim ? (
          <Pressable
            onPress={goStation}
            style={{
              alignItems: 'center', paddingVertical: 12,
              borderColor: UI.cursor, borderWidth: PIXEL,
              backgroundColor: UI.panelFill,
            }}
          >
            <PixelText size={14} color={UI.cursor}>
              ▶ {claim.defenderClassId ? 'CHANGE CARETAKER' : 'STATION A CARETAKER'}
            </PixelText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.replace('/map')}
          style={{
            alignItems: 'center', paddingVertical: 12,
            borderColor: UI.border, borderWidth: PIXEL,
            backgroundColor: UI.bg,
          }}
        >
          <PixelText size={14} color={UI.text}>BACK TO THE WILD</PixelText>
        </Pressable>
      </View>
    </View>
  );
}

function ItemPanel({ item }: { item: Loot.Item }) {
  const rColor = RARITY_COLOR[item.rarity];
  return (
    <Panel style={{ borderColor: rColor, borderWidth: PIXEL }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <PixelText size={11} color={rColor}>
          {item.rarity.toUpperCase()} {SLOT_LABEL[item.slot]}
        </PixelText>
        <PixelText size={11} color={UI.textDim}>iLVL {item.ilvl}</PixelText>
      </View>
      <PixelText size={16} color={UI.text} style={{ marginTop: 4 }}>
        {item.displayName}
      </PixelText>
      <PixelText size={10} color={UI.textDim} style={{ marginTop: 2 }}>
        {item.implicitText}
      </PixelText>
      {item.prefixes.length + item.suffixes.length > 0 ? (
        <View style={{ marginTop: 8, gap: 2 }}>
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
        </View>
      ) : null}
      {item.anointment ? (
        <View style={{ marginTop: 8, padding: 6, backgroundColor: '#2a1a08' }}>
          <PixelText size={9} color={UI.cursor}>ANOINTMENT</PixelText>
          <PixelText size={10} color={UI.cursor} style={{ marginTop: 2 }}>
            {item.anointment.effectText}
          </PixelText>
        </View>
      ) : null}
    </Panel>
  );
}
