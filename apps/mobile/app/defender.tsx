// Defender stationing screen. Pick a character to leave at the bar you
// just claimed. Chars already stationed elsewhere appear with a notice +
// require a tap to relocate (one defender per character per spec).

import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getClass, type ClassId } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI, CLASS_ACCENT } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';

export default function DefenderScreen() {
  const params = useLocalSearchParams<{ barId?: string; theme?: string; label?: string }>();
  const { roster, claimedBars, stationDefender, defenderForBar } = useGameStore();

  const barId = params.barId ?? '';
  const claim = barId ? defenderForBar(barId) : undefined;
  const currentDefenderClass = claim?.defenderClassId;

  const onPick = (classId: ClassId) => {
    if (!barId) return;
    stationDefender(barId, classId);
    router.replace('/map');
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>STATION A DEFENDER</PixelText>
        <View style={{ width: 60 }} />
      </View>

      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <PixelText size={11} color={UI.textDim}>STATION FOR</PixelText>
        <PixelText size={18} color={UI.cursor} style={{ letterSpacing: 2, marginTop: 2 }}>
          {(params.label ?? 'BAR').toUpperCase()}
        </PixelText>
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <PixelText size={10} color={UI.textDim}>
          Defenders earn coins + XP while you sleep, and fight back when others
          challenge this bar. One defender per character.
        </PixelText>
      </Panel>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32, gap: 6 }}>
        {roster.map((char) => {
          const cls = getClass(char.class_id);
          const accent = CLASS_ACCENT[char.class_id as keyof typeof CLASS_ACCENT];
          const stationedHere = char.class_id === currentDefenderClass;
          const stationedElsewhere = claimedBars.find((b) =>
            b.defenderClassId === char.class_id && b.barId !== barId,
          );
          return (
            <Pressable
              key={char.class_id}
              onPress={() => onPick(char.class_id as ClassId)}
            >
              <Panel
                style={{
                  borderColor: stationedHere ? UI.cursor : UI.border,
                  borderWidth: stationedHere ? PIXEL : 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 32, height: 32,
                    backgroundColor: accent,
                    borderColor: UI.border, borderWidth: 2,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PixelText size={18} color={UI.bg}>{cls.icon}</PixelText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <PixelText size={13} color={stationedHere ? UI.cursor : UI.text}>
                        {cls.name}
                      </PixelText>
                      <PixelText size={10} color={UI.textDim}>LV {char.level}</PixelText>
                    </View>
                    {stationedHere ? (
                      <PixelText size={9} color={UI.cursor} style={{ marginTop: 2 }}>
                        ▶ CURRENTLY HERE
                      </PixelText>
                    ) : stationedElsewhere ? (
                      <PixelText size={9} color={UI.hpHalf} style={{ marginTop: 2 }}>
                        Stationed at {stationedElsewhere.label} — tap to relocate
                      </PixelText>
                    ) : (
                      <PixelText size={9} color={UI.textDim} style={{ marginTop: 2 }}>
                        Available
                      </PixelText>
                    )}
                  </View>
                </View>
              </Panel>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
