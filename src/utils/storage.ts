/**
 * Type-safe localStorage helpers with JSON serialization.
 * Handles private browsing, quota exceeded, and corrupt data gracefully.
 * Write failures are logged to console for debugging.
 */

/** Read and parse a JSON value from localStorage. Returns fallback on any error. */
export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Read a raw string from localStorage. Returns fallback if missing. */
export function getString(key: string, fallback: string | null = null): string | null {
  return localStorage.getItem(key) ?? fallback;
}

/** Write a JSON-serialized value to localStorage. Logs warning on failure. */
export function setJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storage] Failed to save', key, e);
  }
}

/** Write a raw string value to localStorage. Logs warning on failure. */
export function setString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[storage] Failed to save', key, e);
  }
}

/** Remove a key from localStorage. Logs warning on failure. */
export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[storage] Failed to remove', key, e);
  }
}
