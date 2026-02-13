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
  // Opening statement (dolce, bel canto) → gentle turn figure
  { freq: NOTE.G4,  duration: 3.0, velocity: 0.36 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb4, duration: 2.0, velocity: 0.44 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.46 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.G4,  duration: 1.0, velocity: 0.34 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb4, duration: 2.0, velocity: 0.30 },
  { freq: REST,     duration: 0.5, velocity: 0 },

  // Development: appoggiaturas, chromatic passing tones, wider register
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.40 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.44 },
  { freq: NOTE.Eb5, duration: 2.5, velocity: 0.54 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.46 },
  { freq: NOTE.F5,  duration: 2.0, velocity: 0.58 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.48 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.42 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.A4,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb4, duration: 2.0, velocity: 0.44 },
  { freq: NOTE.G4,  duration: 1.0, velocity: 0.36 },
  { freq: NOTE.Eb4, duration: 1.5, velocity: 0.32 },

  // Low-register answer → expansive leap (Chopin-like sweep)
  { freq: NOTE.Bb3, duration: 3.0, velocity: 0.30 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.G4,  duration: 1.0, velocity: 0.40 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.48 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.52 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.58 },
  { freq: NOTE.G5,  duration: 2.5, velocity: 0.72 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.62 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.60 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.56 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.54 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.52 },

  // Climax: appassionato ascent to Bb5 → resolved Eb cadence
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.48 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.54 },
  { freq: NOTE.D5,  duration: 1.5, velocity: 0.66 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.80 },
  { freq: NOTE.Bb5, duration: 2.5, velocity: 0.85 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.76 },
  { freq: NOTE.G5,  duration: 1.0, velocity: 0.72 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.64 },

  // Resolution → breath
  { freq: NOTE.Eb5, duration: 5.0, velocity: 0.60 },
  { freq: 0,        duration: 2.5, velocity: 0 },
];

/** Bass — flowing broken chord arpeggios in the nocturne style */
const MENU_BASS: MelodyNote[] = [
  // I (Eb) → V (Bb) → vi (Cm) → IV (Ab) → ii (Fm) → V → I
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },

  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },

  { freq: NOTE.C3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.28 },

  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.28 },

  { freq: NOTE.F3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },

  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.30 },

  // Cadential return
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.34 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.28 },
  { freq: NOTE.G3,  duration: 1.0, velocity: 0.26 },
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.30 },
];

/**
 * Calm — A♭ major, floating and peaceful.
 * Opens on C5, gentle chromatic neighbor tones, wide intervals.
 * A different harmonic world from the menu.
 */
const CALM_MELODY: MelodyNote[] = [
  // Opening statement (pp) — floating lullaby line
  { freq: NOTE.Ab4, duration: 2.5, velocity: 0.34 },
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.38 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.36 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.32 },
  { freq: NOTE.Ab4, duration: 2.0, velocity: 0.34 },
  { freq: REST,     duration: 0.5, velocity: 0 },

  // Development — wide intervals, soft chromatic color
  { freq: NOTE.Eb4, duration: 1.5, velocity: 0.32 },
  { freq: NOTE.Ab4, duration: 1.0, velocity: 0.34 },
  { freq: NOTE.C5,  duration: 2.0, velocity: 0.38 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb5, duration: 2.5, velocity: 0.42 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.36 },
  { freq: NOTE.Ab4, duration: 2.0, velocity: 0.34 },

  // Low-register answering sigh
  { freq: NOTE.Ab3, duration: 2.0, velocity: 0.30 },
  { freq: NOTE.Eb4, duration: 1.0, velocity: 0.32 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab4, duration: 1.5, velocity: 0.34 },

  // Climax (still gentle): high-register bloom → dissolve
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.38 },
  { freq: NOTE.Eb5, duration: 1.5, velocity: 0.44 },
  { freq: NOTE.F5,  duration: 1.0, velocity: 0.48 },
  { freq: NOTE.E5,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.44 },
  { freq: NOTE.Ab5, duration: 2.0, velocity: 0.55 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.F5,  duration: 1.0, velocity: 0.42 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.38 },

  // Resolution
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.34 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab4, duration: 2.5, velocity: 0.34 },
  { freq: REST,     duration: 1.0, velocity: 0 },

  // Final rocking cadence
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.36 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.32 },
  { freq: NOTE.Ab4, duration: 1.5, velocity: 0.34 },
  { freq: NOTE.Eb4, duration: 1.5, velocity: 0.32 },
  { freq: NOTE.C4,  duration: 1.5, velocity: 0.30 },
  { freq: NOTE.Eb4, duration: 1.0, velocity: 0.32 },
  { freq: NOTE.Ab4, duration: 2.0, velocity: 0.36 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.40 },
  { freq: NOTE.Ab4, duration: 3.5, velocity: 0.42 },
  { freq: 0,        duration: 3.0, velocity: 0 },
];

