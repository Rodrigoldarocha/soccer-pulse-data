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
| `BZZOIRO_TOKEN`                 | Sim         | Token da API Bzzoiro                    |
| `SUPABASE_URL`                  | Sim         | URL do projeto Supabase                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-side | Chave service_role (cache + rate limit) |
| `SUPABASE_PUBLISHABLE_KEY`      | Sim         | Chave pública anônima do Supabase       |
| `VITE_SUPABASE_URL`             | Sim         | Mesmo valor de SUPABASE_URL (Vite)      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim         | Mesmo valor de SUPABASE_PUBLISHABLE_KEY |

> **⚠️ Segurança**: Nunca commite o arquivo `.env`. Use `.env.example` como template.

## Scripts

```sh
npm run dev              # Dev server com HMR
npm run build            # Build produção
npm run test             # Rodar testes unitários
npm run lint             # ESLint
npm run format           # Prettier
bun scripts/verify-setup.ts  # Verificar configuração
```

## Arquitetura

```
src/
├── __tests__/          # Testes unitários (Vitest)
├── components/         # Componentes React (UI)
│   ├── PredictionCard.tsx
│   ├── TeamLogo.tsx
│   └── ui/             # shadcn/ui components
├── integrations/
│   └── supabase/       # Clientes Supabase (client/server/admin)
├── lib/
│   ├── bzzoiro/        # API client + cache (server-only)
│   ├── predictions.functions.ts  # Server functions
│   ├── live.functions.ts         # Live events server function
│   └── rate-limit.server.ts      # Rate limiting (distribuído)
├── routes/             # TanStack Router (file-based)
│   ├── index.tsx       # Home — previsões futuras
│   ├── live.tsx        # Ao Vivo — jogos em andamento
│   └── events.$eventId.tsx  # Detalhe do evento + odds
└── server.ts           # SSR entry + security headers
```

### Fluxo de dados

1. Cliente → TanStack React Query → Server Function
2. Server Function valida input (Zod) → verifica rate limit (Supabase em produção, in-memory em dev)
3. Cache (Postgres via Supabase) → se miss, chama API Bzzoiro
4. Se API falhar, serve cache expirado (stale-if-error)
5. Resposta normalizada → React Query cache → Componentes

## Funcionalidades

- **Previsões ML**: Lista de partidas futuras com probabilidades 1X2, Over/Under, BTTS, xG
- **Jogos ao Vivo**: Rota `/live` com scores atualizados e polling a cada 10s
- **Detalhe do Evento**: Placar, odds comparativas entre casas de apostas
- **Polling Automático**: Dados atualizados a cada 30s enquanto houver jogos ativos
- **Cache Distribuído**: Respostas armazenadas em Postgres com fallback para dados expirados
- **Rate Limiting Distribuído**: Supabase RPC em produção, in-memory em desenvolvimento
- **Tratamento de Erros**: Hierarquia de erros (auth, rate limit, timeout) com mensagens amigáveis

## CI/CD

GitHub Actions configurado (`.github/workflows/ci.yml`):

- Lint + type check + build em push/PR para main

## Deploy (Cloudflare Workers)

```sh
npm run build
# O build gera os arquivos em .output/ para deploy via wrangler
```
