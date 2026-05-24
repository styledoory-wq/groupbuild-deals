type CacheEntry<T> = { value: T; at: number };

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

// Default TTL bumped to 5 minutes (stale-while-revalidate semantics below).
export const DEFAULT_TTL = 5 * 60_000;

export function getCachedValue<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const hit = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!hit || Date.now() - hit.at > ttl) return null;
  return hit.value;
}

/** Read whatever's in cache regardless of age. */
export function peekCachedValue<T>(key: string): T | null {
  const hit = memoryCache.get(key) as CacheEntry<T> | undefined;
  return hit ? hit.value : null;
}

function runLoader<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const active = inflight.get(key) as Promise<T> | undefined;
  if (active) return active;
  const next = loader()
    .then((value) => {
      memoryCache.set(key, { value, at: Date.now() });
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });
  inflight.set(key, next);
  return next;
}

/**
 * Stale-while-revalidate cache:
 * - fresh hit (within ttl) → return immediately, no fetch
 * - stale hit (older than ttl) → return stale immediately, refresh in background
 * - miss → await loader
 */
export async function cachedQuery<T>(key: string, loader: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const fresh = getCachedValue<T>(key, ttl);
  if (fresh !== null) return fresh;
  const stale = peekCachedValue<T>(key);
  if (stale !== null) {
    // Kick off background revalidation but resolve immediately with stale data.
    runLoader(key, loader).catch((err) => console.warn(`[cache] revalidate failed for ${key}`, err));
    return stale;
  }
  return runLoader(key, loader);
}

/** Fire-and-forget prefetch — populates cache if missing or stale. */
export function prefetchQuery<T>(key: string, loader: () => Promise<T>, ttl = DEFAULT_TTL): void {
  if (getCachedValue<T>(key, ttl) !== null) return;
  runLoader(key, loader).catch((err) => console.warn(`[cache] prefetch failed for ${key}`, err));
}

export function setCachedValue<T>(key: string, value: T) {
  memoryCache.set(key, { value, at: Date.now() });
}

export function invalidateCache(prefix: string) {
  [...memoryCache.keys()].forEach((key) => { if (key.startsWith(prefix)) memoryCache.delete(key); });
  [...inflight.keys()].forEach((key) => { if (key.startsWith(prefix)) inflight.delete(key); });
}
