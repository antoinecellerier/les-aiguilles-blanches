/**
 * Procedural wildlife sound effects via Web Audio API.
 *
 * Stateless exported functions — usable from both GameScene and MenuScene.
 * Each animal has a characteristic flee/alarm sound.
 * Routes audio through AudioSystem's SFX channel.
 */

import { AudioSystem } from './AudioSystem';
import { BALANCE } from '../config/gameConfig';
import type { AnimalType } from '../utils/animalSprites';

const WV = () => BALANCE.WILDLIFE_CALL_VOLUME; // Base wildlife call volume

/** Play the appropriate sound for a given animal type. */
export function playAnimalCall(type: AnimalType): void {
  switch (type) {
    case 'marmot': playMarmotCall(); break;
    case 'chamois': playChamoisCall(); break;
    case 'bird': playBirdCall(); break;
    case 'bunny': playBunnyCall(); break;
    case 'bouquetin': playBouquetinCall(); break;
    case 'fox': playFoxCall(); break;
  }
}

/** Marmot alarm whistle — sharp high-pitched chirp. */
export function playMarmotCall(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2200, now);
  osc.frequency.linearRampToValueAtTime(1800, now + 0.15);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(WV(), now + 0.02);
  gain.gain.setValueAtTime(WV(), now + 0.10);
  gain.gain.linearRampToValueAtTime(0, now + 0.15);
  osc.connect(gain);
  gain.connect(sfx);
  osc.start(now);
  osc.stop(now + 0.15);
}

/** Chamois snort — breathy alarm bark. */
export function playChamoisCall(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  const now = ctx.currentTime;
  // Two-part snort: nasal tone + breathy burst
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.linearRampToValueAtTime(350, now + 0.12);
  oscGain.gain.setValueAtTime(0, now);
  oscGain.gain.linearRampToValueAtTime(WV() * 0.75, now + 0.02);
  oscGain.gain.setValueAtTime(WV() * 0.75, now + 0.08);
  oscGain.gain.linearRampToValueAtTime(0, now + 0.15);
  osc.connect(oscGain);
  oscGain.connect(sfx);
  osc.start(now);
  osc.stop(now + 0.15);

  // Breathy noise layer
  const bufLen = Math.floor(ctx.sampleRate * 0.2);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 900;
  filter.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(WV() * 1.25, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.2);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfx);
  noise.start(now);
  noise.stop(now + 0.2);
}

/** Bird flutter — rapid short chirps as bird takes off. */
export function playBirdCall(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const freq = 3000 + Math.random() * 1000;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.linearRampToValueAtTime(freq * 0.8, t + 0.04);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(WV() * 0.75, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + 0.04);
    osc.connect(gain);
    gain.connect(sfx);
    osc.start(t);
    osc.stop(t + 0.04);
  }
  // Wing flutter
  const bufLen = Math.floor(ctx.sampleRate * 0.2);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(WV() * 0.5, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.2);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfx);
  noise.start(now);
  noise.stop(now + 0.2);
}

/** Bunny thump — double hop thud as it bolts. */
export function playBunnyCall(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  const now = ctx.currentTime;
  // Two quick thumps — bounding away
  for (const offset of [0, 0.1]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now + offset);
    osc.frequency.exponentialRampToValueAtTime(45, now + offset + 0.08);
    gain.gain.setValueAtTime(WV() * 1.5, now + offset);
    gain.gain.linearRampToValueAtTime(0, now + offset + 0.08);
    osc.connect(gain);
    gain.connect(sfx);
    osc.start(now + offset);
    osc.stop(now + offset + 0.08);
  }
}

/** Bouquetin hoof clatter — stone-on-stone clicks. */
export function playBouquetinCall(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  const now = ctx.currentTime;
  const clicks = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < clicks; i++) {
    const t = now + i * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 + Math.random() * 400, t);
    gain.gain.setValueAtTime(WV() * 0.875, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.03);
    osc.connect(gain);
    gain.connect(sfx);
    osc.start(t);
    osc.stop(t + 0.03);
  }
}

/** Fox bark — short raspy yelp. */
export function playFoxCall(): void {
  const audio = AudioSystem.getInstance();
  if (!audio.isReady()) return;

  const ctx = audio.getContext();
  const sfx = audio.getChannelNode('sfx');

  const now = ctx.currentTime;
  for (const freq of [350, 370]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 0.6, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(WV() * 0.625, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(gain);
    gain.connect(sfx);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}
