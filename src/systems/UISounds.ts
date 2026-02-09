/**
 * Procedural UI sound effects via Web Audio API.
 *
 * All sounds are generated from oscillators and noise — no external audio files.
 * Designed for SkiFree-inspired retro feel: short, clear, 8-bit-flavored.
 * Navigation sounds vary slightly in pitch (Switch home screen style).
 */

import { AudioSystem, type VolumeChannel } from './AudioSystem';

/** Small random pitch variation for organic feel (±5%) */
function vary(base: number): number {
  return base * (0.95 + Math.random() * 0.1);
}

/** Play a short click sound for button activation / confirm. */
export function playClick(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  // Soft triangle blip: ~660Hz → ~550Hz over 50ms
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(vary(660), ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(vary(550), ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(sfx);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

/** Play a soft hover/select tick for button navigation. Pitch varies slightly. */
export function playHover(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  // Very short sine tick with slight pitch variation
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(vary(900), ctx.currentTime);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.02);

  osc.connect(gain);
  gain.connect(sfx);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.02);
}

/** Play a cancel / back sound. */
export function playCancel(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  // Gentle descending sine: ~500Hz → ~300Hz over 60ms
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06);

  osc.connect(gain);
  gain.connect(sfx);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
}

/** Play a toggle on/off sound. */
export function playToggle(on: boolean): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  // Gentle rising pitch for on, falling for off
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  if (on) {
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.05);
  } else {
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.05);
  }
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(sfx);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

/** Play a short preview blip through a specific channel for volume feedback. */
export function playPreview(channel: VolumeChannel): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const target = audio.getChannelNode(channel);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(vary(700), ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(target);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
}

/** Play a pitch-mapped blip for sensitivity slider (low→low pitch, high→high pitch). */
export function playSensitivityBlip(t: number): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  // Map 0–1 to 200–1200Hz for a fun theremin-like sweep
  const freq = 200 + t * 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(sfx);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

/** Play a two-note chime for input device connected (rising) or disconnected (falling). */
export function playDeviceChime(connected: boolean): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  const [f1, f2] = connected ? [500, 750] : [750, 500];

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(f1, ctx.currentTime);
  gain1.gain.setValueAtTime(0.1, ctx.currentTime);
  gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
  osc1.connect(gain1);
  gain1.connect(sfx);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.08);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(f2, ctx.currentTime + 0.09);
  gain2.gain.setValueAtTime(0, ctx.currentTime);
  gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.09);
  gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
  osc2.connect(gain2);
  gain2.connect(sfx);
  osc2.start(ctx.currentTime + 0.09);
  osc2.stop(ctx.currentTime + 0.18);
}
