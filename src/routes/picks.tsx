import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { CalendarDays, CalendarClock, Radar, Target, Layers, Inbox } from "lucide-react";
import { getDailyPicks, type PicksDayPayload } from "@/lib/picks/picks.functions";
import { spTodayISO, spDateISO, fmtDateSP } from "@/lib/match-dates";
import { PickCard } from "@/components/PickCard";
import { ParlayCard } from "@/components/ParlayCard";
import type { ParlayProfile } from "@/lib/picks/parlays";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/picks")({
  head: () => ({
    meta: [
      { title: "Palpites — PulseLab" },
      {
        name: "description",
        content: "Palpites de valor do dia: simples + múltiplas com EV, edge e stake sugerida.",
      },
    ],
  }),
  component: PicksPage,
});

function PendingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-white/[0.06]" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-lg border border-border/50 bg-card" />
        ))}
      </div>
    </div>
  );
}

const PROFILE_ORDER: ParlayProfile[] = ["segura", "equilibrada", "ousada"];

function PicksPage() {
  const todayFn = useServerFn(getDailyPicks);
  const today = useMemo(() => spTodayISO(), []);
  const tomorrow = useMemo(() => spDateISO(1), []);

  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["picks", today],
      queryFn: () => todayFn({ data: today }),
    }),
  );

  const { data: tomorrowData } = useSuspenseQuery(
    queryOptions({
      queryKey: ["picks", tomorrow],
      queryFn: () => todayFn({ data: tomorrow }),
      staleTime: 5 * 60 * 1000,
    }),
  );

  const t = data as PicksDayPayload;
  const tm = tomorrowData as PicksDayPayload;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Palpites</h1>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {fmtDateSP(t.date)} · {t.singles.analyzed} jogos analisados · {t.singles.withValue} de
            valor
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-medium",
              t.singles.oddsMode === "market"
                ? "bg-confirmed/10 text-confirmed"
                : "bg-white/[0.06]",
            )}
          >
            {t.singles.oddsMode === "market" ? "Odds de mercado" : "Modo probabilidade"}
          </span>
          <span>{new Date(t.generatedAt).toLocaleTimeString("pt-BR")}</span>
        </div>
      </header>

      {(t.singles.partial || t.singles.notes.length > 0) && (
        <div className="rounded border border-chart-4/25 bg-chart-4/5 px-4 py-3 text-xs text-chart-4">
          {t.singles.partial && <p>Dados parciais — algumas fontes falharam.</p>}
          {t.singles.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}

      {/* Resumo exposição */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Palpites", value: String(t.singles.withValue), icon: Target },
          {
            label: "Exposição",
            value: `${t.singles.exposure.usedUnits.toFixed(1)}/${t.singles.exposure.maxUnits}u`,
            icon: Layers,
          },
          {
            label: "Sem odd",
            value: String(t.singles.withoutOdd),
            icon: Inbox,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground/50">
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
            <p className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
              {s.value}
            </p>
          </div>
        ))}
      </section>

      {/* Top palpites */}
      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <Target className="h-4 w-4 text-primary" />
          Top palpites
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/50">
          Máx 1 por jogo · EV e edge vs odd real · stake ¼ Kelly
        </p>
        <div className="mt-3 space-y-3">
          {t.singles.picks.length === 0 ? (
            <EmptyBlock
              title="Sem palpites de valor hoje"
              body={
                t.singles.withoutOdd > 0 && t.singles.withoutOdd === t.singles.analyzed
                  ? "Odds indisponíveis — modo probabilidade. Sem palpite de valor sem odd real."
                  : "Isso é normal — disciplina também é resultado."
              }
            />
          ) : (
            t.singles.picks.map((p, i) => (
              <div key={`${p.eventId}-${p.market}`} className="stagger-item">
                <PickCard pick={p} index={i + 1} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Múltiplas */}
      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          Múltiplas do dia
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/50">
          2–4 pernas · correlação do mesmo jogo via matriz · EV &gt; 0 obrigatório
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {PROFILE_ORDER.map((profile) => {
            const day = t.parlays[profile];
            const pl = day.parlays[0];
            if (!pl) {
              return (
                <div
                  key={profile}
                  className="rounded-lg border border-border/40 bg-white/[0.02] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {profile}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground/50">
                    {day.honestMessage ?? "Hoje não há múltipla de valor."}
                  </p>
                </div>
              );
            }
            return (
              <div key={profile} className="stagger-item">
                <ParlayCard parlay={pl} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Radar */}
      {t.singles.radar.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Radar className="h-4 w-4 text-muted-foreground" />
            Radar (quase valor)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground/50">
            EV &gt; 0 mas filtro não passou — não é recomendação
          </p>
          <ul className="mt-3 space-y-1.5">
            {t.singles.radar.slice(0, 8).map((p) => (
              <li
                key={`${p.eventId}-${p.market}-radar`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-foreground/80">
                  {p.selectionLabel}
                  <span className="text-muted-foreground/50"> · {p.leagueLabel}</span>
                </span>
                <span className="font-display font-bold tabular-nums text-muted-foreground">
                  {p.odd.toFixed(2)} · EV +{(p.EV * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Amanhã preview */}
      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <CalendarClock className="h-4 w-4 text-primary" />
          Amanhã · {fmtDateSP(tm.date)}
        </h2>
        <div className="mt-3">
          {tm.singles.picks.length === 0 ? (
            <EmptyBlock
              title="Ainda sem palpites para amanhã"
              body={
                tm.singles.notes[0] ??
                "Mercado ainda fechado — volte mais tarde ou confira as partidas."
              }
              linkTo="/tomorrow"
              linkLabel="Ver jogos de amanhã"
            />
          ) : (
            <div className="space-y-3">
              {tm.singles.picks.slice(0, 3).map((p, i) => (
                <PickCard key={`${p.eventId}-${p.market}-tm`} pick={p} index={i + 1} />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border/40 pt-4 text-[11px] text-muted-foreground/40">
        <p className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" />
          Estatísticas, não certeza. +18 · Jogue com responsabilidade.
        </p>
      </footer>
    </div>
  );
}

function EmptyBlock({
  title,
  body,
  linkTo,
  linkLabel,
}: {
  title: string;
  body: string;
  linkTo?: "/tomorrow" | "/today";
  linkLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-white/[0.02] px-4 py-8 text-center">
      <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground/50">{body}</p>
      {linkTo && linkLabel && (
        <a href={linkTo} className="mt-2 inline-block text-xs text-primary hover:underline">
          {linkLabel}
        </a>
      )}
    </div>
  );
}
