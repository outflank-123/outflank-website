/**
 * Browser Cache Utility for Outflank E-Commerce
 * Provides typed, TTL-aware local and session storage caching
 * with stale-while-revalidate support to eliminate repeated API calls.
 */

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
}

export interface CacheResult<T> {
  data: T;
  isStale: boolean;
  ageMs: number;
}

/**
 * Retrieve cached data from localStorage or sessionStorage with TTL validation.
 * @param key Unique storage key
 * @param maxAgeMs Maximum age in milliseconds before data is considered stale. If omitted, data is never stale.
 * @param storage 'local' (default) or 'session'
 */
export function getBrowserCache<T>(
  key: string,
  maxAgeMs?: number,
  storage: 'local' | 'session' = 'local'
): CacheResult<T> | null {
  if (typeof window === 'undefined') return null;

  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    const item = store.getItem(key);
    if (!item) return null;

    const envelope: CacheEnvelope<T> = JSON.parse(item);
    if (!envelope || typeof envelope !== 'object' || !('data' in envelope) || !('timestamp' in envelope)) {
      return null;
    }

    const ageMs = Date.now() - envelope.timestamp;
    const isStale = maxAgeMs !== undefined ? ageMs > maxAgeMs : false;

    return {
      data: envelope.data,
      isStale,
      ageMs,
    };
  } catch {
    return null;
  }
}

/**
 * Save data to localStorage or sessionStorage with the current timestamp.
 * @param key Unique storage key
 * @param data Data payload to serialize
 * @param storage 'local' (default) or 'session'
 */
export function setBrowserCache<T>(
  key: string,
  data: T,
  storage: 'local' | 'session' = 'local'
): void {
  if (typeof window === 'undefined') return;

  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    const envelope: CacheEnvelope<T> = {
      data,
      timestamp: Date.now(),
    };
    store.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    console.warn('[browserCache] Storage quota or write error:', err);
  }
}

/**
 * Remove a specific key from storage.
 */
export function removeBrowserCache(
  key: string,
  storage: 'local' | 'session' = 'local'
): void {
  if (typeof window === 'undefined') return;

  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    store.removeItem(key);
  } catch {}
}

/**
 * Clear all cache entries starting with a prefix.
 */
export function clearBrowserCacheByPrefix(
  prefix: string,
  storage: 'local' | 'session' = 'local'
): void {
  if (typeof window === 'undefined') return;

  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    const keysToRemove: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => store.removeItem(k));
  } catch {}
}
