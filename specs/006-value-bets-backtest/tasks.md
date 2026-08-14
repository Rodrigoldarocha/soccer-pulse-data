# Tasks — Spec 006 (Backtest value bets)

## Infra

- [X] Migration `value_bets` (UNIQUE event_id,market,outcome, RLS, índices)
- [X] Tipo `value_bets` em `integrations/supabase/types.ts`

## Lógica (TDD)

- [X] `settleOutcome` puro — 1x2 HOME/AWAY/DRAW, OU2.5, btts, null safety, case-insensitive
- [X] `computeRoiStats` puro — stake unitária, ROI, hit_rate, vazios
- [X] `event_date` em `ValueBet` (snapshot precisa)

## Servidor

- [X] Snapshot idempotente no `getValueBets` (try/catch, feed não derruba)
- [X] `settlePendingValueBets` — scores em batch via events paginado
- [X] `getValueBetsBacktest` — settlement lazy + stats + recent, degrada p/ vazio sem tabela

## UI

- [X] Seção ROI em `/valor` (6 cards + últimos liquidados)
- [X] Suspense + preload no loader

## Qualidade

- [X] Testes 65/65
- [X] ESLint 0 erros
- [X] Build ok
- [ ] `npx supabase db push` (deploy da migration — passo do usuário)