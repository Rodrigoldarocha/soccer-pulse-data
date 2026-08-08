// Server-only Bzzoiro API client. The `.server.ts` extension makes this file
// unreachable from client bundles — the BZZOIRO_TOKEN never crosses to the
// browser. Import only from other `.server.ts` files or from inside a
// createServerFn `.handler()` body.

const BASE_URL = "https://sports.bzzoiro.com";

// Error types live in a client-safe module so routes/components can import
// them without pulling this server-only file into the browser bundle.
export { BzzoiroApiError, BzzoiroTimeoutError, BzzoiroTokenError, getRetryDelay } from "./errors";

import { BzzoiroApiError, BzzoiroTimeoutError, BzzoiroTokenError } from "./errors";

// ============================================================
// 2. TOKEN VALIDATION NO STARTUP
// ============================================================

if (!process.env.BZZOIRO_TOKEN) {
  console.error("[bzzoiro] BZZOIRO_TOKEN is not configured in environment variables");

  if (process.env.NODE_ENV === "production") {
    throw new BzzoiroTokenError();
  }

  console.warn("[bzzoiro] Running without BZZOIRO_TOKEN — API calls will fail.");
}

// ============================================================
// 3. FetchOptions interface
// ============================================================

export interface FetchOptions {
  /** Query-string params. `undefined` values are stripped. */
  params?: Record<string, string | number | undefined>;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** Timeout per attempt in ms (default 10_000). */
  timeoutMs?: number;
  /** Extra attempts after a timeout / 5xx (default 2). */
  retries?: number;
}

// ============================================================
// 4. Função auxiliar buildUrl
// ============================================================

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

// ============================================================
// 5. Função principal bzzoiroFetch
// ============================================================

export async function bzzoiroFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const attempts = Math.max(0, opts.retries ?? 2) + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await bzzoiroFetchOnce<T>(path, opts);
    } catch (error) {
      lastError = error;

      // Only transient failures are worth retrying.
      const transient =
        error instanceof BzzoiroTimeoutError ||
        (error instanceof BzzoiroApiError && error.isRetryable());

      if (!transient || attempt === attempts - 1 || opts.signal?.aborted) throw error;

      const delay = 400 * 2 ** attempt;
      console.warn(
        `[bzzoiro] ${path} failed (attempt ${attempt + 1}/${attempts}), retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

async function bzzoiroFetchOnce<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const token = process.env.BZZOIRO_TOKEN;
  if (!token) {
    throw new BzzoiroTokenError();
  }

  const url = buildUrl(path, opts.params);
  const timeoutMs = opts.timeoutMs ?? 10_000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = opts.signal
    ? AbortSignal.any([opts.signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json",
      },
      signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        // ignore body read error
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;

        const rateLimits = ((globalThis as Record<string, unknown>).__BZZOIRO_RATE_LIMITS ??=
          new Map<string, { retryAfter: number; timestamp: number }>()) as Map<
          string,
          { retryAfter: number; timestamp: number }
        >;
        rateLimits.set(path, { retryAfter: retrySeconds, timestamp: Date.now() });

        console.warn(`[bzzoiro] Rate limited on ${path}. Retry-After: ${retrySeconds}s`);
      }

      throw new BzzoiroApiError(res.status, res.statusText, path, body.slice(0, 500));
    }

    if (res.status === 204) {
      return undefined as T;
    }

    try {
      return (await res.json()) as T;
    } catch {
      const text = await res.text();
      throw new Error(`Failed to parse API response as JSON: ${text.slice(0, 200)}`);
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new BzzoiroTimeoutError(path, timeoutMs);
    }

    if (
      error instanceof BzzoiroApiError ||
      error instanceof BzzoiroTimeoutError ||
      error instanceof BzzoiroTokenError
    ) {
      throw error;
    }

    throw new Error(
      `Unexpected error calling ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// getRetryDelay is re-exported from ./errors above.

// ============================================================
// 7. Função de diagnóstico
// ============================================================

/**
 * Testa a conexão com a API Bzzoiro (apenas para diagnóstico).
 */
export async function testBzzoiroConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await bzzoiroFetch("/api/v2/leagues/", { timeoutMs: 12000 });
    return { ok: true };
  } catch (error) {
    if (error instanceof BzzoiroTokenError) {
      return { ok: false, error: "Token não configurado" };
    }
    if (error instanceof BzzoiroApiError) {
      return { ok: false, error: error.getUserMessage() };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}
