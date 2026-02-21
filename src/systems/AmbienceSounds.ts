/**
 * Procedural ambient soundscapes via Web Audio API.
 *
 * - Storm weather: low wind noise + howling gusts
 * - Night levels: occasional owl hoots and distant wolf howls
 *
 * Routes through AudioSystem's ambience channel.
 * Created/destroyed with each GameScene lifecycle.
 */

import { AudioSystem } from './AudioSystem';
import { BALANCE } from '../config/gameConfig';

// --- Storm tuning ---
const STORM_WIND_VOLUME = BALANCE.AMBIENCE_STORM_WIND;
const STORM_GUST_VOLUME = BALANCE.AMBIENCE_STORM_GUST;

// --- Night wildlife tuning ---
const NIGHT_CALL_MIN_INTERVAL = 8000;   // ms minimum between calls
const NIGHT_CALL_MAX_INTERVAL = 20000;  // ms maximum between calls
const NIGHT_CALL_VOLUME = BALANCE.AMBIENCE_NIGHT_CALL;

// --- Noise buffer ---
const NOISE_DURATION = 2;            // seconds of noise to generate

export class AmbienceSounds {
  private ctx: AudioContext | null = null;
  private ambienceNode: GainNode | null = null;

  // Wind nodes
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // Storm gust nodes
  private gustOsc: OscillatorNode | null = null;
  private gustLfo: OscillatorNode | null = null;
  private gustGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private started = false;
  private isStorm = false;
  private isNight = false;
  private nightCallTimer = 0;

  /**
   * Start ambient sounds for the current level.
   * Storm: continuous wind + gusts. Night: occasional wildlife calls.
   */
  start(weather: string, isNight: boolean): void {
    this.stop();

    this.isStorm = weather === 'storm';
    this.isNight = isNight;

    if (!this.isStorm && !this.isNight) return;

    const audio = AudioSystem.getInstance();
    if (!audio.isReady()) return;

    this.ctx = audio.getContext();
    this.ambienceNode = audio.getChannelNode('ambience');
    this.started = true;

    if (this.isStorm) {
      this.createNoiseBuffer();
      this.startStorm();
    }

    if (this.isNight) {
      this.scheduleNextCall();
    }
  }

  /** Stop all ambient sounds. */
  stop(): void {
    this.started = false;
    this.stopWind();
    this.stopGust();
    this.nightCallTimer = 0;
    this.noiseBuffer = null;
    this.ctx = null;
    this.ambienceNode = null;
  }

  /** Mute on pause. */
  pause(): void {
    if (!this.ctx) return;
    this.windGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    this.gustGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  /** Scale ambience output for ducking during dialogue (0-1). */
  setDuck(level: number): void {
    if (!this.ctx) return;
    if (this.isStorm) {
      this.windGain?.gain.setTargetAtTime(STORM_WIND_VOLUME * level, this.ctx.currentTime, 0.1);
      this.gustGain?.gain.setTargetAtTime(STORM_GUST_VOLUME * level, this.ctx.currentTime, 0.1);
    }
  }

  /** Restore on resume. */
  resume(_weather: string, _isNight: boolean): void {
    if (!this.ctx) return;
    if (this.isStorm) {
      this.windGain?.gain.setTargetAtTime(STORM_WIND_VOLUME, this.ctx.currentTime, 0.1);
      this.gustGain?.gain.setTargetAtTime(STORM_GUST_VOLUME, this.ctx.currentTime, 0.1);
    }
    if (this.isNight && this.nightCallTimer <= 0) {
      this.scheduleNextCall();
    }
  }

  // --- Internals ---

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * NOISE_DURATION);
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  private startStorm(): void {
    if (!this.ctx || !this.ambienceNode || !this.noiseBuffer) return;

    // Low wind noise: looping bandpass-filtered white noise
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 300;
    this.windFilter.Q.value = 0.3;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.windGain.gain.linearRampToValueAtTime(STORM_WIND_VOLUME, this.ctx.currentTime + 2);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ambienceNode);
    this.windSource.start();

    // Howling gusts: LFO-modulated sine for slow swelling wind
    this.gustGain = this.ctx.createGain();
    this.gustGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gustGain.gain.linearRampToValueAtTime(STORM_GUST_VOLUME, this.ctx.currentTime + 3);
    this.gustGain.connect(this.ambienceNode);

