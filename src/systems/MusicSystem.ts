/**
 * Chopin nocturne-style music via Web Audio API.
 *
 * Generates procedural piano melodies inspired by Chopin's Op. 9 nocturnes,
 * rendered through multi-harmonic sine wave synthesis.
 *
 * Five moods:
 *  - 'menu'    — E♭ major, singing quality of Op. 9 No. 2
 *  - 'calm'    — B♭ major, sparse snowfall (distilled No. 2)
 *  - 'night'   — B♭ minor, languid melancholy of Op. 9 No. 1
 *  - 'intense' — C minor, dramatic departure (No. 1 middle section)
 *  - 'credits' — E♭ major, warm triumphant reprise of the No. 2 theme
 *
 * Routes through AudioSystem's 'music' channel.
 */

import { AudioSystem } from './AudioSystem';

// ── Note frequencies (Hz) ──────────────────────────────────────────
// Octave 3–5 range for chiptune piano feel
const NOTE: Record<string, number> = {
  C3: 130.81, Db3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61,
  Gb3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
  Gb4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.26, F5: 698.46,
  Gb5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33,
};

// Rest placeholder
const REST = 0;

// ── Note type for melody sequences ─────────────────────────────────
interface MelodyNote {
  freq: number;    // 0 = rest
  duration: number; // beats
  velocity: number; // 0-1 volume multiplier
}

// ── Melody definitions ─────────────────────────────────────────────
// Each melody is an array of notes. One beat ≈ 1/tempo seconds.
// Inspired by Chopin's Nocturne Op. 9 No. 1 (B♭ minor) and No. 2 (E♭ major):
// flowing arpeggiated bass, ornamental chromatic melody, bel canto phrasing.

/**
 * Menu — E♭ major, inspired by Op. 9 No. 2.
 * Opens on G4 with the iconic turn figure, chromatic passing tones,
 * singing melody rising to Eb5 climax.
 */
const MENU_MELODY: MelodyNote[] = [
  { freq: NOTE.G4,  duration: 1.0, velocity: 0.65 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.55 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.60 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.55 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.60 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.66 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.55 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.62 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.64 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.60 },
  { freq: NOTE.G4,  duration: 1.0, velocity: 0.60 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.52 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.58 },
  { freq: NOTE.Eb4, duration: 1.0, velocity: 0.56 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.55 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.60 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.66 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.62 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.58 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.72 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.58 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.66 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.70 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.66 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.60 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.56 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.56 },
  { freq: NOTE.Eb5, duration: 3.5, velocity: 0.74 },
];

/** Bass — flowing broken chord arpeggios in the nocturne style */
const MENU_BASS: MelodyNote[] = [
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.34 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.28 },
  { freq: NOTE.G3,  duration: 1.0, velocity: 0.28 },
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.32 },
];

/**
 * Calm — A♭ major, floating and peaceful.
 * Opens on C5, gentle chromatic neighbor tones, wide intervals.
 * A different harmonic world from the menu.
 */
const CALM_MELODY: MelodyNote[] = [
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.55 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.45 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.45 },
  { freq: NOTE.Ab4, duration: 1.0, velocity: 0.50 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.45 },
  { freq: NOTE.B4,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.56 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.45 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.45 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.44 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.44 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.52 },
  { freq: REST,     duration: 0.5, velocity: 0 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.48 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.45 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.52 },
  { freq: NOTE.F5,  duration: 1.0, velocity: 0.56 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.45 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.50 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.45 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Ab4, duration: 1.5, velocity: 0.48 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.44 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.48 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.44 },
  { freq: NOTE.Ab4, duration: 4.0, velocity: 0.60 },
];

const CALM_BASS: MelodyNote[] = [
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Db3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Db3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Ab3, duration: 1.0, velocity: 0.28 },
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.24 },
  { freq: NOTE.C4,  duration: 1.0, velocity: 0.22 },
  { freq: NOTE.Ab3, duration: 1.0, velocity: 0.26 },
];

/**
 * Night — B♭ minor, inspired by Op. 9 No. 1.
 * Opens on Db5 with the sighing chromatic descent,
 * F→Gb→F→Eb→Db motive, dark and languid.
 */
