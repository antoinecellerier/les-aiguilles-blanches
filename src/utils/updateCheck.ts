/**
 * Checks if a newer version of the app is deployed.
 * Fetches version.json (with cache-busting) and compares against
 * the baked-in __APP_VERSION__. Returns the remote version string
 * if an update is available, null otherwise.
 *
 * Only runs in production builds. Caches result for the session.
 */

let cachedResult: string | null | undefined;

export async function checkForUpdate(): Promise<string | null> {
  if (import.meta.env.DEV) return null;
  if (cachedResult !== undefined) return cachedResult;

  try {
    const res = await fetch(`./version.json?_=${Date.now()}`);
    if (!res.ok) { cachedResult = null; return null; }
    const data = await res.json();
    const local = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
    if (data.version && data.version !== local) {
      cachedResult = data.version;
      return data.version;
    }
    cachedResult = null;
    return null;
  } catch {
    cachedResult = null;
    return null;
  }
}
