# Soccer Pulse Data — PulseLab

Dashboard de probabilidades esportivas (BTTS, 1X2, Over/Under 2.5) com modelo Poisson + xG em TypeScript, calibração Platt Scaling, ensemble ponderado por Brier Score, cache em Supabase/Postgres e front-end React.

> Painel de visualização — sem odds, sem apostas, sem bilhete. Conectado ao [Lovable](https://lovable.dev). Não reescreva histórico git publicado (rebase/amend/force-push) — ver `AGENTS.md`.

## Funcionalidades

- **Hoje (`/today`)**: partidas de hoje (America/Sao_Paulo) com busca por time/liga
- **Amanhã (`/tomorrow`)**: partidas de amanhã (America/Sao_Paulo)
- **`/`**: redireciona para `/today`
- **Ao vivo (`/live`)**: placar + mesmas probabilidades (atualiza a cada 30s)
- **Analytics (`/analytics`)**: métricas técnicas do modelo (Brier, Log Loss, Calibration Error, acurácia) + distribuições de hoje; estado vazio quando sem amostras
- **Settings (`/settings`)**: fuso horário, info do modelo
- **MatchCard somente leitura**: BTTS SIM/NÃO, 1X2 CASA/EMPATE/FORA, OVER/UNDER 2.5 em `%` inteiros + confiança do modelo (Alta/Média/Baixa)
- Hierarquia visual por probabilidade (≥65% forte, 50–64% moderado, <50% neutro) — não é recomendação de aposta

## Como funciona (ML)

Detalhe completo em [`ML_ARCHITECTURE.md`](./ML_ARCHITECTURE.md).

```
Bzzoiro Sports API ──► Prediction Engine ──► Calibração ──► Ensemble ──► Supabase cache
(dados históricos)      (Poisson + xG)      (Platt Scaling)  (70/30 default)
```

1. **Prediction Engine** (`src/lib/prediction-engine.ts`):
   `xG_home = league_avg * home_offense * away_defense_weakness * 1.2`
   `xG_away = league_avg * away_offense * home_defense_weakness`
   Convolução Poisson → P(1X2, Over 2.5, BTTS).
2. **Calibração** (`src/lib/ml/calibration.ts`): `sigmoid(a * logit(P_raw) + b)` por `(league_id, market)`. Mínimo 10 amostras, senão retorna raw.
3. **Ensemble** (`src/lib/ml/ensemble.ts`): `w_model * P_calibrated + w_poisson * P_poisson`, pesos dinâmicos por Brier Score (modelo 40–90%).
4. **Pipeline** (`src/lib/ml/pipeline.ts` + `src/lib/data-pipeline.ts`): timeout global 25s, top 20 eventos/dia, fallback xG `1.56 / 1.10`, confidence `low` sem dados.
5. **Accuracy Store** (`src/lib/ml/accuracy-store.ts`): persiste predições/outcomes, recalcula métricas pós-jogo via `POST /api/triggerRecalibration`.

Confiança: `high` = Brier < 0.15 e > 50 amostras · `medium` = Brier < 0.22 e > 20 · `low` = demais.

## Stack

| Camada | Tech |
|---|---|
| Front | React 19, TanStack Start/Router/Query, Tailwind 4, shadcn/Radix, Framer Motion, Recharts, Lucide |
| Forms/validação | React Hook Form + Zod |
| Backend | TanStack Start SSR + Server Functions (`*.functions.ts`), Nitro |
| Dados | Bzzoiro Sports API (`https://sports.bzzoiro.com/api/v2`), ESPN (live backup) |
| Persistência | Supabase Postgres (`supabase/migrations/`) |
| Build | Vite 8, `@lovable.dev/vite-tanstack-config`, TypeScript 5.8, ESLint + Prettier |

## Estrutura

```
src/
├── routes/            # / (→/today), /today, /tomorrow, /live, /analytics, /settings
├── components/        # AppLayout, MatchCard (probabilidades), ui/*
├── lib/
│   ├── match-dates.ts        # bucket today/tomorrow/other em America/Sao_Paulo
│   ├── probability-view.ts   # grupos BTTS/1X2/OverUnder, fmtPct, níveis visuais
│   ├── prediction-engine.ts
│   ├── data-pipeline.ts      # orquestrador: fetch → filtra finished → top 20 → buildPrediction
│   ├── matches.server.ts / matches.functions.ts / standings.functions.ts
│   ├── api/thesportsdb.ts    # cliente Bzzoiro (rate-limit 350ms, cache 5min, retry 3x, timeout 8s)
│   ├── api/espn.ts           # cliente ESPN (não wired ao pipeline — ver nota em APIs)
│   └── ml/                   # types, calibration, ensemble, pipeline, accuracy-store, recalibrate
├── integrations/supabase/    # client.ts, client.server.ts, auth-*
supabase/migrations/  # data_tables + ml_tables (ml_predictions, ml_calibration_params, ml_accuracy_metrics)
```

## Pré-requisitos

- Node 20+ (ou Bun 1.2+ — há `bun.lock` e `package-lock.json`)
- Conta Supabase (URL + publishable key + service role key)
- Token Bzzoiro **obrigatório para dados reais** — sem `BZZOIRO_TOKEN` a API retorna HTTP 401 e o pipeline entrega listas vazias (verificado em 2026-09-09)

## Quickstart

```bash
# 1. instalar
npm install        # ou: bun install

# 2. configurar env (ver tabela abaixo)
cp .env.example .env  # se não existir, crie manualmente

# 3. rodar
npm run dev        # SSR dev

# 4. build / lint / testes
npm run build
npm run build:dev  # build modo development
npm run preview
npm run lint
npm run test     # vitest: match-dates + probability-view
npm run format
```

Acesse `http://localhost:5173` (porta pode variar pelo sandbox Lovable).

## Variáveis de ambiente

| Var | Onde | Obrigatória |
|---|---|---|
| `SUPABASE_URL` | server SSR | sim |
| `SUPABASE_PUBLISHABLE_KEY` | server SSR | sim |
| `VITE_SUPABASE_URL` | client (fallback p/ `SUPABASE_URL`) | sim p/ client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | sim p/ client |
| `SUPABASE_SERVICE_ROLE_KEY` | server apenas — cache ML, `matches.server.ts`, `accuracy-store.ts` | sim p/ persistência; sem ela, app roda em modo memória |
| `BZZOIRO_TOKEN` | server (`Authorization: Token ...`) | **sim p/ dados reais** — sem ele, Bzzoiro retorna 401 |

Sem Supabase: cache em memória continua válido, persistência desativada. Sem histórico suficiente: usa médias da liga. Sem `BZZOIRO_TOKEN`: Hoje/Amanhã/Ao vivo retornam vazio (estado vazio na UI).

## Supabase

Tabelas (ver `supabase/migrations/20260704022000_ml_tables.sql`):

- `ml_predictions(event_id, market, probability, odds, confidence, model_version, outcome)` — unique `(event_id, market)`
- `ml_calibration_params(league_id, market, a, b, brier_score, sample_size)` — PK `(league_id, market)`
- `ml_accuracy_metrics(league_id, market, total/correct, accuracy, brier, log_loss, calibration_error)`

Aplique com Supabase CLI (`supabase db push`) ou pelo dashboard SQL. RLS habilitado; `service_role` tem grant total.

## APIs externas

| API | Uso | Status 2026-09-09 |
|---|---|---|
| Bzzoiro Sports | eventos do dia, histórico da liga, standings | exige token (`BZZOIRO_TOKEN` ausente no ambiente local → HTTP 401, pipeline retorna `[]`) |
| ESPN | scoreboard público por liga (gratuito, sem token) | OK (200), mas `src/lib/api/espn.ts` não está wired ao pipeline — `/live` usa Bzzoiro |
| Supabase | cache + métricas ML | vars ausentes no ambiente local → modo memória |

Cliente Bzzoiro: gap mínimo 350ms entre calls, cache em memória TTL 5min, 3 retries.

## Tratamento de falhas

| Cenário | Comportamento |
|---|---|
| API esportes offline | xG default (1.56 / 1.10), confidence `low` |
| Histórico insuficiente | médias da liga |
| Supabase offline | memória + sem persistência |
| Sem calibração | raw do modelo (peso 70%) |
| Pipeline > 25s | retorna `[]` e loga timeout |

## Deploy

- Branch conectada sincroniza de volta p/ Lovable — mantenha branch em estado funcional.
- `vite.config.ts` usa `@lovable.dev/vite-tanstack-config` (já inclui TanStack Start, Tailwind, Nitro/Cloudflare target). Não duplicar plugins.
- Build gera `.output/` + `.wrangler/` (ignorados no git).

## Aviso

Projeto educacional. Probabilidades são estimativas estatísticas, não garantia de resultado e não constituem recomendação de aposta.