const CALM_BASS: MelodyNote[] = [
  // Ab → Db → Eb → Fm (soft snowfall accompaniment)
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.24 },

  { freq: NOTE.Db3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Db3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },

  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.24 },

  { freq: NOTE.F3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.22 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.22 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.24 },

  { freq: NOTE.Db3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Db3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },

  { freq: NOTE.Ab3, duration: 1.0, velocity: 0.28 },
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.22 },
  { freq: NOTE.C4,  duration: 1.0, velocity: 0.20 },
  { freq: NOTE.Ab3, duration: 1.0, velocity: 0.24 },
];

/**
 * Night — B♭ minor, inspired by Op. 9 No. 1.
 * Opens on Db5 with the sighing chromatic descent,
 * F→Gb→F→Eb→Db motive, dark and languid.
 */
const NIGHT_MELODY: MelodyNote[] = [
  // Opening statement — yearning, elegant form (pp → mp)
  { freq: NOTE.Db5, duration: 1.5, velocity: 0.42 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.40 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb4, duration: 1.5, velocity: 0.38 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Db5, duration: 1.5, velocity: 0.44 },

  // "Sigh" kernel — descending chromatic tension
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.36 },
  { freq: NOTE.E4,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Db4, duration: 2.0, velocity: 0.34 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.F4,  duration: 1.0, velocity: 0.36 },
  { freq: REST,     duration: 0.5, velocity: 0 },

  // Development — rising sequence, widening intervals
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.F4,  duration: 1.0, velocity: 0.42 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Db4, duration: 1.0, velocity: 0.36 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Bb3, duration: 2.0, velocity: 0.30 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.44 },
  { freq: NOTE.Db5, duration: 1.5, velocity: 0.54 },

  // Build to appassionato
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.46 },
  { freq: NOTE.F5,  duration: 2.0, velocity: 0.62 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.46 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.44 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.46 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.42 },

  // Climax: appassionato burst (ff) → then retreat
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.64 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.82 },
  { freq: NOTE.Bb5, duration: 1.0, velocity: 0.85 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.80 },
  { freq: NOTE.Gb5, duration: 0.5, velocity: 0.76 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.72 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.68 },
  { freq: NOTE.Db5, duration: 1.0, velocity: 0.62 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.50 },

  // Dolcissimo return — dying away
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.44 },
  { freq: NOTE.Bb4, duration: 1.5, velocity: 0.38 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.F4,  duration: 1.0, velocity: 0.34 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Db4, duration: 1.0, velocity: 0.30 },
  { freq: NOTE.Bb4, duration: 4.5, velocity: 0.36 },
  { freq: 0,        duration: 3.0, velocity: 0 },
];

const NIGHT_BASS: MelodyNote[] = [
  // Bbm → Gb → Ebm → F(7) → Bbm (supports the A-section arc)
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.32 },

  { freq: NOTE.Gb3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Gb3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.26 },

  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Gb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Gb3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.30 },

  { freq: NOTE.F3,  duration: 0.5, velocity: 0.38 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.A3,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.38 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.A3,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },

  // Back to tonic
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.36 },
  { freq: NOTE.F3,  duration: 1.0, velocity: 0.30 },
  { freq: NOTE.Db4, duration: 1.0, velocity: 0.24 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.30 },
];

/**
 * Night middle section — D♭ major, inspired by Op. 9 No. 1's contrasting section.
 * "A melody without ornaments, almost ascetic and strong, led in octaves sotto voce,
 * repeating the same phrases over and over."
 * Simpler, no ornaments; octave doubling added by the scheduler.
 */
const NIGHT_MIDDLE_MELODY: MelodyNote[] = [
  { freq: NOTE.Db4, duration: 1.5, velocity: 0.42 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.F4,  duration: 1.0, velocity: 0.44 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Db4, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Ab3, duration: 1.5, velocity: 0.40 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.Db4, duration: 1.0, velocity: 0.42 },
  // Repeat the phrase (sotto voce repetition)
  { freq: NOTE.Db4, duration: 1.5, velocity: 0.40 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.36 },
  { freq: NOTE.F4,  duration: 1.0, velocity: 0.42 },
  { freq: NOTE.Ab4, duration: 1.0, velocity: 0.46 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Db4, duration: 2.0, velocity: 0.44 },
  { freq: 0,        duration: 2.0, velocity: 0 },
];

const NIGHT_MIDDLE_BASS: MelodyNote[] = [
  { freq: NOTE.Db3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Db3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.24 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.22 },
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.22 },
  { freq: NOTE.Db3, duration: 1.0, velocity: 0.28 },
  { freq: NOTE.Ab3, duration: 1.0, velocity: 0.22 },
  { freq: NOTE.F3,  duration: 1.0, velocity: 0.22 },
  { freq: NOTE.Db3, duration: 1.0, velocity: 0.26 },
];

