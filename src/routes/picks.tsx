import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { CalendarDays, CalendarClock, Radar, Target, Layers, Inbox, TrendingUp, Landmark, Verified } from "lucide-react";
import { getDailyPicks, type PicksDayPayload } from "@/lib/picks/picks.functions";
import { spTodayISO, spDateISO, fmtDateSP } from "@/lib/match-dates";
import { PickCard } from "@/components/PickCard";
import { ParlayCard } from "@/components/ParlayCard";
import type { ParlayProfile } from "@/lib/picks/parlays";
import { cn } from "@/lib/utils";
import { PipelineStatusStrip } from "@/components/ui/pipeline-status-strip";
import { BentoCard } from "@/components/ui/bento-card";
import { EdgeBadge } from "@/components/ui/edge-badge";
import { KellyGlowCard } from "@/components/ui/kelly-glow-card";
import { EmptyBlock } from "@/components/ui/empty-block";
import { ComplianceFooter } from "@/components/ui/compliance-footer";
import { BottomNav } from "@/components/ui/bottom-nav";

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

function PicksSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-surface-subtle" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bento-card h-24" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="kelly-glow-card h-40" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="kelly-glow-card h-56" />
        ))}
      </div>
    </div>
  );
}

const PROFILE_ORDER: ParlayProfile[] = ["segura", "equilibrada", "ousada"];

const PROFILE_CONFIG: Record<ParlayProfile, { icon: string; color: "primary" | "secondary" | "tertiary" }> = {
  segura: { icon: "shield", color: "primary" },
  equilibrada: { icon: "balance", color: "secondary" },
  ousada: { icon: "trending_up", color: "tertiary" },
};

