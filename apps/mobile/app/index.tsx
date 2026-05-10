import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Events } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from '@/components/PixelText';
import { useGameStore } from '@/state/game-store';

const { progressIntoTier, CRAWL_PASS_RULES } = Events;

/** Demo heuristic: world boss is "active" Sat 20:00 → Mon 20:00 local. */
function isWorldBossActive(now: Date = new Date()): boolean {
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const hour = now.getHours();
  // Saturday from 20:00 onward, Sunday all day, Monday until 20:00.
  if (day === 6 && hour >= 20) return true;
  if (day === 0) return true;
  if (day === 1 && hour < 20) return true;
  return false;
}

export default function Title() {
  const { audioMuted, toggleMuted, crawlPassXp, loginStreak } = useGameStore();
  const cp = progressIntoTier(crawlPassXp);
  const cpPct = cp.tier >= CRAWL_PASS_RULES.TIER_COUNT
    ? 1
    : cp.xpIntoTier / CRAWL_PASS_RULES.XP_PER_TIER;
  const wbActive = isWorldBossActive();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: UI.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* World boss alert ribbon */}
      {wbActive ? (
        <View style={{
          position: 'absolute',
          top: 24, left: 0, right: 0,
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#3a0808',
            borderColor: UI.hpLow,
            borderWidth: PIXEL,
            paddingVertical: 6, paddingHorizontal: 16,
          }}>
            <PixelText size={11} color={UI.hpLow}>
              ▶ TITAN AT LARGE — WORLD BOSS ACTIVE
            </PixelText>
          </View>
        </View>
      ) : null}

      {/* Login streak chip */}
      {loginStreak.currentStreak > 0 ? (
        <View style={{
          position: 'absolute', top: wbActive ? 70 : 24, left: 16,
          paddingHorizontal: 8, paddingVertical: 4,
          borderColor: UI.cursor, borderWidth: 1,
          backgroundColor: UI.panelFill,
        }}>
          <PixelText size={9} color={UI.cursor}>
            STREAK · {loginStreak.currentStreak}d
          </PixelText>
        </View>
      ) : null}
      {/* Mute toggle, top-right */}
      <Pressable
        onPress={toggleMuted}
        style={{
          position: 'absolute',
          top: 32, right: 16,
          paddingHorizontal: 8, paddingVertical: 6,
          borderColor: UI.border, borderWidth: 2,
          backgroundColor: UI.panelFill,
        }}
      >
        <PixelText size={11} color={audioMuted ? UI.textDim : UI.cursor}>
          {audioMuted ? 'MUTED' : '♪ ON'}
        </PixelText>
      </Pressable>
      {/* GBC-style logo block */}
      <View style={{ alignItems: 'center', marginBottom: 56 }}>
        <PixelText size={36} color={UI.cursor} style={{ letterSpacing: 4 }}>
          BAR
        </PixelText>
        <PixelText size={36} color={UI.text} style={{ letterSpacing: 4, marginTop: -8 }}>
          BRAWL
        </PixelText>
        <View style={{
          width: 200, height: PIXEL,
          backgroundColor: UI.cursor, marginTop: 12,
        }} />
        <PixelText size={11} color={UI.textDim} style={{ marginTop: 12 }}>
          Local Bars × Diablo Loot × Pokemon Soul
        </PixelText>
      </View>

      <Pressable
        onPress={() => router.push('/map')}
        style={menuBtn}
      >
        <PixelText size={16} color={UI.cursor}>▶ WALK THE STREETS</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/roster')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>ROSTER</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/tree')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>SKILL TREES</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/territory')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>TERRITORY</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/inventory')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>INVENTORY</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/equip')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>EQUIPMENT</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/mastery')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>MASTERY</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/quests')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>DAILY QUESTS</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/replay')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>REPLAY</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/nominate')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>NOMINATE A BAR</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/dev')}
        onLongPress={() => router.push('/dev')}
        style={{
          marginTop: 12,
          paddingHorizontal: 12, paddingVertical: 4,
        }}
      >
        <PixelText size={9} color={UI.textDim}>· DEV ·</PixelText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/battle')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>FIGHT (DEMO)</PixelText>
      </Pressable>

      {/* Crawl Pass progress strip */}
      <View style={{ marginTop: 28, alignItems: 'center', width: 240 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <PixelText size={9} color={UI.textDim}>CRAWL PASS</PixelText>
          <PixelText size={9} color={UI.cursor}>
            T{cp.tier}/{CRAWL_PASS_RULES.TIER_COUNT}
          </PixelText>
        </View>
        <View style={{
          marginTop: 4,
          width: '100%', height: PIXEL,
          backgroundColor: UI.bg,
          borderColor: UI.border, borderWidth: 1,
          flexDirection: 'row',
        }}>
          <View style={{
            width: `${cpPct * 100}%`, height: '100%',
            backgroundColor: UI.cursor,
          }} />
        </View>
        <PixelText size={8} color={UI.textDim} style={{ marginTop: 2 }}>
          {cp.xpIntoTier.toLocaleString()} / {CRAWL_PASS_RULES.XP_PER_TIER.toLocaleString()} XP
        </PixelText>
      </View>
    </View>
  );
}

const menuBtn = {
  paddingVertical: 12,
  paddingHorizontal: 32,
  borderColor: UI.border,
  borderWidth: PIXEL,
  backgroundColor: UI.panelFill,
  width: 240,
  alignItems: 'center' as const,
};
