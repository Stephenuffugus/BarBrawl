// Respec screen — wipe a character's allocations. Cost = level² gold,
// or 1 token (granted 5/level for every 10 levels).

import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { getClass, type ClassId, Progression } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI, CLASS_ACCENT } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';
import { playSfx } from '@/audio/sfx';

const { respecCostGold } = Progression;

export default function RespecScreen() {
  const { roster, activeIdx, gold, respecTokens, respecCharacter } = useGameStore();
  const active = roster[activeIdx]!;
  const cls = getClass(active.class_id);
  const accent = CLASS_ACCENT[active.class_id as keyof typeof CLASS_ACCENT];
  const cost = respecCostGold(active.level);

  const [feedback, setFeedback] = useState<string | null>(null);

  const onRespec = (useToken: boolean) => {
    const result = respecCharacter(active.class_id as ClassId, useToken);
    if (result.ok) {
      playSfx('level_up');
      setFeedback(useToken
        ? `Respec done — token consumed.`
        : `Respec done — ${result.goldSpent} gold spent.`);
      setTimeout(() => router.back(), 800);
    } else {
      playSfx('miss');
      setFeedback(`Cannot respec: ${result.reason.replaceAll('_', ' ')}.`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>RESPEC</PixelText>
        <PixelText size={11} color={UI.cursor}>{respecTokens} TOKEN{respecTokens === 1 ? '' : 'S'}</PixelText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 10 }}>
        <Panel>
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
                LV {active.level} · {active.allocated_nodes.length} nodes allocated
              </PixelText>
            </View>
          </View>
        </Panel>

        <Panel>
          <PixelText size={11} color={UI.textDim}>WHAT THIS DOES</PixelText>
          <PixelText size={11} color={UI.text} style={{ marginTop: 4 }}>
            Refunds every allocated skill node. Stat bonuses from levels and
            equipment are kept. Cost grows with level² so respec early, often,
            cheaply — endgame respecs are more committal.
          </PixelText>
        </Panel>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => onRespec(false)}
            disabled={active.allocated_nodes.length === 0 || gold < cost}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 12,
              borderColor: UI.cursor, borderWidth: PIXEL,
              backgroundColor: UI.bg,
              opacity: active.allocated_nodes.length === 0 || gold < cost ? 0.5 : 1,
            }}
          >
            <PixelText size={11} color={UI.cursor}>SPEND GOLD</PixelText>
            <PixelText size={14} color={UI.cursor}>{cost} G</PixelText>
            <PixelText size={9} color={UI.textDim} style={{ marginTop: 2 }}>
              You have {gold}
            </PixelText>
          </Pressable>
          <Pressable
            onPress={() => onRespec(true)}
            disabled={active.allocated_nodes.length === 0 || respecTokens < 1}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 12,
              borderColor: UI.text, borderWidth: PIXEL,
              backgroundColor: UI.bg,
              opacity: active.allocated_nodes.length === 0 || respecTokens < 1 ? 0.5 : 1,
            }}
          >
            <PixelText size={11} color={UI.text}>USE TOKEN</PixelText>
            <PixelText size={14} color={UI.text}>1 / {respecTokens}</PixelText>
            <PixelText size={9} color={UI.textDim} style={{ marginTop: 2 }}>
              +5 every 10 levels
            </PixelText>
          </Pressable>
        </View>

        {feedback ? (
          <Panel>
            <PixelText size={11} color={UI.cursor}>{feedback}</PixelText>
          </Panel>
        ) : null}
      </ScrollView>
    </View>
  );
}
