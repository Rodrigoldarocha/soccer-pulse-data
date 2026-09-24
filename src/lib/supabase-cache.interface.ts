// Maps `api_cache` table: key, payload, expires_at.
export interface SupabaseCacheInterface {
  from(t: string): {
    select(c: string): {
      eq(
        k: string,
        v: string,
      ): {
        maybeSingle(): Promise<{ data: { payload: unknown; expires_at: string } | null }>;
      };
    };
    upsert(row: Record<string, unknown>): Promise<unknown>;
  };
}
