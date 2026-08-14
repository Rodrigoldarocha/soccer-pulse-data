# Integração com API Bzzoiro (sports.bzzoiro.com)

## Endpoints Implementados

| Endpoint                                   | Status          | Arquivo                            | Descrição                           |
| ------------------------------------------ | --------------- | ---------------------------------- | ----------------------------------- |
| `GET /api/v2/predictions/`                 | ✅ Implementado | `src/lib/predictions.functions.ts` | Previsões ML com filtros            |
| `GET /api/v2/leagues/`                     | ✅ Implementado | `src/lib/leagues.functions.ts`     | Lista de ligas ativas               |
| `GET /api/v2/events/{id}/`                 | ✅ Implementado | `src/lib/events.functions.ts`      | Detalhe do evento                   |
| `GET /api/v2/events/{id}/odds/comparison/` | ✅ Implementado | `src/lib/odds.functions.ts`        | Comparativo de odds                 |
| `GET /api/v2/events/`                      | ✅ Implementado | `src/lib/live.functions.ts`        | Eventos ao vivo (status=inprogress) |

## Endpoints Planejados

| Endpoint                       | Status       | Descrição                 |
| ------------------------------ | ------------ | ------------------------- |
| `GET /v2/events/{id}/lineups/` | ❌ Planejado | Escalações                |
| `GET /v2/events/{id}/stats/`   | ❌ Planejado | Estatísticas de partida   |
| `GET /v2/bookmakers/`          | ❌ Planejado | Casas de apostas          |
| `GET /v2/broadcasts/`          | ❌ Planejado | Transmissões              |
| `GET /v2/players/`             | ❌ Planejado | Perfil de jogadores       |
| `GET /v2/player-stats/`        | ❌ Planejado | Estatísticas de jogadores |
| `GET /v2/teams/`               | ❌ Planejado | Times                     |
| WebSocket                      | ❌ Planejado | Dados em tempo real       |

## Arquitetura

```
[Browser] → TanStack RPC → [Server Functions] → bzzoiroFetch() → [Bzzoiro API]
                                ↓
                         [bzzoiroCachedFetch]
                                ↓
                         [Supabase Cache (Postgres)]
```

- Cliente **nunca** chama API Bzzoiro diretamente
- Token `BZZOIRO_TOKEN` permanece server-side (`.server.ts`)
- Cache em Postgres com TTL configurável por endpoint
- Rate limiting distribuído via Supabase (produção) ou in-memory (dev)

## Exemplos de Uso

### Listar previsões futuras

```typescript
import { listUpcomingPredictions } from "@/lib/predictions.functions";

const predictions = await listUpcomingPredictions({
  data: { limit: 30, leagueId: 123, minConfidence: 0.6 },
});
```

### Buscar detalhe de evento

```typescript
import { getEventDetail } from "@/lib/events.functions";

const event = await getEventDetail({ data: { eventId: 456 } });
```

### Listar jogos ao vivo

```typescript
import { listLiveEvents } from "@/lib/live.functions";

const liveEvents = await listLiveEvents({ data: {} });
```

## Variáveis de Ambiente

| Variável                        | Obrigatório            | Descrição                          |
| ------------------------------- | ---------------------- | ---------------------------------- |
| `BZZOIRO_TOKEN`                 | Sim                    | Token de autenticação da API       |
| `SUPABASE_URL`                  | Sim                    | URL do projeto Supabase            |
| `SUPABASE_SERVICE_ROLE_KEY`     | Sim (cache/rate-limit) | Chave service_role do Supabase     |
| `VITE_SUPABASE_URL`             | Sim                    | URL pública do Supabase (client)   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim                    | Chave anônima do Supabase (client) |
