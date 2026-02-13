/**
 * AudioSystem — Singleton managing all game audio via Web Audio API.
 *
 * Handles AudioContext lifecycle (autoplay restrictions, pause/resume),
 * volume channels (master, music, sfx, voice, ambience), and persistence.
 * All sound-producing subsystems route through this system's gain nodes.
 */

import { STORAGE_KEYS } from '../config/storageKeys';
import { BALANCE } from '../config/gameConfig';
import { getJSON, setJSON, getString, setString } from '../utils/storage';

export type VolumeChannel = 'master' | 'music' | 'sfx' | 'engine' | 'voice' | 'ambience';

const CHANNEL_STORAGE_KEYS: Record<VolumeChannel, string> = {
  master: STORAGE_KEYS.MASTER_VOLUME,
  music: STORAGE_KEYS.MUSIC_VOLUME,
  sfx: STORAGE_KEYS.SFX_VOLUME,
  engine: STORAGE_KEYS.ENGINE_VOLUME,
  voice: STORAGE_KEYS.VOICE_VOLUME,
  ambience: STORAGE_KEYS.AMBIENCE_VOLUME,
};

const CHANNEL_DEFAULTS: Record<VolumeChannel, number> = {
  master: BALANCE.AUDIO_MASTER_VOLUME_DEFAULT,
  music: BALANCE.AUDIO_MUSIC_VOLUME_DEFAULT,
  sfx: BALANCE.AUDIO_SFX_VOLUME_DEFAULT,
  engine: BALANCE.AUDIO_ENGINE_VOLUME_DEFAULT,
  voice: BALANCE.AUDIO_VOICE_VOLUME_DEFAULT,
  ambience: BALANCE.AUDIO_AMBIENCE_VOLUME_DEFAULT,
};

export class AudioSystem {
  private static instance: AudioSystem | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Record<VolumeChannel, GainNode | null> = {
    master: null,
    music: null,
    sfx: null,
    engine: null,
    voice: null,
    ambience: null,
  };

  private volumes: Record<VolumeChannel, number>;
  private muted: boolean;
  private resumed = false;
  private game: Phaser.Game | null = null;
  private onReadyCallbacks: Array<() => void> = [];
  private visibilityHandler: (() => void) | null = null;

  private constructor() {
    this.volumes = this.loadVolumes();
    this.muted = getString(STORAGE_KEYS.AUDIO_MUTED) === 'true';
  }

  static getInstance(): AudioSystem {
    if (!AudioSystem.instance) {
      AudioSystem.instance = new AudioSystem();
    }
    return AudioSystem.instance;
  }

  /** Call once from main.ts after Phaser.Game is created */
  init(game: Phaser.Game): void {
    this.game = game;
    this.setupUserGestureResume();
    this.setupVisibilityHandling();
    // Expose for Playwright testing — allows probing the actual singleton
    if (typeof window !== 'undefined') {
      (window as any).__audioSystem = this;
    }
  }

