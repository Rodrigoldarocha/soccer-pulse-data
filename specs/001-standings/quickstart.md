# Quickstart: Validação da feature Standings

Guia de validação end-to-end. Detalhes de implementação em `tasks.md` (Phase 2).

## Pré-requisitos

- `.env` configurado (BZZOIRO_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) — ver README
- Dependências instaladas (`npm install`)
- API Bzzoiro acessível

## Setup

```sh
cp .env.example .env   # se ainda não existe; preencher chaves
npm install
```

## Validação manual (rota)

```sh
npm run dev
# abrir http://localhost:3000/tabela
```

Cenários:

1. **Tabela flat**: selecionar liga de pontos (ex: Premier League, Bundesliga) →
   tabela com posição, time+logo, J, V, E, D, GP, GC, SG, PTS, ordenada por pontos
2. **Copa com grupos**: selecionar copa (ex: Champions League) → seções por grupo
   (Grupo A, Grupo B…) sem misturar times
3. **URL state**: trocar liga → URL ganha `?league=<id>`; recarregar → seleção mantida
4. **Zona de rebaixamento**: liga top-5 → últimos 3 times com destaque vermelho suave
5. **Vazio**: liga sem standings (ex: temporada recém-aberta) → mensagem vazia, sem crash
6. **Erro**: desligar rede → erro amigável (se cache existir, stale serve)

## Testes automatizados

```sh
npm run test          # roda suíte completa (Vitest)
npm run test -- src/__tests__/standings.test.ts   # só esta feature
```

Cenários cobertos:

1. Normalização `standings` flat → grupo único sem label
2. Normalização `groups` → múltiplos grupos com label
3. Ambos nulos → `[]` (estado vazio)
4. Ordenação points desc, desempate goal_diff desc
5. `goal_diff` null → derivado de GP−GC
6. Zod schema rejeita payload malformado do cache
7. Fallback stale-if-error: API falha + cache expirado → retorna cache

## Gate de qualidade (CI)

```sh
npm run lint
npm run build
```

Ambos devem passar sem erro novo. Lint + typecheck + build rodam no CI
(`.github/workflows/ci.yml`) em push/PR para main.

## Critérios de aceite (spec.md)

- SC-001: ≤2 cliques da home até classificação (link do nav p/ `/tabela`)
- SC-002: 1ª carga com cache <1s
- SC-003: copas renderizam grupos corretamente
- SC-004: sem BZZOIRO_TOKEN no bundle cliente (verificar `npm run build` output,
  grep por token/endpoint nas chunks client)
