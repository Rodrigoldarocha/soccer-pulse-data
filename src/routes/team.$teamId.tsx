import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowLeft, Users, CalendarDays } from "lucide-react";
import { getTeamPage } from "@/lib/discovery.functions";
import { fmtDateSP, fmtTimeSP } from "@/lib/match-dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/team/$teamId")({
  head: () => ({
    meta: [
      { title: "Time — PulseLab" },
      { name: "description", content: "Elenco, forma recente e próximos jogos do time." },
    ],
  }),
  component: TeamPage,
});

const AVAIL_CLS: Record<string, string> = {
  injured: "bg-rose-500/15 text-rose-400",
  doubtful: "bg-amber-500/15 text-amber-400",
  suspended: "bg-orange-500/15 text-orange-400",
};

function TeamPage() {
  const { teamId } = Route.useParams();
  const fn = useServerFn(getTeamPage);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["team", teamId], queryFn: () => fn({ data: teamId }) }),
  );

  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="py-12 text-center text-sm text-muted-foreground/40">
          Dados do time indisponíveis.
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
          {[data.shortName, data.country, data.elo != null ? `ELO ${data.elo}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </motion.header>

      {(data.recent.length > 0 || data.upcoming.length > 0) && (
        <section className="card-premium p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            Jogos
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {data.recent.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  Recentes
                </p>
                <ul className="space-y-1.5">
                  {data.recent.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate text-muted-foreground/70">
                        {f.home} × {f.away}
                      </span>
                      <span className="shrink-0 font-display font-bold tabular-nums text-foreground">
                        {f.homeScore} × {f.awayScore}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.upcoming.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  Próximos
                </p>
                <ul className="space-y-1.5">
                  {data.upcoming.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {f.home} × {f.away}
                      </span>
                      {f.date && (
                        <span className="shrink-0 tabular-nums text-muted-foreground/50">
                          {fmtDateSP(f.date.slice(0, 10))} · {fmtTimeSP(f.date)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {data.squad.length > 0 && (
        <section className="card-premium p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            Elenco ({data.squad.length})
          </h2>
          <ul className="mt-3 space-y-1.5">
            {data.squad.map((p, i) => (
              <li
                key={`${p.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
              >
                {p.number && (
                  <span className="w-6 shrink-0 text-center font-display font-bold tabular-nums text-primary">
                    {p.number}
                  </span>
                )}
                {p.playerId ? (
                  <Link
                    to="/player/$playerId"
                    params={{ playerId: p.playerId }}
                    className="min-w-0 flex-1 truncate text-foreground transition-colors hover:text-primary"
                  >
                    {p.name}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
                )}
                {p.position && (
                  <span className="shrink-0 text-muted-foreground/50">{p.position}</span>
                )}
                {p.availability && p.availability !== "available" && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      AVAIL_CLS[p.availability] ?? "bg-white/[0.06] text-muted-foreground",
                    )}
                  >
                    {p.availability}
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
