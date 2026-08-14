---
description: "Task list for standings feature implementation"
---

# Tasks: Standings por Liga

**Input**: Design documents from `/specs/001-standings/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: IncluÃ­dos â€” constituiÃ§Ã£o III exige test-first para `src/lib/`.

**Organization**: Tasks grouped by user story (independent implementation/testing).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no deps)
- **[Story]**: user story (US1, US2, US3)
- Exact file paths

## Path Conventions

- Single project: `src/`, `src/__tests__/` at repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Base para a feature

- [x] T001 Add types `StandingEntry`, `StandingsResponse`, `StandingGroup` to src/lib/bzzoiro/types.ts
- [x] T002 [P] Create `standingsResponseSchema` (Zod) in src/lib/standings.functions.ts (novo)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core que TODAS as stories dependem

- [x] T003 Create `getStandings(leagueId)` server fn in src/lib/standings.functions.ts â€” `bzzoiroCachedFetch("/api/v2/leagues/{id}/standings/")`, key `standings:v2:{leagueId}`, TTL 600s, schema Zod
- [x] T004 [P] Add rate limit `checkRateLimit(standings:{ip})` (max 20, janela 60s) inside `getStandings` handler in src/lib/standings.functions.ts
- [x] T005 [P] Implement normalizeStandings(raw) â€” groupsâ†’array de StandingGroup, standingsâ†’grupo Ãºnico, ambos nulosâ†’[] â€” em src/lib/standings.functions.ts
- [x] T006 [P] Implement sortEntries: points desc, desempate goal_diff desc, Ãºltimo position asc â€” em src/lib/standings.functions.ts
- [x] T007 Write failing unit tests para normalizaÃ§Ã£o + ordenaÃ§Ã£o + goal_diff derivado in src/**tests**/standings.test.ts (test-first, red antes de green)

**Checkpoint**: Foundation ready â€” testes T007 devem falhar atÃ© T005/T006 prontos

---

## Phase 3: User Story 1 - Ver classificaÃ§Ã£o de uma liga (Priority: P1) MVP

**Goal**: Rota `/tabela` com seletor de ligas e tabela completa ordenada por pontos

**Independent Test**: abrir `/tabela`, selecionar liga, ver J/V/E/D/GP/GC/SG/PTS ordenado; URL mantÃ©m `?league=`

### Tests for User Story 1

> **NOTE: testes primeiro, falham antes da implementaÃ§Ã£o**

- [x] T008 [P] [US1] Test stale-if-error fallback: API falha + cache expirado â†’ retorna cache em src/**tests**/standings.test.ts
- [x] T009 [P] [US1] Test Zod schema rejeita payload malformado in src/**tests**/standings.test.ts

### Implementation for User Story 1

- [x] T010 [US1] Create StandingsBoard component in src/components/StandingsBoard.tsx â€” renderiza grupos/seÃ§Ãµes, colunas posiÃ§Ã£o/time/logo/J/V/E/D/GP/GC/SG/PTS
- [x] T011 [P] [US1] Create rota src/routes/tabela.tsx com `validateSearch` `{leagueId?: number}` (padrÃ£o proximos.tsx)
- [x] T012 [US1] Wire `getStandings` + React Query (queryKey `["standings", leagueId]`, `ensureQueryData` no loader) em src/routes/tabela.tsx
- [x] T013 [US1] Seletor de ligas reusa `listLeagues`; default = primeira liga; `router.navigate({ to: "/tabela", search: { leagueId } })` em src/components/StandingsBoard.tsx
- [x] T014 [US1] Estados loading skeleton + vazio (sem dados) em src/components/StandingsBoard.tsx

**Checkpoint**: US1 funcional â€” tabela de qualquer liga ativa em â‰¤2 cliques, deep-link OK

---

## Phase 4: User Story 2 - Destaque de zonas (Priority: P2)

**Goal**: Ãšltimas 3 posiÃ§Ãµes destacadas quando total de times â‰¥ 12 (rebaixamento)

**Independent Test**: liga top-5 â†’ fundo vermelho suave nas 3 Ãºltimas; liga pequena â†’ sem destaque

### Implementation for User Story 2

- [x] T015 [P] [US2] Add `getRelegationZoneIndices(entries)` helper (Ãºltimos 3 se â‰¥12 times, senÃ£o []) in src/components/StandingsBoard.tsx
- [x] T016 [US2] Apply zone styling (fundo vermelho suave) nas linhas do rebaixamento in src/components/StandingsBoard.tsx

**Checkpoint**: US1 + US2 funcionais e independentes

---

## Phase 5: User Story 3 - Estado vazio e erro (Priority: P3)

**Goal**: Mensagens amigÃ¡veis p/ sem-dados e falha de API

**Independent Test**: liga sem standings â†’ estado vazio sem crash; rede off â†’ erro amigÃ¡vel ou stale cache

### Implementation for User Story 3

- [x] T017 [P] [US3] Mapear erros: 429 â†’ "tente novamente em instantes"; 404/liga invÃ¡lida â†’ estado vazio; usa `BzzoiroApiError.getUserMessage()` in src/components/StandingsBoard.tsx
- [x] T018 [US3] Adicionar estado error + botÃ£o retry no StandingsBoard in src/components/StandingsBoard.tsx
- [x] T019 [US3] Hint p/ liga inexistente no URL (league invÃ¡lido â†’ mensagem trocar liga) in src/components/StandingsBoard.tsx

**Checkpoint**: Todas user stories independentemente funcionais

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade e validaÃ§Ã£o final

- [x] T020 [P] Link p/ `/tabela` no nav/header (SC-001: â‰¤2 cliques da home)
- [x] T021 Add SEO meta title/description na rota (padrÃ£o proximos.tsx `head()`) in src/routes/tabela.tsx
- [x] T022 Run quickstart.md validation: npm run test + lint + build
- [x] T023 Verificar SC-004: grep nas chunks de build por BZZOIRO_TOKEN (nÃ£o deve aparecer)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)**: sem deps
- **Foundational (P2)**: depende Setup; BLOQUEIA stories
- **US1 (P3)**: depende Foundational
- **US2 (P4)**: depende US1 (mesmo componente)
- **US3 (P5)**: depende US1
- **Polish (P6)**: depende das stories desejadas

### User Story Dependencies

- **US1 (P1)**: MVP â€” sem dep de outras stories
- **US2 (P2)**: reusa StandingsBoard do US1; nÃ£o bloqueia US3
- **US3 (P3)**: reusa estados do US1; independente de US2

### Within Each User Story

- Testes (quando incluÃ­dos) escritos e FALHANDO antes da implementaÃ§Ã£o
- Modelos â†’ services â†’ endpoints â†’ integraÃ§Ã£o

### Parallel Opportunities

- T002 [P] com T001 (arquivos diferentes)
- T004, T005, T006 [P] entre si (funÃ§Ãµes distintas em mesmo arquivo â€” paralelo apenas lÃ³gico, commit sequencial)
- T008, T009 [P] com T010/T011 (testes vs implementaÃ§Ã£o, TDD)
- T015 [P] com T017 (helpers distintos no mesmo componente â€” lÃ³gico)

---

## Parallel Example: Foundational

```bash
Task: "Rate limit em src/lib/standings.functions.ts (T004)"
Task: "normalizeStandings em src/lib/standings.functions.ts (T005)"
Task: "sortEntries em src/lib/standings.functions.ts (T006)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup + Foundational (T001â€“T007)
2. US1 (T008â€“T014)
3. **STOP and VALIDATE**: rota `/tabela` com tabela de qualquer liga
4. Deploy/demo se pronto

### Incremental Delivery

1. Foundation (T001â€“T007)
2. US1 â†’ validar â†’ demo (MVP)
3. US2 â†’ validar (zonas)
4. US3 â†’ validar (erros/vazio)
5. Polish (T020â€“T023)

---

## Notes

- [P] = arquivos diferentes ou funÃ§Ãµes independentes
- [Story] label rastreia p/ user story do spec.md
- Verificar testes falham antes de implementar (red-green)
- Commit apÃ³s cada task ou grupo lÃ³gico
- Parar nos checkpoints p/ validar story independente
