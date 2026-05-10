// Battle replay viewer. Steps through the most-recent battle's log
// entry by entry, with PLAY/STEP/PAUSE controls. Useful for spectating,
// teaching, debugging anti-cheat validation later.

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';
import { playSfx } from '@/audio/sfx';

const AUTO_INTERVAL_MS = 700;

export default function ReplayScreen() {
  const { lastBattle } = useGameStore();
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Autoplay tick.
  useEffect(() => {
    if (!playing || !lastBattle) return;
    intervalRef.current = setInterval(() => {
      setCursor((c) => {
        if (!lastBattle) return c;
        if (c + 1 >= lastBattle.log.length) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, AUTO_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, lastBattle]);

  if (!lastBattle) {
    return (
      <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
          <Pressable onPress={() => router.back()}>
            <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
          </Pressable>
          <PixelText size={14} color={UI.text}>REPLAY</PixelText>
          <View style={{ width: 60 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={11} color={UI.textDim}>No battle to replay yet.</PixelText>
          <PixelText size={9} color={UI.textDim} style={{ marginTop: 8 }}>
            Win or lose a fight to populate this.
          </PixelText>
        </View>
      </View>
    );
  }

  const visibleLog = lastBattle.log.slice(0, cursor + 1);
  const atEnd = cursor + 1 >= lastBattle.log.length;

  const onStep = () => {
    if (atEnd) return;
    setCursor((c) => c + 1);
    playSfx('menu_move');
  };
  const onTogglePlay = () => {
    if (atEnd) {
      setCursor(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
    playSfx('menu_select');
  };
  const onReset = () => {
    setCursor(0);
    setPlaying(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.text}>BATTLE REPLAY</PixelText>
        <PixelText size={11} color={UI.textDim}>
          {cursor + 1}/{lastBattle.log.length}
        </PixelText>
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <PixelText size={10} color={UI.textDim}>VENUE</PixelText>
            <PixelText size={13} color={UI.text}>{lastBattle.barLabel}</PixelText>
          </View>
          <View>
            <PixelText size={10} color={UI.textDim}>OUTCOME</PixelText>
            <PixelText
              size={13}
              color={lastBattle.result === 'win' ? UI.hpFull : UI.hpLow}
            >
              {lastBattle.result.toUpperCase()}
            </PixelText>
          </View>
          <View>
            <PixelText size={10} color={UI.textDim}>THEME</PixelText>
            <PixelText size={13} color={UI.cursor}>{lastBattle.theme.toUpperCase()}</PixelText>
          </View>
        </View>
      </Panel>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, gap: 4 }}
        style={{ flex: 1 }}
      >
        {visibleLog.map((entry, i) => (
          <View
            key={`${entry.turn}-${i}`}
            style={{
              borderColor: entry.kind === 'defeat' ? UI.hpLow
                         : entry.kind === 'info' ? UI.borderDark
                         : UI.border,
              borderLeftWidth: PIXEL,
              paddingLeft: 8, paddingVertical: 2,
              opacity: i === cursor ? 1 : 0.6,
            }}
          >
            <PixelText
              size={10}
              color={
                entry.kind === 'defeat' ? UI.hpLow :
                entry.kind === 'info'   ? UI.textDim :
                entry.kind === 'skill'  ? UI.cursor :
                                          UI.text
              }
            >
              T{entry.turn} · {entry.text}
            </PixelText>
          </View>
        ))}
        {atEnd ? (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <PixelText size={14} color={UI.cursor}>★ END OF FIGHT ★</PixelText>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 24 }}>
        <Pressable
          onPress={onReset}
          style={{
            flex: 1, alignItems: 'center', paddingVertical: 10,
            borderColor: UI.border, borderWidth: 2,
          }}
        >
          <PixelText size={11} color={UI.text}>↺ RESET</PixelText>
        </Pressable>
        <Pressable
          onPress={onTogglePlay}
          style={{
            flex: 2, alignItems: 'center', paddingVertical: 10,
            borderColor: UI.cursor, borderWidth: PIXEL,
            backgroundColor: UI.panelFill,
          }}
        >
          <PixelText size={13} color={UI.cursor}>
            {atEnd ? '↻ REPLAY' : playing ? '❚❚ PAUSE' : '▶ PLAY'}
          </PixelText>
        </Pressable>
        <Pressable
          onPress={onStep}
          disabled={atEnd}
          style={{
            flex: 1, alignItems: 'center', paddingVertical: 10,
            borderColor: UI.border, borderWidth: 2,
            opacity: atEnd ? 0.5 : 1,
          }}
        >
          <PixelText size={11} color={UI.text}>→ STEP</PixelText>
        </Pressable>
      </View>
    </View>
  );
}
