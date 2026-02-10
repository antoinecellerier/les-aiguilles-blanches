/**
 * Procedural engine & movement sound effects via Web Audio API.
 *
 * Manages continuous sounds during gameplay:
 * - Engine idle rumble (low sawtooth drone)
 * - Speed-dependent engine pitch rise
 * - Snow crunch (periodic noise bursts while moving)
 * - Grooming blade buzz (tiller contact feedback)
 * - Winch attach/detach (mechanical clunks)
 * - Winch tension hum (cable stress when taut)
 * - Tumble impact
 * - Cliff fall whoosh
 *
 * Created and destroyed with each GameScene lifecycle.
 * Routes all audio through AudioSystem's SFX channel.
 */

import { AudioSystem } from './AudioSystem';
import { GAME_CONFIG, BALANCE } from '../config/gameConfig';

/** Maximum groomer speed (with speed buff) in px/s */
const MAX_SPEED = GAME_CONFIG.GROOMER_SPEED * BALANCE.SPEED_BUFF_MULTIPLIER;

// --- Engine tuning ---
const ENGINE_IDLE_FREQ = 32;         // Hz — deep diesel idle
const ENGINE_MAX_FREQ = 70;          // Hz — higher pitch at full speed
const ENGINE_IDLE_VOLUME = 0.02;     // Very subtle background
const ENGINE_MAX_VOLUME = 0.05;      // Louder when moving
const ENGINE_OVERTONE_RATIO = 2.01;  // Slight detune for richness

// --- Snow crunch tuning ---
const CRUNCH_INTERVAL_MIN = 80;      // ms between crunch bursts at max speed
const CRUNCH_INTERVAL_MAX = 250;     // ms at slow crawl
const CRUNCH_DURATION = 0.04;        // seconds
const CRUNCH_VOLUME = 0.06;

// --- Grooming tuning ---
const GROOM_FREQ = 120;              // Hz — mechanical buzz
const GROOM_VOLUME = 0.05;
const GROOM_LFO_FREQ = 8;            // Modulation speed — rattling blade

// --- Winch tuning ---
const WINCH_TENSION_FREQ = 200;      // Hz base — cable hum
const WINCH_TENSION_VOLUME = 0.03;

export class EngineSounds {
  private ctx: AudioContext | null = null;
  private sfxNode: GainNode | null = null;
  private duckLevel = 1; // 0-1 multiplier for dialogue ducking

  // Engine nodes
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  // Grooming nodes
  private groomOsc: OscillatorNode | null = null;
  private groomLfo: OscillatorNode | null = null;
  private groomGain: GainNode | null = null;
  private groomLfoGain: GainNode | null = null;

  // Winch tension nodes
  private winchOsc: OscillatorNode | null = null;
  private winchGain: GainNode | null = null;

  // Snow crunch state
  private crunchTimer = 0;
  private moving = false;

  // State tracking for transitions
  private grooming = false;
  private winchTaut = false;
  private started = false;
  private destroyed = false;

  /** Start continuous engine sounds. Call once when GameScene.create() runs. */
  start(): void {
    // Stop any existing sounds from a previous level
    this.stop();
    this.destroyed = false;

    const audio = AudioSystem.getInstance();
    if (!audio.isReady()) {
      // Defer until first user gesture
      audio.onReady(() => {
        if (!this.started && !this.destroyed) {
          this.ctx = audio.getContext();
          this.sfxNode = audio.getChannelNode('sfx');
          this.started = true;
          this.startEngine();
        }
      });
      return;
    }

    this.ctx = audio.getContext();
    this.sfxNode = audio.getChannelNode('sfx');
    this.started = true;

    this.startEngine();
  }

  /** Stop all sounds and release nodes. Call from GameScene.shutdown(). */
  stop(): void {
    this.started = false;
    this.destroyed = true;
    this.stopEngine();
    this.stopGrooming();
    this.stopWinchTension();
    this.ctx = null;
    this.sfxNode = null;
  }

  /** Scale all engine output for ducking (0-1). */
  setDuck(level: number): void {
    this.duckLevel = level;
  }

  /** Mute continuous sounds when game is paused. */
  pause(): void {
    if (!this.ctx) return;
    this.engineGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.groomGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.winchGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  /** Restore continuous sounds when game resumes. */
  resume(): void {
    if (!this.ctx) return;
    // Engine volume will be set by next update() call
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(ENGINE_IDLE_VOLUME, this.ctx.currentTime, 0.05);
    }
    // Grooming and winch will re-trigger naturally via update()
  }

