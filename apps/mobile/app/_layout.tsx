import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useGameStore } from "@/state/game-store";
import { setSfxMuted } from "@/audio/sfx";

export default function RootLayout() {
  // Sync persisted audioMuted into the SFX module.
  const audioMuted = useGameStore((s) => s.audioMuted);
  useEffect(() => { setSfxMuted(audioMuted); }, [audioMuted]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
