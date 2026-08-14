# Implementation Plan: Standings por Liga

**Branch**: `001-standings` | **Date**: 2026-08-14 | **Spec**: `specs/001-standings/spec.md`

**Input**: Feature specification from `/specs/001-standings/spec.md`

## Summary

Nova rota `/tabela` exibe classificação por liga (J, V, E, D, GP, GC, SG, PTS) alimentada
por `/api/v2/leagues/{id}/standings/` via `bzzoiroCachedFetch` (cache + stale-if-error),
seletor de liga com URL state (padrão `proximos.tsx`), suporte a copas (`groups`),
destaque de zonas de rebaixamento e testes Vitest.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict), React 19.2, Node.js 22

**Primary Dependencies**: TanStack Start (`createServerFn`), TanStack Router (file-based),
Zod 3.24, Tailwind CSS v4 + shadcn/ui, Supabase (cache Postgres)

**Storage**: Supabase (tabela `bzzoiro_cache`, service_role, server-only)

**Testing**: Vitest 4 (`npm run test`)

**Target Platform**: Cloudflare Workers (Nitro build), SSR

**Project Type**: Web application (TanStack Start)

**Performance Goals**: Render tabela <1s com cache hit (SC-002); sem chamada upstream
por visita repetida

**Constraints**: Sem segredo no bundle cliente (BZZOIRO_TOKEN server-only);
sem alterar infra de cache existente; reuso de `listLeagues`

**Scale/Scope**: 30+ ligas, tabelas de até ~24 times / 8 grupos

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                 | Gate                                      | Status                                                               |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| I. Spec-First             | spec aprovado antes de código             | PASS — spec.md completo                                              |
| II. Type-Safe Contracts   | Zod em server function, sem `any`         | PASS — schema standings + tipos                                      |
| III. Test-First           | testes p/ lib antes de implementar        | PASS — `standings.test.ts` planejado                                 |
| IV. Resilient Data Access | cache-first + stale-if-error + rate limit | PASS — `bzzoiroCachedFetch` + `checkRateLimit`                       |
| V. Security & Secrets     | token server-only                         | PASS — `standings.functions.ts` é `.ts` server fn, sem import client |

## Project Structure

### Documentation (this feature)

```text
specs/001-standings/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões R1–R8
├── data-model.md        # Phase 1 — entidades + validação
├── quickstart.md        # Phase 1 — guia de validação
├── contracts/           # Phase 1 — contratos de interface
└── tasks.md             # Phase 2 (specify tasks) — NÃO criado aqui
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── bzzoiro/
│   │   └── types.ts             # + StandingEntry, StandingsResponse, StandingGroup
│   ├── standings.functions.ts   # NOVO — getStandings(leagueId) server fn
│   └── rate-limit.server.ts     # reuso
├── components/
│   └── StandingsBoard.tsx       # NOVO — tabela, zonas, vazio/erro
├── routes/
│   └── tabela.tsx               # NOVO — rota /tabela + validateSearch
└── __tests__/
    └── standings.test.ts        # NOVO — normalização, ordenação, stale-if-error
```

**Structure Decision**: Single project (TanStack Start). Server fn em `src/lib/`
(padrão `leagues.functions.ts`), rota file-based em `src/routes/`, UI em `src/components/`,
testes em `src/__tests__/`. Nenhuma mudança em `src/integrations/` ou supabase migrations.

## Complexity Tracking

> Sem violações de constitution. N/A.
