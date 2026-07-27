import type { EventStats } from "@/lib/bzzoiro/types";

interface Props {
  stats: EventStats | null;
}

export function StatsDisplay({ stats }: Props) {
  if (!stats) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Estatísticas não disponíveis para esta partida.</p>
      </div>
    );
  }

  const items: { key: keyof EventStats; label: string; homeLabel?: string; format: (v: number) => string }[] = [
    { key: "possession", label: "Posse de Bola", format: (v) => `${v}%` },
    { key: "shots", label: "Finalizações", format: (v) => String(v) },
    { key: "shots_on_target", label: "No Gol", format: (v) => String(v) },
    { key: "corners", label: "Escanteios", format: (v) => String(v) },
    { key: "fouls", label: "Faltas", format: (v) => String(v) },
    { key: "yellow_cards", label: "Cartões Amarelos", format: (v) => String(v) },
    { key: "red_cards", label: "Cartões Vermelhos", format: (v) => String(v) },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="space-y-5">
        {items.map(({ key, label, format }) => {
          const homeVal = stats[key]?.home ?? 0;
          const awayVal = stats[key]?.away ?? 0;
          const total = homeVal + awayVal;
          const homePct = total > 0 ? (homeVal / total) * 100 : 50;

          return (
            <div key={key}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {format(homeVal)} × {format(awayVal)}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                  style={{ width: `${homePct}%` }}
                />
                <div
                  className="absolute right-0 top-0 h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${100 - homePct}%` }}
                />
                <div className="absolute left-1/2 top-0 h-full w-0.5 bg-background/60" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
