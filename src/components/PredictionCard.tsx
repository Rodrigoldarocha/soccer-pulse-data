import type { Prediction, OverUnderMarket } from "@/lib/bzzoiro/types";
import { TeamLogo } from "./TeamLogo";

interface Props {
  prediction: Prediction;
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  return `${Math.round(p)}%`;
}

function fmtKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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

function outcomeLabel(
  o: "H" | "D" | "A" | null,
  home: string,
  away: string,
): string {
  if (o === "H") return `${home} vence`;
  if (o === "A") return `${away} vence`;
  if (o === "D") return "Empate";
  return "Sem favorito";
}

function bestOuLine(ou: OverUnderMarket): { line: string; over: number; under: number } | null {
  const lines: { line: string; prob: number | null }[] = [
    { line: "1.5", prob: ou.prob_over_15 },
    { line: "2.5", prob: ou.prob_over_25 },
    { line: "3.5", prob: ou.prob_over_35 },
  ];
  let best: { line: string; over: number; under: number } | null = null;
  for (const l of lines) {
    if (l.prob == null) continue;
    const over = Math.round(l.prob);
    const under = Math.round(100 - l.prob);
    if (!best || Math.max(over, under) > Math.max(best.over, best.under)) {
      best = { line: l.line, over, under };
    }
  }
  return best;
}

export function PredictionCard({ prediction }: Props) {
  const { event, markets, model, created_at } = prediction;
  const mr = markets.match_result;
  const confidencePct = Math.round(model.confidence * 100);
  const isHighConfidence = confidencePct >= 60;
  const isLive = event.status === "inprogress";
  const bestOu = bestOuLine(markets.over_under);
  const bttsYes = markets.btts.prob_yes != null ? Math.round(markets.btts.prob_yes) : null;

  return (
    <article className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md">
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
          <time
            dateTime={event.event_date}
            className="text-muted-foreground"
          >
            {fmtKickoff(event.event_date)}
          </time>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo
            teamId={event.home_team_id}
            teamName={event.home_team}
            size={56}
          />
          <span
            className="line-clamp-2 text-sm font-medium"
            title={event.home_team}
          >
            {event.home_team}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          <span className="text-xs text-muted-foreground">vs</span>
          {markets.score.most_likely && (
            <span
              className="rounded-md bg-secondary px-2.5 py-1 font-mono text-sm font-semibold"
              title="Placar mais provável"
            >
              {markets.score.most_likely}
            </span>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo
            teamId={event.away_team_id}
            teamName={event.away_team}
            size={56}
          />
          <span
            className="line-clamp-2 text-sm font-medium"
            title={event.away_team}
          >
            {event.away_team}
          </span>
        </div>
      </div>

      {/* 1X2 probabilities with visual bars */}
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

      {/* Melhores mercados para jogar */}
      <div className="mt-4 space-y-2">
        {bestOu && (
          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Total de gols
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Over {bestOu.line}</span>
              <span className="font-mono font-semibold text-primary">{bestOu.over}%</span>
              <span className="text-muted-foreground mx-1">|</span>
              <span className="font-medium">Under {bestOu.line}</span>
              <span className="font-mono font-semibold">{bestOu.under}%</span>
            </div>
          </div>
        )}
        {bttsYes != null && (
          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Ambos marcam
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Sim</span>
              <span className="font-mono font-semibold text-primary">{bttsYes}%</span>
              <span className="text-muted-foreground mx-1">|</span>
              <span className="font-medium">Não</span>
              <span className="font-mono font-semibold">{100 - bttsYes}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer: palpite + confiança + atualizado */}
      <footer className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">
          Palpite:{" "}
          <span className="text-foreground">
            {outcomeLabel(
              mr.predicted,
              event.home_team,
              event.away_team,
            )}
          </span>
        </span>
        <div className="flex items-center gap-2">
          {created_at && (
            <span className="text-muted-foreground" title={created_at}>
              {timeAgo(created_at)}
            </span>
          )}
          <span
            title={
              isHighConfidence
                ? "Confiança alta (≥60%)"
                : "Confiança baixa (<60%)"
            }
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
    </article>
  );
}

/** Probability cell with inline bar. */
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
        "relative overflow-hidden rounded-lg border px-2 py-2 text-center " +
        (highlighted
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border bg-secondary/40 text-foreground")
      }
    >
      {/* Barra de progresso de fundo */}
      <span
        className="absolute bottom-0 left-0 top-0 opacity-15 transition-all"
        style={{
          width: `${pct}%`,
          backgroundColor: highlighted ? "var(--color-primary)" : color,
        }}
      />
      <div className="relative z-10 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="relative z-10 mt-0.5 font-mono text-sm font-semibold">
        {fmtPct(value)}
      </div>
    </div>
  );
}


