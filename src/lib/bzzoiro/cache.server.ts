// Postgres-backed cache for Bzzoiro API responses. Uses service_role so it
// bypasses RLS on the `bzzoiro_cache` table (which has no policies — the
// table is intentionally server-only).

import { z } from "zod";
import { bzzoiroFetch, type FetchOptions } from "./client.server";
import type { CacheStore, CacheEntry } from "./cache-store";

// Hash-based cache key to keep index size small.
export async function hashKey(prefix: string, params: Record<string, unknown>): Promise<string> {
  const ordered = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = params[k];
      return acc;
    }, {});
  const json = JSON.stringify(ordered);
  const encoder = new TextEncoder();
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(json));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}:${hashHex}`;
}

// Lazy Supabase admin client (only loaded when needed).
let _admin: Awaited<ReturnType<typeof getSupabaseAdmin>> | null = null;

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function defaultStore(): CacheStore {
  const store: CacheStore = {
    async get(key: string): Promise<CacheEntry | null> {
      if (!_admin) _admin = await getSupabaseAdmin();
      const { data } = await _admin
        .from("bzzoiro_cache")
        .select("payload, expires_at")
        .eq("cache_key", key)
        .maybeSingle();
      if (!data) return null;
      return { payload: data.payload, expiresAt: data.expires_at };
    },

    async set(key: string, entry: CacheEntry): Promise<void> {
      if (!_admin) _admin = await getSupabaseAdmin();
      await _admin.from("bzzoiro_cache").upsert(
        {
          cache_key: key,
          payload: entry.payload as never,
          fetched_at: new Date().toISOString(),
          expires_at: entry.expiresAt,
        },
        { onConflict: "cache_key" },
      );
    },
  };
  return store;
}

export interface CachedFetchOptions<T> extends FetchOptions {
  /** Stable key for this request. */
  key: string;
  /** Time-to-live in seconds. */
  ttlSeconds: number;
  /** Optional post-processor before caching. */
  transform?: (raw: unknown) => T;
  /** Optional Zod schema to validate cached payload at runtime. */
  schema?: z.ZodType<T>;
  /** Optional store override (defaults to Supabase). */
  store?: CacheStore;
}

export async function bzzoiroCachedFetch<T>(path: string, opts: CachedFetchOptions<T>): Promise<T> {
  const store = opts.store ?? defaultStore();
  const nowIso = new Date().toISOString();

  // 1. Try cache.
  const cached = await store.get(opts.key);
  if (cached && cached.expiresAt > nowIso) {
    if (opts.schema) return opts.schema.parse(cached.payload);
    return cached.payload as T;
  }

  // 2. Fetch fresh.
  const raw = await bzzoiroFetch<unknown>(path, opts);
  const value = (opts.transform ? opts.transform(raw) : raw) as T;

  // 2b. Validate fresh value before caching (same check as cache-hit path).
  if (opts.schema) {
    opts.schema.parse(value);
  }

  // 3. Upsert into cache. Ignore write errors — cache miss is not fatal.
  const expiresAt = new Date(Date.now() + opts.ttlSeconds * 1000).toISOString();
  try {
    await store.set(opts.key, { payload: value, expiresAt });
  } catch (err) {
    console.warn("[bzzoiro] Cache upsert failed (non-fatal):", err);
  }

  return value;
}
