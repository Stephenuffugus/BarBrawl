import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useGameStore } from "@/state/game-store";
import { setSfxMuted } from "@/audio/sfx";

export default function RootLayout() {
  // Sync persisted audioMuted into the SFX module.
  const audioMuted = useGameStore((s) => s.audioMuted);
  const registerLogin = useGameStore((s) => s.registerLogin);
  const rollDailyQuestsIfNeeded = useGameStore((s) => s.rollDailyQuestsIfNeeded);

  useEffect(() => { setSfxMuted(audioMuted); }, [audioMuted]);

  // Web tab title (guarantees it regardless of the static HTML template).
  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Wild Wardens';
  }, []);

  // On app boot, register the day's login + roll today's quests.
  useEffect(() => {
    registerLogin();
    rollDailyQuestsIfNeeded();
  }, [registerLogin, rollDailyQuestsIfNeeded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
