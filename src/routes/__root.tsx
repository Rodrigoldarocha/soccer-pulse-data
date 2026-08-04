import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
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
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
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
      { title: "Zagueiro — Previsões ML de Futebol" },
      {
        name: "description",
        content:
          "Previsões CatBoost para partidas de futebol: 1X2, Over/Under, BTTS e placar mais provável.",
      },
      { name: "author", content: "Zagueiro" },
      { property: "og:title", content: "Zagueiro — Previsões ML de Futebol" },
      {
        property: "og:description",
        content:
          "Previsões CatBoost para partidas de futebol com probabilidades 1X2, Over/Under, BTTS e confiança do modelo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <header className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="clay-primary grid h-11 w-11 place-items-center">
              <span className="font-black">Z</span>
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight">Zagueiro</span>
              <span className="block text-xs text-muted-foreground">
                Previsões de futebol via CatBoost
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { to: "/", label: "Hoje" },
              { to: "/amanha", label: "Amanhã" },
              { to: "/proximos", label: "Próximos" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "clay-primary px-4 py-2 font-bold" }}
                inactiveProps={{
                  className: "clay-sm px-4 py-2 font-semibold text-muted-foreground",
                }}
                className="transition active:translate-y-0.5"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/live"
              activeProps={{ className: "clay-primary px-4 py-2 font-bold" }}
              inactiveProps={{ className: "clay-sm px-4 py-2 font-semibold text-destructive" }}
              className="transition active:translate-y-0.5"
            >
              🔴 Ao Vivo
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
    </QueryClientProvider>
  );
}

