/**
 * Seeded RNG utility for deterministic procedural generation.
 * Wraps Phaser.Math.RandomDataGenerator with seed-to-code conversion.
 */

const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Convert a numeric seed to a 4-6 char shareable code. */
export function seedToCode(seed: number): string {
  const abs = Math.abs(seed) >>> 0; // unsigned 32-bit
  let result = '';
  let n = abs;
  do {
    result = BASE36_CHARS[n % 36] + result;
    n = Math.floor(n / 36);
  } while (n > 0);
  return result.padStart(4, '0');
}

/** Convert a shareable code back to a numeric seed. */
export function codeToSeed(code: string): number {
  let result = 0;
  for (const ch of code.toUpperCase()) {
    const idx = BASE36_CHARS.indexOf(ch);
    if (idx < 0) continue;
    result = result * 36 + idx;
  }
  return result >>> 0;
}

/** Generate a daily seed from a date string (YYYYMMDD). */
export function dailySeed(date?: Date): number {
  const d = date || new Date();
  const str = `LAB${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return hashString(str);
}

/** Simple string hash (djb2). */
function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Seeded random number generator wrapping Phaser's RandomDataGenerator.
 * All methods produce deterministic results from the initial seed.
 */
export class SeededRNG {
  private rng: Phaser.Math.RandomDataGenerator;
  readonly seed: number;
  readonly code: string;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.code = seedToCode(this.seed);
    this.rng = new Phaser.Math.RandomDataGenerator([String(this.seed)]);
  }

  /** Create from a shareable code. */
  static fromCode(code: string): SeededRNG {
    return new SeededRNG(codeToSeed(code));
  }

  /** Create from today's date (Daily Shift). */
  static daily(date?: Date): SeededRNG {
    return new SeededRNG(dailySeed(date));
  }

  /** Random float 0 to 1 (inclusive). */
  frac(): number {
    return this.rng.frac();
  }

  /** Random integer between min and max (inclusive). */
  integerInRange(min: number, max: number): number {
    return this.rng.integerInRange(min, max);
  }

  /** Random float between min and max (inclusive). */
  realInRange(min: number, max: number): number {
    return this.rng.realInRange(min, max);
  }

  /** Returns true with the given probability (0-1). */
  chance(probability: number): boolean {
    return this.rng.frac() < probability;
  }

  /** Pick a random element from an array. */
  pick<T>(array: T[]): T {
    return this.rng.pick(array);
  }

  /** Shuffle an array (returns new array). */
  shuffle<T>(array: T[]): T[] {
    return this.rng.shuffle([...array]);
  }

  /** Returns -1 or +1. */
  sign(): number {
    return this.rng.sign();
  }
}
