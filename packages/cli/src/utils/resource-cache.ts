/**
 * A tiny, process-scoped, in-memory cache for a single resource type.
 *
 * The CLI runs as a fresh process per invocation, so caches built with this
 * helper live only for the lifetime of one command — there is no cross-process
 * staleness risk and no need for a TTL. Writes that return the authoritative
 * object should refresh the entry; writes that bypass the normal update path
 * must invalidate it.
 *
 * Values are cloned on the way in and out so callers cannot mutate a shared
 * cached object.
 */
export interface ResourceCache<T> {
  /** Returns a clone of the cached value, or `undefined` on a miss. */
  get(key: string): T | undefined;
  /** Stores a clone of `value` under `key`. */
  set(key: string, value: T): void;
  /** Drops a single key, or clears everything when no key is given. */
  invalidate(key?: string): void;
}

export function createResourceCache<T>(): ResourceCache<T> {
  const store = new Map<string, T>();

  return {
    get(key: string): T | undefined {
      const cached = store.get(key);
      return cached === undefined ? undefined : structuredClone(cached);
    },
    set(key: string, value: T): void {
      store.set(key, structuredClone(value));
    },
    invalidate(key?: string): void {
      if (key) {
        store.delete(key);
      } else {
        store.clear();
      }
    },
  };
}
