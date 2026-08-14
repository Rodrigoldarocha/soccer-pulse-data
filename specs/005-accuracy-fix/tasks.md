# Tasks — Spec 005 (Correção acurácia + value bets)

## T1 — Bug oddsByEvent

- [X] Teste red: mesmo evento, entries separadas por mercado → bets dos 3 mercados
- [X] Fix: merge outcomes (não sobrescreve)
- [X] 8/8 testes value-bets verdes

## T2 — Amostra backtest

- [X] Janela 8 → 30 dias
- [X] Paginação predictions (offset, cap 6 páginas, stop em página vazia)
- [X] Amostra alinhada entre predictions e events

## T3 — Calibração

- [X] `calibrationBuckets` puro (5 buckets, hit_rate por faixa)
- [X] 4 testes (vazio, distribuição, hit_rate decididos, sem confiança)
- [X] `LeagueAccuracy.calibration` no retorno
- [X] Tabela de calibração na página Acertividade
- [X] Texto "últimos 7 dias" → "últimos 30 dias"

## Qualidade

- [X] Testes 56/56
- [X] ESLint 0 erros
- [X] Build ok