import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Could send to error reporting service here
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[300px] items-center justify-center px-4">
          <div className="text-center space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-foreground">Algo deu errado</h2>
            <p className="text-label-sm text-muted-foreground/60">
              Ocorreu um erro inesperado. Nossa equipe foi notificada.
            </p>
            {this.state.error && (
              <details className="text-left max-w-md mx-auto p-3 rounded bg-surface-base/50 text-label-xs text-muted-foreground/70">
                <summary className="cursor-pointer font-semibold">Detalhes técnicos</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
              </details>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-primary-foreground font-label-sm font-semibold transition-colors hover:bg-primary-container active:scale-95"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Tentar novamente
              </button>
              <Link
                to="/"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-surface-base px-4 py-2 text-foreground font-label-sm font-semibold transition-colors hover:bg-surface-subtle active:scale-95"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function GlobalErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-canvas">
      <div className="text-center space-y-4">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive" aria-hidden="true" />
        <h1 className="font-display text-xl font-bold text-foreground">Erro Crítico</h1>
        <p className="text-label-sm text-muted-foreground/60 max-w-md">
          A aplicação encontrou um erro irrecuperável. Por favor, recarregue a página.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="flex items-center justify-center gap-1.5 mx-auto rounded-lg bg-primary px-6 py-3 text-primary-foreground font-label-md font-semibold transition-colors hover:bg-primary-container active:scale-95"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Recarregar Aplicação
        </button>
      </div>
    </div>
  );
}