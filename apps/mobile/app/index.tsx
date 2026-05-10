import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { PixelText } from '@/components/PixelText';

export default function Title() {
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
        onPress={() => router.push('/battle')}
        style={[menuBtn, { marginTop: 12 }]}
      >
        <PixelText size={16} color={UI.text}>FIGHT (DEMO)</PixelText>
      </Pressable>

      <PixelText size={9} color={UI.textDim} style={{ marginTop: 48, textAlign: 'center' }}>
        Phase 13 — battle wired · rhythm · trees{'\n'}
        408 tests · 33 suites · all green
      </PixelText>
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
