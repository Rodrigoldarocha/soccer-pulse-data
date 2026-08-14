# Spec 006 — Backtest de value bets (ROI)

**Status:** implementado
**Data:** 2026-08-14

## Objetivo

Responder "as apostas de valor realmente lucram?" — persistir bets de valor,
liquidar com resultado real e expor ROI.

## Restrição de dados

`/api/v2/odds/best/` só retorna odds atuais p/ eventos futuros — odds
históricas inexistem. Única forma honesta: **snapshot a partir de agora**
(cada bet computado é registrado; o ROI acumula com o tempo).

## Arquitetura

1. **Tabela `value_bets`** (migration): event_id, market, outcome, prob,
   odds, ev, event_date, times, status ('pending'|'won'|'lost'), settled_at.
   `UNIQUE (event_id, market, outcome)` → snapshot idempotente via
   `upsert(..., ignoreDuplicates)`.
2. **Snapshot**: `getValueBets` persiste bets novos após computar. Falha de
   persistência só loga — feed não derruba.
3. **Settlement lazy (sem cron)**: `getValueBetsBacktest` liquida pendentes
   com `event_date < now − 3h` antes de ler: busca scores via `/api/v2/events/`
   (janela do menor event_date até agora, paginado), resolve win/loss com
   `settleOutcome` puro, atualiza em lote.
4. **ROI**: stake unitária 1; ganho = odd, perda = 0;
   `roi = (Σ odds vencidas − liquidados) / liquidados`.
5. **UI**: seção de backtest em `/valor` — cards (total, liquidados, acertos,
   hit rate, ROI, lucro em unidades) + tabela dos últimos liquidados.

## Trade-offs

- Sem cron: settlement roda sob demanda (rate limit 20/min). Para volume
  pequeno (bets diárias) é suficiente; cron Cloudflare seria upgrade futuro.
- Linha OU2.5 não tem push (sempre won/lost); btts/1x2 idem.
- Migration não aplicada → backtest degrada para vazio (sem crash).

## Fora de escopo

- Cron automático de settlement.
- Stake real/Kelly (só unidade 1).
- Calibração de value bets por faixa de EV.

## Verificação

- Testes 65/65 (9 novos: settleOutcome 6 + computeRoiStats 3).
- ESLint 0 erros.
- Build ok.
- **Pendente deploy:** `npx supabase db push` (aplicar migration no projeto).