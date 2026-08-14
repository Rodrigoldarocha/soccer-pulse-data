---
description: "Task list for value bets feature"
---

# Tasks: Value Bets

**Input**: `/specs/002-value-bets/` | **Tests**: incluÃ­dos (constituiÃ§Ã£o III)

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Add types `OddsBestEntry`, `ValueBet` in src/lib/bzzoiro/types.ts

## Phase 2: Foundational

- [x] T002 Create `computeValueBets(predictions, oddsBest)` puro (cruze por event_id, EV, filtros limiar/odd, ordenaÃ§Ã£o) in src/lib/value-bets.functions.ts
- [x] T003 [P] Add `normalizeOddsBest(raw)` defensivo (array eventos com outcomes) in src/lib/value-bets.functions.ts
- [x] T004 Write failing tests p/ computeValueBets in src/**tests**/value-bets.test.ts (red antes green)

**Checkpoint**: T004 falha atÃ© T002/T003 prontos

## Phase 3: User Story 1 - Listar apostas de valor (P1) MVP

**Independent Test**: `/valor` mostra cards EV desc com jogo/mercado/seleÃ§Ã£o/prob/odd/EV%

- [x] T005 [P] [US1] Test cruze + EV correto (1X2, O/U 2.5, BTTS) in src/**tests**/value-bets.test.ts
- [x] T006 [P] [US1] Test filtros: EV<5% excluÃ­do, odd fora [1.01,50] excluÃ­do in src/**tests**/value-bets.test.ts
- [x] T007 [US1] Create `getValueBets()` server fn â€” predictions + 3Ã— odds/best (market 1x2, over_under_25, btts), cache keys + TTL, rate limit 20/60s in src/lib/value-bets.functions.ts
- [x] T008 [US1] Create ValueBetsBoard in src/components/ValueBetsBoard.tsx â€” cards, EV badge verde, ordenaÃ§Ã£o
- [x] T009 [P] [US1] Create rota src/routes/valor.tsx com `validateSearch {market?: string}` + loader ensureQueryData
- [x] T010 [US1] Estados loading skeleton + vazio in src/components/ValueBetsBoard.tsx

**Checkpoint**: US1 funcional â€” `/valor` lista value bets

## Phase 4: User Story 2 - Filtro por mercado (P2)

**Independent Test**: `/valor?market=btts` mostra sÃ³ BTTS; URL persiste

- [x] T011 [P] [US2] Filtro select market (1x2, over_under_25, btts, all) + navigate search in src/components/ValueBetsBoard.tsx

## Phase 5: User Story 3 - Estado vazio e erro (P3)

**Independent Test**: sem value bets â†’ mensagem vazia; API off â†’ erro + retry

- [x] T012 [P] [US3] Mapear erros (429/API) â†’ mensagem amigÃ¡vel + retry in src/components/ValueBetsBoard.tsx

## Phase 6: Polish

- [x] T013 [P] Link `/valor` no nav (\_\_root.tsx)
- [x] T014 SEO meta na rota in src/routes/valor.tsx
- [x] T015 Run quickstart: npm run test + lint (arquivos novos) + build

## Dependencies

- US1: Foundational; US2: US1; US3: US1; Polish: todos
- Paralelo: T003 [P] com T002; T005/T006 [P]; T009 [P] com T008

## Implementation Strategy

MVP = US1 (T001â€“T010). Incremental: US1 â†’ US2 â†’ US3 â†’ Polish.

## Notes

- Test-first: T004/T005/T006 falham antes da implementaÃ§Ã£o
- Commit apÃ³s cada grupo lÃ³gico
