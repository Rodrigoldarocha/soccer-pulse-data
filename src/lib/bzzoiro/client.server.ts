// Server-only Bzzoiro API client. The `.server.ts` extension makes this file
// unreachable from client bundles — the BZZOIRO_TOKEN never crosses to the
// browser. Import only from other `.server.ts` files or from inside a
// createServerFn `.handler()` body.

const BASE_URL = "https://sports.bzzoiro.com";

export interface FetchOptions {
  /** Query-string params. `undefined` values are stripped. */
  params?: Record<string, string | number | boolean | undefined>;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: FetchOptions["params"]): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function bzzoiroFetch<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const token = process.env.BZZOIRO_TOKEN;
  if (!token) {
    throw new Error(
      "BZZOIRO_TOKEN is not configured. Add it via the secrets manager.",
    );
  }

  const url = buildUrl(path, opts.params);
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json",
    },
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Bzzoiro API ${res.status} ${res.statusText} on ${path}: ${body.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}
