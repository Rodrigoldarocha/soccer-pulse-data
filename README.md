# Zagueiro — Previsões ML de Futebol

Previsões CatBoost para partidas de futebol: 1X2, Over/Under, BTTS, Expectativas de Gols e placar mais provável.

## Stack

- **Runtime**: Node.js 22 (via nvm) / Bun
- **Framework**: TanStack Start + React 19 + TypeScript 5.8
- **Estilo**: Tailwind CSS v4 + shadcn/ui
- **API Externa**: Bzzoiro Sports Data API (CatBoost ML)
- **Banco/Cache**: Supabase (PostgreSQL 14.5)
- **Deploy**: Cloudflare Workers (Nitro)

## Pré-requisitos

- Node.js >= 22 (use [nvm](https://github.com/nvm-sh/nvm))
- Bun (opcional, para lockfile)

## Setup

```sh
# Clone e instale
git clone <repo-url>
cd soccer-pulse-data
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves (ver abaixo)
```

## Variáveis de Ambiente

| Variável                        | Obrigatória | Descrição                               |
| ------------------------------- | ----------- | --------------------------------------- |
| `SUPABASE_URL`                  | Sim         | URL do projeto Supabase                 |
| `SUPABASE_PUBLISHABLE_KEY`      | Sim         | Chave pública anônima do Supabase       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-side | Chave service_role (cache Postgres)     |
| `BZZOIRO_TOKEN`                 | Sim         | Token da API Bzzoiro                    |
| `VITE_SUPABASE_URL`             | Sim         | Mesmo valor de SUPABASE_URL (Vite)      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim         | Mesmo valor de SUPABASE_PUBLISHABLE_KEY |

> **⚠️ Segurança**: Nunca commite o arquivo `.env`. Use `.env.example` como template.

## Scripts

```sh
npm run dev        # Dev server com HMR
npm run build      # Build produção
npm run test       # Rodar testes unitários
npm run lint       # ESLint
npm run format     # Prettier
```

## Arquitetura

```
src/
├── components/       # Componentes React (UI)
│   ├── PredictionCard.tsx
│   ├── TeamLogo.tsx
│   └── ui/           # shadcn/ui components
├── integrations/
│   └── supabase/     # Clientes Supabase (client/server/admin)
├── lib/
│   ├── bzzoiro/      # API client + cache (server-only)
│   ├── predictions.functions.ts  # Server functions
│   └── rate-limit.server.ts      # Rate limiting
├── routes/           # TanStack Router (file-based)
└── server.ts         # SSR entry + security headers
```

### Fluxo de dados

1. Cliente → TanStack React Query → `listUpcomingPredictions`
2. Server Function valida input (Zod) → verifica rate limit
3. Cache (Postgres via Supabase) → se miss, chama API Bzzoiro
4. Resposta normalizada → React Query cache → Componentes

## API

### `listUpcomingPredictions`

Server function (GET). Retorna previsões ordenadas por data.

**Parâmetros:**

- `limit` (1-100, default 30)
- `leagueId` (opcional, inteiro positivo)
- `minConfidence` (opcional, 0-1)

## Cache

Respostas da API Bzzoiro armazenadas em Postgres (`bzzoiro_cache`):

- TTL: 5 minutos
- Chave: SHA-256 dos parâmetros
- Apenas service_role acessa (RLS habilitado)
- Falha de cache não interrompe resposta

## CI/CD

GitHub Actions configurado (`.github/workflows/ci.yml`):

- Lint + type check + build em push/PR para main
