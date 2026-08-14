# Research: Standings por Liga

## R1 — Shape do endpoint standings (v2)

- **Decision**: Usar `/api/v2/leagues/{id}/standings/` sem params (season default = atual).
- **Rationale**: Schema OpenAPI confirma endpoint ativo; padroniza com `/api/v2/leagues/` já usado.
- **Alternatives considered**: v1 `/api/leagues/{id}/standings/` (deprecated, rejeitado).

## R2 — Formato de resposta: flat vs groups

- **Decision**: Normalizar resposta: `{ standings: StandingEntry[] }` (ligas de pontos) e
  `{ groups: Record<string, StandingEntry[]> }` (copas). Guarda ambos no cache; UI decide.
- **Rationale**: Schema OpenAPI afirma "cup competitions return a `groups` map; league
  competitions return a flat `standings` array". Normalização mínima evita perda de dado.
- **Alternatives considered**: Converter groups → flat com coluna "grupo" (rejeitado: mistura
  times de grupos diferentes na mesma ordenação; mantém `groups` para seções).

## R3 — Tipos TS

- **Decision**: Adicionar `StandingEntry`, `StandingsResponse` e `StandingGroup` em
  `src/lib/bzzoiro/types.ts`, com Zod schema em `standings.functions.ts` (padrão repo:
  `bzzoiroCachedFetch` aceita `schema`).
- **Rationale**: Constituição II — type-safe contracts, validação Zod em todo input/output
  de server function.
- **Alternatives considered**: Tipos soltos sem schema (rejeitado: cache Postgres não valida
  runtime por si só).

## R4 — Cache + rate limit

- **Decision**: `bzzoiroCachedFetch` com `key: standings:v2:{leagueId}` e TTL 10min;
  `checkRateLimit(standings:{ip})` janela 60s, max 20 (2x leagues:list).
- **Rationale**: Padrão exato de `leagues.functions.ts`; stale-if-error já embutido no
  `bzzoiroCachedFetch` (fr-008 grátis).
- **Alternatives considered**: TTL 60min (rejeitado: tabela muda toda rodada).

## R5 — Rota e URL state

- **Decision**: Rota file-based `src/routes/tabela.tsx` com `validateSearch` para
  `{ leagueId?: number }` — padrão idêntico ao `proximos.tsx`; default = primeira liga.
- **Rationale**: Constituição I — spec-first, reuso de padrão provado; deep-link/share via URL.
- **Alternatives considered**: State interno React (rejeitado: perde deep-link, contraria fr-005).

## R6 — Destaque de zonas

- **Decision**: Mapa de zonas config por posição (top N continental, bottom N rebaixamento)
  com fallback seguro: só pinta quando liga tem `promotion/relegation` conhecido — simplificar
  v1: destacar apenas bottom 3 (rebaixamento) quando total de times ≥ 12.
- **Rationale**: Sem metadado de zonas na API, heurística conservadora evita falsos destaques
  (acceptance US2.2).
- **Alternatives considered**: Tabela de zonas por liga hardcoded (rejeitado: manutenção alta).

## R7 — Estado vazio/erro

- **Decision**: `StandingsBoard` com três estados: loading skeleton, vazio (sem dados),
  erro amigável (rate limit/API). Reusa hierarquia de erros existente
  (`BzzoiroApiError.getUserMessage()`).
- **Rationale**: Padrão `PredictionsBoard`/`PredictionCard` já trata erros assim; consistência.

## R8 — Testes

- **Decision**: Vitest em `src/__tests__/standings.test.ts` cobrindo: normalização
  flat/groups, ordenação por pontos+saldo, fallback stale-if-error, validação Zod.
- **Rationale**: Constituição III — test-first non-negotiable para `src/lib/`.
- **Alternatives considered**: Testes só de UI (rejeitado: lógica de normalização é onde mora
  o risco).
