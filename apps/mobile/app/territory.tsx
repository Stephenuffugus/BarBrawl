// Territory screen — view of every bar you've claimed. Shows defender,
// time stationed, simulated coin accrual (spec §5.5: 2 coins/hr per
// defender, capped at 75/day account-wide). Tap a row to manage that
// bar's defender.
//
// Coin accrual is read-only here for v1. A "CLAIM" action that moves
// simulated coins into wallet gold lands when we wire to a real backend.

import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { getClass } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI, BAR_PALETTES, CLASS_ACCENT, type BarThemeId } from '@/design/palette';
import { useGameStore, type ClaimedBar } from '@/state/game-store';

const COINS_PER_HOUR_PER_DEFENDER = 2;
const ACCOUNT_DAILY_CAP = 75;

function isBarTheme(s: string): s is BarThemeId {
  return s in BAR_PALETTES;
}

function hoursSince(ms: number | null): number {
  if (!ms) return 0;
  return Math.max(0, (Date.now() - ms) / (1000 * 60 * 60));
}

function simulateCoinsForBar(bar: ClaimedBar): { hours: number; coins: number } {
  if (!bar.defenderClassId || !bar.stationedAtMs) return { hours: 0, coins: 0 };
  const hours = hoursSince(bar.stationedAtMs);
  const raw = hours * COINS_PER_HOUR_PER_DEFENDER;
  const dailyCap = (hours / 24) * ACCOUNT_DAILY_CAP;
  return { hours, coins: Math.floor(Math.min(raw, dailyCap)) };
}

export default function TerritoryScreen() {
  const { claimedBars } = useGameStore();
  const totalCoins = claimedBars.reduce((sum, b) => sum + simulateCoinsForBar(b).coins, 0);
  const defendedCount = claimedBars.filter((b) => b.defenderClassId).length;

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>YOUR TERRITORY</PixelText>
        <PixelText size={11} color={UI.cursor}>{defendedCount}/{claimedBars.length}</PixelText>
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <PixelText size={11} color={UI.textDim}>BARS CLAIMED</PixelText>
            <PixelText size={20} color={UI.text}>{claimedBars.length}</PixelText>
          </View>
          <View>
            <PixelText size={11} color={UI.textDim}>DEFENDED</PixelText>
            <PixelText size={20} color={UI.hpFull}>{defendedCount}</PixelText>
          </View>
          <View>
            <PixelText size={11} color={UI.textDim}>EARNED (sim)</PixelText>
            <PixelText size={20} color={UI.cursor}>{totalCoins} G</PixelText>
          </View>
        </View>
      </Panel>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 6 }}>
        {claimedBars.length === 0 ? (
          <Panel>
            <PixelText size={11} color={UI.textDim}>
              No bars claimed yet. Walk the streets and challenge a door.
            </PixelText>
          </Panel>
        ) : null}
        {claimedBars.map((bar) => (
          <ClaimRow key={bar.barId} bar={bar} />
        ))}
      </ScrollView>
    </View>
  );
}

function ClaimRow({ bar }: { bar: ClaimedBar }) {
  const cls = bar.defenderClassId ? getClass(bar.defenderClassId) : null;
  const accent = cls ? CLASS_ACCENT[cls.id as keyof typeof CLASS_ACCENT] : UI.textDim;
  const sim = simulateCoinsForBar(bar);
  const themePalette = isBarTheme(bar.theme) ? BAR_PALETTES[bar.theme as BarThemeId] : BAR_PALETTES.dive;

  const open = () => {
    router.push({
      pathname: '/defender',
      params: { barId: bar.barId, theme: bar.theme, label: bar.label },
    });
  };

  return (
    <Pressable onPress={open}>
      <Panel style={{ borderColor: cls ? accent : UI.border, borderWidth: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Theme swatch */}
          <View style={{
            width: 32, height: 32,
            backgroundColor: themePalette[2],
            borderColor: UI.border, borderWidth: 2,
          }}>
            <View style={{
              position: 'absolute', left: 4, top: 4, right: 4, bottom: 4,
              backgroundColor: themePalette[3],
            }} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <PixelText size={13} color={UI.text}>{bar.label}</PixelText>
              <PixelText size={9} color={UI.textDim}>{bar.theme.toUpperCase()}</PixelText>
            </View>
            {cls ? (
              <PixelText size={10} color={accent} style={{ marginTop: 2 }}>
                {cls.icon} {cls.name} · {sim.hours.toFixed(1)} h
              </PixelText>
            ) : (
              <PixelText size={10} color={UI.hpHalf} style={{ marginTop: 2 }}>
                Undefended — tap to station
              </PixelText>
            )}
          </View>

          {sim.coins > 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <PixelText size={9} color={UI.textDim}>EARNED</PixelText>
              <PixelText size={14} color={UI.cursor}>{sim.coins} G</PixelText>
            </View>
          ) : null}
        </View>
      </Panel>
    </Pressable>
  );
}
