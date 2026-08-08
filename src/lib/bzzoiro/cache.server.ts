// Postgres-backed cache for Bzzoiro API responses. Uses service_role so it
// bypasses RLS on the `bzzoiro_cache` table (which has no policies — the
// table is intentionally server-only).

import { z } from "zod";
import { bzzoiroFetch, type FetchOptions } from "./client.server";
import type { CacheStore, CacheEntry } from "./cache-store";
import { InMemoryCacheStore } from "./cache-store";

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
type SupabaseAdmin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

let _admin: SupabaseAdmin | null = null;

function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const memStore = new InMemoryCacheStore();

async function getSupabaseAdmin(): Promise<SupabaseAdmin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function defaultStore(): CacheStore {
  if (!hasSupabase()) {
    console.warn(
      "[cache] Supabase não configurado — usando cache em memória (por instância, não persiste).",
    );
    return memStore;
  }
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

  // 1. Try cache (válido).
  const cached = await store.get(opts.key);
  if (cached && cached.expiresAt > nowIso) {
    if (opts.schema) return opts.schema.parse(cached.payload);
    return cached.payload as T;
  }

  // Guarda cache expirado como fallback para caso de falha da API
  const staleCache = cached;

  try {
    // 2. Fetch fresh.
    const raw = await bzzoiroFetch<unknown>(path, opts);
    const value = (opts.transform ? opts.transform(raw) : raw) as T;

    // 2b. Validate fresh value before caching.
    if (opts.schema) {
      opts.schema.parse(value);
    }

    // 3. Upsert into cache. Ignore write errors.
    const expiresAt = new Date(Date.now() + opts.ttlSeconds * 1000).toISOString();
    try {
      await store.set(opts.key, { payload: value, expiresAt });
    } catch (err) {
      console.warn("[bzzoiro] Cache upsert failed (non-fatal):", err);
    }

    // 3b. Purga probabilística: 10% das chamadas limpam cache expirado.
    if (hasSupabase() && Math.random() < 0.1) {
      try {
        if (!_admin) _admin = await getSupabaseAdmin();
        await _admin.rpc("purge_expired_cache");
      } catch {
        // non-fatal
      }
    }

    return value;
  } catch (fetchError) {
    // 4. FALLBACK: se API falhou e temos cache expirado, serve mesmo assim
    if (staleCache) {
      console.warn(
        `[cache] API failed for ${path}, serving stale cache (expired at ${staleCache.expiresAt})`,
      );
      if (opts.schema) return opts.schema.parse(staleCache.payload);
      return staleCache.payload as T;
    }

    // 5. Sem cache algum — propaga erro original.
    throw fetchError;
  }
}