/**
 * Opens with rapid Eb5 descending scale, urgent chromatic figures.
 * The passionate middle section of Op. 9 No. 1.
 */
const INTENSE_MELODY: MelodyNote[] = [
  // Opening statement — urgent descent, accented syncopation
  { freq: NOTE.Eb5, duration: 1.5, velocity: 0.82 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.78 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.80 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.76 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.74 },
  { freq: NOTE.G4,  duration: 1.5, velocity: 0.76 },
  { freq: NOTE.F4,  duration: 0.5, velocity: 0.72 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.74 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.70 },
  { freq: NOTE.C4,  duration: 2.5, velocity: 0.74 },
  { freq: REST,     duration: 0.5, velocity: 0 },

  // Development — octave sweeps and chromatic pressure
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.80 },
  { freq: NOTE.Eb5, duration: 1.5, velocity: 0.84 },
  { freq: NOTE.G5,  duration: 2.5, velocity: 0.85 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.80 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.82 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.78 },
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.80 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.76 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.78 },
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.82 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.78 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.80 },
  { freq: NOTE.Eb5, duration: 1.5, velocity: 0.84 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.85 },
  { freq: NOTE.Bb5, duration: 3.0, velocity: 0.85 },

  // Brief release → re-gathering force
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.82 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.80 },
  { freq: NOTE.F5,  duration: 1.5, velocity: 0.80 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.78 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.76 },
  { freq: NOTE.C5,  duration: 2.5, velocity: 0.80 },
  { freq: REST,     duration: 1.0, velocity: 0 },

  // Climax wave — sharp leaps, chromatic bite
  { freq: NOTE.Bb5, duration: 1.5, velocity: 0.85 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.82 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.82 },
  { freq: NOTE.Bb4, duration: 1.5, velocity: 0.78 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.76 },
  { freq: NOTE.Gb4, duration: 0.5, velocity: 0.78 },
  { freq: NOTE.G4,  duration: 1.5, velocity: 0.80 },
  { freq: NOTE.B4,  duration: 0.5, velocity: 0.82 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.84 },
  { freq: NOTE.Eb5, duration: 2.5, velocity: 0.85 },

  // Resolution — exhausted but still burning
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.80 },
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.82 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.78 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.76 },
  { freq: NOTE.F4,  duration: 1.5, velocity: 0.74 },
  { freq: NOTE.Eb4, duration: 0.5, velocity: 0.72 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.70 },
  { freq: NOTE.C4,  duration: 5.0, velocity: 0.76 },
  { freq: NOTE.G4,  duration: 2.5, velocity: 0.68 },
  { freq: NOTE.C4,  duration: 5.0, velocity: 0.62 },
  { freq: 0,        duration: 3.0, velocity: 0 },
];

const INTENSE_BASS: MelodyNote[] = [
  // Driving i–VI–V gestures (straight bass, no triplets)
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.44 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.44 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.34 },

  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.42 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.42 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.32 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.32 },

  { freq: NOTE.G3,  duration: 0.5, velocity: 0.44 },
  { freq: NOTE.D3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.B3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.D3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.44 },
  { freq: NOTE.D3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.B3,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.D3,  duration: 0.5, velocity: 0.32 },

  { freq: NOTE.F3,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.26 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.28 },

  // Cadential push to i
  { freq: NOTE.G3,  duration: 1.0, velocity: 0.42 },
  { freq: NOTE.D3,  duration: 1.0, velocity: 0.32 },
  { freq: NOTE.C3,  duration: 1.0, velocity: 0.36 },
  { freq: NOTE.C3,  duration: 1.0, velocity: 0.36 },
];

/**
 * Credits — E♭ major, triumphant warm reprise.
 * Opens high on G5, expansive and confident, soaring phrases.
 * Chromatic embellishments, warm resolution.
 */
