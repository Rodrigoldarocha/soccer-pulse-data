import type { Lineups, LineupTeam } from "@/lib/bzzoiro/types";

interface Props {
  lineups: Lineups | null;
}

export function LineupsDisplay({ lineups }: Props) {
  const home = lineups?.home ?? null;
  const away = lineups?.away ?? null;

  if (!home && !away) {
    return (
      <div className="clay p-8 text-center">
        <p className="text-muted-foreground">Escalações não disponíveis para esta partida.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {home && <LineupSide team={home} />}
      {away && <LineupSide team={away} />}
    </div>
  );
}

function LineupSide({ team }: { team: LineupTeam }) {
  const players = team.players ?? [];

  return (
    <div className="clay p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-bold">{team.team_name}</h3>
        {team.formation && (
          <span className="clay-sm px-2 py-0.5 font-mono text-xs">{team.formation}</span>
        )}
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">Escalação ainda não divulgada.</p>
      ) : (
        <div className="space-y-1">
          {players.map((player, i) => (
            <div
              key={player.id ?? i}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
            >
              <span className="w-7 text-right font-mono text-xs text-muted-foreground">
                {player.jersey_number ?? "–"}
              </span>
              <span className="font-medium">
                {player.name}
                {player.captain && <span className="ml-1 text-xs text-primary">(C)</span>}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {positionLabel(player.position)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function positionLabel(pos: string): string {
  const map: Record<string, string> = {
    G: "Goleiro",
    GK: "Goleiro",
    D: "Defensor",
    DF: "Defensor",
    M: "Meio-campo",
    MF: "Meio-campo",
    F: "Atacante",
    FW: "Atacante",
  };
  return map[pos] ?? pos;
}
