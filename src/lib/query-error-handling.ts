import { QueryClient, QueryObserverResult } from "@tanstack/react-query";

export function getQueryErrorMessage(error: unknown): string {
  if (error instanceof Response) {
    switch (error.status) {
      case 401:
        return "Não autenticado. Verifique suas credenciais.";
      case 403:
        return "Acesso negado. Permissões insuficientes.";
      case 404:
        return "Recurso não encontrado.";
      case 429:
        return "Muitas requisições. Tente novamente em alguns instantes.";
      case 500:
        return "Erro interno do servidor.";
      case 503:
        return "Serviço temporariamente indisponível.";
      default:
        return `Erro ${error.status}: ${error.statusText}`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro desconhecido. Tente novamente.";
}

export function getQueryRetryMessage(failureCount: number): string {
  if (failureCount >= 3) {
    return "Falha após várias tentativas. Verifique sua conexão.";
  }
  return `Tentando novamente... (${failureCount}/3)`;
}

export interface PartialDataInfo {
  hasPartialData: boolean;
  warnings: string[];
  source: "cache" | "fallback" | "degraded";
}

export function extractPartialDataInfo<T>(
  result: QueryObserverResult<T, Error>
): PartialDataInfo {
  const warnings: string[] = [];
  let hasPartialData = false;
  let source: "cache" | "fallback" | "degraded" = "cache";

  if (result.isFetching) {
    if (result.data) {
      hasPartialData = true;
      source = "cache";
      warnings.push("Exibindo dados em cache enquanto atualiza...");
    }
  }

  if (result.error) {
    if (result.data) {
      hasPartialData = true;
      source = "degraded";
      warnings.push(getQueryErrorMessage(result.error));
    } else {
      source = "fallback";
      warnings.push("Usando dados de fallback — funcionalidade limitada.");
    }
  }

  if (result.data && typeof result.data === "object" && "partial" in result.data) {
    const data = result.data as Record<string, unknown>;
    if (data.partial === true) {
      hasPartialData = true;
      if (Array.isArray(data.notes)) {
        warnings.push(...data.notes.map(String));
      }
    }
  }

  return { hasPartialData, warnings, source };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function createErrorHandler(
  showToast: (message: string, type: "error" | "warning" | "info") => void
) {
  return (error: unknown) => {
    const message = getQueryErrorMessage(error);
    showToast(message, "error");
  };
}

export function createPartialDataHandler(
  showToast: (message: string, type: "error" | "warning" | "info") => void
) {
  return (info: PartialDataInfo) => {
    if (info.hasPartialData && info.warnings.length > 0) {
      info.warnings.forEach((w) => showToast(w, info.source === "fallback" ? "warning" : "info"));
    }
  };
}

export const API_ERROR_CODES = {
  BZZOIRO_TOKEN_MISSING: "BZZOIRO_TOKEN_MISSING",
  BZZOIRO_RATE_LIMIT: "BZZOIRO_RATE_LIMIT",
  BZZOIRO_UNAUTHORIZED: "BZZOIRO_UNAUTHORIZED",
  SUPABASE_UNAVAILABLE: "SUPABASE_UNAVAILABLE",
  PIPELINE_TIMEOUT: "PIPELINE_TIMEOUT",
  CALIBRATION_INSUFFICIENT_DATA: "CALIBRATION_INSUFFICIENT_DATA",
  ODD_NOT_AVAILABLE: "ODD_NOT_AVAILABLE",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export function parseApiError(response: Response): { code: ApiErrorCode; message: string } {
  switch (response.status) {
    case 401:
      return { code: "BZZOIRO_UNAUTHORIZED", message: "Token Bzzoiro inválido ou ausente." };
    case 403:
      if (response.headers.get("x-rate-limit-remaining") === "0") {
        return { code: "BZZOIRO_RATE_LIMIT", message: "Limite de requisições Bzzoiro excedido." };
      }
      return { code: "BZZOIRO_UNAUTHORIZED", message: "Acesso negado à API Bzzoiro." };
    case 504:
      return { code: "PIPELINE_TIMEOUT", message: "Pipeline de predição excedeu o tempo limite." };
    default:
      return { code: "BZZOIRO_UNAUTHORIZED", message: `Erro da API: ${response.statusText}` };
  }
}