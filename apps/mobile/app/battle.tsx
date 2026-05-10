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
import { Combat, Loot, Gating, Progression, getClass, type ClassId, type RhythmResult, type RhythmQuality } from '@barbrawl/game-core';
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
import { SwapPanel } from '@/components/SwapPanel';
import { LevelUpFlash } from '@/components/LevelUpFlash';
import { playSfx } from '@/audio/sfx';
import { SPRITES, type SpriteId } from '@/design/sprites';
import { UI, CLASS_ACCENT, BAR_PALETTES, type BarThemeId } from '@/design/palette';
import { PIXEL, BATTLE_LAYOUT } from '@/design/scale';
import { buildDemoBattle, buildSwapCombatant, type DemoBattle, type ReserveChar } from '@/battle/setup';
import { useGameStore } from '@/state/game-store';

/** Static command set; SWAP is appended dynamically when reserves exist. */
const BASE_COMMAND_ITEMS: readonly MenuItem[] = [
  { id: 'fight', label: 'FIGHT' },
  { id: 'skill', label: 'SKILL' },
  { id: 'item',  label: 'ITEM' },
  { id: 'run',   label: 'RUN' },
];

function isBarTheme(s: string | undefined): s is BarThemeId {
  return !!s && s in BAR_PALETTES;
}

type Phase = 'idle' | 'choosing-skill' | 'choosing-item' | 'awaiting-rhythm' | 'resolving' | 'swapping';

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