const CREDITS_MELODY: MelodyNote[] = [
  // Grand statement — full register, warm triumph (mf → ff)
  { freq: NOTE.Eb4, duration: 1.0, velocity: 0.56 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.50 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.60 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.66 },
  { freq: NOTE.Eb5, duration: 1.5, velocity: 0.72 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.62 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.68 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.70 },
  { freq: NOTE.G5,  duration: 1.0, velocity: 0.76 },
  { freq: NOTE.Bb5, duration: 1.5, velocity: 0.85 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.78 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.76 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.72 },
  { freq: NOTE.G5,  duration: 1.0, velocity: 0.78 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.70 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.62 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.70 },

  // Development — sequences + chromatic color
  { freq: NOTE.C5,  duration: 1.5, velocity: 0.64 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.58 },
  { freq: NOTE.Ab4, duration: 0.5, velocity: 0.56 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.62 },
  { freq: NOTE.C5,  duration: 1.0, velocity: 0.66 },
  { freq: NOTE.Db5, duration: 0.5, velocity: 0.60 },
  { freq: NOTE.C5,  duration: 0.5, velocity: 0.64 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.62 },
  { freq: NOTE.G4,  duration: 0.5, velocity: 0.58 },
  { freq: NOTE.Bb4, duration: 0.5, velocity: 0.64 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.72 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.78 },
  { freq: NOTE.Ab5, duration: 2.0, velocity: 0.82 },

  // Climax — octave sweep to Bb5, then cadential descent
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.78 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.Eb5, duration: 1.0, velocity: 0.72 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.G5,  duration: 0.5, velocity: 0.78 },
  { freq: NOTE.Bb5, duration: 2.0, velocity: 0.85 },
  { freq: NOTE.Ab5, duration: 0.5, velocity: 0.80 },
  { freq: NOTE.Bb5, duration: 0.5, velocity: 0.85 },
  { freq: NOTE.G5,  duration: 1.0, velocity: 0.80 },
  { freq: NOTE.F5,  duration: 0.5, velocity: 0.74 },
  { freq: NOTE.E5,  duration: 0.5, velocity: 0.62 },

  // Resolution — warm apotheosis and breath
  { freq: NOTE.F5,  duration: 1.5, velocity: 0.76 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.70 },
  { freq: NOTE.D5,  duration: 0.5, velocity: 0.62 },
  { freq: NOTE.Eb5, duration: 0.5, velocity: 0.70 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.62 },
  { freq: NOTE.G4,  duration: 1.0, velocity: 0.58 },
  { freq: NOTE.Eb4, duration: 6.0, velocity: 0.78 },
  { freq: NOTE.Bb4, duration: 1.0, velocity: 0.64 },
  { freq: NOTE.G4,  duration: 2.0, velocity: 0.60 },
  { freq: 0,        duration: 2.5, velocity: 0 },
];

const CREDITS_BASS: MelodyNote[] = [
  // Grander Eb-major progression to support the epic reprise
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.42 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.42 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.34 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.34 },

  { freq: NOTE.C3,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.C3,  duration: 0.5, velocity: 0.40 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.G3,  duration: 0.5, velocity: 0.32 },

  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.Ab3, duration: 0.5, velocity: 0.38 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },
  { freq: NOTE.C4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.Eb3, duration: 0.5, velocity: 0.30 },

  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.Bb3, duration: 0.5, velocity: 0.40 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.32 },
  { freq: NOTE.D4,  duration: 0.5, velocity: 0.26 },
  { freq: NOTE.F3,  duration: 0.5, velocity: 0.32 },

  // Final cadence back to Eb
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.40 },
  { freq: NOTE.Bb3, duration: 1.0, velocity: 0.32 },
  { freq: NOTE.G3,  duration: 1.0, velocity: 0.30 },
  { freq: NOTE.Eb3, duration: 1.0, velocity: 0.36 },
];

// ── Polyphonic voice settings per mood ─────────────────────────────
// Counter-melody: diatonic third/sixth below the melody note.
// Ornamental echo: quiet neighbor-tone turn after longer notes.
interface PolyphonyConfig {
  harmonyChance: number;   // 0–1: probability a melody note gets a harmony voice
  harmonyVolume: number;   // volume multiplier vs melody note velocity
  harmonyDelay: number;    // seconds: slight spread like a pianist's hand
  echoChance: number;      // 0–1: probability a long note (≥1 beat) gets an ornament
  echoVolume: number;      // volume multiplier vs melody note velocity
}

// ── Scale definitions for diatonic harmony ─────────────────────────
// Chromatic pitch classes (0=C) → scale degree membership.
// We look up the melody pitch class, step down the scale by 2 degrees (a third)
// or 4 degrees (a sixth) to find the diatonic harmony note.
const SCALES: Record<string, number[]> = {
  'Eb_major': [3, 5, 7, 8, 10, 0, 2],   // Eb F G Ab Bb C D
  'Ab_major': [8, 10, 0, 1, 3, 5, 7],    // Ab Bb C Db Eb F G
  'Bb_minor': [10, 0, 1, 3, 5, 6, 8],    // Bb C Db Eb F Gb Ab
  'C_minor':  [0, 2, 3, 5, 7, 8, 10],    // C D Eb F G Ab Bb
  'Db_major': [1, 3, 5, 6, 8, 10, 0],    // Db Eb F Gb Ab Bb C
};

/** Return a frequency a diatonic third below the given freq in the given scale. */
function diatonicThirdBelow(freq: number, scale: number[]): number {
  // Find the nearest pitch class
  const semitones = 12 * Math.log2(freq / 261.63); // relative to C4
  const pitchClass = ((Math.round(semitones) % 12) + 12) % 12;
  const idx = scale.indexOf(pitchClass);
  if (idx < 0) {
    // Chromatic note — fall back to minor third (3 semitones below)
    return freq / Math.pow(2, 3 / 12);
  }
  // Step down 2 scale degrees for a diatonic third
  const targetIdx = ((idx - 2) % scale.length + scale.length) % scale.length;
  const targetPC = scale[targetIdx];
  const interval = ((pitchClass - targetPC) % 12 + 12) % 12;
  return freq / Math.pow(2, interval / 12);
}