  /**
   * Update per frame from GameScene.update().
   * @param speed Current velocity magnitude (px/s)
   * @param isGrooming Whether the tiller is active
   * @param winchTaut Whether the winch cable is under tension
   * @param onGroomed Whether groomer is on already-groomed snow
   * @param delta Frame delta in ms
   */
  update(speed: number, isGrooming: boolean, winchTaut: boolean, onGroomed: boolean, delta: number): void {
    if (!this.started || !this.ctx || !this.sfxNode) return;

    const t = Math.min(1, speed / MAX_SPEED);

    this.updateEngine(t);
    this.updateCrunch(t, onGroomed, delta);
    this.updateGrooming(isGrooming);
    this.updateWinchTension(winchTaut);
  }

  // --- Engine ---

  private startEngine(): void {
    if (!this.ctx || !this.sfxNode) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(ENGINE_IDLE_VOLUME, this.ctx.currentTime);
    this.engineGain.connect(this.sfxNode);

    // Primary: low sawtooth
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(ENGINE_IDLE_FREQ, this.ctx.currentTime);
    this.engineOsc.connect(this.engineGain);
    this.engineOsc.start();

    // Overtone: slightly detuned for diesel richness
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.setValueAtTime(ENGINE_IDLE_FREQ * ENGINE_OVERTONE_RATIO, this.ctx.currentTime);
    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.value = 0.3;
    this.engineOsc2.connect(overtoneGain);
    overtoneGain.connect(this.engineGain);
    this.engineOsc2.start();
  }

  private stopEngine(): void {
    this.engineOsc?.stop();
    this.engineOsc = null;
    this.engineOsc2?.stop();
    this.engineOsc2 = null;
    this.engineGain?.disconnect();
    this.engineGain = null;
  }

