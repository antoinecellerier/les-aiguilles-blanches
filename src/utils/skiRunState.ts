/**
 * Shared state for ski run — stores groomed tile data from the
 * completed level so SkiRunScene can render it without serialization.
 */

/** Set of "x,y" keys for tiles the player groomed */
let groomedTileKeys: Set<string> | null = null;

export function setGroomedTiles(tiles: Set<string>): void {
  groomedTileKeys = tiles;
}

export function getGroomedTiles(): Set<string> {
  return groomedTileKeys ?? new Set();
}

export function clearGroomedTiles(): void {
  groomedTileKeys = null;
}