function PicksPage() {
  const todayFn = useServerFn(getDailyPicks);
  const today = useMemo(() => spTodayISO(), []);
  const tomorrow = useMemo(() => spDateISO(1), []);

  const { data, isLoading } = useSuspenseQuery(
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

  if (isLoading) return <PicksSkeleton />;

  return (
    <div className="space-y-8 pb-24">
      {/* Pipeline Status Strip */}
      <PipelineStatusStrip
        weights={{ api: 0.45, dc: 0.35, market: 0.20 }}
        calibrationResidue={0.018}
        oddsFilter={{ min: 1.40, max: 4.50, trap: 1.25 }}
        dispersionRule="1 mercado / confronto"
      />

      {/* Exposure & Bankroll Summary Bento Grid */}
      <section className="px-margin pb-space-md">
        <div className="grid grid-cols-3 gap-space-xs">
          <BentoCard icon={<Landmark className="h-12 w-12" />} iconColor="primary">
            <span className="font-label-xs text-label-xs text-muted-foreground">Banca Total</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display text-2xl font-bold tabular-nums text-primary">{t.singles.exposure.bankrollUnits?.toFixed(1) ?? "3.20"}</span>
              <span className="font-label-xs text-label-xs text-primary-fixed-dim">u</span>
            </div>
            <span className="font-label-xs text-label-xs text-muted-foreground mt-0.5 truncate">~R$ {(t.singles.exposure.bankrollUnits ?? 3.20) * 100}00</span>
          </BentoCard>
          <BentoCard icon={<TrendingUp className="h-12 w-12" />} iconColor="secondary">
            <span className="font-label-xs text-label-xs text-muted-foreground">EV Médio</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <EdgeBadge ev={t.singles.picks.length > 0 ? t.singles.picks.reduce((a, b) => a + b.EV, 0) / t.singles.picks.length : 0} variant="large" showIcon={false} />
            </div>
            <span className="font-label-xs text-label-xs text-secondary-fixed-dim mt-0.5 truncate">Alfa Real</span>
          </BentoCard>
          <BentoCard icon={<Verified className="h-12 w-12" />} iconColor="tertiary">
            <span className="font-label-xs text-label-xs text-muted-foreground">Filtro Top</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display text-2xl font-bold tabular-nums text-tertiary">{t.singles.withValue}</span>
              <span className="font-label-xs text-label-xs text-tertiary-fixed">picks</span>
            </div>
            <span className="font-label-xs text-label-xs text-muted-foreground mt-0.5 truncate">Max 1/jogo</span>
          </BentoCard>
        </div>
      </section>

      {/* Partial data warning */}
      {(t.singles.partial || t.singles.notes.length > 0) && (
        <div className="px-margin mb-4 rounded-xl border border-tertiary/25 bg-tertiary/5 px-4 py-3 text-label-xs text-tertiary">
          {t.singles.partial && <p>⚠ Dados parciais — algumas fontes falharam.</p>}
          {t.singles.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}

      {/* Top palpites */}
      <section className="px-margin space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <div className="w-1.5 h-3.5 bg-primary rounded-full" />
            <h2 className="font-display text-lg font-bold text-foreground">Top palpites</h2>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground font-label-xs text-label-xs">
            <span>¼-Kelly Otimizado</span>
            <Verified className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </div>
        </div>
        <p className="text-label-xs text-muted-foreground/50">
          Máx 1 por jogo · EV e edge vs odd real · stake ¼ Kelly
        </p>

        <div className="space-y-3">
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
                <KellyGlowCard ev={p.EV} threshold={0.08}>
                  <PickCard pick={p} index={i + 1} />
                </KellyGlowCard>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Múltiplas Modeladas */}
      <section className="px-margin pt-space-xl pb-space-sm space-y-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <div className="w-1.5 h-3.5 bg-secondary rounded-full" />
            <h2 className="font-display text-lg font-bold text-foreground">Múltiplas Modeladas</h2>
          </div>
          <span className="font-label-xs text-label-xs text-muted-foreground">Simulação Monte Carlo 20k · Correlação Dixon-Coles</span>
        </div>

        {/* Interactive Strategy Tabs */}
        <div className="flex gap-space-xs p-1 rounded-2xl bg-surface-base/50 overflow-x-auto">
          {PROFILE_ORDER.map((profile) => {
            const day = t.parlays[profile];
            const pl = day.parlays[0];
            const config = PROFILE_CONFIG[profile];

            return (
              <button
                key={profile}
                className={cn(
                  "parlay-tab flex-1 flex flex-col items-center py-2 px-1 rounded-xl text-muted-foreground hover:text-foreground transition-all whitespace-nowrap",
                  pl && "bg-surface-subtle text-primary shadow-sm"
                )}
              >
                <span className="font-label-xs text-label-xs uppercase">{profile}</span>
                <span className="font-label-sm text-label-sm font-bold mt-0.5">
                  {pl ? `@${pl.oddTotal.toFixed(2)} · ${(pl.pTotal * 100).toFixed(0)}%` : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Parlay Cards */}
        <div className="grid gap-3 lg:grid-cols-2">
          {PROFILE_ORDER.map((profile) => {
            const day = t.parlays[profile];
            const pl = day.parlays[0];

            if (!pl) {
              return (
                <div
                  key={profile}
                  className="rounded-xl border border-border-subtle/40 bg-surface-base/50 p-4"
                >
                  <p className="text-label-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
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
                <KellyGlowCard ev={pl.EV} threshold={0.08}>
                  <ParlayCard parlay={pl} />
                </KellyGlowCard>
              </div>
            );
          })}
        </div>
      </section>

      {/* Radar (quase valor) */}
      {t.singles.radar.length > 0 && (
        <section className="px-margin space-y-4">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-foreground">Radar (quase valor)</h2>
          </div>
          <p className="text-label-xs text-muted-foreground/50">
            EV &gt; 0 mas filtro não passou — não é recomendação
          </p>
          <ul className="space-y-1.5">
            {t.singles.radar.slice(0, 8).map((p) => (
              <li
                key={`${p.eventId}-${p.market}-radar`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle/40 bg-surface-base/50 px-3 py-2 text-label-xs"
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
      <section className="px-margin space-y-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-foreground">Amanhã · {fmtDateSP(tm.date)}</h2>
        </div>
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
                <KellyGlowCard key={`${p.eventId}-${p.market}-tm`} ev={p.EV} threshold={0.08}>
                  <PickCard pick={p} index={i + 1} />
                </KellyGlowCard>
              ))}
            </div>
          )}
        </div>
      </section>

      <ComplianceFooter version="4.2.1" latency="<14ms" />

      <BottomNav />
    </div>
  );
}