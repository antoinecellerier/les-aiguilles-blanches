/**
 * Procedural ski/snowboard descent sound effects via Web Audio API.
 *
 * Continuous sounds:
 * - Wind rush (speed-dependent bandpass noise)
 * - Snow carving (periodic swish bursts, terrain-aware)
 * - Brake scrape (filtered noise when braking)
 *
 * One-shot sounds:
 * - Obstacle bump (impact thud)
 * - Cliff wipeout (crash impact)
 * - Trick launch (upward whoosh)
 * - Trick land (landing thud + boost swoosh)
 * - Rail grind (sustained metallic scrape)
 *
 * Created and destroyed with each SkiRunScene lifecycle.
 * Routes all audio through AudioSystem's SFX channel.
 */

import { AudioSystem } from './AudioSystem';
import { BALANCE } from '../config/gameConfig';

const MAX_SPEED = BALANCE.SKI_MAX_SPEED;

export class SkiRunSounds {
  private ctx: AudioContext | null = null;
  private sfxNode: GainNode | null = null;

  /** Create a white noise AudioBuffer with an optional amplitude envelope. */
  private noiseBuffer(seconds: number, envelope: 'flat' | 'decay' | 'rise' | 'sqrt-decay' = 'flat'): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx!.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      let amp = 1;
      const t = i / len;
      if (envelope === 'decay') amp = 1 - t;
      else if (envelope === 'rise') amp = t;
      else if (envelope === 'sqrt-decay') amp = Math.pow(1 - t, 0.5);
      data[i] = (Math.random() * 2 - 1) * amp;
    }
    return buf;
  }

  // Wind nodes
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // Brake nodes
  private brakeSource: AudioBufferSourceNode | null = null;
  private brakeFilter: BiquadFilterNode | null = null;
  private brakeGain: GainNode | null = null;

  // Snow carve state
  private carveTimer = 0;
  private moving = false;

  // Lifecycle
  private started = false;
  private destroyed = false;
  private braking = false;

  /** Start continuous sounds. Call from SkiRunScene.create(). */
  start(): void {
    this.stop();
    this.destroyed = false;

    const audio = AudioSystem.getInstance();
    if (!audio.isReady()) {
      audio.onReady(() => {
        if (!this.started && !this.destroyed) {
          this.ctx = audio.getContext();
          this.sfxNode = audio.getChannelNode('sfx');
          this.started = true;
          this.startWind();
        }
      });
      return;
    }

    this.ctx = audio.getContext();
    this.sfxNode = audio.getChannelNode('sfx');
    this.started = true;
    this.startWind();
  }

  /** Stop all sounds and release nodes. Call from SkiRunScene.shutdown(). */
  stop(): void {
    this.started = false;
    this.destroyed = true;
    this.stopWind();
    this.stopBrake();
    this.ctx = null;
    this.sfxNode = null;
  }

  /** Mute continuous sounds when game is paused. */
  pause(): void {
    if (!this.ctx) return;
    this.windGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.brakeGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  /** Restore continuous sounds when game resumes. */
  resume(): void {
    if (!this.ctx) return;
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(BALANCE.SKI_WIND_MIN_VOLUME, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Update per frame from SkiRunScene.update().
   * @param speed Current velocity magnitude (px/s)
   * @param braking Whether the player is braking
   * @param onGroomed Whether on groomed snow
   * @param delta Frame delta in ms
   */
  update(speed: number, braking: boolean, onGroomed: boolean, delta: number): void {
    if (!this.started || !this.ctx || !this.sfxNode) return;

    const t = Math.min(1, speed / MAX_SPEED);

    this.updateWind(t);
    this.updateCarve(t, onGroomed, delta);
    this.updateBrake(braking, t);
  }

  // --- Wind rush ---

  private startWind(): void {
    if (!this.ctx || !this.sfxNode) return;

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.noiseBuffer(2);
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(BALANCE.SKI_WIND_MIN_FREQ, this.ctx.currentTime);
    this.windFilter.Q.value = 0.5;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(BALANCE.SKI_WIND_MIN_VOLUME, this.ctx.currentTime);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxNode);
    this.windSource.start();
  }

  private stopWind(): void {
    this.windSource?.stop();
    this.windSource = null;
    this.windFilter?.disconnect();
    this.windFilter = null;
    this.windGain?.disconnect();
    this.windGain = null;
  }

  private updateWind(t: number): void {
    if (!this.ctx || !this.windFilter || !this.windGain) return;

    const freq = BALANCE.SKI_WIND_MIN_FREQ + t * (BALANCE.SKI_WIND_MAX_FREQ - BALANCE.SKI_WIND_MIN_FREQ);
    const vol = BALANCE.SKI_WIND_MIN_VOLUME + t * (BALANCE.SKI_WIND_MAX_VOLUME - BALANCE.SKI_WIND_MIN_VOLUME);

    this.windFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.windGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  // --- Snow carving ---

  private updateCarve(t: number, onGroomed: boolean, delta: number): void {
    if (!this.ctx || !this.sfxNode) return;

    const wasMoving = this.moving;
    this.moving = t > 0.01;

    if (!this.moving) {
      this.carveTimer = 0;
      return;
    }
    if (!wasMoving) this.carveTimer = 0;

    this.carveTimer -= delta;
    if (this.carveTimer <= 0) {
      this.playCarve(t, onGroomed);
      const baseInterval = BALANCE.SKI_CARVE_INTERVAL_MAX - t * (BALANCE.SKI_CARVE_INTERVAL_MAX - BALANCE.SKI_CARVE_INTERVAL_MIN);
      const interval = onGroomed ? baseInterval * 1.3 : baseInterval;
      this.carveTimer = interval * (0.7 + Math.random() * 0.6);
    }
  }

  private playCarve(t: number, onGroomed: boolean): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    if (onGroomed) {
      // Groomed: clean edge carve — higher-pitched sine swish
      const volume = BALANCE.SKI_CARVE_VOLUME * 0.5 * (0.3 + t * 0.7);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 + Math.random() * 200, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(now);
      osc.stop(now + 0.04);
    } else {
      // Ungroomed: rough powder crunch — noise burst
      const volume = BALANCE.SKI_CARVE_VOLUME * (0.4 + t * 0.6);
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer(0.05, 'decay');
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800 + Math.random() * 1500;
      filter.Q.value = 0.6;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxNode);
      source.start(now);
      source.stop(now + 0.05);
    }
  }

  // --- Brake scrape ---

  private updateBrake(isBraking: boolean, t: number): void {
    if (isBraking && !this.braking) {
      this.startBrake(t);
    } else if (!isBraking && this.braking) {
      this.stopBrake();
    } else if (isBraking && this.braking && this.ctx && this.brakeGain) {
      // Modulate volume with speed
      const vol = BALANCE.SKI_BRAKE_VOLUME * t;
      this.brakeGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  private startBrake(t: number): void {
    if (!this.ctx || !this.sfxNode) return;
    this.braking = true;

    this.brakeSource = this.ctx.createBufferSource();
    this.brakeSource.buffer = this.noiseBuffer(1);
    this.brakeSource.loop = true;

    this.brakeFilter = this.ctx.createBiquadFilter();
    this.brakeFilter.type = 'bandpass';
    this.brakeFilter.frequency.value = BALANCE.SKI_BRAKE_FREQ;
    this.brakeFilter.Q.value = 1.2;

    this.brakeGain = this.ctx.createGain();
    this.brakeGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.brakeGain.gain.linearRampToValueAtTime(BALANCE.SKI_BRAKE_VOLUME * t, this.ctx.currentTime + 0.08);

    this.brakeSource.connect(this.brakeFilter);
    this.brakeFilter.connect(this.brakeGain);
    this.brakeGain.connect(this.sfxNode);
    this.brakeSource.start();
  }

  private stopBrake(): void {
    this.braking = false;
    const src = this.brakeSource;
    const filter = this.brakeFilter;
    const gain = this.brakeGain;
    this.brakeSource = null;
    this.brakeFilter = null;
    this.brakeGain = null;
    if (this.ctx && gain) {
      gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    }
    // Delayed cleanup to allow fade-out
    setTimeout(() => {
      try { src?.stop(); } catch { /* already stopped */ }
      filter?.disconnect();
      gain?.disconnect();
    }, 100);
  }

  // --- One-shot sounds ---

  /** Impact thud for hitting obstacles. */
  playBump(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Low impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    gain.gain.setValueAtTime(BALANCE.SKI_BUMP_SFX_VOLUME, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.1);

    // Snow spray noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(0.08, 'decay');
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(BALANCE.SKI_BUMP_SFX_VOLUME * 0.6, now);
    nGain.gain.linearRampToValueAtTime(0, now + 0.08);
    noise.connect(nGain);
    nGain.connect(this.sfxNode);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  /** Crash impact for cliff wipeout — heavy thud + silence. */
  playWipeout(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Heavy low impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
    gain.gain.setValueAtTime(BALANCE.SKI_BUMP_SFX_VOLUME * 1.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.25);

    // Snow explosion noise burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(0.15, 'sqrt-decay');
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(BALANCE.SKI_BUMP_SFX_VOLUME, now);
    nGain.gain.linearRampToValueAtTime(0, now + 0.15);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxNode);
    noise.start(now);
    noise.stop(now + 0.15);
  }

  /** Upward whoosh for trick launch (kicker/halfpipe). */
  playTrickLaunch(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Rising filtered noise — lift-off whoosh
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer(0.3, 'rise');

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.25);
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(BALANCE.SKI_TRICK_VOLUME, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxNode);
    source.start(now);
    source.stop(now + 0.3);
  }

  /** Landing impact + speed boost swoosh for trick completion. */
  playTrickLand(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Landing thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    gain.gain.setValueAtTime(BALANCE.SKI_TRICK_VOLUME, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.08);

    // Speed boost swoosh — descending noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(0.15, 'decay');
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(1500, now);
    nFilter.frequency.exponentialRampToValueAtTime(500, now + 0.15);
    nFilter.Q.value = 0.6;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(BALANCE.SKI_TRICK_VOLUME * 0.7, now);
    nGain.gain.linearRampToValueAtTime(0, now + 0.15);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxNode);
    noise.start(now);
    noise.stop(now + 0.15);
  }

  /** Sustained metallic scrape for rail grinds (~480ms). */
  playRailGrind(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;
    const dur = 0.48;

    // Metallic scrape: filtered noise with high-frequency emphasis
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer(dur);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = BALANCE.SKI_GRIND_FREQ;
    filter.Q.value = 2.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(BALANCE.SKI_GRIND_VOLUME, now + 0.05);
    gain.gain.setValueAtTime(BALANCE.SKI_GRIND_VOLUME, now + dur - 0.08);
    gain.gain.linearRampToValueAtTime(0, now + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxNode);
    source.start(now);
    source.stop(now + dur);

    // Metallic ring overtone
    const ring = this.ctx.createOscillator();
    const rGain = this.ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(BALANCE.SKI_GRIND_FREQ * 1.5, now);
    // Slight pitch variation during grind
    ring.frequency.linearRampToValueAtTime(BALANCE.SKI_GRIND_FREQ * 1.3, now + dur);
    rGain.gain.setValueAtTime(0, now);
    rGain.gain.linearRampToValueAtTime(BALANCE.SKI_GRIND_VOLUME * 0.3, now + 0.05);
    rGain.gain.linearRampToValueAtTime(0, now + dur);
    ring.connect(rGain);
    rGain.connect(this.sfxNode);
    ring.start(now);
    ring.stop(now + dur);
  }

  /** Avalanche warning rumble — level 1: menacing low drone. */
  playAvalancheWarning1(): void {
    if (!this.ctx || !this.sfxNode) return;
    const now = this.ctx.currentTime;
    for (const freq of [55, 58]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 1.2);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(now);
      osc.stop(now + 1.2);
    }
    const bufLen = Math.floor(this.ctx.sampleRate * 1.2);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    filter.Q.value = 1;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0, now);
    nGain.gain.linearRampToValueAtTime(0.10, now + 0.15);
    nGain.gain.linearRampToValueAtTime(0, now + 1.2);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxNode);
    noise.start(now);
    noise.stop(now + 1.2);
  }

  /** Avalanche warning rumble — level 2: the mountain is angry. */
  playAvalancheWarning2(): void {
    if (!this.ctx || !this.sfxNode) return;
    const now = this.ctx.currentTime;
    for (const freq of [48, 55, 63, 75]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.6);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(now);
      osc.stop(now + 1.6);
    }
    const pulse = this.ctx.createOscillator();
    const pulseGain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    pulse.type = 'sine';
    pulse.frequency.value = 60;
    lfo.frequency.value = 4;
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(pulseGain.gain);
    pulseGain.gain.setValueAtTime(0.12, now);
    pulseGain.gain.linearRampToValueAtTime(0, now + 1.6);
    pulse.connect(pulseGain);
    pulseGain.connect(this.sfxNode);
    pulse.start(now);
    pulse.stop(now + 1.6);
    lfo.start(now);
    lfo.stop(now + 1.6);
    const bufLen = Math.floor(this.ctx.sampleRate * 1.6);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 0.8;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0, now);
    nGain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    nGain.gain.linearRampToValueAtTime(0, now + 1.6);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxNode);
    noise.start(now);
    noise.stop(now + 1.6);
  }

  /** Short chime for passing through a slalom gate. */
  playGatePass(): void {
    if (!this.ctx || !this.sfxNode) return;
    const now = this.ctx.currentTime;

    // Bright two-note ascending chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1175, now + 0.06);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Soft buzz for missing a slalom gate. */
  playGateMiss(): void {
    if (!this.ctx || !this.sfxNode) return;
    const now = this.ctx.currentTime;

    // Low dissonant buzz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.10, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Massive avalanche trigger — building roar with crumbling texture. */
  playAvalancheTrigger(): void {
    if (!this.ctx || !this.sfxNode) return;
    const now = this.ctx.currentTime;
    const freqs = [45, 55, 65, 80, 100];
    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const entry = i * 0.12;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + entry + 0.4);
      gain.gain.setValueAtTime(0.12, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 2.0);
      osc.connect(gain);
      gain.connect(this.sfxNode!);
      osc.start(now + entry);
      osc.stop(now + 2.0);
    });
    const bufLen = Math.floor(this.ctx.sampleRate * 2.0);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const env = Math.sin(Math.PI * i / bufLen);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(100, now + 2.0);
    filter.Q.value = 0.8;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0, now);
    nGain.gain.linearRampToValueAtTime(0.12, now + 0.4);
    nGain.gain.linearRampToValueAtTime(0, now + 2.0);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxNode);
    noise.start(now);
    noise.stop(now + 2.0);
  }
}