// ── Mood-to-melody mapping ─────────────────────────────────────────
type Mood = 'menu' | 'calm' | 'night' | 'intense' | 'credits';

interface MoodConfig {
  melody: MelodyNote[];
  bass: MelodyNote[];
  tempo: number;
  scale: number[];
  polyphony: PolyphonyConfig;
  // Optional contrasting middle section (A-B-A' form)
  middleMelody?: MelodyNote[];
  middleBass?: MelodyNote[];
  middleScale?: number[];
  // Section form: how many loops of A before switching to B
  sectionLoopsA?: number;
  sectionLoopsB?: number;
  // Triplet bass: subdivide bass notes into 3 sub-attacks
  tripletBass?: boolean;
  // Picardy third: chance of major-mode color on final cadence
  picardyChance?: number;
}

const MOOD_DATA: Record<Mood, MoodConfig> = {
  menu: {
    melody: MENU_MELODY, bass: MENU_BASS, tempo: 1.4,
    scale: SCALES['Eb_major'],
    polyphony: { harmonyChance: 0.35, harmonyVolume: 0.38, harmonyDelay: 0.04,
                 echoChance: 0.25, echoVolume: 0.22 },
    tripletBass: true,
  },
  calm: {
    melody: CALM_MELODY, bass: CALM_BASS, tempo: 1.2,
    scale: SCALES['Ab_major'],
    polyphony: { harmonyChance: 0.20, harmonyVolume: 0.30, harmonyDelay: 0.05,
                 echoChance: 0.20, echoVolume: 0.18 },
    tripletBass: true,
  },
  night: {
    melody: NIGHT_MELODY, bass: NIGHT_BASS, tempo: 1.2,
    scale: SCALES['Bb_minor'],
    polyphony: { harmonyChance: 0.30, harmonyVolume: 0.35, harmonyDelay: 0.05,
                 echoChance: 0.30, echoVolume: 0.20 },
    middleMelody: NIGHT_MIDDLE_MELODY,
    middleBass: NIGHT_MIDDLE_BASS,
    middleScale: SCALES['Db_major'],
    sectionLoopsA: 2,
    sectionLoopsB: 1,
    tripletBass: true,
    picardyChance: 0.15,
  },
  intense: {
    melody: INTENSE_MELODY, bass: INTENSE_BASS, tempo: 1.6,
    scale: SCALES['C_minor'],
    polyphony: { harmonyChance: 0.45, harmonyVolume: 0.42, harmonyDelay: 0.03,
                 echoChance: 0.15, echoVolume: 0.20 },
    // Intense keeps straight bass for urgency
  },
  credits: {
    melody: CREDITS_MELODY, bass: CREDITS_BASS, tempo: 1.2,
    scale: SCALES['Eb_major'],
    polyphony: { harmonyChance: 0.40, harmonyVolume: 0.40, harmonyDelay: 0.04,
                 echoChance: 0.30, echoVolume: 0.25 },
    tripletBass: true,
  },
};

// ── Volume constants ───────────────────────────────────────────────
const MELODY_VOLUME = 0.18;  // Base melody volume (before velocity)
const BASS_VOLUME = 0.13;    // Base bass volume — understated foundation under polyphony
const FADE_TIME = 2.0;       // Crossfade duration in seconds

// ── Music system class ─────────────────────────────────────────────

let musicInstance: MusicSystem | null = null;

export class MusicSystem {
  private ctx: AudioContext | null = null;
  private musicNode: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private melodyTimerId: ReturnType<typeof setTimeout> | null = null;
  private bassTimerId: ReturnType<typeof setTimeout> | null = null;
  private currentMood: Mood | null = null;
  private melodyIndex = 0;
  private bassIndex = 0;
  private playing = false;
  private paused = false;

  // Section form state (A–B–A' for night mood)
  private section: 'A' | 'B' | 'Aprime' = 'A';
  private sectionLoops = 0;

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

    // ── Global Reverb (Convolver) ──
    // Procedural impulse response for wooden body resonance
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.generateReverbBuffer(2.0, 4); // 2s tail
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.35; // Wet mix
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    this.currentMood = mood;
    // Both voices start together for harmonic alignment
    this.melodyIndex = 0;
    this.bassIndex = 0;
    this.section = 'A';
    this.sectionLoops = 0;
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

  /** Get the active melody/bass/scale arrays based on current section. */
  private getActiveArrays(): { melody: MelodyNote[]; bass: MelodyNote[]; scale: number[] } {
    const data = MOOD_DATA[this.currentMood!];
    if (this.section === 'B' && data.middleMelody && data.middleBass) {
      return {
        melody: data.middleMelody,
        bass: data.middleBass,
        scale: data.middleScale || data.scale,
      };
    }
    return { melody: data.melody, bass: data.bass, scale: data.scale };
  }

