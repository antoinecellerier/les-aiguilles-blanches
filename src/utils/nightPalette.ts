import { BALANCE } from '../config/gameConfig';

/**
 * Convert a daytime 0xRRGGBB color to its night-time equivalent.
 * Darkens by NIGHT_BRIGHTNESS and shifts toward blue by NIGHT_BLUE_SHIFT.
 */
export function nightColor(color: number): number {
  const b = BALANCE.NIGHT_BRIGHTNESS;
  const blueShift = BALANCE.NIGHT_BLUE_SHIFT;
  const r = Math.round(((color >> 16) & 0xff) * b);
  const g = Math.round(((color >> 8) & 0xff) * b);
  const rawB = Math.round((color & 0xff) * b);
  const blue = Math.min(255, rawB + Math.round(255 * blueShift));
  return (r << 16) | (g << 8) | blue;
}

/** Color transform function type — identity for day, nightColor for night */
export type ColorTransform = (color: number) => number;

/** Identity transform (day) */
export const dayColors: ColorTransform = (c) => c;

/** Night transform */
export const nightColors: ColorTransform = nightColor;

/** Suffix appended to texture keys for night variants */
export const NIGHT_SUFFIX = '_night';

/** List of texture keys that get night variants */
export const NIGHT_TEXTURE_KEYS = [
  'snow_ungroomed', 'snow_offpiste', 'snow_groomed', 'snow_packed',
  'snow_groomed_med', 'snow_groomed_rough',
  'snow_steep_25', 'snow_steep_30', 'snow_steep_35',
  'snow_steep_40', 'snow_steep_45', 'snow_steep_50',
  'snow_groomed_steep_25', 'snow_groomed_steep_30', 'snow_groomed_steep_35',
  'snow_groomed_steep_40', 'snow_groomed_steep_45', 'snow_groomed_steep_50',
];

/** Get the night key for a texture (e.g. 'snow_offpiste' → 'snow_offpiste_night') */
export function nightKey(key: string): string {
  return key + NIGHT_SUFFIX;
}
