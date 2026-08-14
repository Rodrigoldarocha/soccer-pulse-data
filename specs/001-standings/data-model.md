# Data Model: Standings por Liga

## Entidades

### StandingEntry

Linha da tabela. Shape bruto da API `/api/v2/leagues/{id}/standings/` (mapear campos reais
na implementação; tipos permitem `null` nos numéricos — modelo ML/agregados podem faltar).

| Campo         | Tipo             | Obrigatório | Regra                              |
| ------------- | ---------------- | ----------- | ---------------------------------- |
| position      | `number`         | sim         | 1-based, ordem da API              |
| team_id       | `number \| null` | não         | chave de renderização (nunca nome) |
| team_name     | `string`         | sim         | nome exibido                       |
| team_logo     | `string \| null` | não         | fallback avatar                    |
| played        | `number \| null` | sim         | J                                  |
| won           | `number \| null` | não         | V                                  |
| drawn         | `number \| null` | não         | E                                  |
| lost          | `number \| null` | não         | D                                  |
| goals_for     | `number \| null` | não         | GP                                 |
| goals_against | `number \| null` | não         | GC                                 |
| goal_diff     | `number \| null` | não         | SG (derivar se ausente: GP−GC)     |
| points        | `number \| null` | sim         | PTS — chave de ordenação           |

Validação (Zod):

- `position`, `played`, `points` number ou null
- `team_name` string não vazia; demais numéricos null-able
- `goal_diff` null-able: derivar `goals_for - goals_against` quando nulo

### StandingsResponse

Container da resposta da API.

| Campo     | Tipo                                      | Regra                  |
| --------- | ----------------------------------------- | ---------------------- |
| standings | `StandingEntry[] \| null`                 | ligas de pontos (flat) |
| groups    | `Record<string, StandingEntry[]> \| null` | copas (fase de grupos) |

Regra de invariante: exatamente um dos dois presente (xor); ambos nulos → estado vazio.

### StandingGroup (UI)

Seção renderizável pós-normalização.

| Campo   | Tipo              | Regra                                              |
| ------- | ----------------- | -------------------------------------------------- |
| label   | `string`          | "Grupo A" … ou nome vindo da API                   |
| entries | `StandingEntry[]` | ordenado por points desc, desempate goal_diff desc |

### Normalização (server fn → UI)

- `standings` array → `[{ label: null, entries }]`
- `groups` mapa → array de grupos (ordem estável das chaves)
- ambos nulos → `[]` → estado vazio
- Ordenação: `points desc`, desempate `goal_diff desc`, último `position asc`

## Zonas de destaque (UI)

| Região       | Regra                           | Aplicação                               |
| ------------ | ------------------------------- | --------------------------------------- |
| Rebaixamento | total de times ≥ 12 → últimos 3 | fundo vermelho suave                    |
| Continental  | sem metadado confiável          | v1: não destacar (evita falso positivo) |

## Transições de estado

- `loading` → `ready | empty | error`
- `ready` quando dados normalizados não-vazios
- `empty` quando API retorna dados vazios/nulos
- `error` quando `bzzoiroCachedFetch` propaga erro (sem cache nenhum)
- Mudança de liga → reset p/ `loading`, novo fetch

## Contratos externos

- Cache key: `standings:v2:{leagueId}` — TTL 600s
- Rate limit: `checkRateLimit(standings:{ip})` — max 20, janela 60s
- URL: `?league=<id>` — validação Zod-like no `validateSearch` (padrão proximos.tsx)
