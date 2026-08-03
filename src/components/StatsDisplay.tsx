import type { EventStats, StatValue } from "@/lib/bzzoiro/types";

interface Props {
  stats: EventStats | null;
}

const ITEMS: { key: string; label: string; suffix?: string }[] = [
  { key: "ball_possession", label: "Posse de Bola", suffix: "%" },
  { key: "total_shots", label: "Finalizações" },
  { key: "shots_on_target", label: "No Gol" },
  { key: "corner_kicks", label: "Escanteios" },
  { key: "fouls", label: "Faltas" },
  { key: "yellow_cards", label: "Cartões Amarelos" },
  { key: "expected_goals", label: "Gols Esperados (xG)" },
  { key: "passes", label: "Passes" },
  { key: "pass_accuracy_pct", label: "Precisão de Passe", suffix: "%" },
];

function toNumber(v: StatValue | undefined): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") {
    if (typeof v.value === "number") return v.value;
    if (typeof v.actual === "number") return v.actual;
  }
  return 0;
}

export function StatsDisplay({ stats }: Props) {
  const home = stats?.home;
  const away = stats?.away;

  const rows = ITEMS.filter((i) => home?.[i.key] != null || away?.[i.key] != null);

  if (!stats || rows.length === 0) {
    return (
      <div className="clay p-8 text-center">
        <p className="text-muted-foreground">Estatísticas não disponíveis para esta partida.</p>
      </div>
    );
  }

  return (
    <div className="clay p-5">
      <div className="space-y-5">
        {rows.map(({ key, label, suffix }) => {
          const homeVal = toNumber(home?.[key]);
          const awayVal = toNumber(away?.[key]);
          const total = homeVal + awayVal;
          const homePct = total > 0 ? (homeVal / total) * 100 : 50;
          const fmt = (v: number) =>
            `${Number.isInteger(v) ? v : v.toFixed(2)}${suffix ?? ""}`;

          return (
            <div key={key}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {fmt(homeVal)} × {fmt(awayVal)}
                </span>
              </div>
              <div className="clay-inset relative h-2.5 overflow-hidden rounded-full">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-primary"
                  style={{ width: `${homePct}%` }}
                />
                <div
                  className="absolute right-0 top-0 h-full rounded-full bg-accent"
                  style={{ width: `${100 - homePct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
