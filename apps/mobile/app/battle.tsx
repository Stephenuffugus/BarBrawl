// PS1-literal battle screen with rhythm + skill selection.
//
// State machine:
//   idle             — command menu visible (FIGHT/SKILL/ITEM/RUN)
//   choosing-skill   — skill panel replaces menu
//   awaiting-rhythm  — rhythm bar overlays the menu, marker sliding
//   resolving        — frozen result flash, then back to idle
//
// FIGHT and SKILL both stage a `pendingAction` (without rhythm), then the
// rhythm bar fills in the rhythm quality. Real engine call follows.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Combat, Loot, type RhythmResult, type RhythmQuality } from '@barbrawl/game-core';
import { Panel } from '@/components/Panel';
import { PixelText } from '@/components/PixelText';
import { PixelGrid } from '@/components/PixelGrid';
import { HpBar } from '@/components/HpBar';
import { MenuList, type MenuItem } from '@/components/MenuList';
import { RhythmBar } from '@/components/RhythmBar';
import { SkillPanel } from '@/components/SkillPanel';
import { ShakeFlash } from '@/components/ShakeFlash';
import { VictoryFlash } from '@/components/VictoryFlash';
import { SPRITES, type SpriteId } from '@/design/sprites';
import { UI, CLASS_ACCENT, BAR_PALETTES, type BarThemeId } from '@/design/palette';
import { PIXEL, BATTLE_LAYOUT } from '@/design/scale';
import { buildDemoBattle, type DemoBattle } from '@/battle/setup';
import { useGameStore } from '@/state/game-store';

const COMMAND_ITEMS: readonly MenuItem[] = [
  { id: 'fight', label: 'FIGHT' },
  { id: 'skill', label: 'SKILL' },
  { id: 'item',  label: 'ITEM',  disabled: true },
  { id: 'run',   label: 'RUN' },
];

function isBarTheme(s: string | undefined): s is BarThemeId {
  return !!s && s in BAR_PALETTES;
}

type Phase = 'idle' | 'choosing-skill' | 'awaiting-rhythm' | 'resolving';

interface PendingAction {
  kind: 'basic_attack' | 'skill';
  targetId: string;
  skillNodeId?: string;
  /** Filled in once rhythm resolves. */
  rhythm?: RhythmQuality;
}

function makeRng() {
  return Math.random;
}

function pickSlot(): Loot.ItemSlot {
  const slots: readonly Loot.ItemSlot[] = ['weapon', 'outfit', 'footwear', 'trinket', 'mark'];
  return slots[Math.floor(Math.random() * slots.length)]!;
}

