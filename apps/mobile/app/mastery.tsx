// Mastery tracker — 7 chars × 7 bar types = 49 progression tracks.
// Tier rewards: 1/5/15/30 conquers = +HP/+ATK/+DEF (spec §5.7).
// Tier 4 (30) unlocks a title displayed on the character.

import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { CLASSES, Progression } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI, BAR_PALETTES, type BarThemeId } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';

const { MASTERY_TIERS, bonusesForBarType, nextMasteryTier } = Progression;

const BAR_TYPES: BarThemeId[] = ['dive', 'pub', 'sports', 'cocktail', 'wine', 'brewery', 'nightclub'];

export default function MasteryScreen() {
  const { roster, activeIdx } = useGameStore();
  const activeChar = roster[activeIdx]!;

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>MASTERY</PixelText>
        <PixelText size={11} color={UI.textDim}>49 TRACKS</PixelText>
      </View>

      {/* Active character header */}
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <PixelText size={11} color={UI.textDim}>VIEWING</PixelText>
        <PixelText size={16} color={UI.cursor} style={{ marginTop: 2 }}>
          {CLASSES[activeIdx]!.name.toUpperCase()}
        </PixelText>
        <PixelText size={9} color={UI.textDim} style={{ marginTop: 2 }}>
          Switch character on the Roster screen.
        </PixelText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 6 }}>
        {BAR_TYPES.map((bt) => {
          const conquers = (activeChar.mastery as Record<string, number>)[bt] ?? 0;
          const cur = bonusesForBarType(conquers);
          const next = nextMasteryTier(conquers);
          const palette = BAR_PALETTES[bt];
          return (
            <Panel key={bt}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 32, height: 32,
                  backgroundColor: palette[2],
                }}>
                  <View style={{
                    position: 'absolute', left: 4, top: 4, right: 4, bottom: 4,
                    backgroundColor: palette[3],
                  }} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <PixelText size={13} color={UI.text}>{bt.toUpperCase()}</PixelText>
                    <PixelText size={11} color={UI.cursor}>{conquers} CLEAR{conquers === 1 ? '' : 'S'}</PixelText>
                  </View>
                  {next ? (
                    <PixelText size={9} color={UI.textDim} style={{ marginTop: 2 }}>
                      Next tier in {next.target - conquers} ·
                      {next.bonus.hp ? ` +${next.bonus.hp} HP` : ''}
                      {next.bonus.atk ? ` +${next.bonus.atk} ATK` : ''}
                      {next.bonus.def ? ` +${next.bonus.def} DEF` : ''}
                      {next.bonus.title ? ` · "${next.bonus.title}"` : ''}
                    </PixelText>
                  ) : (
                    <PixelText size={9} color={UI.cursor} style={{ marginTop: 2 }}>
                      MASTERED — all tiers earned.
                    </PixelText>
                  )}
                </View>
              </View>
              <ProgressBar
                conquers={conquers}
                color={palette[3]}
              />
              {(cur.hp + cur.atk + cur.def) > 0 ? (
                <PixelText size={9} color={UI.hpFull} style={{ marginTop: 4 }}>
                  Active: +{cur.hp} HP · +{cur.atk} ATK · +{cur.def} DEF
                </PixelText>
              ) : null}
            </Panel>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProgressBar({ conquers, color }: { conquers: number; color: string }) {
  // Show progress within the next tier as a horizontal bar.
  const lastTier = [...MASTERY_TIERS].reverse().find((t) => conquers >= t.conquersRequired);
  const nextTier = MASTERY_TIERS.find((t) => conquers < t.conquersRequired);
  const lo = lastTier?.conquersRequired ?? 0;
  const hi = nextTier?.conquersRequired ?? Math.max(1, conquers);
  const pct = nextTier ? (conquers - lo) / (hi - lo) : 1;
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{
        width: '100%', height: PIXEL * 2,
        backgroundColor: UI.bg,
        borderColor: UI.border, borderWidth: 1,
        flexDirection: 'row',
      }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <PixelText size={8} color={UI.textDim}>{lo}</PixelText>
        <PixelText size={8} color={UI.textDim}>{nextTier ? hi : 'MAX'}</PixelText>
      </View>
    </View>
  );
}
