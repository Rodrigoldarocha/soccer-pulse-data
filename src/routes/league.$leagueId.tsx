import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowLeft, Table2, Target } from "lucide-react";
import { getLeaguePage } from "@/lib/discovery.functions";

export const Route = createFileRoute("/league/$leagueId")({
  head: () => ({
    meta: [
      { title: "Liga — PulseLab" },
      { name: "description", content: "Classificação, artilharia e times da liga." },
    ],
  }),
  component: LeaguePage,
});

function LeaguePage() {
  const { leagueId } = Route.useParams();
  const fn = useServerFn(getLeaguePage);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["league", leagueId], queryFn: () => fn({ data: leagueId }) }),
  );

  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="py-12 text-center text-sm text-muted-foreground/40">
          Dados da liga indisponíveis.
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
      >
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {data.leagueName}
        </h1>
      </motion.header>

      <section className="card-premium p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <Table2 className="h-4 w-4 text-primary" />
          Classificação
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs tabular-nums">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground/50">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">Time</th>
                <th className="pb-2 pr-2 text-center font-medium">P</th>
                <th className="pb-2 pr-2 text-center font-medium">J</th>
                <th className="pb-2 pr-2 text-center font-medium">V</th>
                <th className="pb-2 pr-2 text-center font-medium">E</th>
                <th className="pb-2 pr-2 text-center font-medium">D</th>
                <th className="pb-2 text-center font-medium">SG</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((r) => (
                <tr key={r.team} className="border-t border-border/30">
                  <td className="py-2 pr-2 text-muted-foreground/60">{r.position}</td>
                  <td className="py-2 pr-2">
                    {r.teamId ? (
                      <Link
                        to="/team/$teamId"
                        params={{ teamId: r.teamId }}
                        className="flex items-center gap-2 text-foreground transition-colors hover:text-primary"
                      >
                        {r.crest && (
                          <img
                            src={r.crest}
                            alt=""
                            loading="lazy"
                            className="h-5 w-5 object-contain"
                          />
                        )}
                        {r.team}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 text-foreground">
                        {r.crest && (
                          <img
                            src={r.crest}
                            alt=""
                            loading="lazy"
                            className="h-5 w-5 object-contain"
                          />
                        )}
                        {r.team}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-center font-bold text-foreground">{r.points}</td>
                  <td className="py-2 pr-2 text-center text-muted-foreground/70">{r.played}</td>
                  <td className="py-2 pr-2 text-center text-muted-foreground/70">{r.won}</td>
                  <td className="py-2 pr-2 text-center text-muted-foreground/70">{r.drawn}</td>
                  <td className="py-2 pr-2 text-center text-muted-foreground/70">{r.lost}</td>
                  <td className="py-2 text-center text-muted-foreground/70">
                    {r.goalsFor - r.goalsAgainst > 0 ? "+" : ""}
                    {r.goalsFor - r.goalsAgainst}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.scorers.length > 0 && (
        <section className="card-premium p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Artilharia
          </h2>
          <ul className="mt-3 space-y-1.5">
            {data.scorers.map((s, i) => (
              <li
                key={`${s.player}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="w-5 shrink-0 font-display font-bold tabular-nums text-muted-foreground/50">
                  {i + 1}
                </span>
                {s.playerId ? (
                  <Link
                    to="/player/$playerId"
                    params={{ playerId: s.playerId }}
                    className="min-w-0 flex-1 truncate text-foreground transition-colors hover:text-primary"
                  >
                    {s.player}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-foreground">{s.player}</span>
                )}
                {s.team && <span className="shrink-0 text-muted-foreground/50">{s.team}</span>}
                <span className="font-display font-bold tabular-nums text-primary">{s.goals}</span>
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
