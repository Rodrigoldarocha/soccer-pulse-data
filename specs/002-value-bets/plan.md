# Implementation Plan: Value Bets

**Branch**: `002-value-bets` | **Date**: 2026-08-14 | **Spec**: `specs/002-value-bets/spec.md`

## Summary

Rota `/valor` cruza predictions (probs ML) com `/api/v2/odds/best/` (melhor odd por outcome,
1 call por mercado: 1x2, over_under_25, btts), computa EV = prob/100×odd−1, filtra
EV≥5% e odd∈[1.01,50], ordena EV desc. Server fn cacheada + rate limit; UI com filtro
market por URL.

## Technical Context

**Language/Version**: TypeScript 5.8 strict, React 19, Node 22
**Primary Dependencies**: TanStack Start (createServerFn), Zod, TanStack Query/Router, Tailwind+shadcn
**Storage**: Supabase bzzoiro_cache (reuso)
**Testing**: Vitest
**Target Platform**: Cloudflare Workers (SSR)
**Constraints**: ≤4 upstream calls, sem segredo client, padrões repo (cache/rate-limit/erros)

## Constitution Check

| Princípio       | Gate                               | Status |
| --------------- | ---------------------------------- | ------ |
| I. Spec-First   | spec antes de código               | PASS   |
| II. Type-Safe   | Zod + tipos ValueBet/OddsBestEntry | PASS   |
| III. Test-First | computeValueBets testado antes     | PASS   |
| IV. Resilient   | cache+stale-if-error+rate limit    | PASS   |
| V. Security     | token server-only                  | PASS   |

## Project Structure

```text
src/
├── lib/
│   ├── bzzoiro/types.ts            # + OddsBestEntry, ValueBet
│   ├── value-bets.functions.ts     # NOVO — getValueBets + computeValueBets (puro)
├── components/
│   └── ValueBetsBoard.tsx          # NOVO — lista, filtro market, vazio/erro
├── routes/
│   └── valor.tsx                   # NOVO — /valor + validateSearch market
└── __tests__/
    └── value-bets.test.ts          # NOVO — computeValueBets
```

## Complexity Tracking

N/A — sem violações.