/** Build a BattleSummary for daily-quest progress updates. */
function buildSummary(demo: DemoBattle, result: 'win' | 'loss', barTheme: BarThemeId) {
  const player = demo.state.combatants.find((c) => c.kind === 'player');
  const log = demo.state.log;
  const perfectHits = log.filter((e) => /\(perfect/.test(e.text)).length;
  const skillsUsed = log.filter((e) => e.kind === 'skill').length;
  const consumablesUsed = log.filter((e) => e.kind === 'consumable').length;
  const statusApplies = log.filter((e) => /applies|inflicts|stuns|skips|braces|reads/.test(e.text)).length;
  let biggestHit = 0;
  for (const e of log) {
    const m = e.text.match(/for (\d+)/);
    if (m) biggestHit = Math.max(biggestHit, parseInt(m[1]!, 10));
  }
  return {
    won: result === 'win',
    barType: barTheme,
    barLevel: player?.level ?? 1,
    playerLevel: player?.level ?? 1,
    bossDefeated: result === 'win',
    perfectHits,
    skillsUsed,
    statusApplies,
    consumablesUsed,
    biggestHit,
    roomsCleared: 3,
    endedHpPct: player ? player.stats.hp / player.stats.maxHp : 0,
    goldEarned: result === 'win' ? 50 : 0,
  };
}

export default function BattleScreen() {
  const params = useLocalSearchParams<{ barId?: string; theme?: string; label?: string; tier?: string; secondary?: string }>();
  const barTheme: BarThemeId = isBarTheme(params.theme) ? params.theme : 'dive';
  const barLabel = (params.label ?? '').trim() || 'A nameless bar';

  const [demo, setDemo] = useState<DemoBattle>(() => buildDemoBattle({
    theme: barTheme,
    ...(params.barId ? { barId: params.barId } : {}),
    ...(params.secondary ? { secondaryClassId: params.secondary as ClassId } : {}),
  }));
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
  // Level-up celebration trigger.
  const [levelUpEvent, setLevelUpEvent] = useState<{ levels: number; newLevel: number } | null>(null);

  const awardXp = useGameStore((s) => s.awardXp);
  const addItem = useGameStore((s) => s.addItem);
  const addGold = useGameStore((s) => s.addGold);
  const claimBar = useGameStore((s) => s.claimBar);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const bumpMastery = useGameStore((s) => s.bumpMastery);
  const earnMark = useGameStore((s) => s.earnMark);
  const recordBarClear = useGameStore((s) => s.recordBarClear);
  const saveLastBattle = useGameStore((s) => s.saveLastBattle);
  const applyBattleToQuests = useGameStore((s) => s.applyBattleToQuests);
  const activeChar = useGameStore((s) => s.active());

  const player = demo.state.combatants.find((c) => c.kind === 'player')!;
  // Reserves with a residual HP > 0 can be swapped in.
  const swappableReserves = demo.reserves.filter((r) => r.startingHp > 0);
  // Active player's mutable class for awarding shared XP / mastery later.
  const [activeClassId, setActiveClassId] = useState<ClassId>(demo.classId);
  const COMMAND_ITEMS = useMemo<readonly MenuItem[]>(() => {
    if (swappableReserves.length === 0) return BASE_COMMAND_ITEMS;
    // Insert SWAP right after SKILL.
    return [
      BASE_COMMAND_ITEMS[0]!,
      BASE_COMMAND_ITEMS[1]!,
      { id: 'swap', label: 'SWAP' },
      ...BASE_COMMAND_ITEMS.slice(2),
    ];
  }, [swappableReserves.length]);
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
    } else if (id === 'swap') {
      setPhase('swapping');
    } else if (id === 'run') {
      router.back();
    }
  }, [phase, result, aliveEnemy]);

  /** Execute the swap: replace player Combatant in state with a reserve, the
   *  current player goes to the bench at residual HP. Costs the turn —
   *  enemy gets a free swing while we transition. */
  const onSwap = useCallback((newClassId: ClassId) => {
    setPhase('resolving');
    const reserve = demo.reserves.find((r) => r.classId === newClassId);
    if (!reserve) { setPhase('idle'); return; }

    const before = demo.state;
    const oldPlayerIdx = before.combatants.findIndex((c) => c.kind === 'player');
    if (oldPlayerIdx < 0) { setPhase('idle'); return; }
    const oldPlayer = before.combatants[oldPlayerIdx]!;

    // Build the new player Combatant from the reserve at its previously
    // recorded HP (if it was swapped out before).
    const swap = buildSwapCombatant(newClassId, reserve.startingHp);
    const newPlayer = { ...swap.combatant, kind: 'player' as const };

    // Replace combatants; build new reserves array with the outgoing player.
    const newCombatants = [...before.combatants];
    newCombatants[oldPlayerIdx] = newPlayer;

    const newReserves: ReserveChar[] = demo.reserves
      .filter((r) => r.classId !== newClassId)
      .concat({
        classId: oldPlayer.classId as ClassId,
        level: oldPlayer.level ?? 5,
        allocatedNodes: oldPlayer.allocatedNodes ?? [],
        equippedSkills: oldPlayer.skillsEquipped ?? [],
        maxHp: oldPlayer.stats.maxHp,
        startingHp: oldPlayer.stats.hp,
      });

    let nextState: Combat.BattleState = {
      ...before,
      combatants: newCombatants,
      log: [...before.log, {
        turn: before.turn,
        actorId: oldPlayer.id,
        kind: 'info',
        text: `${getClass(oldPlayer.classId as ClassId).name} taps out — ${getClass(newClassId).name} steps in.`,
      }],
    };
    // Spend the turn (enemy gets to act).
    nextState = Combat.advanceTurn(nextState, { rng: makeRng() });

    // Detect player damage from enemy retaliation.
    const playerBefore = before.combatants.find((c) => c.kind === 'player');
    const playerAfter = nextState.combatants.find((c) => c.kind === 'player');
    if (playerBefore && playerAfter) {
      const dmg = newPlayer.stats.hp - playerAfter.stats.hp;
      if (dmg > 0) {
        const heavy = dmg / newPlayer.stats.maxHp >= 0.15;
        setPlayerHitSeverity(heavy ? 'heavy' : 'light');
        setPlayerHitAt(Date.now());
      }
    }

    setDemo({ ...demo, state: nextState, reserves: newReserves, classId: newClassId, equipped: swap.equipped });
    setActiveClassId(newClassId);
    playSfx('menu_select');
    setTimeout(() => setPhase('idle'), 350);
  }, [demo]);

  const onCancelSwap = useCallback(() => setPhase('idle'), []);

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
    setDemo(buildDemoBattle({
      theme: barTheme,
      ...(params.barId ? { barId: params.barId } : {}),
      ...(params.secondary ? { secondaryClassId: params.secondary as ClassId } : {}),
    }));
    setPhase('idle');
    setPending(null);
    setCursor(0);
  }, [barTheme, params.barId, params.secondary]);

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

  // Reward minting on victory (XP + gold + loot drop + bar claim + quests).
  useEffect(() => {
    if (result === 'win' || result === 'loss') {
      const summary = buildSummary(demo, result, barTheme);
      applyBattleToQuests(summary);
      saveLastBattle({
        barLabel,
        theme: barTheme,
        result,
        classId: demo.classId,
        log: demo.state.log.map((e) => ({
          turn: e.turn, actorId: e.actorId, kind: e.kind, text: e.text,
        })),
        finishedAtMs: Date.now(),
      });
    }
    if (result === 'win') {
      playSfx('victory');
      const t = setTimeout(() => {
        // Compute reward multipliers from the current bar's clear context.
        const tierStr = (params.tier as string | undefined) ?? '1';
        const tier = parseInt(tierStr, 10) || 1;
        const barId = params.barId ?? '';
        const meta = barId ? recordBarClear(barId) : { clearNumberToday: 1, firstEverClear: true };
        const dailyMult = Progression.rewardMultiplierForClearNumber(meta.clearNumberToday);
        const firstConquerMult = meta.firstEverClear ? 2 : 1;
        // Bar tier scales loot ilvl AND awards bonus XP at high tiers.
        const tierMult = 1 + (tier - 1) * 0.25; // T1=1.0, T6=2.25
        const xpAward = Math.floor(100 * dailyMult * firstConquerMult * tierMult);
        const goldAward = Math.floor(50 * dailyMult * tierMult);

        const xpResult = awardXp(activeClassId, xpAward);
        // Reserves get half-XP for participating.
        for (const r of demo.reserves) {
          awardXp(r.classId, Math.floor(xpAward * 0.5));
        }
        addGold(goldAward);
        if (xpResult.levelsGained > 0) {
          const newRow = useGameStore.getState().roster.find((r) => r.class_id === activeClassId);
          if (newRow) {
            setLevelUpEvent({ levels: xpResult.levelsGained, newLevel: newRow.level });
            playSfx('level_up');
            setTimeout(() => setLevelUpEvent(null), 1500);
          }
        }
        const item = Loot.rollItem({
          slot: pickSlot(),
          barTier: tier,
          rng: Math.random,
          itemIdGen: () => `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
        addItem(item);
        bumpMastery(activeClassId, barTheme);
        for (const r of demo.reserves) bumpMastery(r.classId, barTheme);
        if (tier >= 3) {
          const dmgType = Gating.BAR_THEME_DAMAGE[barTheme];
          earnMark(`mark_${dmgType}`);
        }
        if (params.barId) {
          claimBar({ barId: params.barId, theme: barTheme, label: barLabel });
        }
      }, 100);
      return () => clearTimeout(t);
    } else if (result === 'loss') {
      playSfx('defeat');
    }
    return undefined;
  }, [result, demo, demo.classId, activeClassId, awardXp, addGold, addItem, bumpMastery, earnMark, recordBarClear, saveLastBattle, claimBar, applyBattleToQuests, params.barId, params.tier, barTheme, barLabel]);

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

      {/* Level-up flourish */}
      {levelUpEvent ? (
        <LevelUpFlash
          levelsGained={levelUpEvent.levels}
          newLevel={levelUpEvent.newLevel}
        />
      ) : null}
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
          {/* Bench indicator: show backup at residual HP. */}
          {swappableReserves.length > 0 ? (
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <PixelText size={9} color={UI.textDim}>BENCH</PixelText>
              {swappableReserves.map((r) => {
                const c = getClass(r.classId);
                const accentR = CLASS_ACCENT[r.classId as keyof typeof CLASS_ACCENT];
                const hpPct = r.startingHp / r.maxHp;
                return (
                  <View key={r.classId} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 4, paddingVertical: 2,
                    backgroundColor: UI.bg,
                    borderColor: accentR, borderWidth: 1,
                  }}>
                    <PixelText size={10} color={accentR}>{c.icon}</PixelText>
                    <PixelText size={8} color={hpPct > 0.5 ? UI.hpFull : hpPct > 0.25 ? UI.hpHalf : UI.hpLow}>
                      {Math.round(hpPct * 100)}%
                    </PixelText>
                  </View>
                );
              })}
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
          ) : phase === 'swapping' ? (
            <SwapPanel reserves={swappableReserves} onPick={onSwap} onCancel={onCancelSwap} />
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