const NIGHT_MELODY: MelodyNote[] = [
  { freq: NOTE.Db5, duration: 1.0, velocity: 0.62 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.56 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.60 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.55 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.58 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.55 },
  { freq: NOTE.Db5, duration: 1.0, velocity: 0.60 },
  // Op. 9 No. 1 "sigh" kernel
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.52 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.55 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.52 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Db4, duration: 1.5, velocity: 0.52 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.48 },
  { freq: NOTE.E4,  duration: 0.5, velocity: 0.46 },
  { freq: NOTE.F4,  duration: 1.0, velocity: 0.54 },
  { freq: REST,     duration: 0.5, velocity: 0 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.54 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.56 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.54 },
  { freq: NOTE.F4,  duration: 1.0, velocity: 0.56 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.50 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.52 },
  { freq: NOTE.Db4, duration: 1.0, velocity: 0.52 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.48 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.50 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.50 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.52 },
  { freq: NOTE.Bb4, duration: 4.0, velocity: 0.60 },
];

const NIGHT_BASS: MelodyNote[] = [
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Gb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Gb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.A3,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Gb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.34 },
  { freq: NOTE.F3,  duration: 1.0, velocity: 0.28 },
  { freq: NOTE.Db4, duration: 1.0, velocity: 0.24 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.30 },
];

/**
 * Intense — C minor, storm departure.
 * Opens with rapid Eb5 descending scale, urgent chromatic figures.
 * The passionate middle section of Op. 9 No. 1.
 */
const INTENSE_MELODY: MelodyNote[] = [
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.72 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.65 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.68 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.64 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.62 },
  { freq: NOTE.G4,  duration: 1.0, velocity: 0.66 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.64 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.66 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.70 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.62 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.66 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.62 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.60 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.62 },
  { freq: NOTE.F4,  duration: 1.0, velocity: 0.62 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.62 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.64 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.66 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.68 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.74 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.66 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.70 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.72 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.70 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.62 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.68 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.64 },
  { freq: NOTE.G4,  duration: 1.0, velocity: 0.62 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.70 },
  { freq: NOTE.C5,  duration: 3.5, velocity: 0.76 },
];

const INTENSE_BASS: MelodyNote[] = [
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.42 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.42 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.D3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.B3,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.D3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.D3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.42 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 1.0, velocity: 0.38 },
  { freq: NOTE.D3,  duration: 1.0, velocity: 0.30 },
  { freq: NOTE.C3,  duration: 1.0, velocity: 0.34 },
  { freq: NOTE.C3,  duration: 1.0, velocity: 0.34 },
];

/**
 * Credits — E♭ major, triumphant warm reprise.
 * Opens high on G5, expansive and confident, soaring phrases.
 * Chromatic embellishments, warm resolution.
 */
const CREDITS_MELODY: MelodyNote[] = [
  { freq: NOTE.G5,  duration: 1.0, velocity: 0.78 },
  { freq: NOTE.Bb5, duration: 1.0, velocity: 0.82 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.72 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.68 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.Bb5, duration: 1.0, velocity: 0.84 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.76 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.68 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.72 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.70 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.Ab5, duration: 1.0, velocity: 0.78 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.76 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.68 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.72 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.62 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.70 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.72 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.76 },
  { freq: NOTE.Bb5, duration: 1.0, velocity: 0.86 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.74 },
  { freq: NOTE.Bb5, duration: 0.5, velocity: 0.84 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.76 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.68 },
  { freq: NOTE.E5,  duration: 0.5, velocity: 0.62 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.70 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.76 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.78 },
  { freq: NOTE.G5,  duration: 1.0, velocity: 0.76 },
  { freq: NOTE.Eb5, duration: 4.0, velocity: 0.82 },
];

const CREDITS_BASS: MelodyNote[] = [
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.36 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.E3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.36 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.A3,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.38 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 1.0, velocity: 0.28 },
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.34 },
];

// ── Mood-to-melody mapping ─────────────────────────────────────────
type Mood = 'menu' | 'calm' | 'night' | 'intense' | 'credits';

const MOOD_DATA: Record<Mood, { melody: MelodyNote[]; bass: MelodyNote[]; tempo: number }> = {
  menu:    { melody: MENU_MELODY,    bass: MENU_BASS,    tempo: 1.4 },
  calm:    { melody: CALM_MELODY,    bass: CALM_BASS,    tempo: 1.2 },
  night:   { melody: NIGHT_MELODY,   bass: NIGHT_BASS,   tempo: 1.2 },
  intense: { melody: INTENSE_MELODY, bass: INTENSE_BASS, tempo: 1.6 },
  credits: { melody: CREDITS_MELODY, bass: CREDITS_BASS, tempo: 1.2 },
};