    this.gustOsc = this.ctx.createOscillator();
    this.gustOsc.type = 'sine';
    this.gustOsc.frequency.value = 140;

    this.gustLfo = this.ctx.createOscillator();
    this.gustLfo.frequency.value = 0.12; // Very slow swells (~8s cycle)
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 25;
    this.gustLfo.connect(lfoGain);
    lfoGain.connect(this.gustOsc.frequency);

    this.gustOsc.connect(this.gustGain);
    this.gustOsc.start();
    this.gustLfo.start();
  }

  private stopWind(): void {
    try { this.windSource?.stop(); } catch { /* already stopped */ }
    this.windSource = null;
    this.windFilter = null;
    this.windGain?.disconnect();
    this.windGain = null;
  }

  private stopGust(): void {
    try { this.gustOsc?.stop(); } catch { /* already stopped */ }
    try { this.gustLfo?.stop(); } catch { /* already stopped */ }
    this.gustOsc = null;
    this.gustLfo = null;
    this.gustGain?.disconnect();
    this.gustGain = null;
  }

  // --- Night wildlife ---

  private scheduleNextCall(): void {
    this.nightCallTimer = NIGHT_CALL_MIN_INTERVAL +
      Math.random() * (NIGHT_CALL_MAX_INTERVAL - NIGHT_CALL_MIN_INTERVAL);
  }

  /**
   * Call from GameScene.update() to tick night wildlife timers.
   * @param delta Frame delta in ms
   */
  update(delta: number): void {
    if (!this.isNight || !this.started) return;

    this.nightCallTimer -= delta;
    if (this.nightCallTimer <= 0) {
      if (Math.random() < 0.4) {
        this.playWolfHowl();
      } else {
        this.playOwlHoot();
      }
      this.scheduleNextCall();
    }
  }

  /** Two-tone owl hoot: low "hoo" then slightly higher "hoo". */
  private playOwlHoot(): void {
    if (!this.ctx || !this.ambienceNode) return;

    const now = this.ctx.currentTime;

    // First "hoo"
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(280, now);
    osc1.frequency.linearRampToValueAtTime(260, now + 0.3);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(NIGHT_CALL_VOLUME, now + 0.05);
    gain1.gain.setValueAtTime(NIGHT_CALL_VOLUME, now + 0.2);
    gain1.gain.linearRampToValueAtTime(0, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(this.ambienceNode);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second "hoo" — slightly higher, after a short pause
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(320, now + 0.5);
    osc2.frequency.linearRampToValueAtTime(290, now + 0.85);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(NIGHT_CALL_VOLUME * 0.8, now + 0.5);
    gain2.gain.setValueAtTime(NIGHT_CALL_VOLUME * 0.8, now + 0.7);
    gain2.gain.linearRampToValueAtTime(0, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(this.ambienceNode);
    osc2.start(now + 0.5);
    osc2.stop(now + 0.9);
  }

  /** Distant wolf howl: rising then slowly falling pitch. */
  private playWolfHowl(): void {
    if (!this.ctx || !this.ambienceNode) return;

    const now = this.ctx.currentTime;
    // Vary the base pitch slightly each time
    const base = 180 + Math.random() * 40;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    // Rise up
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base * 1.8, now + 0.4);
    // Hold and waver
    osc.frequency.linearRampToValueAtTime(base * 1.7, now + 1.0);
    // Fall off
    osc.frequency.linearRampToValueAtTime(base * 1.2, now + 1.6);
    osc.frequency.linearRampToValueAtTime(base * 0.9, now + 2.0);

    // Envelope: fade in, sustain, long fade out
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(NIGHT_CALL_VOLUME * 0.7, now + 0.3);
    gain.gain.setValueAtTime(NIGHT_CALL_VOLUME * 0.7, now + 1.0);
    gain.gain.linearRampToValueAtTime(0, now + 2.0);

    // Slight vibrato for realism
    const vibrato = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vibrato.frequency.value = 5; // 5Hz wobble
    vibGain.gain.value = 8; // ±8Hz
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(this.ambienceNode);
    osc.start(now);
    osc.stop(now + 2.0);
    vibrato.start(now);
    vibrato.stop(now + 2.0);
  }
}
