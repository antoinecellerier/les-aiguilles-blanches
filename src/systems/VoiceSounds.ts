/**
 * Celeste-style voice gibberish via Web Audio API.
 *
 * Each character has a distinct vocal timbre defined by base pitch
 * and formant emphasis. Letters trigger short pitched blips that
 * sound like speech without being intelligible.
 *
 * Spaces and punctuation create natural pauses (no sound).
 * Routes audio through AudioSystem's voice channel.
 */

import { AudioSystem } from './AudioSystem';

/** Per-character voice profile */
interface VoiceProfile {
  basePitch: number;   // Hz — fundamental frequency
  pitchRange: number;  // Hz — variation range
  type: OscillatorType;
  speed: number;       // multiplier for blip duration
  volume: number;
}

/** Voice profiles for each speaker */
const VOICES: Record<string, VoiceProfile> = {
  'Jean-Pierre': {
    basePitch: 140,     // Deep, authoritative (bumped from 130 for audibility)
    pitchRange: 40,
    type: 'triangle',
    speed: 1.0,
    volume: 0.22,
  },
  'Thierry': {
    basePitch: 165,     // Mid-range, gruff
    pitchRange: 35,
    type: 'triangle',
    speed: 0.9,
    volume: 0.20,
  },
  'Émilie': {
    basePitch: 240,     // Higher, bright
    pitchRange: 50,
    type: 'sine',
    speed: 1.1,
    volume: 0.18,
  },
  'Marie': {
    basePitch: 210,     // Warm, medium-high
    pitchRange: 45,
    type: 'sine',
    speed: 1.0,
    volume: 0.18,
  },
};

const DEFAULT_VOICE: VoiceProfile = {
  basePitch: 160,
  pitchRange: 40,
  type: 'triangle',
  speed: 1.0,
  volume: 0.07,
};

// Map vowels/consonants to pitch offsets for variety
const LETTER_OFFSETS: Record<string, number> = {
  a: 0, e: 0.15, i: 0.4, o: -0.1, u: -0.2, y: 0.3,
  é: 0.2, è: 0.1, ê: 0.15, à: 0.05, ù: -0.15, î: 0.45,
  b: -0.3, c: 0.1, d: -0.25, f: 0.3, g: -0.2, h: 0,
  j: 0.05, k: 0.15, l: 0.1, m: -0.15, n: -0.1, p: 0.2,
  q: -0.2, r: -0.35, s: 0.35, t: 0.25, v: -0.1, w: -0.05,
  x: 0.2, z: 0.3,
};

/** Silent characters — no blip on these */
const SILENT = new Set([' ', '.', ',', '!', '?', ':', ';', '"', '\u00AB', '\u00BB', '\n', '\u2014', '-', '\u2026', "'", '\u2019']);

/**
 * Play a single voice blip for a character being revealed.
 * Call this from the typewriter callback on each character.
 */
export function playVoiceBlip(speaker: string, char: string): void {
  if (SILENT.has(char)) return;

  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const wasSuspended = ctx.state !== 'running';
  if (wasSuspended) ctx.resume();

  const voiceNode = audio.getChannelNode('voice');
  if (!voiceNode) return;

  const voice = VOICES[speaker] || DEFAULT_VOICE;
  const lower = char.toLowerCase();
  const offset = LETTER_OFFSETS[lower] ?? 0;

  // Compute pitch: base + letter offset scaled by range + small random jitter
  const pitch = voice.basePitch + offset * voice.pitchRange + (Math.random() - 0.5) * 10;
  const duration = 0.055 * voice.speed;

  // When resuming from suspended, currentTime is frozen — schedule slightly
  // ahead so the blip plays once the context is actually running.
  const now = ctx.currentTime + (wasSuspended ? 0.05 : 0);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = voice.type;
  osc.frequency.setValueAtTime(pitch, now);
  // Slight pitch slide for organic feel
  osc.frequency.linearRampToValueAtTime(pitch * 0.95, now + duration);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(voice.volume, now + 0.005);
  gain.gain.setValueAtTime(voice.volume, now + duration * 0.6);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain);
  gain.connect(voiceNode);
  osc.start(now);
  osc.stop(now + duration);
}
