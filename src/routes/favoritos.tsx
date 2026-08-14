import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";

import { listLeagues } from "@/lib/leagues.functions";
import { readFavorites, safeLocalStorage, toggleFavorite, writeFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos · Zagueiro" },
      {
        name: "description",
        content: "Suas ligas favoritas com acesso rápido às previsões, tabela e acertividade.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Suspense fallback={<div className="clay mx-auto mt-8 h-40 max-w-6xl animate-pulse px-4" />}>
      <FavoritesPage />
    </Suspense>
  );
}

function FavoritesPage() {
  const { data: leagues } = useSuspenseQuery(
    queryOptions({
      queryKey: ["leagues", "active", "favorites"],
      queryFn: () => listLeagues(),
      staleTime: 10 * 60_000,
    }),
  );
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    setFavorites(readFavorites(safeLocalStorage()));
  }, []);

  const saved = leagues.filter((l) => favorites.includes(l.id));

  const remove = (id: number) => {
    const next = toggleFavorite(favorites, id);
    setFavorites(next);
    const storage = safeLocalStorage();
    if (storage) writeFavorites(storage, next);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">⭐ Ligas favoritas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Salvas neste dispositivo (localStorage) — toque na estrela na página de uma liga para
          adicionar.
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="clay p-10 text-center">
          <p className="text-muted-foreground">Nenhuma liga favorita ainda.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Abra uma liga (via Tabela ou Previsões da liga) e marque a estrela ⭐.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((l) => (
            <div key={l.id} className="clay p-5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="truncate text-base font-bold" title={l.name}>
                  {l.name}
                </h2>
                <button
                  type="button"
                  onClick={() => remove(l.id)}
                  aria-label={`Remover ${l.name} dos favoritos`}
                  className="clay-sm shrink-0 px-2 py-1 text-xs text-destructive"
                >
                  ★
                </button>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">{l.country}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link
                  to="/liga/$leagueId"
                  params={{ leagueId: String(l.id) }}
                  className="clay-sm px-3 py-1.5 font-semibold"
                >
                  🎯 Previsões
                </Link>
                <Link
                  to="/tabela"
                  search={{ leagueId: l.id }}
                  className="clay-sm px-3 py-1.5 font-semibold text-muted-foreground"
                >
                  📋 Tabela
                </Link>
                <Link
                  to="/acertividade"
                  search={{ leagueId: l.id }}
                  className="clay-sm px-3 py-1.5 font-semibold text-muted-foreground"
                >
                  📊 Acertividade
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
