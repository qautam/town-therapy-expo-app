type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/** In-flight fetch dedupe so parallel callers share one network round-trip. */
const inflight = new Map<string, Promise<unknown>>();

/** Bumped on invalidate so stale in-flight responses cannot overwrite fresh data. */
const writeGeneration = new Map<string, number>();

type InvalidateListener = () => void;
const invalidateListeners = new Map<string, Set<InvalidateListener>>();

function notifyInvalidate(prefix: string) {
  for (const [registered, listeners] of invalidateListeners) {
    if (prefix.startsWith(registered) || registered.startsWith(prefix)) {
      listeners.forEach((listener) => listener());
    }
  }
}

function bumpWriteGeneration(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      writeGeneration.set(key, (writeGeneration.get(key) ?? 0) + 1);
    }
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) {
      writeGeneration.set(key, (writeGeneration.get(key) ?? 0) + 1);
    }
  }
}

/** Read a fresh (non-expired) cache entry. */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) return undefined;
  return entry.value as T;
}

/** Read cache even if expired — for instant paint + background refresh. */
export function cacheGetStale<T>(key: string): { value: T; fresh: boolean } | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  return { value: entry.value, fresh: Date.now() <= entry.expiresAt };
}

export function cacheSet<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Replace cache, cancel in-flight fetches, and notify subscribers (e.g. after a mutation). */
export function cacheReplace<T>(key: string, value: T, ttlMs: number) {
  bumpWriteGeneration(key);
  for (const inflightKey of inflight.keys()) {
    if (inflightKey.startsWith(key)) inflight.delete(inflightKey);
  }
  cacheSet(key, value, ttlMs);
  notifyInvalidate(key);
}

export function cacheInvalidate(prefix?: string) {
  if (!prefix) {
    store.clear();
    inflight.clear();
    writeGeneration.clear();
    notifyInvalidate('');
    return;
  }

  bumpWriteGeneration(prefix);

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }

  notifyInvalidate(prefix);
}

/** Notify subscribers without clearing cached data (e.g. after optimistic update). */
export function cacheNotify(prefix: string) {
  notifyInvalidate(prefix);
}

/** Subscribe to cache invalidation / notify for a key prefix. */
export function cacheOnInvalidate(prefix: string, listener: InvalidateListener) {
  if (!invalidateListeners.has(prefix)) {
    invalidateListeners.set(prefix, new Set());
  }
  invalidateListeners.get(prefix)!.add(listener);
  return () => {
    invalidateListeners.get(prefix)?.delete(listener);
  };
}

/**
 * Cache-first fetch with optional stale-while-revalidate.
 * - Fresh hit → return immediately
 * - Stale hit + onCacheHit → paint instantly, then revalidate
 * - Force → always network (still deduped)
 */
export async function cacheGetOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  options?: {
    force?: boolean;
    /** Called synchronously when any cached value exists (fresh or stale). */
    onCacheHit?: (value: T) => void;
  }
): Promise<T> {
  const cached = cacheGetStale<T>(key);

  if (cached && !options?.force) {
    options?.onCacheHit?.(cached.value);
    if (cached.fresh) return cached.value;
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing && !options?.force) {
    const value = await existing;
    options?.onCacheHit?.(value);
    return value;
  }

  const generation = writeGeneration.get(key) ?? 0;

  let pending!: Promise<T>;
  pending = (async () => {
    try {
      const value = await fetcher();
      if ((writeGeneration.get(key) ?? 0) === generation) {
        cacheSet(key, value, ttlMs);
      }
      return value;
    } finally {
      if (inflight.get(key) === pending) {
        inflight.delete(key);
      }
    }
  })();

  inflight.set(key, pending);
  return pending;
}
