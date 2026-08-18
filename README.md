# ⚽ Zagueiro — Previsões ML de Futebol

Dashboard de **previsões de futebol com Machine Learning**, utilizando CatBoost para estimar probabilidades de **1X2, Over/Under, BTTS, gols esperados (xG) e placar provável**.

---

## ✨ Funcionalidades

- 🤖 **Previsões ML** — probabilidades para 1X2, Over/Under, BTTS e xG
- ⚽ **Jogos ao Vivo** — placares e eventos atualizados automaticamente
- 📊 **Detalhes da partida** — estatísticas, previsões e odds
- 💰 **Comparação de odds** — visualização de odds entre casas disponíveis
- 🔄 **Atualização automática** — polling para partidas e eventos ativos
- 💾 **Cache distribuído** — PostgreSQL/Supabase com fallback para dados expirados
- 🛡️ **Rate limiting** — proteção distribuída em produção
- 🚨 **Tratamento de erros** — timeout, autenticação, limite de requisições e falhas da API
- 📱 **Interface responsiva** — desktop e mobile

---

## 🛠️ Stack

| Tecnologia                  | Uso               |
| --------------------------- | ----------------- |
| **Node.js 22 / Bun**        | Runtime           |
| **TanStack Start**          | Framework         |
| **React 19**                | Interface         |
| **TypeScript 5.8**          | Tipagem           |
| **Tailwind CSS v4**         | Estilização       |
| **shadcn/ui**               | Componentes       |
| **CatBoost**                | Machine Learning  |
| **Bzzoiro Sports Data API** | Dados e previsões |
| **Supabase / PostgreSQL**   | Banco e cache     |
| **Cloudflare Workers**      | Deploy            |

---

## 🚀 Setup

### Pré-requisitos

- Node.js `>= 22`
- npm
- Bun _(opcional)_

### Instalação

```bash
git clone <repo-url>
cd <project-directory>

npm install

cp .env.example .env
```

Configure as variáveis no `.env`.

---

## 🔐 Variáveis de Ambiente

| Variável                        | Obrigatória | Descrição                       |
| ------------------------------- | ----------- | ------------------------------- |
| `BZZOIRO_TOKEN`                 | ✅          | Token da API Bzzoiro            |
| `SUPABASE_URL`                  | ✅          | URL do Supabase                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | 🔒 Server   | Chave `service_role`            |
| `SUPABASE_PUBLISHABLE_KEY`      | ✅          | Chave pública do Supabase       |
| `VITE_SUPABASE_URL`             | ✅          | URL do Supabase para o frontend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅          | Chave pública para o frontend   |

> ⚠️ **Nunca versione o `.env`.** Utilize `.env.example` como modelo e mantenha credenciais privadas exclusivamente no ambiente de execução.

---

## 📜 Scripts

```bash
npm run dev                 # Desenvolvimento com HMR
npm run build               # Build de produção
npm run test                # Testes unitários
npm run lint                # ESLint
npm run format              # Prettier
bun scripts/verify-setup.ts # Validação da configuração
```

---

## 🏗️ Arquitetura

```text
src/
├── __tests__/                 # Testes Vitest
├── components/                # Componentes React
│   ├── PredictionCard.tsx
│   ├── TeamLogo.tsx
│   └── ui/
│
├── integrations/
│   └── supabase/              # Clientes Supabase
│
├── lib/
│   ├── bzzoiro/              # API + cache
│   ├── predictions.functions.ts
│   ├── live.functions.ts
│   └── rate-limit.server.ts
│
├── routes/
│   ├── index.tsx             # Previsões
│   ├── live.tsx              # Jogos ao vivo
│   └── events.$eventId.tsx   # Detalhes da partida
│
└── server.ts                 # SSR + headers de segurança
```

### 🔄 Fluxo de dados

```text
Usuário
   ↓
React Query
   ↓
Server Function
   ↓
Validação + Rate Limit
   ↓
Cache Supabase
   ↓
Bzzoiro API
   ↓
Normalização
   ↓
React Query
   ↓
Interface
```

Em caso de indisponibilidade da API, o sistema pode utilizar **dados expirados do cache (stale-if-error)** quando disponíveis.

---

## 📊 Previsões

O sistema disponibiliza modelos e indicadores para:

- 🏠 **1X2** — Casa / Empate / Fora
- ⚽ **Over/Under** — linhas de gols
- 🤝 **BTTS** — ambas marcam
- 📈 **xG** — gols esperados
- 🎯 **Placar provável**
- 💰 **Odds** — comparação das cotações disponíveis

> As previsões são estimativas estatísticas e não representam garantia de resultado.

---

## 🔴 Jogos ao Vivo

A rota:

```text
/live
```

apresenta partidas em andamento com atualização automática dos dados.

O sistema utiliza polling para manter:

- Placar;
- Eventos;
- Status da partida;
- Informações relevantes

atualizados enquanto houver jogos ativos.

---

## 💾 Cache e Performance

O sistema utiliza **Supabase/PostgreSQL** como cache distribuído.

Estratégia:

```text
Cache válido
    ↓
Retorna imediatamente

Cache expirado
    ↓
Tenta API

API indisponível
    ↓
Utiliza cache expirado
```

Isso reduz chamadas desnecessárias à API e melhora a disponibilidade do sistema.

---

## 🛡️ Segurança

A aplicação implementa:

- 🔐 Validação de entrada com Zod
- 🚦 Rate limiting
- ⏱️ Controle de timeout
- 🔒 Separação entre clientes Supabase
- 🧱 Server Functions para operações sensíveis
- 🛡️ Headers de segurança
- 🚫 Proteção das credenciais server-side

A `SUPABASE_SERVICE_ROLE_KEY` deve permanecer **exclusivamente no ambiente server-side**.

---

## 🔄 CI/CD

O projeto utiliza **GitHub Actions** para validação automática.

Em pushes e Pull Requests para `main` são executados:

```text
Lint
  ↓
Type Check
  ↓
Build
```

---

## ☁️ Deploy

O projeto utiliza **Cloudflare Workers**.

Build de produção:

```bash
npm run build
```

Os arquivos gerados ficam em:

```text
.output/
```

O deploy pode ser realizado utilizando a configuração do Wrangler do projeto.

---

## ⚠️ Aviso

As previsões são produzidas por modelos estatísticos e Machine Learning a partir dos dados disponíveis.

**Nenhuma previsão garante o resultado de uma partida.**

O projeto tem finalidade **analítica e experimental**.

---

## 👨‍💻 Autor

**Rodrigo Rocha** — [GitHub](https://github.com/Rodrigoldarocha) · [LinkedIn](https://www.linkedin.com/in/rodrigo-rocha-19249170/)

---

<p align="center">

⚽ **Zagueiro**

<br>

<sub>Machine Learning aplicado à análise de futebol</sub>

</p>
