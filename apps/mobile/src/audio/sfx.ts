// Web Audio synth for retro 8-bit SFX. Generates tones directly — no
// audio assets to bundle. Each named "patch" is a sequence of (freq,
// duration, waveform, gain) blips with linear envelope decay.
//
// Browsers require user-gesture before AudioContext starts. We lazily
// create the context on first play() and resume() it; on first call
// after a tap/click it begins working. Pre-resume calls are silent.
//
// Native (react-native): no AudioContext on the global, so we no-op.
// Swap to expo-av/Audio with bundled .wav files for native builds.

type Waveform = 'square' | 'sawtooth' | 'triangle' | 'sine';

interface Note {
  freq: number;
  durMs: number;
  wave: Waveform;
  gain?: number;
  /** ms delay relative to start of patch. */
  startMs?: number;
  /** Frequency to slide to over duration. */
  slideTo?: number;
}

const PATCHES: Record<string, readonly Note[]> = {
  menu_move:   [{ freq: 660, durMs: 40, wave: 'square', gain: 0.06 }],
  menu_select: [{ freq: 880, durMs: 70, wave: 'square', gain: 0.08 }],
  hit:         [
    { freq: 220, durMs: 90, wave: 'square', gain: 0.10, slideTo: 110 },
  ],
  crit:        [
    { freq: 440, durMs: 70, wave: 'sawtooth', gain: 0.12 },
    { freq: 660, durMs: 90, wave: 'square',   gain: 0.12, startMs: 50 },
    { freq: 880, durMs: 120, wave: 'square',   gain: 0.10, startMs: 110 },
  ],
  miss:        [{ freq: 180, durMs: 120, wave: 'triangle', gain: 0.08, slideTo: 90 }],
  perfect:     [{ freq: 1320, durMs: 120, wave: 'square', gain: 0.10, slideTo: 1760 }],
  good:        [{ freq: 770, durMs: 90, wave: 'square', gain: 0.09 }],
  victory:     [
    { freq: 523, durMs: 100, wave: 'square', gain: 0.10 },
    { freq: 659, durMs: 100, wave: 'square', gain: 0.10, startMs: 100 },
    { freq: 784, durMs: 100, wave: 'square', gain: 0.10, startMs: 200 },
    { freq: 1047, durMs: 250, wave: 'square', gain: 0.12, startMs: 300 },
  ],
  level_up:    [
    { freq: 523, durMs: 80, wave: 'square', gain: 0.10 },
    { freq: 784, durMs: 80, wave: 'square', gain: 0.10, startMs: 80 },
    { freq: 1047, durMs: 80, wave: 'square', gain: 0.10, startMs: 160 },
    { freq: 1568, durMs: 200, wave: 'square', gain: 0.12, startMs: 240 },
  ],
  footstep:    [{ freq: 80, durMs: 30, wave: 'triangle', gain: 0.04 }],
  defeat:      [
    { freq: 220, durMs: 150, wave: 'sawtooth', gain: 0.10, slideTo: 140 },
    { freq: 110, durMs: 200, wave: 'sawtooth', gain: 0.08, startMs: 150 },
  ],
} as const;

export type SfxId = keyof typeof PATCHES;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
let lastFootstepMs = 0;

/** Hook: subscribe to muted state from the store. Caller wires this once
 *  at app boot. We keep the store-aware logic OUT of this module to avoid
 *  a circular dep — caller imports the store separately. */
export function setSfxMuted(m: boolean): void {
  muted = m;
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = W.AudioContext ?? W.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }
  return ctx;
}

function playNote(c: AudioContext, master: GainNode, note: Note, atMs: number): void {
  const now = c.currentTime + atMs / 1000;
  const dur = note.durMs / 1000;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = note.wave;
  osc.frequency.setValueAtTime(note.freq, now);
  if (note.slideTo !== undefined) {
    osc.frequency.linearRampToValueAtTime(note.slideTo, now + dur);
  }
  const peak = note.gain ?? 0.1;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(peak, now + 0.005);
  env.gain.linearRampToValueAtTime(0, now + dur);
  osc.connect(env).connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export function playSfx(id: SfxId): void {
  if (muted) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const patch = PATCHES[id];
  if (!patch) return;
  // Footstep dedup so movement spam doesn't sound awful.
  if (id === 'footstep') {
    const now = performance.now();
    if (now - lastFootstepMs < 110) return;
    lastFootstepMs = now;
  }
  for (const note of patch) {
    playNote(c, masterGain, note, note.startMs ?? 0);
  }
}

export function isMuted(): boolean {
  return muted;
}