  /** Handle section transitions (A→B→A') when melody loops back to index 0. */
  private advanceSection(): void {
    const data = MOOD_DATA[this.currentMood!];
    if (!data.middleMelody) return; // No section form for this mood

    this.sectionLoops++;
    const loopsA = data.sectionLoopsA ?? 2;
    const loopsB = data.sectionLoopsB ?? 1;

    if (this.section === 'A' && this.sectionLoops >= loopsA) {
      this.section = 'B';
      this.sectionLoops = 0;
      this.melodyIndex = 0;
      this.bassIndex = 0;
    } else if (this.section === 'B' && this.sectionLoops >= loopsB) {
      this.section = 'Aprime';
      this.sectionLoops = 0;
      this.melodyIndex = 0;
      this.bassIndex = 0;
    } else if (this.section === 'Aprime' && this.sectionLoops >= 1) {
      this.section = 'A';
      this.sectionLoops = 0;
      this.melodyIndex = 0;
      this.bassIndex = 0;
    }
  }

  private scheduleMelodyNote(): void {
    if (!this.playing || this.paused || !this.currentMood || !this.ctx) return;

    const data = MOOD_DATA[this.currentMood];
    const { melody, scale } = this.getActiveArrays();
    const note = melody[this.melodyIndex];
    const beatDuration = 1 / data.tempo;
    const noteDuration = note.duration * beatDuration;

    // ── Phrase-level dynamic swell ──
    // Op. 9 No. 2: "continual surges and ebbs" — sine-shaped volume contour
    const phraseT = melody.length > 1 ? this.melodyIndex / (melody.length - 1) : 0.5;
    const phraseShape = 0.78 + 0.40 * Math.sin(Math.PI * phraseT);

    // Add rubato: ±12% timing variation for Chopin-like temporal freedom
    const rubato = 1 + (Math.random() - 0.5) * 0.24;
    const actualDuration = noteDuration * rubato;

    if (note.freq > 0) {
      const swelledVolume = note.velocity * MELODY_VOLUME * phraseShape;
      this.playNote(note.freq, actualDuration * 0.9, swelledVolume, false);

      const inMiddleSection = this.section === 'B';

      // ── Octave doubling in middle section (sotto voce) ──
      // Op. 9 No. 1: "led in octaves sotto voce"
      if (inMiddleSection) {
        const octaveVol = swelledVolume * 0.35;
        setTimeout(() => {
          this.playNote(note.freq * 2, actualDuration * 0.8, octaveVol, false);
        }, 15); // 15ms spread
      }

      // Polyphonic voices only in outer sections (middle is "ascetic")
      if (!inMiddleSection) {
        const poly = data.polyphony;
        // Scale harmony/echo chances by phrase shape
        const effectiveHarmonyChance = poly.harmonyChance * (0.7 + 0.9 * (phraseShape - 0.78));
        const effectiveEchoChance = poly.echoChance * (0.6 + 1.2 * (phraseShape - 0.78));

        // ── Counter-melody: diatonic third below ──
        if (Math.random() < effectiveHarmonyChance) {
          const harmFreq = diatonicThirdBelow(note.freq, scale);
          if (harmFreq > 130) {
            const harmVol = swelledVolume * poly.harmonyVolume;
            setTimeout(() => {
              this.playNote(harmFreq, actualDuration * 0.85, harmVol, false);
            }, poly.harmonyDelay * 1000);
          }
        }

        // ── Ornamental echo: neighbor-tone turn on longer notes ──
        if (note.duration >= 1.0 && Math.random() < effectiveEchoChance) {
          const semitone = Math.pow(2, 1 / 12);
          const upperNeighbor = note.freq * semitone * semitone;
          const echoVol = swelledVolume * poly.echoVolume;
          const graceDelay = actualDuration * 0.3;
          const graceDuration = actualDuration * 0.12;
          setTimeout(() => {
            this.playNote(upperNeighbor, graceDuration, echoVol, false);
          }, graceDelay * 1000);
          setTimeout(() => {
            this.playNote(note.freq, graceDuration, echoVol * 0.8, false);
          }, (graceDelay + graceDuration) * 1000);
        }

        // ── Distant echo at cadences ──
        // Op. 9 No. 1: "sonorous music... immediately followed by its distant echo"
        if (note.duration >= 3.0) {
          const echoDelay = 0.25;
          const echoVol = swelledVolume * 0.14;
          setTimeout(() => {
            this.playNote(note.freq * 2, actualDuration * 0.15, echoVol, false);
          }, echoDelay * 1000);
        }

        // ── Picardy third on night cadence ──
        // Op. 9 No. 1: "dying away not in B♭ minor, but in B♭ major"
        if (data.picardyChance && note.duration >= 3.5 && Math.random() < data.picardyChance) {
          const picardyNotes = [NOTE.D4, NOTE.F4, NOTE.Bb4]; // B♭ major color
          picardyNotes.forEach((pFreq, i) => {
            const pDelay = 0.4 + i * 0.15;
            const pVol = swelledVolume * (0.12 - i * 0.02);
            setTimeout(() => {
              this.playNote(pFreq, 0.4, pVol, false);
            }, pDelay * 1000);
          });
        }
      }
    }

    // Advance and handle section looping
    this.melodyIndex++;
    if (this.melodyIndex >= melody.length) {
      this.melodyIndex = 0;
      this.advanceSection();
    }

    this.melodyTimerId = setTimeout(
      () => this.scheduleMelodyNote(),
      actualDuration * 1000,
    );
  }

