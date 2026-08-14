# Feature Specification: Value Bets (Odd x Previsão ML)

**Feature Branch**: `002-value-bets`

**Created**: 2026-08-14

**Status**: Draft

**Input**: Nova rota `/valor` listando apostas com valor esperado (EV) positivo: compara
probabilidades do modelo CatBoost (`/api/v2/predictions/`) com as melhores odds das casas
(`/api/v2/odds/best/`). EV = (prob/100) × odd_decimal − 1. Destaque apenas mercados com
EV ≥ limiar.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Listar apostas de valor (Priority: P1)

Usuário abre `/valor` e vê, ordenadas por EV desc, as apostas onde o modelo enxerga
probabilidade maior que a implícita nas odds: jogo, mercado, seleção, prob modelo, odd da
casa, EV%.

**Why this priority**: Núcleo do feature — sem comparação prob×odd não existe value bet.

**Independent Test**: Abrir `/valor`, ver cards ordenados por EV desc com jogo, mercado,
seleção, prob, odd e EV%. Funciona sozinho (lista completa).

**Acceptance Scenarios**:

1. **Given** predictions + odds disponíveis, **When** EV > limiar, **Then** aposta aparece com prob do modelo, melhor odd e EV%
2. **Given** múltiplas apostas, **When** lista renderiza, **Then** ordena por EV desc
3. **Given** mesmo jogo em 2 mercados (ex: 1X2 e O/U 2.5), **When** ambos têm valor, **Then** aparecem como entradas separadas

---

### User Story 2 - Filtro por mercado (Priority: P2)

Filtro por mercado: 1X2, Over 2.5, Under 2.5, BTTS. Persistido em URL `?market=`.

**Why this priority**: Reduz ruído; lista completa já funciona sem.

**Independent Test**: Abrir `/valor?market=btts`, ver apenas apostas BTTS.

**Acceptance Scenarios**:

1. **Given** filtro 1X2, **When** lista renderiza, **Then** só entradas de resultado de partida
2. **Given** URL com market, **When** recarrega, **Then** filtro mantém

---

### User Story 3 - Estados vazio e erro (Priority: P3)

Sem value bets no dia, estado vazio claro. Erro de API (qualquer origem) com mensagem amigável + retry.

**Why this priority**: Robustez; essencial mas não primário.

**Acceptance Scenarios**:

1. **Given** nenhuma aposta com EV ≥ limiar, **When** rota abre, **Then** mensagem "nenhuma aposta com valor hoje"
2. **Given** API falha, **When** rota abre, **Then** erro amigável com botão tentar novamente

---

### Edge Cases

- Odd implícita > prob modelo (EV negativo) → excluída
- Odd = 1.0 (evento suspenso) → EV = prob − 1, nunca positivo → excluída naturalmente
- prob = 0 ou null → entrada descartada
- Mesmo evento com odds de mercados diferentes → entradas independentes
- Odd muito alta (erro de feed, ex: 501.0) → EV absurdo; clamp por odd máxima (≤ 50.0) ou desconto
- Sem odds para evento → evento sem entrada (não bloqueia outros)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Sistema MUST criar server fn `getValueBets()` que busca predictions upcoming (`/api/v2/predictions/`) e melhores odds (`/api/v2/odds/best/`), ambas via `bzzoiroCachedFetch` com cache keys próprias
- **FR-002**: Sistema MUST aplicar rate limit por IP na server fn (padrão `checkRateLimit`, janela 60s)
- **FR-003**: Sistema MUST implementar `computeValueBets(predictions, oddsBest)` puro: cruza por event_id, calcula EV por mercado, filtra EV ≥ `MIN_EV` (0.05) e odd no intervalo `[1.01, 50]`
- **FR-004**: Sistema MUST mapear mercados: `match_result`↔market `1x2`, `prob_over_25`↔`over_under_25` (over), `btts`↔`btts` (yes)
- **FR-005**: Sistema MUST ordenar por EV desc e retornar `ValueBet[]` tipado
- **FR-006**: Sistema MUST criar rota `/valor` com `validateSearch` `{market?: string}`, filtro persistido em URL
- **FR-007**: Sistema MUST exibir card: jogo (casa×fora), mercado, seleção, prob modelo %, melhor odd, EV% (badge verde)
- **FR-008**: Sistema MUST ter estados loading/vazio/erro com retry
- **FR-009**: Sistema MUST adicionar tipos `OddsBestEntry`, `ValueBet` em `src/lib/bzzoiro/types.ts`
- **FR-010**: Sistema MUST incluir testes em `src/__tests__/` para `computeValueBets`: cruze, EV, filtros de limiar/odd, ordenação

### Key Entities _(include if feature involves data)_

- **ValueBet**: event_id, home/away, league, market, outcome, prob (0-1), odds, ev (decimal), evPct
- **OddsBestEntry**: shape bruto de `/api/v2/odds/best/` (normalizado defensivo: array de eventos com outcomes)
- **Prediction**: existente — fonte de probs

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `/valor` computa EV de todos os jogos upcoming em <2s com cache quente
- **SC-002**: Zero falsos positivos de odd: toda entrada tem odd ∈ [1.01, 50] e EV ≥ 5%
- **SC-003**: Sem N+1 por-jogo: máx 4 chamadas upstream (1 predictions + 1 por mercado: 1x2, O/U 2.5, BTTS), cada uma com cache próprio
- **SC-004**: Sem segredos no bundle cliente

## Assumptions

- `/api/v2/odds/best/` retorna lista de eventos com outcomes e `best_odds` decimal por outcome (shape normalizado defensivamente como predictions)
- `min_confidence`/`recommended` da predictions não é condição p/ value bet — EV é o critério
- Fora de escopo v1: apostas múltiplas/combinadas, Kelly criterion, historico de EV
