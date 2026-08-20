# Spec 008 — Design System: TeamLogo

**Feature Branch**: `008-design-system-team-logo`
**Created**: 2026-08-20
**Status**: Specified
**Category**: UI Component
**Owner**: Frontend

## Identidade

| Campo | Valor |
|---|---|
| Nome | TeamLogo |
| Categoria | UI Component |
| Status | Implementado |
| Versão | 1.0.0 |
| Owner | Frontend |

## Propósito

Exibe o escudo (crest) de um time de futebol. Quando o escudo não está
disponível ou falha ao carregar, exibe fallback com iniciais do nome — nunca
deixa espaço visual vazio.

## Quando utilizar

- Qualquer card, board ou linha que exiba um time (Previsões, Tabela, Forma,
  Value Bets, Favoritos).
- Sempre que houver `teamId` do Bzzoiro e `teamName`.

## Quando NÃO utilizar

- Para logos de ligas/competições (não existe token hoje — criar artefato próprio).
- Para bandeiras de países.
- Quando o componente consumidor precisa de crop/formato não-circular.

## Anatomia

```text
TeamLogo
├── Escudo (img, object-contain, transparent bg)
└── Fallback (circle, initials) — quando teamId null ou erro de load
```

## Propriedades

| Nome | Tipo | Obrigatório | Padrão | Descrição | Restrições |
|---|---|---|---|---|---|
| `teamId` | `number \| null` | sim | — | id do time Bzzoiro | null → fallback |
| `teamName` | `string` | sim | — | nome do time p/ alt + iniciais | — |
| `size` | `number` | não | `48` | diâmetro em px | `> 0` |

## Variantes

Nenhuma. Tamanho controlado via prop `size`; cor sempre via tokens semânticos
(`bg-muted`, `text-muted-foreground`). Variante visual não justificada hoje —
não criar.

## Estados

| Estado | Comportamento |
|---|---|
| `default` | `<img>` do proxy Bzzoiro (`sports.bzzoiro.com/img/team/{id}`), `loading="lazy"` |
| `empty` (`teamId == null`) | fallback iniciais, `aria-label={teamName}` |
| `error` (load falhou) | fallback iniciais (via `onError` → `failed=true`) |
| `loading` | browser nativo (`loading="lazy"`), sem skeleton |

## Responsividade

| Breakpoint | Comportamento |
|---|---|
| mobile | size fixo por prop; consumidor reduz se necessário |
| tablet | idem |
| desktop | idem |
| large desktop | idem |

Componente é size-driven, não responsivo por breakpoint. Responsabilidade de
dimensionamento pertence ao consumidor (prop `size`).

## Acessibilidade

| Item | Requisito |
|---|---|
| Semântica | `<img>` com `alt="{teamName} crest"` |
| Fallback | `aria-label={teamName}` (não-texto, lido pelo screen reader) |
| Contraste | fallback usa `bg-muted`/`text-muted-foreground` (≥ 4.5:1 verificado nos tokens) |
| Touch target | não-interativo — n/a |
| Keyboard | não-interativo — n/a |

## Composição

- Usável dentro de: `PredictionCard`, `StandingsBoard`, `ValueBetsBoard`,
  `StatsDisplay`, `LineupsDisplay`, boards de favoritos/liga.
- Não compõe com slots/interativos. Se precisar botão com logo, wrapper do
  consumidor adiciona o link.

## Design ↔ Code

| Referência | Local |
|---|---|
| Design name | TeamLogo (escudo circular) |
| Code name | `TeamLogo` |
| Figma reference | ausente (sem Figma ativo) |
| Storybook reference | ausente (sem Storybook) |
| Source code | `src/components/TeamLogo.tsx` |
| Spec location | `specs/008-design-system-team-logo/spec.md` |
| Token dependencies | `bg-muted`, `text-muted-foreground`, `rounded-full` |

## Exemplos

### Uso correto

```tsx
<TeamLogo teamId={7} teamName="Flamengo" size={48} />
```

### Uso incorreto

```tsx
<TeamLogo teamName="Flamengo" />            {/* sem teamId: sempre fallback — ok só se intencional */}
<TeamLogo teamId={7} teamName="F" />        {/* nome curto: alt ruim p/ a11y */}
<TeamLogo teamId={7} teamName="Flamengo" size={0} />  {/* tamanho inválido */}
```

## Critérios de aceitação

- **AC-001**: `teamId` válido → renderiza `<img>` com src do proxy e `alt` com nome.
- **AC-002**: `teamId` null → renderiza fallback circular com iniciais e `aria-label`.
- **AC-003**: `onError` do img → estado `failed` → fallback, sem quebrar app.
- **AC-004**: `size` prop controla width/height + font-size do fallback
  proporcionalmente (`fontSize = size * 0.32`).
- **AC-005**: nenhum valor de cor hardcoded — apenas tokens semânticos.
- **AC-006**: contraste fallback `bg-muted`/`text-muted-foreground` ≥ 4.5:1
  (WCAG AA, tokens `:root` em `src/styles.css`).

## Versionamento

| Tipo | Exemplo |
|---|---|
| PATCH | ajuste de fallback de iniciais |
| MINOR | nova variante de tamanho pré-definida |
| MAJOR | mudança de API (`teamId` obrigatório em outro formato), remoção de prop |

Breaking changes exigem seção `Breaking Change / Impact / Migration Path /
Affected Components` nesta spec antes do merge.

## Próximos passos (incremental)

1. PLAN `008` — plano técnico de adoção (componente já existe; validar vs spec).
2. TASKS — gaps: testes de fallback/erro se ausentes; documentação.
3. Analisar inconsistências: checar `TeamLogo` usos vs spec.
4. Próximas specs DS: tokens semânticos → Button → Card → PredictionCard.