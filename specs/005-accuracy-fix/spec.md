# Spec 005 — Correção de acurácia e value bets

**Status:** implementado
**Data:** 2026-08-14

## Contexto (investigação)

Sistema de previsões auditado contra o schema v2 (`/api/schema/`). Verdict:
EV math e backtest corretos; probs do modelo calibradas e market-anchored.
Encontrado 1 bug crítico + 2 lacunas.

## T1 — Bug: value bets perdidos por sobrescrita de mercado

`oddsByEvent` sobrescrevia outcomes do mesmo `event_id` entre calls
separadas de `/api/v2/odds/best/` (uma por mercado). Efeito: só o último
mercado (btts) era avaliado; bets de 1x2 e OU2.5 nunca apareciam.

**Fix:** merge de outcomes no entry existente em vez de `map.set`.

## T2 — Amostra de backtest fraca

Janela de 8 dias e 1 página (200) de predictions vs até 1200 events →
hit_rate viesado por truncamento.

**Fix:** janela 30 dias + paginação de predictions (offset até página vazia,
cap 6 páginas), alinhada à cobertura de events.

## T3 — Calibração por bucket de confiança

O modelo declara confiança 0-1 calibrada; o app nunca verificava.

**Fix:** `calibrationBuckets` puro (buckets <50%, 50-60, 60-70, 70-80, 80+)
exposto em `LeagueAccuracy.calibration` + tabela na página Acertividade.
Se hit_rate ≈ confiança do bucket, modelo calibrado.

## Fora de escopo

- Backtest de value bets (settlement/ROI persistido) — infra maior.
- Calibração de mercados BTTS/OU (só 1X2 nesta entrega).

## Verificação

- Testes 56/56 (5 novos: merge multi-mercado + 4 calibração).
- ESLint 0 erros nos arquivos tocados.
- Build ok.