// ── Volume constants ───────────────────────────────────────────────
const MELODY_VOLUME = 0.18;  // Base melody volume (before velocity)
const BASS_VOLUME = 0.10;    // Base bass volume (before velocity)
const FADE_TIME = 2.0;       // Crossfade duration in seconds

// ── Music system class ─────────────────────────────────────────────

let musicInstance: MusicSystem | null = null;

export class MusicSystem {
  private ctx: AudioContext | null = null;
  private musicNode: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private melodyTimerId: ReturnType<typeof setTimeout> | null = null;
  private bassTimerId: ReturnType<typeof setTimeout> | null = null;
  private currentMood: Mood | null = null;
  private melodyIndex = 0;
  private bassIndex = 0;
  private playing = false;
  private paused = false;

  private pendingMood: Mood | null = null;

  /** Get or create the singleton music system. */
  static getInstance(): MusicSystem {
    if (!musicInstance) musicInstance = new MusicSystem();
    return musicInstance;
  }

  /** Start playing music with the given mood, or crossfade if already playing. */
  start(mood: Mood): void {
    // If already playing this mood, just keep going — no interruption
    if (this.playing && this.currentMood === mood) return;
    // If playing a different mood, crossfade
    if (this.playing) {
      this.changeMood(mood);
      return;
    }

    const audio = AudioSystem.getInstance();

    if (!audio.isReady()) {
      // Defer until first user gesture
      this.pendingMood = mood;
      audio.onReady(() => {
        if (this.pendingMood) {
          this.beginPlayback(this.pendingMood);
          this.pendingMood = null;
        }
      });
      return;
    }

    this.beginPlayback(mood);
  }

  private beginPlayback(mood: Mood): void {
    const audio = AudioSystem.getInstance();
    this.ctx = audio.getContext();
    this.musicNode = audio.getChannelNode('music');

    // Create a local gain for fade control
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.connect(this.musicNode);

    this.currentMood = mood;
    // Start at a random position so the same mood doesn't always open identically
    const data = MOOD_DATA[mood];
    this.melodyIndex = Math.floor(Math.random() * data.melody.length);
    this.bassIndex = Math.floor(Math.random() * data.bass.length);
    this.playing = true;
    this.paused = false;

    // Fade in
    this.masterGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + FADE_TIME);

