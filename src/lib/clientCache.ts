type CacheEntry<T> = { value: T; at: number };

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCachedValue<T>(key: string, ttl = 60_000): T | null {
  const hit = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!hit || Date.now() - hit.at > ttl) return null;
  return hit.value;
}

export async function cachedQuery<T>(key: string, loader: () => Promise<T>, ttl = 60_000): Promise<T> {
  const cached = getCachedValue<T>(key, ttl);
  if (cached !== null) return cached;
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

export function setCachedValue<T>(key: string, value: T) {
  memoryCache.set(key, { value, at: Date.now() });
}

export function invalidateCache(prefix: string) {
  [...memoryCache.keys()].forEach((key) => { if (key.startsWith(prefix)) memoryCache.delete(key); });
  [...inflight.keys()].forEach((key) => { if (key.startsWith(prefix)) inflight.delete(key); });
}