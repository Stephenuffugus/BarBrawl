import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useGameStore } from "@/state/game-store";
import { setSfxMuted } from "@/audio/sfx";

export default function RootLayout() {
  // Sync persisted audioMuted into the SFX module.
  const audioMuted = useGameStore((s) => s.audioMuted);
  const registerLogin = useGameStore((s) => s.registerLogin);
  const rollDailyQuestsIfNeeded = useGameStore((s) => s.rollDailyQuestsIfNeeded);

  useEffect(() => { setSfxMuted(audioMuted); }, [audioMuted]);

  // Web-only shell setup (SPA mode ignores app/+html.tsx, so do it at runtime):
  // tab title, viewport-fit=cover (enables iOS safe-area insets), and dynamic
  // viewport height so the mobile browser's toolbar / phone nav bar can't cover
  // the bottom of the app.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'Wild Wardens';
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute(
        'content',
        'width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover',
      );
    }
    if (!document.getElementById('ww-dvh')) {
      const style = document.createElement('style');
      style.id = 'ww-dvh';
      style.textContent = '@supports (height:100dvh){html,body,#root{height:100dvh}}';
      document.head.appendChild(style);
    }
  }, []);

  // On app boot, register the day's login + roll today's quests.
  useEffect(() => {
    registerLogin();
    rollDailyQuestsIfNeeded();
  }, [registerLogin, rollDailyQuestsIfNeeded]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
