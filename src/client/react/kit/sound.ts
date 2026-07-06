// SOUND — a tiny synthesized SFX engine. Every cue is generated at runtime with
// the Web Audio API (oscillator + gain envelope), so there are NO audio assets
// to load and nothing that trips the Devvit webview's strict CSP. Mute state is
// persisted in localStorage. The AudioContext is created lazily on the first
// cue after a user gesture (browser autoplay policy), and all of this degrades
// to a no-op when Web Audio isn't available (SSR / tests / old webviews).

export type Cue = 'pledge' | 'vote' | 'back' | 'action' | 'mission' | 'dawn' | 'raid' | 'success' | 'error';

type Note = { f: number; t: number; dur: number; type?: OscillatorType; gain?: number };

// Each cue is a short sequence of notes (t = start offset in seconds).
const CUES: Record<Cue, Note[]> = {
  // warm rising ding — a candle lit
  pledge: [
    { f: 660, t: 0, dur: 0.12, type: 'sine' },
    { f: 880, t: 0.08, dur: 0.16, type: 'sine' },
  ],
  // decisive two-tone
  vote: [
    { f: 523, t: 0, dur: 0.09, type: 'triangle' },
    { f: 784, t: 0.08, dur: 0.14, type: 'triangle' },
  ],
  // council chord stab
  back: [
    { f: 392, t: 0, dur: 0.14, type: 'sine' },
    { f: 587, t: 0, dur: 0.14, type: 'sine', gain: 0.5 },
  ],
  // soft tick
  action: [{ f: 460, t: 0, dur: 0.08, type: 'triangle' }],
  // adventurous descent into the ruins
  mission: [
    { f: 520, t: 0, dur: 0.1, type: 'sawtooth', gain: 0.4 },
    { f: 392, t: 0.09, dur: 0.12, type: 'sawtooth', gain: 0.4 },
    { f: 294, t: 0.19, dur: 0.16, type: 'sawtooth', gain: 0.4 },
  ],
  // gentle sunrise chord
  dawn: [
    { f: 440, t: 0, dur: 0.5, type: 'sine', gain: 0.35 },
    { f: 554, t: 0.05, dur: 0.5, type: 'sine', gain: 0.3 },
    { f: 659, t: 0.1, dur: 0.5, type: 'sine', gain: 0.28 },
  ],
  // low alarm
  raid: [
    { f: 180, t: 0, dur: 0.16, type: 'square', gain: 0.35 },
    { f: 120, t: 0.16, dur: 0.22, type: 'square', gain: 0.35 },
  ],
  // triumphant arpeggio (title unlocked)
  success: [
    { f: 523, t: 0, dur: 0.1, type: 'sine' },
    { f: 659, t: 0.09, dur: 0.1, type: 'sine' },
    { f: 784, t: 0.18, dur: 0.2, type: 'sine' },
  ],
  // dull error buzz
  error: [{ f: 150, t: 0, dur: 0.18, type: 'sawtooth', gain: 0.3 }],
};

const STORAGE_KEY = 'omd.muted';

type Win = typeof window & { webkitAudioContext?: typeof AudioContext };

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private readonly listeners = new Set<(muted: boolean) => void>();

  constructor() {
    let stored = false;
    try {
      stored = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      /* localStorage blocked — default to unmuted */
    }
    this.muted = stored;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Subscribe to mute changes (for the toggle button). Returns an unsubscribe. */
  subscribe(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore persistence failure */
    }
    this.listeners.forEach((fn) => fn(muted));
  }

  toggle(): void {
    this.setMuted(!this.muted);
  }

  private context(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctor = (window as Win).AudioContext ?? (window as Win).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    return this.ctx;
  }

  play(cue: Cue): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    // Autoplay policy: a context created before a gesture starts suspended.
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const n of CUES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.value = n.f;
      const peak = n.gain ?? 0.6;
      const start = now + n.t;
      const end = start + n.dur;
      // Quick attack, exponential decay — a soft blip, never a click.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }
}

export const sfx = new SoundEngine();
