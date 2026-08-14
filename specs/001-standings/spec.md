# Feature Specification: Standings por Liga (Tabela de Classificação)

**Feature Branch**: `001-standings`

**Created**: 2026-08-14

**Status**: Draft

**Input**: Nova rota `/tabela` exibindo classificação (standings) por liga, alimentada pelo endpoint `/api/v2/leagues/{id}/standings/` da API Bzzoiro, seguindo o padrão existente (server function + cache + rate limit).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver classificação de uma liga (Priority: P1)

Usuário abre `/tabela`, seleciona uma liga (ex: Premier League) e vê a tabela de classificação atual: posição, time, jogos, vitórias, empates, derrotas, gols pró, gols contra, saldo e pontos.

**Why this priority**: Núcleo do feature. Sem lista de ligas + tabela não existe nada para o usuário. É o slice mínimo entregável.

**Independent Test**: Abrir `/tabela`, escolher liga na lista, ver tabela ordenada por pontos com as colunas corretas. Entrega valor sozinho (classificação real visível).

**Acceptance Scenarios**:

1. **Given** usuário na rota `/tabela`, **When** seleciona liga ativa, **Then** tabela exibe times ordenados por pontos (desc), com posição, J, V, E, D, GP, GC, SG, PTS
2. **Given** API retorna dados, **When** liga é copa (ex: Champions League), **Then** tabela agrupa por `groups` (fase de grupos) em vez de lista única
3. **Given** seleção de liga, **When** rota é recarregada, **Then** seleção persiste via URL param (?league=<id>)

---

### User Story 2 - Tabela com destaque de zonas (Priority: P2)

Times em zona de classificação continental (CL), rebaixamento e playoffs recebem destaque visual (cor/linha), conforme posição na tabela.

**Why this priority**: Diferencial de leitura, mas tabela funcional já existe sem isso.

**Independent Test**: Abrir tabela de liga com zona de rebaixamento, confirmar cores distintas para as faixas de posição.

**Acceptance Scenarios**:

1. **Given** tabela carregada, **When** liga tem rebaixamento (ex: top-5 europeu), **Then** últimas N posições têm estilo destacado
2. **Given** liga sem rebaixamento (ex: liga menor), **When** tabela renderiza, **Then** não há falsos destaques

---

### User Story 3 - Estado vazio e erro (Priority: P3)

Sem standings disponíveis para a liga, tela mostra estado vazio com mensagem clara. Falha de API mostra erro amigável com fallback a cache expirado (stale-if-error), seguindo padrão existente.

**Why this priority**: Robustez; essencial para não quebrar UX, mas não é funcionalidade primária.

**Independent Test**: Abrir `/tabela` com liga sem dados de standings, confirmar mensagem de vazio sem crash.

**Acceptance Scenarios**:

1. **Given** liga sem dados de classificação, **When** tabela solicitada, **Then** aparece estado vazio com texto explicativo
2. **Given** API Bzzoiro indisponível, **When** tabela solicitada, **Then** serve cache expirado se existir; senão, erro amigável com retry

---

### Edge Cases

- Copas retornam `groups` (mapa) em vez de `standings` flat — shape precisa ser tratado
- API pode retornar `standings` nulo/ausente para liga ativa (temporada recém-iniciada)
- Liga sem logo: fallback para avatar/placeholder do time
- Seleção de liga com id inválido no URL → fallback para primeira liga ou estado vazio
- Rate limit atingido (429) → mensagem de "tente novamente em instantes", não tela quebrada
- Time com nome duplicado entre ligas — chave de renderização deve usar team id, não nome

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Sistema MUST expor server function `getStandings(leagueId)` que chama `/api/v2/leagues/{id}/standings/` via `bzzoiroCachedFetch`, com cache key por liga e TTL definido
- **FR-002**: Sistema MUST aplicar rate limit por IP na server function (padrão `checkRateLimit`, janela 60s)
- **FR-003**: Sistema MUST normalizar resposta: ligas de copa (`groups`) viram seções agrupadas; ligas de pontos (`standings`) viram lista plana
- **FR-004**: Sistema MUST criar rota `/tabela` (TanStack Router file-based, `tabela.tsx`) com seletor de ligas (reusa `listLeagues` existente)
- **FR-005**: Sistema MUST persistir liga selecionada em `?league=<id>` para deep-link/share
- **FR-006**: Sistema MUST exibir colunas: posição, time (com logo se houver), J, V, E, D, GP, GC, SG, PTS
- **FR-007**: Sistema MUST ordenar por pontos desc, desempate por saldo de gols (ou ordem vinda da API)
- **FR-008**: Sistema MUST tratar erro de API com stale-if-error (cache expirado) antes de exibir erro
- **FR-009**: Sistema MUST adicionar tipos TS para `StandingEntry` e resposta `StandingsResponse` em `src/lib/bzzoiro/types.ts`
- **FR-010**: Sistema MUST incluir testes em `src/__tests__/` para normalização groups/flat, ordenação e fallback de cache

### Key Entities _(include if feature involves data)_

- **StandingEntry**: linha da tabela — posição, time (id/nome/logo), jogos, vitórias, empates, derrotas, gols pró/contra, saldo, pontos
- **StandingsResponse**: container da API — `standings` (array, ligas) OU `groups` (mapa, copas)
- **League**: já existente em `types.ts` (id, name, country, logo) — usado no seletor

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Usuário chega à classificação de qualquer liga ativa em até 2 cliques a partir da home
- **SC-002**: Rota `/tabela` carrega standings em menos de 1s com dados em cache (sem chamada upstream)
- **SC-003**: 100% das ligas de copa ativas renderizam grupos corretamente (sem dados misturados)
- **SC-004**: Nenhum segredo exposto: chamada Bzzoiro permanece server-side (nenhum BZZOIRO_TOKEN no bundle cliente)

## Assumptions

- Endpoint `/api/v2/leagues/{id}/standings/` retorna `{ standings: StandingEntry[] }` para ligas de pontos e `{ groups: Record<string, StandingEntry[]> }` para copas (schema OpenAPI confirmado)
- Cache infra (`bzzoiroCachedFetch` em `cache.server.ts`) reutilizável sem alterações
- `listLeagues` existente fornece o seletor; nenhuma mudança na resposta de leagues
- Seletor de liga usa lista ativa (mesma regra de `leagues:v2:active`)
- Fora de escopo v1: temporadas históricas, playoff bracket, artilheiros
