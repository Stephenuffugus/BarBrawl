// Dev / cheat menu. Speeds up content testing — grants gold, levels,
// marks, VIP keys, full consumable pack, and a slug of legendary
// loot in one tap each. Reachable via long-press on the title's
// PRESS START button (4-second hold) or the small "DEV" link below
// the menu when developer mode is on.

import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';
import { playSfx } from '@/audio/sfx';

export default function DevScreen() {
  const {
    addGold, awardXp, devSetActiveLevel, devFillConsumables,
    devGrantGating, devGrantLoot, resetDemo, active,
  } = useGameStore();
  const [feedback, setFeedback] = useState<string | null>(null);

  const flash = (msg: string) => {
    setFeedback(msg);
    playSfx('menu_select');
    setTimeout(() => setFeedback(null), 1600);
  };

  const activeChar = active();

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ BACK</PixelText>
        </Pressable>
        <PixelText size={14} color={UI.hpHalf}>DEV / CHEATS</PixelText>
        <View style={{ width: 60 }} />
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8, borderColor: UI.hpHalf, borderWidth: 2 }}>
        <PixelText size={10} color={UI.hpHalf}>NOT FOR LIVE BUILDS</PixelText>
        <PixelText size={11} color={UI.text} style={{ marginTop: 4 }}>
          Speeds up testing. Granting state here bypasses normal
          progression — use it to verify content reaches its expected
          end-state, then reset between sessions.
        </PixelText>
      </Panel>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32, gap: 8 }}>
        <Panel>
          <PixelText size={11} color={UI.textDim}>ACTIVE</PixelText>
          <PixelText size={13} color={UI.text} style={{ marginTop: 2 }}>
            {activeChar.class_id} · LV {activeChar.level} · {activeChar.allocated_nodes.length} nodes
          </PixelText>
        </Panel>

        <Section title="GOLD">
          <Btn onPress={() => { addGold(1000); flash('+1000 gold'); }}>+1000 G</Btn>
          <Btn onPress={() => { addGold(10000); flash('+10000 gold'); }}>+10K G</Btn>
        </Section>

        <Section title="EXPERIENCE">
          <Btn onPress={() => { awardXp(activeChar.class_id, 500); flash('+500 XP'); }}>+500 XP</Btn>
          <Btn onPress={() => { awardXp(activeChar.class_id, 5000); flash('+5000 XP'); }}>+5K XP</Btn>
          <Btn onPress={() => { awardXp(activeChar.class_id, 100000); flash('+100K XP'); }}>+100K XP</Btn>
        </Section>

        <Section title="LEVEL">
          <Btn onPress={() => { devSetActiveLevel(10); flash('Level 10'); }}>SET LV 10</Btn>
          <Btn onPress={() => { devSetActiveLevel(50); flash('Level 50'); }}>SET LV 50</Btn>
          <Btn onPress={() => { devSetActiveLevel(100); flash('Level 100'); }}>SET LV 100</Btn>
          <Btn onPress={() => { devSetActiveLevel(1000); flash('Level 1000'); }}>SET LV 1000</Btn>
        </Section>

        <Section title="GATING (marks + VIP keys)">
          <Btn onPress={() => { devGrantGating(); flash('All marks + 3 VIP keys per theme'); }}>
            GRANT ALL MARKS + KEYS
          </Btn>
        </Section>

        <Section title="LOOT">
          <Btn onPress={() => { devGrantLoot(5, 'rare');      flash('5 rares'); }}>5× RARE</Btn>
          <Btn onPress={() => { devGrantLoot(5, 'epic');      flash('5 epics'); }}>5× EPIC</Btn>
          <Btn onPress={() => { devGrantLoot(5, 'legendary'); flash('5 legendaries'); }}>5× LEGENDARY</Btn>
        </Section>

        <Section title="CONSUMABLES">
          <Btn onPress={() => { devFillConsumables(); flash('Consumable pack refilled'); }}>
            REFILL ALL
          </Btn>
        </Section>

        <Section title="DESTRUCTIVE" danger>
          <Btn
            danger
            onPress={() => { resetDemo(); flash('Progress reset'); }}
          >
            RESET ALL PROGRESS
          </Btn>
        </Section>

        {feedback ? (
          <Panel style={{ borderColor: UI.cursor, borderWidth: 2 }}>
            <PixelText size={11} color={UI.cursor}>{feedback}</PixelText>
          </Panel>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <Panel>
      <PixelText size={10} color={danger ? UI.hpLow : UI.textDim}>{title}</PixelText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {children}
      </View>
    </Panel>
  );
}

function Btn({ onPress, danger, children }: { onPress: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10, paddingVertical: 6,
        borderColor: danger ? UI.hpLow : UI.cursor, borderWidth: PIXEL,
        backgroundColor: UI.bg,
      }}
    >
      <PixelText size={11} color={danger ? UI.hpLow : UI.cursor}>{children}</PixelText>
    </Pressable>
  );
}
