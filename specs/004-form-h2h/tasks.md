# Tasks — Spec 004 (Forma + H2H)

## Pesquisa

- [X] Confirmar `head_to_head` inline no `EventDetailV2Schema`
- [X] Confirmar ausência de forma na lista de predictions
- [X] Confirmar `teams/{id}/fixtures/` como fonte de forma

## Tipos

- [X] `HeadToHead` + `HeadToHeadRecentMatch` + `head_to_head?` em `EventDetail`

## Lógica (TDD)

- [X] Testes de `computeTeamForm` (ordem, perspectiva casa/fora, filtro, cap, vazio)
- [X] Testes de `formSummary`
- [X] Implementação `computeTeamForm` + `formSummary` puros

## Servidor

- [X] `getTeamForm` com rate limit e cache 5 min

## UI

- [X] `H2HBlock` — totais, gols, média, taxas, últimos confrontos
- [X] `FormBlock` — chips W/D/L + resumo por time
- [X] Integração na aba Detalhes com Suspense

## Qualidade

- [X] Testes 51/51
- [X] ESLint 0 erros
- [X] Build ok