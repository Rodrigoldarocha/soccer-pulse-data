import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Fragment } from "react";
import { ArrowLeft, Trophy, Shirt, BarChart3, Radio, Tv, MapPin } from "lucide-react";
import { getMatchDetails } from "@/lib/match-details.functions";
import { getTodayMatches, getTomorrowMatches } from "@/lib/matches.functions";
import { LEAGUE_IDS } from "@/lib/api/thesportsdb";
import { MatchCard } from "@/components/MatchCard";
import { fmtTimeSP } from "@/lib/match-dates";
import { cn } from "@/lib/utils";
import type {
  FormEntry,
  H2HMatch,
  LineupPlayer,
  MatchIncident,
  StatRow,
} from "@/lib/api/match-details";

export const Route = createFileRoute("/match/$matchId")({
  head: () => ({
    meta: [
      { title: "Jogo — PulseLab" },
      {
        name: "description",
        content:
          "Detalhes da partida: confronto direto, forma, escalações, estatísticas e transmissão.",
      },
    ],
  }),
  component: MatchPage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Trophy;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-premium p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground/40">{text}</p>;
}

function Score({ m }: { m: H2HMatch }) {
  const s = m.homeScore != null && m.awayScore != null ? `${m.homeScore} × ${m.awayScore}` : "×";
  return <span className="font-display font-bold tabular-nums text-foreground">{s}</span>;
}

const RESULT_CLS: Record<FormEntry["result"], string> = {
  W: "bg-emerald-500/15 text-emerald-400",
  D: "bg-white/[0.06] text-muted-foreground",
  L: "bg-rose-500/15 text-rose-400",
};

function FormBlock({
  title,
  wins,
  draws,
  losses,
  last5,
  align,
}: {
  title: string;
  wins: number;
  draws: number;
  losses: number;
  last5: FormEntry[];
  align: "home" | "away";
}) {
  return (
    <div>
      <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground/60">
        {wins}V · {draws}E · {losses}D
      </p>
      <ul className="mt-2 space-y-1.5">
        {last5.map((f, i) => {
          const vs = align === "home" ? f.away : f.home;
          return (
            <li
              key={`${f.date}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-2.5 py-1.5 text-xs"
            >
              <span className={cn("rounded px-1.5 py-0.5 font-bold", RESULT_CLS[f.result])}>
                {f.result === "W" ? "V" : f.result === "D" ? "E" : "D"}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground/70">{vs}</span>
              <Score m={f} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlayerList({ players }: { players: LineupPlayer[] }) {
  if (players.length === 0) return <Empty text="Escalação indisponível." />;
  return (
    <ul className="space-y-1">
      {players.map((p, i) => (
        <li
          key={`${p.name}-${i}`}
          className="flex items-center gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-2.5 py-1.5 text-xs"
        >
          {p.number && (
            <span className="w-6 shrink-0 text-center font-display font-bold tabular-nums text-primary">
              {p.number}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
          {p.position && <span className="shrink-0 text-muted-foreground/50">{p.position}</span>}
        </li>
      ))}
    </ul>
  );
}

function MatchPage() {
  const { matchId } = Route.useParams();
  const detailsFn = useServerFn(getMatchDetails);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["match", matchId], queryFn: () => detailsFn({ data: matchId }) }),
  );

  const todayFn = useServerFn(getTodayMatches);
  const tomorrowFn = useServerFn(getTomorrowMatches);
  const { data: today } = useSuspenseQuery(queryOptions({ queryKey: ["today"], queryFn: todayFn }));
  const { data: tomorrow } = useQuery(
    queryOptions({ queryKey: ["tomorrow"], queryFn: tomorrowFn }),
  );
  const card =
    today.matches.find((m) => m.id === matchId) ?? tomorrow?.matches.find((m) => m.id === matchId);

  const h = data.header;
  const leagueId = card ? (LEAGUE_IDS[card.league] ?? null) : null;

  return (
    <div className="space-y-4">
      <Link
        to="/today"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="card-premium p-4 text-center sm:p-6"
      >
        {h?.leagueName && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            {leagueId ? (
              <Link
                to="/league/$leagueId"
                params={{ leagueId }}
                className="transition-colors hover:text-primary"
              >
                {h.leagueName}
              </Link>
            ) : (
              h.leagueName
            )}
          </p>
        )}
        <h1 className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl">
          {h ? (
            <>
              {h.homeTeamId ? (
                <Link
                  to="/team/$teamId"
                  params={{ teamId: h.homeTeamId }}
                  className="transition-colors hover:text-primary"
                >
                  {h.homeName}
                </Link>
              ) : (
                h.homeName
              )}{" "}
              ×{" "}
              {h.awayTeamId ? (
                <Link
                  to="/team/$teamId"
                  params={{ teamId: h.awayTeamId }}
                  className="transition-colors hover:text-primary"
                >
                  {h.awayName}
                </Link>
              ) : (
                h.awayName
              )}
            </>
          ) : (
            `Jogo ${matchId}`
          )}
        </h1>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground/60">
          {h?.homeScore != null && h?.awayScore != null
            ? `${h.homeScore} × ${h.awayScore}`
            : h?.kickoff
              ? fmtTimeSP(h.kickoff)
              : ""}
        </p>
      </motion.header>

      {card && <MatchCard match={card} />}

      {data.apiPrediction && (
        <Section icon={BarChart3} title="Modelos">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1.5 text-xs">
            <span />
            <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              PulseLab
            </span>
            <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              CatBoost API
            </span>
            {(
              [
                ["CASA", card?.probabilities.home, data.apiPrediction.home],
                ["EMPATE", card?.probabilities.draw, data.apiPrediction.draw],
                ["FORA", card?.probabilities.away, data.apiPrediction.away],
                ["OVER 2.5", card?.probabilities.over25, data.apiPrediction.over25],
                ["BTTS SIM", card?.probabilities.btts, data.apiPrediction.btts],
              ] as Array<[string, number | undefined, number | null]>
            ).map(([label, local, api]) => (
              <Fragment key={label}>
                <span className="text-muted-foreground/70">{label}</span>
                <span className="text-right font-display font-bold tabular-nums text-foreground">
                  {local != null ? `${Math.round(local * 100)}%` : "—"}
                </span>
                <span className="text-right font-display font-bold tabular-nums text-sky-400">
                  {api != null ? `${Math.round(api * 100)}%` : "—"}
                </span>
              </Fragment>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/40">
            Duas estimativas independentes — nenhuma é recomendação de aposta.
          </p>
        </Section>
      )}

      <Section icon={Trophy} title="Confronto direto">
        {!data.h2h || data.h2h.matches.length === 0 ? (
          <Empty text="Sem histórico de confrontos." />
        ) : (
          <>
            <p className="text-center text-sm tabular-nums text-muted-foreground/70">
              <span className="font-bold text-emerald-400">{data.h2h.homeWins}</span> vitórias ·{" "}
              <span className="font-bold text-foreground">{data.h2h.draws}</span> empates ·{" "}
              <span className="font-bold text-rose-400">{data.h2h.awayWins}</span> vitórias
            </p>
            <ul className="mt-3 space-y-1.5">
              {data.h2h.matches.map((m, i) => (
                <li
                  key={`${m.date}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground/70">
                    {m.home} × {m.away}
                  </span>
                  <Score m={m} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section icon={Shirt} title="Forma recente">
        {!data.homeForm && !data.awayForm ? (
          <Empty text="Sem dados de forma recente." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.homeForm && (
              <FormBlock
                title={data.homeForm.team}
                wins={data.homeForm.wins}
                draws={data.homeForm.draws}
                losses={data.homeForm.losses}
                last5={data.homeForm.last5}
                align="home"
              />
            )}
            {data.awayForm && (
              <FormBlock
                title={data.awayForm.team}
                wins={data.awayForm.wins}
                draws={data.awayForm.draws}
                losses={data.awayForm.losses}
                last5={data.awayForm.last5}
                align="away"
              />
            )}
          </div>
        )}
      </Section>

      <Section icon={Shirt} title="Escalações">
        {!data.lineups || data.lineups.status === "unavailable" ? (
          <Empty text="Escalações indisponíveis." />
        ) : (
          <>
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              {data.lineups.status === "confirmed" ? "Escalação oficial" : "Escalação provável"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 truncate text-sm font-semibold text-foreground">
                  {h?.homeName ?? "Casa"}
                  {data.lineups.homeFormation && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground/50">
                      {data.lineups.homeFormation}
                    </span>
                  )}
                </p>
                <PlayerList players={data.lineups.home} />
              </div>
              <div>
                <p className="mb-2 truncate text-sm font-semibold text-foreground">
                  {h?.awayName ?? "Fora"}
                  {data.lineups.awayFormation && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground/50">
                      {data.lineups.awayFormation}
                    </span>
                  )}
                </p>
                <PlayerList players={data.lineups.away} />
              </div>
            </div>
          </>
        )}
      </Section>

      <Section icon={BarChart3} title="Estatísticas">
        {!data.stats ? (
          <Empty text="Estatísticas disponíveis após o início do jogo." />
        ) : (
          <ul className="space-y-1.5">
            {(data.stats as StatRow[]).map((s) => (
              <li
                key={s.label}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="text-right font-display font-bold tabular-nums text-foreground">
                  {s.home}
                </span>
                <span className="text-center text-muted-foreground/50">{s.label}</span>
                <span className="font-display font-bold tabular-nums text-foreground">
                  {s.away}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {(data.incidents?.length ?? 0) > 0 && (
        <Section icon={Radio} title="Linha do tempo">
          <ul className="space-y-1.5">
            {(data.incidents as MatchIncident[]).map((e, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="w-10 shrink-0 font-display font-bold tabular-nums text-primary">
                  {e.minute}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {e.player ?? e.kind}
                  {e.player && e.kind ? ` · ${e.kind}` : ""}
                </span>
                {e.team && <span className="shrink-0 text-muted-foreground/50">{e.team}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section icon={Tv} title="Onde assistir">
        {!data.broadcasts ? (
          <Empty text="Transmissão não informada." />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {data.broadcasts.map((b, i) => (
              <li
                key={i}
                className="rounded-full border border-border/40 bg-white/[0.03] px-3 py-1.5 text-xs text-foreground"
              >
                {b.channel}
                {b.country && <span className="ml-1.5 text-muted-foreground/50">{b.country}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {(data.meta?.venue || data.meta?.referee) && (
        <Section icon={MapPin} title="Estádio e arbitragem">
          <div className="space-y-1 text-sm text-muted-foreground/70">
            {data.meta?.venue && (
              <p>
                {data.meta.venue}
                {data.meta.city ? ` · ${data.meta.city}` : ""}
              </p>
            )}
            {data.meta?.referee && <p>Árbitro: {data.meta.referee}</p>}
          </div>
        </Section>
      )}
    </div>
  );
}