  private scheduleBassNote(): void {
    if (!this.playing || this.paused || !this.currentMood || !this.ctx) return;

    const data = MOOD_DATA[this.currentMood];
    const { bass, scale } = this.getActiveArrays();
    const note = bass[this.bassIndex];
    const beatDuration = 1 / data.tempo;
    const noteDuration = note.duration * beatDuration;

    const rubato = 1 + (Math.random() - 0.5) * 0.14;
    const actualDuration = noteDuration * rubato;

    if (note.freq > 0) {
      if (data.tripletBass && note.duration >= 0.5) {
        // ── Triplet bass: 12/8 nocturne accompaniment ──
        // Roll the same pitch with diminishing velocity for lulling feel
        const subDur = actualDuration / 3;
        const vols = [1.0, 0.65, 0.50];
        vols.forEach((v, i) => {
          setTimeout(() => {
            this.playNote(note.freq, subDur * 0.8, note.velocity * BASS_VOLUME * v, true);
          }, i * subDur * 1000);
        });
      } else {
        this.playNote(note.freq, actualDuration * 0.8, note.velocity * BASS_VOLUME, true);
      }
    }

    this.bassIndex++;
    if (this.bassIndex >= bass.length) {
      this.bassIndex = 0;
    }

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

    // ── Output chain: note gain → panner → soundboard → master ──
    const noteGain = this.ctx.createGain();
    
    // Stereo spread: Bass left (-0.5), Treble right (+0.5)
    const panner = this.ctx.createStereoPanner();
    // Map freq 100Hz..2000Hz to -0.5..0.5
    const panPos = Math.max(-0.6, Math.min(0.6, (Math.log2(freq / 261.6) * 0.15)));
    panner.pan.value = panPos;

    const soundboard = this.ctx.createBiquadFilter();
    soundboard.type = 'lowpass';
    // Piano soundboard: warm, rounded — lower cutoff than harpsichord
    const baseFreq = isBass ? 1400 : 2800;
    const brightBoost = (volume / 0.2) * (isBass ? 500 : 1500);
    soundboard.frequency.setValueAtTime(baseFreq + brightBoost, now);
    // Brightness fades as the note decays (real piano behavior)
    soundboard.frequency.setTargetAtTime(baseFreq * 0.5, now + 0.05, duration * 0.5);
    soundboard.Q.setValueAtTime(0.4, now);
    noteGain.connect(panner);
    panner.connect(soundboard);
    soundboard.connect(this.masterGain);

    // Reverb send (post-panner, post-soundboard for cohesion)
    if (this.reverbNode) {
      const send = this.ctx.createGain();
      // Send less bass to reverb to avoid mud
      send.gain.value = isBass ? 0.4 : 0.7;
      soundboard.connect(send);
      send.connect(this.reverbNode);
    }

    // ── Release noise: damper falling back ──
    const releaseTime = now + duration;
    // Only audible on longer notes where the release is distinct
    if (duration > 0.3) {
      const dGain = this.ctx.createGain();
      const dOsc = this.ctx.createOscillator();
      // Low thud (50Hz) + high click filter would be better, but simple sine thud works
      dOsc.frequency.value = 40;
      dGain.gain.setValueAtTime(0, releaseTime);
      dGain.gain.linearRampToValueAtTime(volume * 0.04, releaseTime + 0.02);
      dGain.gain.exponentialRampToValueAtTime(0.001, releaseTime + 0.15);
      dOsc.connect(dGain);
      dGain.connect(this.masterGain);
      dOsc.start(releaseTime);
      dOsc.stop(releaseTime + 0.2);
    }

    // ── Piano envelope: soft felt-hammer attack, long singing sustain ──
    // Real piano: hammer compresses, tone blooms gradually, sustain rings
    const attack = 0.020;
    const sustainLevel = 0.62;
    const stage1Time = duration * 0.28;
    const stage2Time = duration * 0.70;

    noteGain.gain.setValueAtTime(0, now);
    // Exponential ramp for softer bloom (not linear snap)
    noteGain.gain.setTargetAtTime(volume, now, attack / 3);
    noteGain.gain.setTargetAtTime(volume * sustainLevel, now + attack, stage1Time);
    noteGain.gain.setTargetAtTime(0.001, now + duration * 0.7, stage2Time);

    // ── Hammer strike: very subtle felt thud ──
    const noiseLen = 0.008;
    const noiseBuf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * noiseLen), this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      // Shape the noise: sharper at start, fading
      const env = 1 - (i / noiseData.length);
      noiseData[i] = (Math.random() * 2 - 1) * env * 0.4;
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(Math.min(freq * 3, 6000), now);
    noiseFilter.Q.setValueAtTime(0.8, now);
    noiseGain.gain.setValueAtTime(volume * (isBass ? 0.06 : 0.08), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(panner); // Bypass note envelope for crisp attack
    noiseSrc.start(now);
    noiseSrc.stop(now + noiseLen);

    // ── Hammer Thump (low frequency impact) ──
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    // Pitch drop mimics physical impact
    thudOsc.frequency.setValueAtTime(120, now);
    thudOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    // Quick burst
    thudGain.gain.setValueAtTime(volume * (isBass ? 0.3 : 0.15), now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    thudOsc.connect(thudGain);
    thudGain.connect(panner); // Bypass note envelope
    thudOsc.start(now);
    thudOsc.stop(now + 0.1);

    // ── Harmonic series with inharmonicity ──
    // B = inharmonicity coefficient (real piano: ~0.0004 for mid-range)
    const B = isBass ? 0.0003 : 0.0005;

    const harmonics = isBass
      ? [ // Bass: warm fundamental-heavy
          { ratio: 1, vol: 1.0 },
          { ratio: 2, vol: 0.35 },
          { ratio: 3, vol: 0.10 },
          { ratio: 4, vol: 0.04 },
          { ratio: 5, vol: 0.015 },
        ]
      : [ // Melody: round piano tone, fundamental dominant
          { ratio: 1, vol: 1.0 },
          { ratio: 2, vol: 0.38 },
          { ratio: 3, vol: 0.14 },
          { ratio: 4, vol: 0.06 },
          { ratio: 5, vol: 0.025 },
          { ratio: 6, vol: 0.012 },
          { ratio: 7, vol: 0.006 },
        ];

    const endTime = now + duration + 0.5;

    for (const h of harmonics) {
      // Inharmonicity: f_n = n * f0 * sqrt(1 + B * n^2)
      const stretchedFreq = freq * h.ratio * Math.sqrt(1 + B * h.ratio * h.ratio);

      // Per-note volume randomization (±5%) — no two notes identical
      const noteVariation = 1 + (Math.random() - 0.5) * 0.10;
      const hGain = this.ctx.createGain();
      hGain.gain.setValueAtTime(h.vol * noteVariation, now);
      if (h.ratio > 1) {
        const harmonicDecay = duration * (0.2 / h.ratio);
        hGain.gain.setTargetAtTime(h.vol * noteVariation * 0.08, now + attack, harmonicDecay);
      }
      hGain.connect(noteGain);

      // ── String pair: two slightly detuned oscillators per harmonic ──
      // Real pianos have 2–3 strings per note, never perfectly in tune.
      // The beating between them creates warmth and "life".
      const pairCount = h.ratio <= 2 ? 2 : 1; // only double fundamental+2nd
      for (let p = 0; p < pairCount; p++) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        // Each string detuned ±3 cents (wider spread than before)
        const detuneCents = pairCount > 1
          ? (p === 0 ? -2.5 : 2.5) + (Math.random() - 0.5) * 1.5
          : (Math.random() - 0.5) * 4;
        const detunedFreq = stretchedFreq * Math.pow(2, detuneCents / 1200);

        // ── Pitch settling: strings start slightly sharp then relax ──
        // Real piano strings overshoot on hammer impact, settle over ~50ms
        const settleAmount = isBass ? 8 : 5; // cents overshoot
        const startFreq = detunedFreq * Math.pow(2, settleAmount / 1200);
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.setTargetAtTime(detunedFreq, now + 0.003, 0.015);

        // Scale volume for string pairs (split evenly)
        const pairGain = this.ctx.createGain();
        pairGain.gain.setValueAtTime(pairCount > 1 ? 0.55 : 1.0, now);
        osc.connect(pairGain);
        pairGain.connect(hGain);
        osc.start(now);
        osc.stop(endTime);
      }
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

  private generateReverbBuffer(duration: number, decay: number): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx!.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  private cleanup(): void {
    if (this.melodyTimerId) { clearTimeout(this.melodyTimerId); this.melodyTimerId = null; }
    if (this.bassTimerId) { clearTimeout(this.bassTimerId); this.bassTimerId = null; }
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch { /* already disconnected */ }
      this.masterGain = null;
    }
    if (this.reverbGain) {
      try { this.reverbGain.disconnect(); } catch { /* ok */ }
      this.reverbGain = null;
    }
    this.reverbNode = null;
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
