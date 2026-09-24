import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Suspense, useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppLayout } from "@/components/AppLayout";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-in">
        <div className="text-8xl font-display font-bold text-primary mb-4">404</div>
        <h2 className="text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground/60">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground/60">
          Ocorreu um erro ao carregar a página. Tente recarregar ou volte ao início.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.04]"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PulseLab — Probabilidades de Futebol" },
      {
        name: "description",
        content: "Dashboard de probabilidades de futebol: BTTS, 1X2 e Over/Under 2.5.",
      },
      { property: "og:title", content: "PulseLab — Probabilidades de Futebol" },
      {
        property: "og:description",
        content: "Dashboard de probabilidades de futebol: BTTS, 1X2 e Over/Under 2.5.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PulseLab — Probabilidades de Futebol" },
      {
        name: "twitter:description",
        content: "Dashboard de probabilidades de futebol: BTTS, 1X2 e Over/Under 2.5.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="dark">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-72 rounded bg-white/[0.04]" />
      </div>
      <div className="relative mb-5">
        <div className="h-10 w-full rounded-lg border border-border/50 bg-white/[0.04]" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stagger-item">
            <div className="mb-2 h-3 w-24 rounded bg-white/[0.04]" />
            <div className="space-y-1.5">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 rounded border border-border/50 bg-card px-3 py-2.5"
                >
                  <div className="h-5 w-12 rounded bg-white/[0.06]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-24 rounded bg-white/[0.06]" />
                    <div className="h-4 w-20 rounded bg-white/[0.06]" />
                  </div>
                  <div className="h-5 w-16 rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Suspense fallback={<LoadingSkeleton />}>
          <Outlet />
        </Suspense>
      </AppLayout>
    </QueryClientProvider>
  );
}
