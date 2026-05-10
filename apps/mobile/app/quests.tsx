// Daily quest screen. Shows the 3 quests rolled for today + progress
// + claim button when a quest is complete.

import React, { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';
import { playSfx } from '@/audio/sfx';

export default function QuestsScreen() {
  const { dailyQuests, rollDailyQuestsIfNeeded, claimDailyQuest, loginStreak } = useGameStore();

  useEffect(() => {
    rollDailyQuestsIfNeeded();
  }, [rollDailyQuestsIfNeeded]);

  if (!dailyQuests) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.bg, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={11} color={UI.textDim}>Rolling today's quests…</PixelText>
      </View>
    );
  }

  const onClaim = (id: string) => {
    if (claimDailyQuest(id)) playSfx('level_up');
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>DAILY QUESTS</PixelText>
        <PixelText size={11} color={UI.textDim}>{dailyQuests.dateKey}</PixelText>
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <PixelText size={11} color={UI.textDim}>LOGIN STREAK</PixelText>
            <PixelText size={20} color={UI.cursor}>{loginStreak.currentStreak} days</PixelText>
          </View>
          <View>
            <PixelText size={11} color={UI.textDim}>LONGEST</PixelText>
            <PixelText size={20} color={UI.text}>{loginStreak.longestStreak}</PixelText>
          </View>
          <View>
            <PixelText size={11} color={UI.textDim}>TOTAL</PixelText>
            <PixelText size={20} color={UI.text}>{loginStreak.totalLogins}</PixelText>
          </View>
        </View>
      </Panel>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 8 }}>
        {dailyQuests.picks.map((def) => {
          const progress = dailyQuests.progress[def.id];
          const pct = progress ? Math.min(1, progress.progress / def.target) : 0;
          const completed = progress?.completed ?? false;
          const claimed = progress?.claimed ?? false;
          const accent = claimed ? UI.textDim : completed ? UI.cursor : UI.text;
          return (
            <Panel
              key={def.id}
              style={{
                borderColor: completed && !claimed ? UI.cursor : UI.border,
                borderWidth: completed && !claimed ? PIXEL : 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <PixelText size={13} color={accent}>{def.name}</PixelText>
                <PixelText size={10} color={UI.cursor}>+{def.xpReward} XP</PixelText>
              </View>
              <PixelText size={9} color={UI.textDim} style={{ marginTop: 2 }}>
                {def.description}
              </PixelText>
              <View style={{ marginTop: 8 }}>
                <View style={{
                  width: '100%', height: PIXEL * 2,
                  backgroundColor: UI.bg,
                  borderColor: UI.border, borderWidth: 1,
                  flexDirection: 'row',
                }}>
                  <View style={{
                    width: `${pct * 100}%`, height: '100%',
                    backgroundColor: completed ? UI.cursor : UI.hpFull,
                  }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <PixelText size={8} color={UI.textDim}>
                    {progress?.progress ?? 0}/{def.target}
                  </PixelText>
                  <PixelText size={8} color={UI.textDim}>
                    {claimed ? 'CLAIMED' : completed ? 'COMPLETE' : 'IN PROGRESS'}
                  </PixelText>
                </View>
              </View>
              {completed && !claimed ? (
                <Pressable
                  onPress={() => onClaim(def.id)}
                  style={{
                    alignItems: 'center', paddingVertical: 8, marginTop: 8,
                    borderColor: UI.cursor, borderWidth: PIXEL,
                    backgroundColor: UI.bg,
                  }}
                >
                  <PixelText size={13} color={UI.cursor}>▶ CLAIM +{def.xpReward} XP</PixelText>
                </Pressable>
              ) : null}
            </Panel>
          );
        })}
      </ScrollView>
    </View>
  );
}
