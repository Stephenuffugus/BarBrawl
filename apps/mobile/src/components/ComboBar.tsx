import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { RhythmResult } from '@barbrawl/game-core';
import { UI } from '@/design/palette';
import { PIXEL } from '@/design/scale';
import { playSfx } from '@/audio/sfx';
import { PixelText } from './PixelText';
import type { ComboPattern } from '@/battle/patterns';

const HOLD_MS = 160; // pause after the last beat before resolving

type BeatResult = 'perfect' | 'good' | 'miss' | null;

/**
 * Per-attack combo input. A playhead sweeps across the track; tap (button or
 * spacebar) as it crosses each beat marker. Nailing every beat = full damage,
 * fumbling some still lands a partial hit. Aggregates to a single RhythmResult
 * so the combat engine is unchanged.
 */
export function ComboBar({
  pattern,
  onResolve,
  caption,
  width = 300,
}: {
  pattern: ComboPattern;
  onResolve: (r: RhythmResult) => void;
  caption?: string;
  width?: number;
}) {
  const [pos, setPos] = useState(0); // 0..1 playhead
  const [results, setResults] = useState<BeatResult[]>(() => pattern.beats.map(() => null));
  const resultsRef = useRef<BeatResult[]>(pattern.beats.map(() => null));
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const r = resultsRef.current;
    const score = r.reduce<number>((s, b) => s + (b === 'perfect' ? 1 : b === 'good' ? 0.65 : 0), 0);
    const avg = r.length ? score / r.length : 0;
    const quality: RhythmResult['quality'] =
      avg >= 0.9 ? 'perfect' : avg >= 0.6 ? 'good' : avg >= 0.25 ? 'ok' : 'miss';
    setTimeout(() => onResolve({ quality, position: null, deviationMs: null }), HOLD_MS);
  }, [onResolve]);

  // Drive the playhead.
  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(1, elapsed / pattern.totalMs);
      setPos(p);
      // Mark beats whose window has fully passed as missed (live feedback).
      let changed = false;
      pattern.beats.forEach((b, i) => {
        if (resultsRef.current[i] === null && elapsed > b.atMs + b.goodMs) {
          resultsRef.current[i] = 'miss';
          changed = true;
        }
      });
      if (changed) setResults([...resultsRef.current]);
      if (p >= 1) { finish(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTap = useCallback(() => {
    if (doneRef.current) return;
    const nowMs = performance.now() - startRef.current;
    // Nearest still-pending beat.
    let best = -1;
    let bestD = Infinity;
    pattern.beats.forEach((b, i) => {
      if (resultsRef.current[i] !== null) return;
      const d = Math.abs(nowMs - b.atMs);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best < 0) return;
    const b = pattern.beats[best]!;
    // Stray tap far from any pending beat — ignore so it doesn't burn a beat.
    if (bestD > b.goodMs * 2.5) { playSfx('menu_move'); return; }
    const res: BeatResult = bestD <= b.goodMs * 0.5 ? 'perfect' : bestD <= b.goodMs ? 'good' : 'miss';
    resultsRef.current[best] = res;
    setResults([...resultsRef.current]);
    playSfx(res === 'perfect' ? 'perfect' : res === 'good' ? 'good' : 'miss');
  }, [pattern.beats]);

  // Spacebar / Enter on web.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onTap(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onTap]);

  const trackH = PIXEL * 7;
  const hitCount = results.filter((r) => r === 'perfect' || r === 'good').length;

  const colorFor = (r: BeatResult) =>
    r === 'perfect' ? UI.cursor : r === 'good' ? UI.hpFull : r === 'miss' ? UI.hpLow : UI.textDim;

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      {caption ? <PixelText size={11} color={UI.text}>{caption}</PixelText> : null}
      <PixelText size={10} color={UI.cursor}>
        {pattern.name} · {hitCount}/{pattern.beats.length}
      </PixelText>

      {/* Track */}
      <View style={{
        width, height: trackH, backgroundColor: UI.bg,
        borderColor: UI.border, borderWidth: 1, position: 'relative', overflow: 'hidden',
      }}>
        {/* beat targets */}
        {pattern.beats.map((b, i) => {
          const left = (b.atMs / pattern.totalMs) * width;
          const halfGood = (b.goodMs / pattern.totalMs) * width;
          const r = results[i] ?? null;
          return (
            <React.Fragment key={i}>
              {/* good window band */}
              <View style={{
                position: 'absolute', top: 0, height: '100%',
                left: left - halfGood, width: halfGood * 2,
                backgroundColor: '#13241a',
              }} />
              {/* beat marker dot */}
              <View style={{
                position: 'absolute', top: trackH / 2 - PIXEL * 2,
                left: left - PIXEL * 2, width: PIXEL * 4, height: PIXEL * 4,
                borderRadius: PIXEL * 2,
                backgroundColor: colorFor(r),
                borderColor: UI.border, borderWidth: 1,
              }} />
            </React.Fragment>
          );
        })}
        {/* playhead */}
        <View style={{
          position: 'absolute', top: -2, bottom: -2,
          left: Math.max(0, Math.min(width - PIXEL, pos * width - PIXEL / 2)),
          width: PIXEL, backgroundColor: '#ffffff',
        }} />
      </View>

      {/* Big tap button — the attack action you press. */}
      <Pressable
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel="Tap to the beat"
        style={{
          marginTop: 4, width, alignItems: 'center', justifyContent: 'center',
          paddingVertical: 16,
          backgroundColor: UI.panelFill, borderColor: UI.cursor, borderWidth: PIXEL,
        }}
      >
        <PixelText size={18} color={UI.cursor}>
          {pattern.beats.length > 1 ? 'TAP EACH BEAT ▸' : 'TAP ▸'}
        </PixelText>
        <PixelText size={9} color={UI.textDim} style={{ marginTop: 2 }}>
          (or SPACE) — hit the white line on the dots
        </PixelText>
      </Pressable>
    </View>
  );
}