  private updateEngine(t: number): void {
    if (!this.ctx || !this.engineOsc || !this.engineOsc2 || !this.engineGain) return;

    const freq = ENGINE_IDLE_FREQ + t * (ENGINE_MAX_FREQ - ENGINE_IDLE_FREQ);
    const vol = ENGINE_IDLE_VOLUME + t * (ENGINE_MAX_VOLUME - ENGINE_IDLE_VOLUME);

    // Smooth transitions (avoid clicks)
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(freq * ENGINE_OVERTONE_RATIO, this.ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(vol * this.duckLevel, this.ctx.currentTime, 0.05);
  }

  // --- Snow crunch ---

  private updateCrunch(t: number, onGroomed: boolean, delta: number): void {
    if (!this.ctx || !this.sfxNode) return;

    const wasMoving = this.moving;
    this.moving = t > 0.01;

    if (!this.moving) {
      this.crunchTimer = 0;
      return;
    }

    // Reset timer when starting to move
    if (!wasMoving) this.crunchTimer = 0;

    this.crunchTimer -= delta;
    if (this.crunchTimer <= 0) {
      this.playCrunch(t, onGroomed);
      // Faster crunches at higher speed; groomed snow has longer intervals (smoother ride)
      const baseInterval = CRUNCH_INTERVAL_MAX - t * (CRUNCH_INTERVAL_MAX - CRUNCH_INTERVAL_MIN);
      const interval = onGroomed ? baseInterval * 1.5 : baseInterval;
      // Add some randomness
      this.crunchTimer = interval * (0.7 + Math.random() * 0.6);
    }
  }

  private playCrunch(t: number, onGroomed: boolean): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    if (onGroomed) {
      // Groomed snow: soft low-frequency thump — packed surface, smooth ride
      const volume = CRUNCH_VOLUME * 0.4 * (0.3 + t * 0.7);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80 + Math.random() * 30, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.03);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.03);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(now);
      osc.stop(now + 0.03);
    } else {
      // Ungroomed snow: crunchy noise burst — loose snow compression
      const volume = CRUNCH_VOLUME * (0.4 + t * 0.6);
      const bufferSize = Math.floor(this.ctx.sampleRate * CRUNCH_DURATION);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      // Bandpass filter — snow crunch is mid-high frequency
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000 + Math.random() * 2000;
      filter.Q.value = 0.8;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.linearRampToValueAtTime(0, now + CRUNCH_DURATION);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxNode);
      source.start(now);
      source.stop(now + CRUNCH_DURATION);
    }
  }

  // --- Grooming ---

  private updateGrooming(isGrooming: boolean): void {
    if (isGrooming && !this.grooming) {
      this.startGrooming();
    } else if (!isGrooming && this.grooming) {
      this.stopGrooming();
    }
  }

  private startGrooming(): void {
    if (!this.ctx || !this.sfxNode) return;
    this.grooming = true;

    this.groomGain = this.ctx.createGain();
    // Fade in
    this.groomGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.groomGain.gain.linearRampToValueAtTime(GROOM_VOLUME, this.ctx.currentTime + 0.1);
    this.groomGain.connect(this.sfxNode);

    // Main buzz: triangle wave for softer texture
    this.groomOsc = this.ctx.createOscillator();
    this.groomOsc.type = 'triangle';
    this.groomOsc.frequency.setValueAtTime(GROOM_FREQ, this.ctx.currentTime);

    // LFO for rattling/vibration effect
    this.groomLfoGain = this.ctx.createGain();
    this.groomLfoGain.gain.value = 30; // Modulation depth in Hz
    this.groomLfo = this.ctx.createOscillator();
    this.groomLfo.frequency.value = GROOM_LFO_FREQ;
    this.groomLfo.connect(this.groomLfoGain);
    this.groomLfoGain.connect(this.groomOsc.frequency);

    this.groomOsc.connect(this.groomGain);
    this.groomOsc.start();
    this.groomLfo.start();
  }

  private stopGrooming(): void {
    this.grooming = false;
    if (this.groomGain && this.ctx) {
      // Fade out
      this.groomGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      const g = this.groomGain;
      const o = this.groomOsc;
      const l = this.groomLfo;
      // Stop after fade
      setTimeout(() => {
        o?.stop();
        l?.stop();
        g.disconnect();
      }, 150);
    }
    this.groomOsc = null;
    this.groomLfo = null;
    this.groomGain = null;
    this.groomLfoGain = null;
  }

  // --- Winch tension ---

  private updateWinchTension(taut: boolean): void {
    if (taut && !this.winchTaut) {
      this.startWinchTension();
    } else if (!taut && this.winchTaut) {
      this.stopWinchTension();
    }
  }

  private startWinchTension(): void {
    if (!this.ctx || !this.sfxNode) return;
    this.winchTaut = true;

    this.winchGain = this.ctx.createGain();
    this.winchGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.winchGain.gain.linearRampToValueAtTime(WINCH_TENSION_VOLUME, this.ctx.currentTime + 0.2);
    this.winchGain.connect(this.sfxNode);

    // Thin sine hum for cable tension
    this.winchOsc = this.ctx.createOscillator();
    this.winchOsc.type = 'sine';
    this.winchOsc.frequency.setValueAtTime(WINCH_TENSION_FREQ, this.ctx.currentTime);
    this.winchOsc.connect(this.winchGain);
    this.winchOsc.start();
  }

  private stopWinchTension(): void {
    this.winchTaut = false;
    if (this.winchGain && this.ctx) {
      this.winchGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      const g = this.winchGain;
      const o = this.winchOsc;
      setTimeout(() => {
        o?.stop();
        g.disconnect();
      }, 150);
    }
    this.winchOsc = null;
    this.winchGain = null;
  }

  // --- One-shot sounds ---

  /** Mechanical clunk for winch attach. */
  playWinchAttach(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Low thud + metallic ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.1);

    // Metallic ping
    const ping = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1200, now);
    ping.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    pingGain.gain.setValueAtTime(0.04, now);
    pingGain.gain.linearRampToValueAtTime(0, now + 0.15);
    ping.connect(pingGain);
    pingGain.connect(this.sfxNode);
    ping.start(now);
    ping.stop(now + 0.15);
  }

  /** Softer release clunk for winch detach. */
  playWinchDetach(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** Rolling tumble with multiple staggered impacts over 1.2s. */
  playTumble(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Series of impacts — initial big hit, then smaller bounces with decreasing intensity
    const hits = [
      { time: 0,    freq: 100, vol: 0.15, dur: 0.15 },
      { time: 0.18, freq: 80,  vol: 0.12, dur: 0.12 },
      { time: 0.35, freq: 70,  vol: 0.09, dur: 0.10 },
      { time: 0.52, freq: 60,  vol: 0.07, dur: 0.08 },
      { time: 0.68, freq: 55,  vol: 0.05, dur: 0.07 },
      { time: 0.82, freq: 50,  vol: 0.03, dur: 0.06 },
    ];

    for (const hit of hits) {
      const t = now + hit.time;

      // Impact thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hit.freq, t);
      osc.frequency.exponentialRampToValueAtTime(hit.freq * 0.3, t + hit.dur);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(hit.vol, t);
      gain.gain.linearRampToValueAtTime(0, t + hit.dur);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(t);
      osc.stop(t + hit.dur);

      // Crunch noise per hit
      const bufLen = Math.floor(this.ctx.sampleRate * hit.dur);
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0, now);
      nGain.gain.setValueAtTime(hit.vol * 0.6, t);
      nGain.gain.linearRampToValueAtTime(0, t + hit.dur);
      noise.connect(nGain);
      nGain.connect(this.sfxNode);
      noise.start(t);
    }
  }

  /** Dramatic cliff fall: whoosh → cascading rock impacts → final crash. ~1.3s total. */
  playCliffFall(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // --- Layer 1: Falling whoosh (descending pitch, full duration) ---
    const whoosh = this.ctx.createOscillator();
    const whooshGain = this.ctx.createGain();
    whoosh.type = 'sawtooth';
    whoosh.frequency.setValueAtTime(500, now);
    whoosh.frequency.exponentialRampToValueAtTime(40, now + 1.2);
    whooshGain.gain.setValueAtTime(0.06, now);
    whooshGain.gain.linearRampToValueAtTime(0.1, now + 0.3);
    whooshGain.gain.linearRampToValueAtTime(0, now + 1.2);
    whoosh.connect(whooshGain);
    whooshGain.connect(this.sfxNode);
    whoosh.start(now);
    whoosh.stop(now + 1.2);

    // --- Layer 2: Wind noise (rising then fading) ---
    const windLen = Math.floor(this.ctx.sampleRate * 1.2);
    const windBuf = this.ctx.createBuffer(1, windLen, this.ctx.sampleRate);
    const windData = windBuf.getChannelData(0);
    for (let i = 0; i < windLen; i++) {
      const env = Math.sin(Math.PI * i / windLen);
      windData[i] = (Math.random() * 2 - 1) * env;
    }
    const wind = this.ctx.createBufferSource();
    wind.buffer = windBuf;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(1200, now);
    windFilter.frequency.linearRampToValueAtTime(200, now + 1.2);
    windFilter.Q.value = 0.8;
    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.04, now);
    windGain.gain.linearRampToValueAtTime(0.08, now + 0.4);
    windGain.gain.linearRampToValueAtTime(0, now + 1.2);
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.sfxNode);
    wind.start(now);
    wind.stop(now + 1.2);

    // --- Layer 3: Rock impacts (accelerating cascade) ---
    const rocks = [
      { time: 0.25, freq: 90,  vol: 0.08, dur: 0.08 },
      { time: 0.40, freq: 110, vol: 0.10, dur: 0.07 },
      { time: 0.52, freq: 75,  vol: 0.09, dur: 0.08 },
      { time: 0.62, freq: 130, vol: 0.11, dur: 0.06 },
      { time: 0.70, freq: 95,  vol: 0.10, dur: 0.07 },
      { time: 0.77, freq: 120, vol: 0.12, dur: 0.06 },
      { time: 0.83, freq: 85,  vol: 0.11, dur: 0.06 },
      { time: 0.88, freq: 100, vol: 0.13, dur: 0.05 },
    ];

    for (const rock of rocks) {
      const t = now + rock.time;

      // Sharp impact tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(rock.freq, t);
      osc.frequency.exponentialRampToValueAtTime(rock.freq * 0.2, t + rock.dur);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(rock.vol, t);
      gain.gain.linearRampToValueAtTime(0, t + rock.dur);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(t);
      osc.stop(t + rock.dur);

      // Rock crunch noise per hit
      const nLen = Math.floor(this.ctx.sampleRate * rock.dur);
      const nBuf = this.ctx.createBuffer(1, nLen, this.ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) {
        nData[i] = (Math.random() * 2 - 1) * (1 - i / nLen);
      }
      const nSrc = this.ctx.createBufferSource();
      nSrc.buffer = nBuf;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0, now);
      nGain.gain.setValueAtTime(rock.vol * 0.7, t);
      nGain.gain.linearRampToValueAtTime(0, t + rock.dur);
      nSrc.connect(nGain);
      nGain.connect(this.sfxNode);
      nSrc.start(t);
      nSrc.stop(t + rock.dur);
    }

    // --- Layer 4: Final heavy crash ---
    const crashT = now + 0.95;

    const crash = this.ctx.createOscillator();
    const crashGain = this.ctx.createGain();
    crash.type = 'sine';
    crash.frequency.setValueAtTime(60, crashT);
    crash.frequency.exponentialRampToValueAtTime(20, crashT + 0.25);
    crashGain.gain.setValueAtTime(0, now);
    crashGain.gain.setValueAtTime(0.18, crashT);
    crashGain.gain.linearRampToValueAtTime(0, crashT + 0.25);
    crash.connect(crashGain);
    crashGain.connect(this.sfxNode);
    crash.start(crashT);
    crash.stop(crashT + 0.25);

    // Final crunch burst
    const cLen = Math.floor(this.ctx.sampleRate * 0.2);
    const cBuf = this.ctx.createBuffer(1, cLen, this.ctx.sampleRate);
    const cData = cBuf.getChannelData(0);
    for (let i = 0; i < cLen; i++) {
      cData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cLen, 0.5);
    }
    const cSrc = this.ctx.createBufferSource();
    cSrc.buffer = cBuf;
    const cGain = this.ctx.createGain();
    cGain.gain.setValueAtTime(0, now);
    cGain.gain.setValueAtTime(0.14, crashT);
    cGain.gain.linearRampToValueAtTime(0, crashT + 0.2);
    cSrc.connect(cGain);
    cGain.connect(this.sfxNode);
    cSrc.start(crashT);
  }

  /** Metallic clang for hitting obstacles (rocks, trees, buildings). */
  playObstacleBump(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Sharp metallic impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(250 + Math.random() * 100, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.1);

    // Rattly crunch
    const bufLen = Math.floor(this.ctx.sampleRate * 0.08);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.08, now);
    nGain.gain.linearRampToValueAtTime(0, now + 0.08);
    noise.connect(nGain);
    nGain.connect(this.sfxNode);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  /** Fuel pump gurgle — bubbly low-frequency pulses. */
  playFuelRefill(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Bubbly pulse: LFO-modulated low tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);

    // LFO makes it gurgle
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 12;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.12);
    lfo.start(now);
    lfo.stop(now + 0.12);
  }

  /** Warm welcome chime for Chez Marie — ascending three-note arpeggio. */
  playRestaurant(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;
    // C5 → E5 → G5 (major triad, warm and inviting)
    const notes = [523, 659, 784];

    notes.forEach((freq, i) => {
      const t = now + i * 0.1;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxNode!);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // --- Hazard & warning sounds ---

  /** Deep sub-bass rumble for avalanche warning level 1. Ominous, felt more than heard. */
  playAvalancheWarning1(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Low detuned pair — menacing rumble
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

    // Filtered noise layer for texture
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
  }

  /** Intense low rumble for avalanche warning level 2. The mountain is angry. */
  playAvalancheWarning2(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Layered low drones — deeper, louder, more voices
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

    // Throbbing LFO pulse for menace
    const pulse = this.ctx.createOscillator();
    const pulseGain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    pulse.type = 'sine';
    pulse.frequency.value = 60;
    lfo.frequency.value = 4; // Throbbing at 4Hz
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

    // Rumbling noise
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
  }

  /** Massive avalanche — building low-frequency roar with crumbling rock texture. */
  playAvalancheTrigger(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Multiple detuned low layers building over 2s
    const freqs = [45, 55, 65, 80, 100];
    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      // Staggered entry — each voice joins slightly later
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

    // Crumbling rumble noise layer
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

  /** Short warning beep for low fuel. */
  playFuelWarning(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Double beep — urgent but not harsh
    for (const offset of [0, 0.15]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now + offset);
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.14, now + offset + 0.02);
      gain.gain.setValueAtTime(0.14, now + offset + 0.08);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    }
  }

  /** Descending tone for low stamina — tired/winding down feel. */
  playStaminaWarning(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;
    // Two-note descending — sounds like running out of energy
    for (const [offset, freq] of [[0, 380], [0.15, 300]] as [number, number][]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      osc.frequency.linearRampToValueAtTime(freq * 0.85, now + offset + 0.12);
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.12, now + offset + 0.02);
      gain.gain.setValueAtTime(0.12, now + offset + 0.08);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    }
  }

  /** Exhaustion — long descending "powering down" tone when stamina hits zero. */
  playStaminaDepleted(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;

    // Three-note descending slide — winding down
    const notes = [400, 280, 180];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      const start = now + i * 0.2;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * 0.7, start + 0.25);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.03);
      gain.gain.setValueAtTime(0.14, start + 0.12);
      gain.gain.linearRampToValueAtTime(0, start + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxNode!);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  /** Urgent tick for time running low. */
  playTimeWarning(): void {
    if (!this.ctx || !this.sfxNode) return;

    const now = this.ctx.currentTime;
    // Two quick ticks
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxNode);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  }
}