  // --- AudioContext lifecycle ---

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      // Safari fallback for older versions
      const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new CtxClass();
      this.buildGainChain();
    }
    // Nudge context out of suspended state if a user gesture has occurred
    if (this.resumed && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private buildGainChain(): void {
    if (!this.ctx) return;

    // Limiter/compressor before destination to prevent clipping
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);   // start compressing at -6dB
    compressor.knee.setValueAtTime(12, this.ctx.currentTime);        // soft knee
    compressor.ratio.setValueAtTime(4, this.ctx.currentTime);        // 4:1 ratio
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);   // fast attack
    compressor.release.setValueAtTime(0.15, this.ctx.currentTime);   // moderate release
    compressor.connect(this.ctx.destination);

    // master → compressor → destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(compressor);
    this.channelGains.master = this.masterGain;

    // each channel → master
    for (const ch of ['music', 'sfx', 'engine', 'voice', 'ambience'] as VolumeChannel[]) {
      const gain = this.ctx.createGain();
      gain.connect(this.masterGain);
      this.channelGains[ch] = gain;
    }

    this.applyAllVolumes();
  }

  /**
   * Resume AudioContext on first user gesture (browser autoplay policy).
   * Listens on document for click/keydown/touchstart.
   */
  private setupUserGestureResume(): void {
    if (this.resumed) return;

    const resume = () => {
      if (this.resumed) return;
      const ctx = this.ensureContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      this.resumed = true;
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
      document.removeEventListener('touchstart', resume);
      // Notify anyone waiting for audio to be ready
      for (const cb of this.onReadyCallbacks) {
        try { cb(); } catch { /* don't break other callbacks */ }
      }
      this.onReadyCallbacks = [];
    };

    document.addEventListener('click', resume, { once: false });
    document.addEventListener('keydown', resume, { once: false });
    document.addEventListener('touchstart', resume, { once: false });
  }

  /** Suspend audio when tab is hidden, resume when visible */
  private setupVisibilityHandling(): void {
    // Remove previous listener if any (guards against duplicate registration)
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.visibilityHandler = () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.ctx.suspend().catch(() => {});
      } else if (this.resumed) {
        // Mute before resuming to avoid a burst of stale audio
        if (this.masterGain) {
          this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        this.ctx.resume().then(() => {
          // Fade master back in over 200ms
          if (this.masterGain && this.ctx) {
            const vol = this.muted ? 0 : this.volumes.master;
            this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.06);
          }
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // --- Volume control ---

  private loadVolumes(): Record<VolumeChannel, number> {
    const vols = {} as Record<VolumeChannel, number>;
    for (const ch of Object.keys(CHANNEL_DEFAULTS) as VolumeChannel[]) {
      const raw = getString(CHANNEL_STORAGE_KEYS[ch]);
      const parsed = raw ? parseFloat(raw) : NaN;
      vols[ch] = isNaN(parsed) ? CHANNEL_DEFAULTS[ch] : Math.max(0, Math.min(1, parsed));
    }
    return vols;
  }

  private applyAllVolumes(): void {
    const effectiveMaster = this.muted ? 0 : this.volumes.master;
    if (this.channelGains.master) {
      this.channelGains.master.gain.value = effectiveMaster;
    }
    for (const ch of ['music', 'sfx', 'voice', 'ambience'] as VolumeChannel[]) {
      if (this.channelGains[ch]) {
        this.channelGains[ch]!.gain.value = this.volumes[ch];
      }
    }
  }

  setVolume(channel: VolumeChannel, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.volumes[channel] = clamped;
    setString(CHANNEL_STORAGE_KEYS[channel], String(clamped));

    if (channel === 'master') {
      if (this.channelGains.master) {
        this.channelGains.master.gain.value = this.muted ? 0 : clamped;
      }
    } else if (this.channelGains[channel]) {
      this.channelGains[channel]!.gain.value = clamped;
    }
  }

  getVolume(channel: VolumeChannel): number {
    return this.volumes[channel];
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    setString(STORAGE_KEYS.AUDIO_MUTED, String(muted));
    if (this.channelGains.master) {
      this.channelGains.master.gain.value = muted ? 0 : this.volumes.master;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // --- Channel access for subsystems ---

  /** Get the GainNode for a channel. Subsystems connect their sources here. */
  getChannelNode(channel: VolumeChannel): GainNode {
    this.ensureContext();
    return this.channelGains[channel]!;
  }

  /** Get the raw AudioContext (for oscillators, buffers, etc.) */
  getContext(): AudioContext {
    return this.ensureContext();
  }

  /** True if a user gesture has been detected to enable audio */
  isReady(): boolean {
    return this.resumed;
  }

  /**
   * Register a callback to fire once audio is ready (user gesture detected).
   * If already ready, fires immediately.
   */
  onReady(cb: () => void): void {
    if (this.resumed) {
      cb();
    } else {
      this.onReadyCallbacks.push(cb);
    }
  }

  // --- Cleanup ---

  /** Reset for testing. Not normally called in production. */
  static reset(): void {
    if (AudioSystem.instance) {
      if (AudioSystem.instance.visibilityHandler) {
        document.removeEventListener('visibilitychange', AudioSystem.instance.visibilityHandler);
        AudioSystem.instance.visibilityHandler = null;
      }
      if (AudioSystem.instance.ctx) {
        AudioSystem.instance.ctx.close().catch(() => {});
      }
    }
    AudioSystem.instance = null;
  }
}
