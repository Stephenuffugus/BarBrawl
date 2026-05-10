// Pre-battle preview. Shows the bar you walked into, the boss waiting at
// the back, and your active character. ENTER routes through the dungeon
// crawl (or directly to /battle if dungeon is skipped).

import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getClass, Gating, type ClassId } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { PixelGrid } from '@/components/PixelGrid';
import { HpBar } from '@/components/HpBar';
import { SPRITES } from '@/design/sprites';
import { UI, CLASS_ACCENT, BAR_PALETTES, type BarThemeId } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { useGameStore } from '@/state/game-store';

function isBarTheme(s: string | undefined): s is BarThemeId {
  return !!s && s in BAR_PALETTES;
}

const THEME_FLAVOR: Record<BarThemeId, string> = {
  dive: 'Sticky floor. Cigarette smoke memory. Brass tap stuck on lukewarm.',
  pub: 'Wood-paneled, brass-railed, somewhere on Boylston. Regulars only.',
  sports: 'Twelve TVs. Two of them on. The wrong game.',
  cocktail: 'Velvet booths. Three-deep at the rail. Small batch ice.',
  wine: 'A single dim Edison bulb. The bartender wears a vest.',
  brewery: 'Tank room visible behind glass. Yeast in the air.',
  nightclub: 'Bass through the soles. The doorman is the most dangerous one inside.',
};

const THEME_BOSS_TITLE: Record<BarThemeId, string> = {
  dive: 'BAR OWNER', pub: 'PUBLICAN', sports: 'COACH', cocktail: 'SOMMELIER',
  wine: 'VINTNER', brewery: 'BREWMASTER', nightclub: 'DJ',
};

