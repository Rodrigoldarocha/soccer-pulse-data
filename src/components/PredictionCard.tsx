import { Link } from "@tanstack/react-router";
import type { Prediction } from "@/lib/bzzoiro/types";
import { TeamLogo } from "./TeamLogo";

interface Props {
  prediction: Prediction;
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  return `${Math.round(p)}%`;
}

// Locale and timezone are pinned so the SSR markup matches client hydration.
function fmtKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function outcomeLabel(o: "H" | "D" | "A" | null, home: string, away: string): string {
  if (o === "H") return `${home} vence`;
  if (o === "A") return `${away} vence`;
  if (o === "D") return "Empate";
  return "Sem favorito";
}

function PctRow({
  labelA,
  a,
  labelB,
  b,
}: {
  labelA: string;
  a: number;
  labelB: string;
  b: number;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium">{labelA}</span>
      <span className="font-mono font-semibold text-primary">{a}%</span>
      <span className="text-muted-foreground mx-1">|</span>
      <span className="font-medium">{labelB}</span>
      <span className="font-mono font-semibold">{b}%</span>
    </div>
  );
}

export function PredictionCard({ prediction }: Props) {
  const { event, markets, model, created_at } = prediction;
  const mr = markets.match_result;
  const confidencePct = Math.round(model.confidence * 100);
  const isHighConfidence = confidencePct >= 60;
  const isLive = event.status === "inprogress";
  const ouLines: { line: string; over: number | null }[] = [
    { line: "1.5", over: markets.over_under.prob_over_15 },
    { line: "2.5", over: markets.over_under.prob_over_25 },
    { line: "3.5", over: markets.over_under.prob_over_35 },
  ].filter((l) => l.over != null);
  const cornerLines: { line: string; over: number }[] = Object.entries(markets.corners ?? {})
    .filter(([k, v]) => k.startsWith("prob_over_") && typeof v === "number")
    .map(([k, v]) => ({
      line: (Number(k.slice("prob_over_".length)) / 10).toFixed(1),
      over: Math.round(v as number),
    }));
  const bttsYes = markets.btts.prob_yes != null ? Math.round(markets.btts.prob_yes) : null;

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: String(event.id) }}
      className="clay block p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <header className="mb-4 flex items-center justify-between text-xs">
        <span className="uppercase tracking-wide text-muted-foreground">
          {event.league_name ?? "—"}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive animate-pulse">
              AO VIVO
            </span>
          )}
          <time dateTime={event.event_date} className="text-muted-foreground">
            {fmtKickoff(event.event_date)}
          </time>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo teamId={event.home_team_id} teamName={event.home_team} size={56} />
          <span className="line-clamp-2 text-sm font-medium" title={event.home_team}>
            {event.home_team}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          <span className="text-xs text-muted-foreground">vs</span>
          {markets.score.most_likely && (
            <span
              className="clay-inset px-2.5 py-1 font-mono text-sm font-semibold"
              title="Placar mais provável"
            >
              {markets.score.most_likely}
            </span>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo teamId={event.away_team_id} teamName={event.away_team} size={56} />
          <span className="line-clamp-2 text-sm font-medium" title={event.away_team}>
            {event.away_team}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <ProbBar
          label="Casa"
          value={mr.prob_home}
          highlighted={mr.predicted === "H"}
          color="oklch(0.78 0.19 145)"
        />
        <ProbBar
          label="Empate"
          value={mr.prob_draw}
          highlighted={mr.predicted === "D"}
          color="oklch(0.72 0.02 250)"
        />
        <ProbBar
          label="Fora"
          value={mr.prob_away}
          highlighted={mr.predicted === "A"}
          color="oklch(0.7 0.17 250)"
        />
      </div>

      <div className="mt-4 space-y-2">
        {ouLines.length > 0 && (
          <div className="clay-inset px-3 py-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Total de gols
            </div>
            <div className="space-y-1.5">
              {ouLines.map((l) => (
                <PctRow
                  key={l.line}
                  labelA={`Over ${l.line}`}
                  a={Math.round(l.over as number)}
                  labelB={`Under ${l.line}`}
                  b={100 - Math.round(l.over as number)}
                />
              ))}
            </div>
          </div>
        )}
        {bttsYes != null && (
          <div className="clay-inset px-3 py-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Ambos marcam
            </div>
            <PctRow labelA="Sim" a={bttsYes} labelB="Não" b={100 - bttsYes} />
          </div>
        )}
        {markets.draw_no_bet.prob_home != null && (
          <div className="clay-inset px-3 py-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Draw No Bet
            </div>
            <PctRow
              labelA={event.home_team}
              a={Math.round(markets.draw_no_bet.prob_home)}
              labelB={event.away_team}
              b={Math.round(100 - markets.draw_no_bet.prob_home)}
            />
          </div>
        )}
        {cornerLines.length > 0 && (
          <div className="clay-inset px-3 py-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Escanteios
            </div>
            <div className="space-y-1.5">
              {cornerLines.map((l) => (
                <PctRow
                  key={l.line}
                  labelA={`Over ${l.line}`}
                  a={l.over}
                  labelB={`Under ${l.line}`}
                  b={100 - l.over}
                />
              ))}
            </div>
          </div>
        )}
        {markets.expected_goals.home != null && markets.expected_goals.away != null && (
          <div className="clay-inset px-3 py-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Gols esperados (xG)
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{event.home_team}</span>
              <span className="font-mono font-semibold text-primary">
                {markets.expected_goals.home.toFixed(2)}
              </span>
              <span className="text-muted-foreground mx-1">×</span>
              <span className="font-medium">{event.away_team}</span>
              <span className="font-mono font-semibold">
                {markets.expected_goals.away.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">
          Palpite:{" "}
          <span className="text-foreground">
            {outcomeLabel(mr.predicted, event.home_team, event.away_team)}
          </span>
        </span>
        <div className="flex items-center gap-2">
          {created_at && (
            <span className="text-muted-foreground" title={created_at} suppressHydrationWarning>
              {timeAgo(created_at)}
            </span>
          )}
          {model.version && (
            <span className="text-muted-foreground" title={`Modelo: ${model.version}`}>
              {model.version}
            </span>
          )}
          <span
            title={isHighConfidence ? "Confiança alta (≥60%)" : "Confiança baixa (<60%)"}
            className={
              "rounded-full px-2.5 py-1 font-semibold " +
              (isHighConfidence
                ? "bg-primary/15 text-primary"
                : "bg-secondary text-muted-foreground")
            }
          >
            {confidencePct}% conf.
          </span>
        </div>
      </footer>
    </Link>
  );
}

function ProbBar({
  label,
  value,
  highlighted,
  color,
}: {
  label: string;
  value: number | null;
  highlighted: boolean;
  color: string;
}) {
  const pct = value != null ? Math.round(value) : 0;
  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl px-2 py-2 text-center " +
        (highlighted ? "clay-primary" : "clay-inset")
      }
    >
      <span
        className="absolute bottom-0 left-0 top-0 opacity-20 transition-all"
        style={{
          width: `${pct}%`,
          backgroundColor: highlighted ? "var(--color-primary)" : color,
        }}
      />
      <div className="relative z-10 text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="relative z-10 mt-0.5 font-mono text-sm font-semibold">{fmtPct(value)}</div>
    </div>
  );
}
