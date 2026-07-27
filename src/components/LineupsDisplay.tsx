import type { Lineups } from "@/lib/bzzoiro/types";

interface Props {
  lineups: Lineups | null;
}

export function LineupsDisplay({ lineups }: Props) {
  if (!lineups) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Escalações não disponíveis para esta partida.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <LineupSide team={lineups.home} side="Casa" />
      <LineupSide team={lineups.away} side="Fora" />
    </div>
  );
}

function LineupSide({ team, side }: { team: Lineups["home"]; side: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">{team.team}</h3>
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-mono">{team.formation}</span>
      </div>
      <div className="space-y-1">
        {team.players.map((player) => (
          <div key={player.number} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/40 transition-colors">
            <span className="w-7 text-right font-mono text-xs text-muted-foreground">{player.number}</span>
            <span className="font-medium">{player.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">{positionLabel(player.position)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function positionLabel(pos: string): string {
  const map: Record<string, string> = {
    GK: "Goleiro",
    DF: "Zagueiro",
    MF: "Meio-campo",
    FW: "Atacante",
  };
  return map[pos] ?? pos;
}