export default function BattleScreen() {
  const params = useLocalSearchParams<{ barId?: string; theme?: string; label?: string }>();
  const barTheme: BarThemeId = isBarTheme(params.theme) ? params.theme : 'dive';
  const barLabel = (params.label ?? '').trim() || 'A nameless bar';

  const [demo, setDemo] = useState<DemoBattle>(() => buildDemoBattle({ theme: barTheme, ...(params.barId ? { barId: params.barId } : {}) }));
  const [phase, setPhase] = useState<Phase>('idle');
  const [cursor, setCursor] = useState(0);
  const [pending, setPending] = useState<PendingAction | null>(null);

  // Shake/flash trigger for the focused enemy sprite + crit flag.
  const [hitToken, setHitToken] = useState(0);
  const [lastHitWasCrit, setLastHitWasCrit] = useState(false);
  // Player hit feedback — flashes the player panel and screen edges.
  const [playerHitAt, setPlayerHitAt] = useState(0);
  const [playerHitSeverity, setPlayerHitSeverity] = useState<'light' | 'heavy'>('light');

  const awardXp = useGameStore((s) => s.awardXp);
  const addItem = useGameStore((s) => s.addItem);
  const addGold = useGameStore((s) => s.addGold);

  const player = demo.state.combatants.find((c) => c.kind === 'player')!;
  const aliveEnemy = demo.state.combatants.find(
    (c) => (c.kind === 'enemy' || c.kind === 'boss') && c.stats.hp > 0,
  );
  const focused = aliveEnemy ?? demo.state.combatants[1]!;
  const spriteId: SpriteId = (demo.enemySpriteIds[focused.id] ?? 'drunken_patron') as SpriteId;
  const sprite = SPRITES[spriteId];
  const accent = CLASS_ACCENT[demo.classId];

  const recentLog = useMemo(() => demo.state.log.slice(-3), [demo.state.log]);
  const result = demo.state.result;

  // ── command-level actions ─────────────────────────────────────
  const onCommand = useCallback((id: string) => {
    if (phase !== 'idle' || result || !aliveEnemy) {
      if (id === 'run') router.back();
      return;
    }
    if (id === 'fight') {
      setPending({ kind: 'basic_attack', targetId: aliveEnemy.id });
      setPhase('awaiting-rhythm');
    } else if (id === 'skill') {
      setPhase('choosing-skill');
    } else if (id === 'run') {
      router.back();
    }
  }, [phase, result, aliveEnemy]);

  const onPickSkill = useCallback((nodeId: string) => {
    if (!aliveEnemy) return;
    setPending({ kind: 'skill', targetId: aliveEnemy.id, skillNodeId: nodeId });
    setPhase('awaiting-rhythm');
  }, [aliveEnemy]);

  const onCancelSkill = useCallback(() => {
    setPhase('idle');
  }, []);

  // ── rhythm resolution ─────────────────────────────────────────
  const onRhythmResolved = useCallback((rResult: RhythmResult) => {
    if (!pending) return;
    setPhase('resolving');
    const rng = makeRng();
    const action: Combat.PlayerAction = pending.kind === 'skill'
      ? { kind: 'skill', actorId: demo.playerId, targetId: pending.targetId, skillNodeId: pending.skillNodeId!, rhythm: rResult.quality }
      : { kind: 'basic_attack', actorId: demo.playerId, targetId: pending.targetId, rhythm: rResult.quality };

    const before = demo.state;
    let next = Combat.applyPlayerAction(before, action, { rng });
    if (!next.result) next = Combat.advanceTurn(next, { rng });

    // Detect whether the focused enemy took a hit; trigger shake/flash.
    const focusedBefore = before.combatants.find((c) => c.id === pending.targetId);
    const focusedAfter = next.combatants.find((c) => c.id === pending.targetId);
    if (focusedBefore && focusedAfter && focusedAfter.stats.hp < focusedBefore.stats.hp) {
      setHitToken((t) => t + 1);
      // Crit detection from log (last entry's text contains 'CRITS').
      const lastEntry = next.log[next.log.length - 1];
      setLastHitWasCrit(!!lastEntry && /CRITS/.test(lastEntry.text));
    }

    // Detect whether the player took a hit during the enemy's response.
    const playerBefore = before.combatants.find((c) => c.kind === 'player');
    const playerAfter = next.combatants.find((c) => c.kind === 'player');
    if (playerBefore && playerAfter) {
      const dmg = playerBefore.stats.hp - playerAfter.stats.hp;
      if (dmg > 0) {
        const heavy = dmg / playerBefore.stats.maxHp >= 0.15;
        setPlayerHitSeverity(heavy ? 'heavy' : 'light');
        setPlayerHitAt(Date.now());
      }
    }

    setDemo({ ...demo, state: next });
    setPending(null);
    setTimeout(() => setPhase('idle'), 350);
  }, [pending, demo]);

  // ── replay / continue ─────────────────────────────────────────
  const onReplay = useCallback(() => {
    setDemo(buildDemoBattle({ theme: barTheme, ...(params.barId ? { barId: params.barId } : {}) }));
    setPhase('idle');
    setPending(null);
    setCursor(0);
  }, [barTheme, params.barId]);

  const onContinue = useCallback(() => {
    if (result === 'win') {
      router.push('/rewards');
    } else {
      router.back();
    }
  }, [result]);

  // Reward minting on victory (XP + gold + loot drop).
  useEffect(() => {
    if (result === 'win') {
      const t = setTimeout(() => {
        awardXp(demo.classId, 100);
        addGold(50);
        const item = Loot.rollItem({
          slot: pickSlot(),
          barTier: 1,
          rng: Math.random,
          itemIdGen: () => `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
        addItem(item);
      }, 100);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [result, demo.classId, awardXp, addGold, addItem]);

  // Time-since-hit drives the screen vignette overlay.
  const playerFlashActive = Date.now() - playerHitAt < 280;

  return (
    <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: BATTLE_LAYOUT.topPad }}>
      {/* Screen-edge vignette on player damage */}
      {playerFlashActive ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
            borderColor: '#ef0040',
            borderWidth: playerHitSeverity === 'heavy' ? 16 : 8,
            zIndex: 100,
          }}
        />
      ) : null}

      {/* Victory celebration overlay */}
      <VictoryFlash active={result === 'win'} />
      {/* ── enemy area ─────────────────────────────────────── */}
      <View style={{
        height: BATTLE_LAYOUT.enemyAreaHeight,
        alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12,
      }}>
        <PixelText size={10} color={UI.textDim} style={{ marginBottom: 4 }}>
          {barLabel.toUpperCase()}
        </PixelText>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <PixelText size={12} color={UI.text}>{focused.name}</PixelText>
          <View style={{ marginTop: 4 }}>
            <HpBar hp={focused.stats.hp} maxHp={focused.stats.maxHp} widthCells={28} showNumbers={false} />
          </View>
        </View>
        <ShakeFlash hitToken={hitToken} strong={lastHitWasCrit}>
          <View style={{ opacity: focused.stats.hp > 0 ? 1 : 0.3 }}>
            <PixelGrid
              sprite={sprite}
              theme={barTheme}
              accent={accent}
              pixelSize={spriteId === 'bar_boss' ? PIXEL : PIXEL + 1}
            />
          </View>
        </ShakeFlash>
      </View>

      {/* ── battle log ───────────────────────────────────────── */}
      <Panel style={{ marginHorizontal: 12, height: BATTLE_LAYOUT.logHeight }}>
        <ScrollView contentContainerStyle={{ paddingVertical: 2 }}>
          {recentLog.length === 0 ? (
            <PixelText size={12} color={UI.textDim}>The fight begins.</PixelText>
          ) : (
            recentLog.map((entry, i) => (
              <PixelText
                key={`${entry.turn}-${i}`}
                size={12}
                color={entry.kind === 'defeat' ? UI.hpLow : entry.kind === 'info' ? UI.textDim : UI.text}
                style={{ marginBottom: 2 }}
              >
                {entry.text}
              </PixelText>
            ))
          )}
          {result === 'win' ? (
            <PixelText size={14} color={UI.hpFull} style={{ marginTop: 4 }}>▶ VICTORY</PixelText>
          ) : null}
          {result === 'loss' ? (
            <PixelText size={14} color={UI.hpLow} style={{ marginTop: 4 }}>▶ DEFEATED</PixelText>
          ) : null}
        </ScrollView>
      </Panel>

      {/* ── HUD row: player + commands/skills/rhythm ──────────── */}
      <View style={{
        flexDirection: 'row',
        marginTop: BATTLE_LAYOUT.panelGap,
        marginHorizontal: 12,
        gap: BATTLE_LAYOUT.panelGap,
      }}>
        <Panel style={{ flex: 1.2 }}>
          {playerFlashActive ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
                backgroundColor: '#ef0040',
                opacity: playerHitSeverity === 'heavy' ? 0.45 : 0.25,
                zIndex: 5,
              }}
            />
          ) : null}
          <PixelText size={13} color={UI.text}>{player.name}</PixelText>
          <PixelText size={10} color={UI.textDim} style={{ marginBottom: 6 }}>LV {player.level ?? 1}</PixelText>
          <HpBar hp={player.stats.hp} maxHp={player.stats.maxHp} widthCells={26} />
          {player.resource ? (
            <PixelText size={10} color={UI.cursor} style={{ marginTop: 6 }}>
              {player.resource.kind.toUpperCase()} {player.resource.current}/{player.resource.cap}
            </PixelText>
          ) : null}
        </Panel>

        {/* The right-side panel cycles between menu / skills / rhythm */}
        <View style={{ flex: 1 }}>
          {phase === 'choosing-skill' ? (
            <SkillPanel
              player={player}
              equipped={demo.equipped}
              onPick={onPickSkill}
              onCancel={onCancelSkill}
            />
          ) : phase === 'awaiting-rhythm' ? (
            <Panel style={{ minHeight: 132, alignItems: 'center', justifyContent: 'center' }}>
              <RhythmBar
                width={220}
                onResolve={onRhythmResolved}
                caption={pending?.kind === 'skill' ? 'SKILL — TIME IT' : 'STRIKE!'}
              />
            </Panel>
          ) : (
            <Panel>
              <MenuList items={COMMAND_ITEMS} cursor={cursor} onMove={setCursor} onSelect={onCommand} />
            </Panel>
          )}
        </View>
      </View>

      {/* ── footer hint / continue ───────────────────────────── */}
      <View style={{ alignItems: 'center', marginTop: 16, paddingHorizontal: 24, gap: 8 }}>
        {result ? (
          <>
            <PixelText
              size={14}
              color={UI.cursor}
              onPress={onContinue}
              style={{ paddingVertical: 8 }}
            >
              ▶ {result === 'win' ? 'COLLECT REWARDS' : 'BACK TO MAP'}
            </PixelText>
            <PixelText
              size={10}
              color={UI.textDim}
              onPress={onReplay}
              style={{ paddingVertical: 4 }}
            >
              REPLAY DEMO
            </PixelText>
          </>
        ) : (
          <PixelText size={9} color={UI.textDim}>
            Tap a command. SKILL opens loadout. Rhythm: hit the gold band.
          </PixelText>
        )}
      </View>

      <View style={{ flex: 1 }} />
    </View>
  );
}

export { BattleScreen };