    this.scheduleMelodyNote();
    this.scheduleBassNote();
  }

  /** Stop music with fade-out. */
  stop(): void {
    this.pendingMood = null;

    // Always cancel timers immediately so no new notes are scheduled
    if (this.melodyTimerId) { clearTimeout(this.melodyTimerId); this.melodyTimerId = null; }
    if (this.bassTimerId) { clearTimeout(this.bassTimerId); this.bassTimerId = null; }

    if (!this.playing || !this.ctx || !this.masterGain) {
      this.cleanup();
      return;
    }

    // Fade out then disconnect
    const fadeTime = FADE_TIME;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTime);

    this.playing = false;
    this.paused = false;

    // Hold a reference so cleanup can disconnect even if `this` is reused
    const gain = this.masterGain;
    this.masterGain = null;
    this.ctx = null;
    this.currentMood = null;
    setTimeout(() => {
      try { gain.disconnect(); } catch { /* already disconnected */ }
    }, fadeTime * 1000 + 100);
  }

  /** Pause music (keep position). */
  pause(): void {
    if (!this.playing) return;
    this.paused = true;
    if (this.melodyTimerId) { clearTimeout(this.melodyTimerId); this.melodyTimerId = null; }
    if (this.bassTimerId) { clearTimeout(this.bassTimerId); this.bassTimerId = null; }
  }

  /** Resume after pause. */
  resume(): void {
    if (!this.paused || !this.currentMood) return;
    this.paused = false;
    this.scheduleMelodyNote();
    this.scheduleBassNote();
  }

  /** Switch to a different mood with crossfade. */
  changeMood(mood: Mood): void {
    if (mood === this.currentMood) return;
    if (!this.playing) {
      this.start(mood);
      return;
    }

    // Crossfade: fade out current gain, then start fresh
    if (this.melodyTimerId) { clearTimeout(this.melodyTimerId); this.melodyTimerId = null; }
    if (this.bassTimerId) { clearTimeout(this.bassTimerId); this.bassTimerId = null; }

    const oldGain = this.masterGain;
    const oldCtx = this.ctx;
    if (oldCtx && oldGain) {
      oldGain.gain.setValueAtTime(oldGain.gain.value, oldCtx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, oldCtx.currentTime + FADE_TIME);
      setTimeout(() => {
        try { oldGain.disconnect(); } catch { /* ok */ }
      }, FADE_TIME * 1000 + 100);
    }

    this.masterGain = null;
    this.ctx = null;
    this.playing = false;
    this.currentMood = null;
    this.start(mood);
  }

  // ── Internal scheduling ───────────────────────────────────────────

  private scheduleMelodyNote(): void {
    if (!this.playing || this.paused || !this.currentMood || !this.ctx) return;

    const data = MOOD_DATA[this.currentMood];
    const note = data.melody[this.melodyIndex];
    const beatDuration = 1 / data.tempo; // seconds per beat
    const noteDuration = note.duration * beatDuration;

    // Add rubato: ±12% timing variation for Chopin-like temporal freedom
    const rubato = 1 + (Math.random() - 0.5) * 0.24;
    const actualDuration = noteDuration * rubato;

    if (note.freq > 0) {
      // Notes ring for 90% of their slot — legato, flowing
      this.playNote(note.freq, actualDuration * 0.9, note.velocity * MELODY_VOLUME, false);
    }

    // Advance and loop
    this.melodyIndex = (this.melodyIndex + 1) % data.melody.length;

    this.melodyTimerId = setTimeout(
      () => this.scheduleMelodyNote(),
      actualDuration * 1000,
    );
  }

  private scheduleBassNote(): void {
    if (!this.playing || this.paused || !this.currentMood || !this.ctx) return;

    const data = MOOD_DATA[this.currentMood];
    const note = data.bass[this.bassIndex];
    const beatDuration = 1 / data.tempo;
    const noteDuration = note.duration * beatDuration;

    const rubato = 1 + (Math.random() - 0.5) * 0.14;
    const actualDuration = noteDuration * rubato;

    if (note.freq > 0) {
      // Bass rings for 80% — a bit shorter than melody for clarity
      this.playNote(note.freq, actualDuration * 0.8, note.velocity * BASS_VOLUME, true);
    }

    this.bassIndex = (this.bassIndex + 1) % data.bass.length;

    this.bassTimerId = setTimeout(
      () => this.scheduleBassNote(),
      actualDuration * 1000,
    );
  }

  /**
   * Play a single grand-piano-like note.
   *
   * Models key characteristics of a real piano:
   * - Hammer strike: brief filtered noise burst at attack
   * - Rich harmonic series (7 partials for melody, 5 for bass)
   * - Inharmonicity: higher partials slightly sharp (stretched tuning)
   * - Two-stage decay: fast initial drop then long sustain tail
   * - Per-harmonic decay: upper partials fade faster than fundamental
   * - Velocity-dependent brightness: harder strikes = brighter tone
   * - Sympathetic resonance: ghost tones at 5th and octave above
   * - Soundboard resonance: low-pass filter on output
   */
  private playNote(freq: number, duration: number, volume: number, isBass: boolean): void {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // ── Output chain: note gain → low-pass (soundboard) → master ──
    const noteGain = this.ctx.createGain();
    const soundboard = this.ctx.createBiquadFilter();
    soundboard.type = 'lowpass';
    // Velocity-dependent brightness: louder notes open up the filter
    const baseFreq = isBass ? 1800 : 3500;
    const brightBoost = (volume / 0.2) * (isBass ? 800 : 2500);
    soundboard.frequency.setValueAtTime(baseFreq + brightBoost, now);
    // Brightness fades as the note decays (real piano behavior)
    soundboard.frequency.setTargetAtTime(baseFreq * 0.6, now + 0.05, duration * 0.3);
    soundboard.Q.setValueAtTime(0.5, now);
    noteGain.connect(soundboard);
    soundboard.connect(this.masterGain);

    // ── Piano envelope: two-stage decay ──
    const attack = 0.004;
    const sustainLevel = 0.30;
    const stage1Time = duration * 0.12;
    const stage2Time = duration * 0.35;

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(volume, now + attack);
    noteGain.gain.setTargetAtTime(volume * sustainLevel, now + attack, stage1Time);
    noteGain.gain.setTargetAtTime(0.001, now + duration * 0.5, stage2Time);

    // ── Hammer strike: brief noise burst ──
    const noiseLen = 0.015;
    const noiseBuf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * noiseLen), this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      // Shape the noise: sharper at start, fading
      const env = 1 - (i / noiseData.length);
      noiseData[i] = (Math.random() * 2 - 1) * env * 0.7;
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(Math.min(freq * 4, 8000), now);
    noiseFilter.Q.setValueAtTime(1.2, now);
    noiseGain.gain.setValueAtTime(volume * (isBass ? 0.2 : 0.35), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(noteGain);
    noiseSrc.start(now);
    noiseSrc.stop(now + noiseLen);

    // ── Harmonic series with inharmonicity ──
    // B = inharmonicity coefficient (real piano: ~0.0004 for mid-range)
    const B = isBass ? 0.0003 : 0.0005;

    const harmonics = isBass
      ? [ // Bass: warm, 5 partials
          { ratio: 1, vol: 1.0 },
          { ratio: 2, vol: 0.45 },
          { ratio: 3, vol: 0.15 },
          { ratio: 4, vol: 0.06 },
          { ratio: 5, vol: 0.02 },
        ]
      : [ // Melody: 7 partials for realistic timbre
          { ratio: 1, vol: 1.0 },
          { ratio: 2, vol: 0.50 },
          { ratio: 3, vol: 0.22 },
          { ratio: 4, vol: 0.11 },
          { ratio: 5, vol: 0.06 },
          { ratio: 6, vol: 0.03 },
          { ratio: 7, vol: 0.015 },
        ];

    const endTime = now + duration + 0.3;

    for (const h of harmonics) {
      const osc = this.ctx.createOscillator();
      const hGain = this.ctx.createGain();

      osc.type = 'sine';
      // Inharmonicity: f_n = n * f0 * sqrt(1 + B * n^2)
      const stretchedFreq = freq * h.ratio * Math.sqrt(1 + B * h.ratio * h.ratio);
      osc.frequency.setValueAtTime(stretchedFreq, now);

      hGain.gain.setValueAtTime(h.vol, now);
      // Higher harmonics decay much faster — brightness fades while warmth lingers
      if (h.ratio > 1) {
        const harmonicDecay = duration * (0.1 / h.ratio);
        hGain.gain.setTargetAtTime(h.vol * 0.03, now + attack, harmonicDecay);
      }

      osc.connect(hGain);
      hGain.connect(noteGain);
      osc.start(now);
      osc.stop(endTime);
    }

    // ── Sympathetic resonance: ghost tones ──
    // On a grand piano, undamped strings resonate sympathetically
    // Add very quiet tones at the 5th above and octave above
    if (!isBass) {
      const sympathetics = [
        { freq: freq * 1.5, vol: 0.02, delay: 0.03 },   // perfect 5th
        { freq: freq * 2.0, vol: 0.015, delay: 0.04 },   // octave
      ];
      for (const s of sympathetics) {
        if (s.freq > 4000) continue; // don't add if too high
        const osc = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(s.freq, now);
        sGain.gain.setValueAtTime(0, now);
        // Sympathetic strings build slowly and decay slowly
        sGain.gain.linearRampToValueAtTime(volume * s.vol, now + s.delay + 0.1);
        sGain.gain.setTargetAtTime(0.001, now + duration * 0.3, duration * 0.5);
        osc.connect(sGain);
        sGain.connect(noteGain);
        osc.start(now + s.delay);
        osc.stop(endTime);
      }
    }
  }

  private cleanup(): void {
    if (this.melodyTimerId) { clearTimeout(this.melodyTimerId); this.melodyTimerId = null; }
    if (this.bassTimerId) { clearTimeout(this.bassTimerId); this.bassTimerId = null; }
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch { /* already disconnected */ }
      this.masterGain = null;
    }
    this.playing = false;
    this.paused = false;
  }
}

// ── Helper: choose mood from level config ──────────────────────────

/** Determine music mood from level properties. */
export function getMoodForLevel(weather: string, isNight: boolean, difficulty?: string): Mood {
  if (weather === 'storm' || weather === 'light_snow') return 'intense';
  if (isNight) return 'night';
  if (difficulty === 'black' || difficulty === 'red') return 'night';
  return 'calm';
}
