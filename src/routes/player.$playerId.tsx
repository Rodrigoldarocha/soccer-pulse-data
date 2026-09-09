import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowLeft, User, ArrowLeftRight } from "lucide-react";
import { getPlayerPage } from "@/lib/discovery.functions";

export const Route = createFileRoute("/player/$playerId")({
  head: () => ({
    meta: [
      { title: "Jogador — PulseLab" },
      { name: "description", content: "Perfil, estatísticas e transferências do jogador." },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { playerId } = Route.useParams();
  const fn = useServerFn(getPlayerPage);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["player", playerId], queryFn: () => fn({ data: playerId }) }),
  );

  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="py-12 text-center text-sm text-muted-foreground/40">
          Dados do jogador indisponíveis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="card-premium p-4 sm:p-6"
      >
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{data.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          {[
            data.specificPosition || data.position,
            data.age != null ? `${data.age} anos` : null,
            data.nationality,
            data.foot ? `pé ${data.foot}` : null,
            data.height ? `${data.height} cm` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {data.team && (
          <p className="mt-1 text-sm text-muted-foreground/60">
            {data.teamId ? (
              <Link
                to="/team/$teamId"
                params={{ teamId: data.teamId }}
                className="text-primary transition-colors hover:text-primary/80"
              >
                {data.team}
              </Link>
            ) : (
              data.team
            )}
          </p>
        )}
      </motion.header>

      {data.stats.length > 0 && (
        <section className="card-premium p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <User className="h-4 w-4 text-primary" />
            Estatísticas
          </h2>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {data.stats.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground/70">{s.label}</span>
                <span className="font-display font-bold tabular-nums text-foreground">
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.transfers.length > 0 && (
        <section className="card-premium p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Transferências
          </h2>
          <ul className="mt-3 space-y-1.5">
            {data.transfers.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {t.from ?? "?"} → {t.to ?? "?"}
                </span>
                {t.date && (
                  <span className="shrink-0 tabular-nums text-muted-foreground/50">
                    {t.date.slice(0, 10)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/today"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </Link>
  );
}
