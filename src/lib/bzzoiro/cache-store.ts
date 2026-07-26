// CacheStore interface — allows swapping Postgres backend for tests or other stores.

export interface CacheEntry {
  payload: unknown;
  expiresAt: string; // ISO 8601
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
}

// In‑memory store, useful for tests and environments without Postgres.
export class InMemoryCacheStore implements CacheStore {
  private map = new Map<string, CacheEntry>();

  async get(key: string): Promise<CacheEntry | null> {
    return this.map.get(key) ?? null;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.map.set(key, entry);
  }

  /** Test helper: clear all entries. */
  clear(): void {
    this.map.clear();
  }
}
