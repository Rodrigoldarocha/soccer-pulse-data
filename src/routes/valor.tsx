import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  ValueBetsBoard,
  buildValueBetsQuery,
  type MarketFilter,
} from "@/components/ValueBetsBoard";

export const Route = createFileRoute("/valor")({
  head: () => ({
    meta: [
      { title: "Apostas de Valor · Zagueiro" },
      {
        name: "description",
        content:
          "Apostas com valor esperado positivo: probabilidades do modelo CatBoost contra as melhores odds das casas.",
      },
      { property: "og:title", content: "Apostas de Valor · Zagueiro" },
      {
        property: "og:description",
        content: "Onde o modelo encontra probabilidade maior que a implícita nas odds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { market?: MarketFilter } => ({
    market:
      typeof search.market === "string" &&
      ["all", "1x2", "over_under_25", "btts"].includes(search.market)
        ? (search.market as MarketFilter)
        : undefined,
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(buildValueBetsQuery());
  },
  component: ValueBetsPage,
});

function ValueBetsPage() {
  const router = useRouter();
  const { market } = Route.useSearch();

  return (
    <ValueBetsBoard
      market={market ?? "all"}
      onMarketChange={(m) => router.navigate({ to: "/valor", search: { market: m } })}
    />
  );
}
