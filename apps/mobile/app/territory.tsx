// Territory screen — view of every bar you've claimed. Shows defender,
// time stationed, simulated coin accrual + HP decay (spec §5.5: 2/hr per
// defender, capped 75/day; 5% maxHp/day decay). Tap CLAIM to move
// accrued coins to wallet, RECALL to unstation, or the row to switch
// the defender.

import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { getClass } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { HpBar } from '@/components/HpBar';
import { UI, BAR_PALETTES, CLASS_ACCENT, type BarThemeId } from '@/design/palette';
import { useGameStore, type ClaimedBar } from '@/state/game-store';
import { playSfx } from '@/audio/sfx';

const COINS_PER_HOUR_PER_DEFENDER = 2;
const ACCOUNT_DAILY_CAP = 75;
const HP_DECAY_PCT_PER_DAY = 0.05;

function isBarTheme(s: string): s is BarThemeId {
  return s in BAR_PALETTES;
}

function hoursSince(ms: number | null): number {
  if (!ms) return 0;
  return Math.max(0, (Date.now() - ms) / (1000 * 60 * 60));
}

function computePending(bar: ClaimedBar) {
  if (!bar.defenderClassId || !bar.stationedAtMs) {
    return { hours: 0, hp: 0, maxHp: 0, claimable: 0 };
  }
  const stationedHours = hoursSince(bar.stationedAtMs);
  const claimSince = bar.coinsClaimedAtMs ?? bar.stationedAtMs;
  const sinceClaimHours = hoursSince(claimSince);
  const decayed = Math.ceil(bar.defenderMaxHp * HP_DECAY_PCT_PER_DAY * (stationedHours / 24));
  const currentHp = Math.max(0, bar.defenderMaxHp - decayed);
  const raw = Math.floor(COINS_PER_HOUR_PER_DEFENDER * sinceClaimHours);
  const dailyLimit = Math.floor((sinceClaimHours / 24) * ACCOUNT_DAILY_CAP);
  return {
    hours: stationedHours,
    hp: currentHp,
    maxHp: bar.defenderMaxHp,
    claimable: Math.min(raw, dailyLimit),
  };
}

export default function TerritoryScreen() {
  const { claimedBars, collectBarCoins, unstationDefender } = useGameStore();
  const [bumper, setBumper] = useState(0); // forces rerender on claim

  const totalClaimable = claimedBars.reduce((sum, b) => sum + computePending(b).claimable, 0);
  const defendedCount = claimedBars.filter((b) => b.defenderClassId).length;

  const onClaim = (barId: string) => {
    const earned = collectBarCoins(barId);
    if (earned > 0) playSfx('menu_select');
    setBumper((b) => b + 1);
  };
  const onRecall = (barId: string) => {
    unstationDefender(barId);
    playSfx('menu_move');
    setBumper((b) => b + 1);
  };
  const onOpenDefender = (bar: ClaimedBar) => {
    router.push({
      pathname: '/defender',
      params: { barId: bar.barId, theme: bar.theme, label: bar.label },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }} key={bumper}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>YOUR HAVEN</PixelText>
        <PixelText size={11} color={UI.cursor}>{defendedCount}/{claimedBars.length}</PixelText>
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <PixelText size={11} color={UI.textDim}>PLACES KEPT</PixelText>
            <PixelText size={20} color={UI.text}>{claimedBars.length}</PixelText>
          </View>
          <View>
            <PixelText size={11} color={UI.textDim}>TENDED</PixelText>
            <PixelText size={20} color={UI.hpFull}>{defendedCount}</PixelText>
          </View>
          <View>
            <PixelText size={11} color={UI.textDim}>UNCLAIMED</PixelText>
            <PixelText size={20} color={UI.cursor}>{totalClaimable} G</PixelText>
          </View>
        </View>
      </Panel>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 6 }}>
        {claimedBars.length === 0 ? (
          <Panel>
            <PixelText size={11} color={UI.textDim}>
              No places kept yet. Walk the wild and tend a gate.
            </PixelText>
          </Panel>
        ) : null}
        {claimedBars.map((bar) => (
          <ClaimRow
            key={bar.barId}
            bar={bar}
            onClaim={() => onClaim(bar.barId)}
            onRecall={() => onRecall(bar.barId)}
            onOpen={() => onOpenDefender(bar)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ClaimRow({
  bar, onClaim, onRecall, onOpen,
}: {
  bar: ClaimedBar;
  onClaim: () => void;
  onRecall: () => void;
  onOpen: () => void;
}) {
  const cls = bar.defenderClassId ? getClass(bar.defenderClassId) : null;
  const accent = cls ? CLASS_ACCENT[cls.id as keyof typeof CLASS_ACCENT] : UI.textDim;
  const sim = computePending(bar);
  const themePalette = isBarTheme(bar.theme) ? BAR_PALETTES[bar.theme as BarThemeId] : BAR_PALETTES.dive;

  return (
    <Panel style={{ borderColor: cls ? accent : UI.border, borderWidth: 2 }}>
      <Pressable onPress={onOpen}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                Untended — tap to station
              </PixelText>
            )}
          </View>
        </View>
      </Pressable>

      {cls ? (
        <View style={{ marginTop: 8, gap: 6 }}>
          <HpBar hp={sim.hp} maxHp={sim.maxHp} widthCells={26} drainMs={0} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              onPress={onClaim}
              disabled={sim.claimable <= 0}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 6,
                borderColor: sim.claimable > 0 ? UI.cursor : UI.borderDark,
                borderWidth: 2,
                backgroundColor: UI.bg,
                opacity: sim.claimable > 0 ? 1 : 0.5,
              }}
            >
              <PixelText size={11} color={sim.claimable > 0 ? UI.cursor : UI.textDim}>
                CLAIM {sim.claimable} G
              </PixelText>
            </Pressable>
            <Pressable
              onPress={onRecall}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 6,
                borderColor: UI.hpHalf,
                borderWidth: 2,
                backgroundColor: UI.bg,
              }}
            >
              <PixelText size={11} color={UI.hpHalf}>RECALL</PixelText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Panel>
  );
}
