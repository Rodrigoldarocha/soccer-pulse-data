# Contractos: Standings por Liga

Contratos entre camadas. Server fn é a fronteira client/server; `bzzoiroCachedFetch` é a
fronteira com API Bzzoiro.

## Contrato 1 — Server Function (client ↔ server)

### `getStandings(leagueId: number): Promise<StandingsView>`

```ts
interface StandingsView {
  leagueId: number;
  groups: StandingGroup[]; // [{ label: string | null, entries: StandingEntry[] }]
  fetchedAt: string; // ISO
}
```

- Input: `leagueId` int positivo; rejeitar `NaN`/`<=0` com erro Zod (`BzzoiroApiError` shape).
- Output: `groups` sempre array (pode ser vazio → estado vazio na UI).
- Erros: propaga `BzzoiroApiError`/`BzzoiroTimeoutError` (hierarquia existente em
  `src/lib/bzzoiro/errors.ts`).

## Contrato 2 — API Bzzoiro (server ↔ externo)

### `GET /api/v2/leagues/{id}/standings/`

- Auth: `Authorization: Token $BZZOIRO_TOKEN` (via `bzzoiroFetch`, já tratado)
- Params: nenhum (season default = atual)
- 200 body (ligas de pontos):
  ```json
  { "standings": [{ "position": 1, "team_name": "Arsenal", "points": 55, ... }] }
  ```
- 200 body (copas):
  ```json
  { "groups": { "Group A": [{ "position": 1, "team_name": "Real Madrid", ... }] } }
  ```
- 404 liga inválida → UI estado vazio (não erro)
- 429 → mensagem amigável rate limit (padrão existente)

## Contrato 3 — Rota / URL

### `GET /tabela?league=<id>`

- Sem `league` → default: primeira liga de `listLeagues` (ordenada por nome)
- `league` inválido (não-number) → ignorado, default
- `league` inexistente na lista → estado vazio com hint p/ trocar liga
- Persistência: `router.navigate({ to: "/tabela", search: { leagueId } })`
  (padrão `proximos.tsx`)

## Contrato 4 — Cache

| Key                       | TTL  | Store                                             |
| ------------------------- | ---- | ------------------------------------------------- |
| `standings:v2:{leagueId}` | 600s | `bzzoiroCachedFetch` default (Supabase / memória) |

- stale-if-error: embutido — API falha + cache expirado → serve cache (log warn)
- sem cache + API falha → propaga erro original

## Contrato 5 — Tipos compartilhados

```ts
// src/lib/bzzoiro/types.ts (novo)
interface StandingEntry {
  /* data-model.md */
}
interface StandingsResponse {
  standings: StandingEntry[] | null;
  groups: Record<string, StandingEntry[]> | null;
}
interface StandingGroup {
  label: string | null;
  entries: StandingEntry[];
}
```

- `StandingsResponse` = shape API; `StandingGroup` = shape pós-normalização (UI)
- Zod schema: `standingsResponseSchema` em `standings.functions.ts` (validação runtime
  do cache, padrão `bzzoiroCachedFetch` `schema` option)
