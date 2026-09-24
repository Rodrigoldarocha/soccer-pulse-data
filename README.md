# Soccer Pulse Data — PulseLab

Motor de probabilidades + palpites de valor (simples e múltiplas) com odds reais Bzzoiro, Poisson + Dixon-Coles, calibração Platt/Isotonic, ensemble ponderado por Brier, ROI/CLV honestos, cache Supabase e front React.

> **+18 · Jogue com responsabilidade.** Estatísticas, sem garantia de lucro. Sem odd real → sem palpite. Conectado ao [Lovable](https://lovable.dev). Não reescreva histórico git publicado — ver `AGENTS.md`.

## Funcionalidades

- **`/` → `/picks`**: palpites do dia — top simples, 3 perfis de múltipla, radar, resumo de exposição
- **Hoje (`/today`)** / **Amanhã (`/tomorrow`)**: partidas (America/Sao_Paulo) com busca
- **Jogo (`/match/$matchId`)**: tab Palpite (mercados, odd real, fair, EV), modelos, H2H, forma, escalações, stats
- **Ao vivo (`/live`)**: placar + minuto reais (30s)
- **Analytics (`/analytics`)**: Brier/Log Loss/ECE + ledger ROI, CLV, drawdown, baselines
- **Settings (`/settings`)**: fuso, modelo, **Recalibrar agora**
- Rotas preservadas: `/today`, `/tomorrow`, `/live`, `/match/$id`, `/analytics`

## Pipeline

```
Bzzoiro odds + prediction → calibração → ensemble (API/DC/market) → EV/edge → picks / múltiplas
                                              │
                         resolver + recalibrate (cron) → ledger → ROI/CLV
```

1. **Odds** (`src/lib/api/odds.ts`): Bzzoiro `/odds/` + `/events/{id}/odds/` (consenso). Campo ausente = `null` (nunca `1/p`).
2. **Dixon-Coles** (`src/lib/ml/dixon-coles.ts`): ratings por liga, matriz de placares, correlação ρ.
3. **Pipeline** (`src/lib/ml/pipeline.ts`): raw → Platt/Isotonic → blend 3-vias → `fairOdds=1/p` separado de `odds`.
4. **Picks** (`src/lib/picks/`): EV/edge/¼-Kelly, filtros (odd 1.40–4.50, trap &lt;1.25, divergência), máx 1/jogo.
5. **Múltiplas**: correlação mesmo jogo via matriz; jogos distintos ×0.98/perna; perfis segura/equilibrada/ousada; MC 20k valida P.
6. **Resolver** (`src/lib/ml/resolver.server.ts`): outcome por mercado pós-jogo; void postponed/AET/PEN.
7. **Cron** (`/api/cron/{resolve,recalibrate,snapshot}`): header `x-cron-secret` vs `CRON_SECRET`.

## Stack

| Camada       | Tech                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Front        | React 19, TanStack Start/Router/Query, Tailwind 4, shadcn/Radix, Framer Motion, Recharts, Lucide |
| Backend      | TanStack Start SSR + Server Functions (`*.functions.ts` / `*.server.ts`), Nitro                  |
| Dados        | Bzzoiro Sports API (predições + odds), ESPN (live backup)                                        |
| Persistência | Supabase Postgres (`supabase/migrations/`)                                                       |
| Build        | Vite 8, TypeScript 5.8, ESLint + Prettier, Vitest                                                |

## Env

| Var                                        | Uso                                |
| ------------------------------------------ | ---------------------------------- |
| `BZZOIRO_TOKEN`                            | obrigatório (API 401 sem token)    |
| `ODDS_API_KEY`                             | opcional (OddsApi second provider) |
| `SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY` | cache, ledger, calibração          |
| `CRON_SECRET`                              | protege `/api/cron/*`              |

Detalhe ML: [`ML_ARCHITECTURE.md`](./ML_ARCHITECTURE.md).

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
npm run test     # vitest: dates, probs, pipeline, DC, calibração, picks, analytics
npm run format
```

Acesse `http://localhost:5173` (porta pode variar pelo sandbox Lovable).

## Variáveis de ambiente

| Var                             | Onde                                                               | Obrigatória                                            |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `SUPABASE_URL`                  | server SSR                                                         | sim                                                    |
| `SUPABASE_PUBLISHABLE_KEY`      | server SSR                                                         | sim                                                    |
| `VITE_SUPABASE_URL`             | client (fallback p/ `SUPABASE_URL`)                                | sim p/ client                                          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client                                                             | sim p/ client                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | server apenas — cache ML, `matches.server.ts`, `accuracy-store.ts` | sim p/ persistência; sem ela, app roda em modo memória |
| `BZZOIRO_TOKEN`                 | server (`Authorization: Token ...`)                                | **sim p/ dados reais** — sem ele, Bzzoiro retorna 401  |

Sem Supabase: cache em memória continua válido, persistência desativada. Sem histórico suficiente: usa médias da liga. Sem `BZZOIRO_TOKEN`: Hoje/Amanhã/Ao vivo retornam vazio (estado vazio na UI).

## Supabase

Tabelas (ver `supabase/migrations/20260704022000_ml_tables.sql`):

- `ml_predictions(event_id, market, probability, odds, confidence, model_version, outcome)` — unique `(event_id, market)`
- `ml_calibration_params(league_id, market, a, b, brier_score, sample_size)` — PK `(league_id, market)`
- `ml_accuracy_metrics(league_id, market, total/correct, accuracy, brier, log_loss, calibration_error)`

Aplique com Supabase CLI (`supabase db push`) ou pelo dashboard SQL. RLS habilitado; `service_role` tem grant total.

## APIs externas

| API            | Uso                                               | Status 2026-09-09                                                                         |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Bzzoiro Sports | eventos do dia, histórico da liga, standings      | exige token (`BZZOIRO_TOKEN` ausente no ambiente local → HTTP 401, pipeline retorna `[]`) |
| ESPN           | scoreboard público por liga (gratuito, sem token) | OK (200), mas `src/lib/api/espn.ts` não está wired ao pipeline — `/live` usa Bzzoiro      |
| Supabase       | cache + métricas ML                               | vars ausentes no ambiente local → modo memória                                            |

Cliente Bzzoiro: gap mínimo 350ms entre calls, cache em memória TTL 5min, 3 retries.

## Tratamento de falhas

| Cenário                | Comportamento                              |
| ---------------------- | ------------------------------------------ |
| API esportes offline   | xG default (1.56 / 1.10), confidence `low` |
| Histórico insuficiente | médias da liga                             |
| Supabase offline       | memória + sem persistência                 |
| Sem calibração         | raw do modelo (peso 70%)                   |
| Pipeline > 25s         | retorna `[]` e loga timeout                |

## Deploy

- Branch conectada sincroniza de volta p/ Lovable — mantenha branch em estado funcional.
- `vite.config.ts` usa `@lovable.dev/vite-tanstack-config` (já inclui TanStack Start, Tailwind, Nitro/Cloudflare target). Não duplicar plugins.
- Build gera `.output/` + `.wrangler/` (ignorados no git).

## Aviso

Projeto educacional. Probabilidades são estimativas estatísticas, não garantia de resultado e não constituem recomendação de aposta.
