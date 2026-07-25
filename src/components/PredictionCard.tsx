import type { Prediction } from "@/lib/bzzoiro/types";
import { TeamLogo } from "./TeamLogo";

interface Props {
  prediction: Prediction;
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  // API returns 0–100 for market probs.
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

function outcomeLabel(o: "H" | "D" | "A" | null, home: string, away: string): string {
  if (o === "H") return `${home} vence`;
  if (o === "A") return `${away} vence`;
  if (o === "D") return "Empate";
  return "Sem favorito";
}

export function PredictionCard({ prediction }: Props) {
  const { event, markets, model } = prediction;
  const mr = markets.match_result;
  const confidencePct = Math.round(model.confidence * 100);
  const isHighConfidence = confidencePct >= 60;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50">
      <header className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">{event.league_name ?? "—"}</span>
        <time dateTime={event.event_date}>{fmtKickoff(event.event_date)}</time>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo teamId={event.home_team_id} teamName={event.home_team} size={56} />
          <span className="line-clamp-2 text-sm font-medium">{event.home_team}</span>
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          <span className="text-xs text-muted-foreground">vs</span>
          {markets.score.most_likely && (
            <span className="rounded-md bg-secondary px-2 py-1 font-mono text-sm">
              {markets.score.most_likely}
            </span>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo teamId={event.away_team_id} teamName={event.away_team} size={56} />
          <span className="line-clamp-2 text-sm font-medium">{event.away_team}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
        <ProbCell label="Casa" value={mr.prob_home} highlighted={mr.predicted === "H"} />
        <ProbCell label="Empate" value={mr.prob_draw} highlighted={mr.predicted === "D"} />
        <ProbCell label="Fora" value={mr.prob_away} highlighted={mr.predicted === "A"} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <MetricPill label="Over 2.5" value={fmtPct(markets.over_under.prob_over_25)} />
        <MetricPill label="BTTS" value={fmtPct(markets.btts.prob_yes)} />
      </div>

      <footer className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">
          Palpite: <span className="text-foreground">{outcomeLabel(mr.predicted, event.home_team, event.away_team)}</span>
        </span>
        <span
          className={
            "rounded-full px-2.5 py-1 font-semibold " +
            (isHighConfidence
              ? "bg-primary/15 text-primary"
              : "bg-secondary text-muted-foreground")
          }
        >
          {confidencePct}% conf.
        </span>
      </footer>
    </article>
  );
}

function ProbCell({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: number | null;
  highlighted: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border px-2 py-2 " +
        (highlighted
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border bg-secondary/40 text-foreground")
      }
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold">{fmtPct(value)}</div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
