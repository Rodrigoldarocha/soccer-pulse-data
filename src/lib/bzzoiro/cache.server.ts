// Postgres-backed cache for Bzzoiro API responses. Uses service_role so it
// bypasses RLS on the `bzzoiro_cache` table (which has no policies — the
// table is intentionally server-only).

import { z } from "zod";
import { bzzoiroFetch, type FetchOptions } from "./client.server";

// Hash-based cache key to keep index size small.
export async function hashKey(prefix: string, params: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(params);
  const encoder = new TextEncoder();
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(json));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}:${hashHex}`;
}

// Load service-role client lazily to keep this module cheap.
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
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
}

export async function bzzoiroCachedFetch<T>(
  path: string,
  opts: CachedFetchOptions<T>,
): Promise<T> {
  const admin = await getAdmin();
  const nowIso = new Date().toISOString();

  // 1. Try cache.
  const { data: cached } = await admin
    .from("bzzoiro_cache")
    .select("payload, expires_at")
    .eq("cache_key", opts.key)
    .maybeSingle();

  if (cached && cached.expires_at > nowIso) {
    if (opts.schema) return opts.schema.parse(cached.payload);
    return cached.payload as T;
  }

  // 2. Fetch fresh.
  const raw = await bzzoiroFetch<unknown>(path, opts);
  const value = (opts.transform ? opts.transform(raw) : raw) as T;

  // 3. Upsert into cache. Ignore write errors — cache miss is not fatal.
  const expiresAt = new Date(Date.now() + opts.ttlSeconds * 1000).toISOString();
  try {
    await admin
      .from("bzzoiro_cache")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(
        {
          cache_key: opts.key,
          payload: value as any,
          fetched_at: nowIso,
          expires_at: expiresAt,
        },
        { onConflict: "cache_key" },
      );
  } catch (err) {
    console.warn("[bzzoiro] Cache upsert failed (non-fatal):", err);
  }

  return value;
}