export default function PreviewScreen() {
  const params = useLocalSearchParams<{ barId?: string; theme?: string; label?: string; tier?: string }>();
  const theme: BarThemeId = isBarTheme(params.theme) ? params.theme : 'dive';
  const label = params.label?.trim() || 'A nameless bar';
  const tier = Math.max(1, Math.min(6, parseInt(params.tier ?? '1', 10) || 1));

  const { active, marks, roster, vipKeys, consumeVipKey } = useGameStore();
  const charRow = active();
  const cls = getClass(charRow.class_id);
  const accent = CLASS_ACCENT[charRow.class_id as keyof typeof CLASS_ACCENT];
  const hp = cls.baseStats.hp + (charRow.level - 1) * 6;
  const [secondary, setSecondary] = useState<ClassId | null>(null);

  // Metroidvania gate: tier 4+ requires matching damage-type Resistance Mark.
  const dmgType = Gating.BAR_THEME_DAMAGE[theme];
  const requiredMark = `mark_${dmgType}`;
  const hasMark = marks.includes(requiredMark);
  const locked = tier >= Gating.GATING_BEGINS_AT_TIER && !hasMark;
  const haveVipKey = (vipKeys[theme] ?? 0) > 0;

  const enterCombat = (useVip: boolean = false) => {
    if (locked) return;
    if (useVip && haveVipKey) consumeVipKey(theme);
    router.push({
      pathname: '/dungeon',
      params: {
        barId: params.barId ?? '',
        theme, label, tier: String(tier),
        ...(secondary ? { secondary } : {}),
        ...(useVip ? { vip: '1' } : {}),
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()}>
          <PixelText size={12} color={UI.cursor}>◀ LEAVE</PixelText>
        </Pressable>
        <PixelText size={11} color={UI.textDim}>
          T{tier} · {theme.toUpperCase()} · {dmgType.toUpperCase()}
        </PixelText>
      </View>

      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <PixelText size={11} color={UI.textDim}>YOU HAVE ENTERED</PixelText>
        <PixelText size={22} color={UI.cursor} style={{ marginTop: 4, letterSpacing: 2 }}>
          {label.toUpperCase()}
        </PixelText>
        <View style={{ width: 220, height: PIXEL, backgroundColor: UI.cursor, marginTop: 8 }} />
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <PixelText size={10} color={UI.textDim}>
          {THEME_FLAVOR[theme]}
        </PixelText>
      </Panel>

      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <PixelText size={10} color={UI.textDim}>WAITING IN BACK</PixelText>
        <PixelText size={14} color={UI.text} style={{ marginTop: 2 }}>
          {THEME_BOSS_TITLE[theme]}
        </PixelText>
        <View style={{ marginTop: 12 }}>
          <PixelGrid sprite={SPRITES.bar_boss} theme={theme} accent={accent} pixelSize={PIXEL - 1} />
        </View>
      </View>

      <Panel style={{ marginHorizontal: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 40, height: 40,
            backgroundColor: accent,
            borderColor: UI.border, borderWidth: 2,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <PixelText size={22} color={UI.bg}>{cls.icon}</PixelText>
          </View>
          <View style={{ flex: 1 }}>
            <PixelText size={13} color={UI.text}>{cls.name}</PixelText>
            <PixelText size={10} color={UI.textDim}>LV {charRow.level} · {charRow.allocated_nodes.length} nodes</PixelText>
            <View style={{ marginTop: 4 }}>
              <HpBar hp={hp} maxHp={hp} widthCells={22} showNumbers={false} />
            </View>
          </View>
        </View>
      </Panel>

      {/* Backup picker — pick one other character to bring on the bench. */}
      <Panel style={{ marginHorizontal: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <PixelText size={11} color={UI.textDim}>BRING A BACKUP?</PixelText>
          {secondary ? (
            <Pressable onPress={() => setSecondary(null)}>
              <PixelText size={10} color={UI.hpHalf}>CLEAR</PixelText>
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: 6 }}
          style={{ flexGrow: 0 }}
        >
          {roster
            .filter((r) => r.class_id !== charRow.class_id)
            .map((r) => {
              const c = getClass(r.class_id);
              const a = CLASS_ACCENT[r.class_id as keyof typeof CLASS_ACCENT];
              const isPicked = secondary === r.class_id;
              return (
                <Pressable
                  key={r.class_id}
                  onPress={() => setSecondary(isPicked ? null : (r.class_id as ClassId))}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 8, paddingVertical: 4,
                    borderColor: isPicked ? UI.cursor : UI.borderDark,
                    borderWidth: PIXEL,
                    backgroundColor: isPicked ? UI.panelFill : UI.bg,
                  }}
                >
                  <View style={{
                    width: 18, height: 18,
                    backgroundColor: a,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PixelText size={11} color={UI.bg}>{c.icon}</PixelText>
                  </View>
                  <PixelText size={9} color={isPicked ? UI.cursor : UI.text}>
                    {c.name.replace(/^The\s+/, '').toUpperCase()} L{r.level}
                  </PixelText>
                </Pressable>
              );
            })}
        </ScrollView>
      </Panel>

      {locked ? (
        <Panel style={{ marginHorizontal: 12, marginBottom: 8, borderColor: UI.hpLow, borderWidth: PIXEL }}>
          <PixelText size={11} color={UI.hpLow}>LOCKED — TIER {tier}+</PixelText>
          <PixelText size={10} color={UI.text} style={{ marginTop: 4 }}>
            This place hits {dmgType.toUpperCase()} damage. You need a matching
            Resistance Mark to survive past Tier {Gating.GATING_BEGINS_AT_TIER - 1}.
          </PixelText>
          <PixelText size={10} color={UI.textDim} style={{ marginTop: 4 }}>
            Marks drop from Tier 3 wins of {theme} bars. Find one elsewhere first.
          </PixelText>
        </Panel>
      ) : null}

      <View style={{ paddingHorizontal: 12, gap: 8 }}>
        <Pressable
          onPress={() => enterCombat(false)}
          disabled={locked}
          style={{
            alignItems: 'center', paddingVertical: 14,
            borderColor: locked ? UI.borderDark : UI.cursor, borderWidth: PIXEL,
            backgroundColor: UI.panelFill,
            opacity: locked ? 0.5 : 1,
          }}
        >
          <PixelText size={16} color={locked ? UI.textDim : UI.cursor}>
            {locked ? '🔒 LOCKED' : '▶ FIGHT YOUR WAY IN'}
          </PixelText>
        </Pressable>
        {haveVipKey && !locked ? (
          <Pressable
            onPress={() => enterCombat(true)}
            style={{
              alignItems: 'center', paddingVertical: 12,
              borderColor: '#a855f7', borderWidth: PIXEL,
              backgroundColor: '#1a0a28',
            }}
          >
            <PixelText size={13} color={'#e0a8f8'}>
              ★ USE VIP KEY ({vipKeys[theme]}) — 2× REWARDS
            </PixelText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
