# ML Architecture — ParlayLab

## Visão Geral

Sistema de previsão desportiva em 3 camadas, executado inteiramente em TypeScript no runtime Lovable (TanStack Start SSR + Supabase).

```
┌─────────────────────────────────────────────────┐
│                   Pipeline                       │
│                                                   │
│  TheSportsDB ──► Prediction Engine ──► Ensemble ──►  │
│  (dados históricos)    (Poisson + xG)   (Calibração)  │
│                      │              │             │
│                      ▼              ▼             │
│                 Supabase DB   Confidence Score    │
│              (params + historico)                 │
└─────────────────────────────────────────────────┘
```

## Camadas

### 1. Prediction Engine — `src/lib/prediction-engine.ts`

Calcula previsões usando dados históricos do TheSportsDB e modelo Poisson.

```
xG_home = league_avg * home_offense_strength * away_defense_weakness * home_advantage
xG_away = league_avg * away_offense_strength * home_defense_weakness
```

- **Dados de entrada**: Últimos ~10 jogos da liga via TheSportsDB `eventspastleague.php`
- **Estatísticas por time**: Média de gols marcados e sofridos (casa/fora)
- **xG calculado**: Baseado na força ofensiva/defensiva relativa à média da liga
- **Fator casa**: 1.2x multiplicador para o time da casa
- **Saída**: Probabilidades 1X2, Over 2.5, BTTS via convolução Poisson

### 2. Calibração (Platt Scaling) — `src/lib/ml/calibration.ts`

Ajusta as probabilidades do modelo para corrigir viés sistemático por liga/mercado.

```
P_calibrated = sigmoid(a * logit(P_raw) + b)
```

- `a`: inclinação da calibração
- `b`: viés (bias)
- Parâmetros armazenados por `(league_id, market)` na tabela `ml_calibration_params`
- Mínimo de 10 amostras para ativar calibração; abaixo disso retorna raw
- Score de confiança baseado no Brier Score:
  - `high`: Brier < 0.15 e > 50 amostras
  - `medium`: Brier < 0.22 e > 20 amostras
  - `low`: demais casos

### 3. Ensemble — `src/lib/ml/ensemble.ts`

Combina modelo calibrado com Poisson baseline.

```
P_final = w_model * P_calibrated + w_poisson * P_poisson
```

- Pesos dinâmicos baseados no Brier Score
- Faixa: modelo entre 40-90%, Poisson entre 60-10%
- Default: 70% modelo, 30% Poisson (antes de ter dados históricos)
- Score de confiança final considera:
  - Qualidade da calibração (parâmetro `calibrationSource`)
  - Concordância entre modelo calibrado e ensemble

### 4. Pipeline Principal — `src/lib/ml/pipeline.ts`

Orquestra todo o fluxo de inferência.

```typescript
buildPrediction(event, prediction, leagueMeta) → MatchPrediction
```

- Cache em memória dos parâmetros de calibração (LRU via Map)
- Fallback automático para Poisson puro quando não há predição
- Todos os 6 mercados calculados: 1X2_HOME, DRAW, 1X2_AWAY, OVER_2_5, BTTS, DOUBLE_CHANCE_1X

### 5. Accuracy Store — `src/lib/ml/accuracy-store.ts`

Armazena e recupera dados históricos de performance.

**Tabelas Supabase:**

| Tabela | Finalidade |
|--------|------------|
| `ml_predictions` | Cada predição feita + outcome quando disponível |
| `ml_calibration_params` | Parâmetros Platt por liga/mercado |
| `ml_accuracy_metrics` | Métricas agregadas (Brier, LogLoss, Calibration Error) |

## Fluxo de Dados

### Produção (Inferência)
1. `fetchTodayMatches()` → TheSportsDB `eventsday.php` + `eventspastleague.php`
2. Para cada evento, `computePrediction()` calcula xG e probabilidades Poisson
3. `buildPrediction()` executa:
   - Calibra probabilidade com params do Supabase (cache)
   - Calcula ensemble ponderado
   - Determina melhor mercado sugerido
4. Resultado armazenado em cache no Supabase (via `getCachedOrGenerate`)

### Pós-Produção (Calibração)
1. Resultados reais são coletados quando eventos mudam para `finished`
2. `recomputeAccuracyMetrics()` recalcula:
   - Brier Score por liga/mercado
   - Log Loss
   - Calibration Error (Expected - Observed por bins de 10%)
   - Atualiza `ml_calibration_params`
3. Chamar via `POST /api/triggerRecalibration` ou agendamento

## Tratamento de Falhas

| Cenário | Comportamento |
|---------|---------------|
| TheSportsDB offline | Poisson com xG default (1.2 / 1.0), confidence = "low" |
| Dados históricos insuficientes | Usa médias da liga como fallback |
| Supabase offline | Cache em memória válido; persistência desativada |
| Calibração sem dados históricos | Usa raw do modelo (peso 70%) |

## APIs Utilizadas

| API | Uso | Custo |
|-----|-----|-------|
| TheSportsDB | Eventos, standings, dados históricos | Gratuita (chave "123") |
| ESPN | Placar ao vivo (backup) | Gratuita |
| Supabase | Cache + persistência ML | Gratuita (plano free) |

## Arquivos do Sistema ML

```
src/lib/
├── prediction-engine.ts       # Engine de xG + Poisson
├── api/
│   └── thesportsdb.ts         # Cliente TheSportsDB expandido
├── ml/
│   ├── types.ts               # Tipos do sistema ML
│   ├── calibration.ts         # Platt scaling
│   ├── ensemble.ts            # Ensemble modelo + Poisson
│   ├── pipeline.ts            # Pipeline de inferência
│   ├── accuracy-store.ts      # Persistência Supabase
│   ├── accuracy.functions.ts  # Server function de métricas
│   └── recalibrate.ts         # Server function de recalibragem
├── data-pipeline.ts           # Orquestrador principal
├── matches.server.ts          # Cache layer
├── matches.functions.ts       # Server functions
└── standings.functions.ts     # Classificações
```
