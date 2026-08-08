// Client-safe error types for the Bzzoiro API. No secrets, no process.env —
// safe to import from routes and components.

export class BzzoiroApiError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    public path: string,
    public responseBody?: string,
  ) {
    super(`Bzzoiro API error: ${statusCode} ${statusText} - ${path}`);
    this.name = "BzzoiroApiError";
  }

  isRetryable(): boolean {
    return this.statusCode === 429 || this.statusCode >= 500;
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  isRateLimit(): boolean {
    return this.statusCode === 429;
  }

  getUserMessage(): string {
    switch (this.statusCode) {
      case 401:
        return "Credenciais da API inválidas. Contate o suporte.";
      case 403:
        return "Acesso negado. Este recurso requer um plano Pro.";
      case 404:
        return "Recurso não encontrado.";
      case 429:
        return "Muitas requisições. Aguarde um momento e tente novamente.";
      case 500:
      case 502:
      case 503:
      case 504:
        return "O servidor da API está temporariamente indisponível. Tente novamente em alguns instantes.";
      default:
        return `Erro ${this.statusCode}: ${this.statusText}`;
    }
  }
}

export class BzzoiroTimeoutError extends Error {
  constructor(
    public path: string,
    public timeoutMs: number,
  ) {
    super(`Request timeout for ${path} after ${timeoutMs}ms`);
    this.name = "BzzoiroTimeoutError";
  }
}

export class BzzoiroTokenError extends Error {
  constructor() {
    super("BZZOIRO_TOKEN is not configured. Add it via the secrets manager.");
    this.name = "BzzoiroTokenError";
  }
}

/** Delay (ms) to wait before retrying, or undefined for default backoff. */
export function getRetryDelay(error: unknown): number | undefined {
  if (error instanceof BzzoiroApiError && error.isRateLimit()) {
    const rateLimits = (globalThis as Record<string, unknown>).__BZZOIRO_RATE_LIMITS as
      | Map<string, { retryAfter: number }>
      | undefined;
    const rateLimit = rateLimits?.get(error.path);
    if (rateLimit) return rateLimit.retryAfter * 1000 + 1000;
    return 60_000;
  }
  return undefined;
}
