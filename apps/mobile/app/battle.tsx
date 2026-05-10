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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ResourceBar } from '@/components/ResourceBar';
import { StatusRow } from '@/components/StatusRow';
import { ConsumablePanel } from '@/components/ConsumablePanel';
import { playSfx } from '@/audio/sfx';
import { SPRITES, type SpriteId } from '@/design/sprites';
import { UI, CLASS_ACCENT, BAR_PALETTES, type BarThemeId } from '@/design/palette';
import { PIXEL, BATTLE_LAYOUT } from '@/design/scale';
import { buildDemoBattle, type DemoBattle } from '@/battle/setup';
import { useGameStore } from '@/state/game-store';

const COMMAND_ITEMS: readonly MenuItem[] = [
  { id: 'fight', label: 'FIGHT' },
  { id: 'skill', label: 'SKILL' },
  { id: 'item',  label: 'ITEM' },
  { id: 'run',   label: 'RUN' },
];

function isBarTheme(s: string | undefined): s is BarThemeId {
  return !!s && s in BAR_PALETTES;
}

type Phase = 'idle' | 'choosing-skill' | 'choosing-item' | 'awaiting-rhythm' | 'resolving';

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
  // Attacker pose — brief lunge of player avatar block when attacking.
  const [attackPoseAt, setAttackPoseAt] = useState(0);

  const awardXp = useGameStore((s) => s.awardXp);
  const addItem = useGameStore((s) => s.addItem);
  const addGold = useGameStore((s) => s.addGold);
  const claimBar = useGameStore((s) => s.claimBar);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const bumpMastery = useGameStore((s) => s.bumpMastery);
  const activeChar = useGameStore((s) => s.active());

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
  const logScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    // Snap log to bottom whenever a new entry lands.
    logScrollRef.current?.scrollToEnd({ animated: true });
  }, [recentLog]);

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
    } else if (id === 'item') {
      setPhase('choosing-item');
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

  const onPickItem = useCallback((consumableId: string) => {
    setPhase('resolving');
    const ok = consumeItem(demo.classId, consumableId);
    if (!ok) { setPhase('idle'); return; }
    const rng = makeRng();
    const action: Combat.PlayerAction = {
      kind: 'consumable',
      actorId: demo.playerId,
      consumableId,
    };
    let next = Combat.applyPlayerAction(demo.state, action, { rng });
    if (!next.result) next = Combat.advanceTurn(next, { rng });

    // Detect player damage from enemy retaliation.
    const playerBefore = demo.state.combatants.find((c) => c.kind === 'player');
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
    playSfx('menu_select');
    setTimeout(() => setPhase('idle'), 350);
  }, [demo, consumeItem]);

  const onCancelItem = useCallback(() => setPhase('idle'), []);

  // ── rhythm resolution ─────────────────────────────────────────
  const onRhythmResolved = useCallback((rResult: RhythmResult) => {
    if (!pending) return;
    setPhase('resolving');
    setAttackPoseAt(Date.now());
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
      const wasCrit = !!lastEntry && /CRITS/.test(lastEntry.text);
      setLastHitWasCrit(wasCrit);
      playSfx(wasCrit ? 'crit' : 'hit');
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
      router.push({
        pathname: '/rewards',
        params: { barId: params.barId ?? '', theme: barTheme, label: barLabel },
      });
    } else {
      router.back();
    }
  }, [result, params.barId, barTheme, barLabel]);

  // Reward minting on victory (XP + gold + loot drop + bar claim).
  useEffect(() => {
    if (result === 'win') {
      playSfx('victory');
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
        bumpMastery(demo.classId, barTheme);
        if (params.barId) {
          claimBar({ barId: params.barId, theme: barTheme, label: barLabel });
        }
      }, 100);
      return () => clearTimeout(t);
    } else if (result === 'loss') {
      playSfx('defeat');
    }
    return undefined;
  }, [result, demo.classId, awardXp, addGold, addItem, bumpMastery, claimBar, params.barId, barTheme, barLabel]);

  // Time-since-hit drives the screen vignette overlay.
  const playerFlashActive = Date.now() - playerHitAt < 280;
  const attackPoseActive = Date.now() - attackPoseAt < 350;
  // Build a subtle theme-tinted backdrop color (palette index 1 — darkest
  // non-black tone — at low opacity).
  const themePalette = BAR_PALETTES[barTheme];
  const backdropColor = themePalette[1];

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
        position: 'relative',
      }}>
        {/* Theme-tinted backdrop — very subtle radial-feeling rectangle */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
            backgroundColor: backdropColor,
            opacity: 0.35,
          }}
        />
        <PixelText size={10} color={UI.textDim} style={{ marginBottom: 4 }}>
          {barLabel.toUpperCase()}
        </PixelText>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <PixelText size={12} color={UI.text}>{focused.name}</PixelText>
          <View style={{ marginTop: 4 }}>
            <HpBar hp={focused.stats.hp} maxHp={focused.stats.maxHp} widthCells={28} showNumbers={false} />
          </View>
          <View style={{ marginTop: 4 }}>
            <StatusRow effects={focused.statusEffects} compact />
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

        {/* Attacker indicator — small class-accent block that lunges up
            when player commits an attack, then settles back. */}
        <View style={{
          position: 'absolute',
          bottom: attackPoseActive ? 80 : 12,
          left: 16,
          width: 28, height: 28,
          backgroundColor: accent,
          borderColor: '#000', borderWidth: 2,
          opacity: attackPoseActive ? 1 : 0.6,
        }} />
      </View>

      {/* ── battle log ───────────────────────────────────────── */}
      <Panel style={{ marginHorizontal: 12, height: BATTLE_LAYOUT.logHeight }}>
        <ScrollView ref={logScrollRef} contentContainerStyle={{ paddingVertical: 2 }}>
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
          <HpBar hp={player.stats.hp} maxHp={player.stats.maxHp} widthCells={22} />
          {player.resource ? (
            <ResourceBar resource={player.resource} widthCells={22} />
          ) : null}
          {player.statusEffects.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              <StatusRow effects={player.statusEffects} />
            </View>
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
          ) : phase === 'choosing-item' ? (
            <ConsumablePanel
              pack={activeChar.consumables as Record<string, number>}
              onPick={onPickItem}
              onCancel={onCancelItem}
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
