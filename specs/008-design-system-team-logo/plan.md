# Implementation Plan: 008 — TeamLogo (Design System)

**Branch**: `008-design-system-team-logo` | **Date**: 2026-08-20 | **Spec**: `specs/008-design-system-team-logo/spec.md`

**Input**: Feature specification from `/specs/008-design-system-team-logo/spec.md`

## Summary

TeamLogo já existe e está em produção. Spec 008 documenta o contrato (props,
estados, a11y, tokens). Este plano valida o código existente contra a spec,
fecha gaps de teste/documentação e **não** introduz mudança de API nem refactor
visual. Mudança não-breaking: PATCH/MINOR de governança + cobertura.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict) / React 19 / TanStack Start 1.170
**Primary Dependencies**: Tailwind CSS v4 (tokens oklch em `src/styles.css`), shadcn/ui
**Storage**: N/A (componente sem estado persistido)
**Testing**: Vitest 4 (`src/__tests__/`), RTL disponível via deps radix — validar setup
**Target Platform**: Web (SSR TanStack Start → Cloudflare Workers)
**Project Type**: Web application (SPA/SSR)
**Performance Goals**: N/A — componente leve (`<img>` lazy)
**Constraints**: tokens semânticos obrigatórios (constitution VI); a11y WCAG 2.1 AA (VIII)
**Scale/Scope**: 2 consumers hoje (`PredictionCard`, `live.tsx`); componente isolado

## Constitution Check

_GATE: passou — sem violações._

| Princípio | Status |
|---|---|
| VI Design Tokens | OK — usa `bg-muted`, `text-muted-foreground`, `rounded-full`; sem hardcode de cor |
| VII Consistency | OK — 1 componente, 2 consumers, zero duplicação |
| VIII Accessibility | PARCIAL — fallback tem `aria-label`; validar contraste tokens + alt; falta teste |
| IX Responsiveness | OK — size-driven via prop `size`, não shrink |
| X Spec-First | OK — spec 008 criada antes de qualquer mudança |
| XI API Predictability | OK — props `teamId/teamName/size` previsíveis; sem breaking change |

Re-check pós-design: abaixo.

## Project Structure

### Documentation (this feature)

```text
specs/008-design-system-team-logo/
├── plan.md              # este arquivo
├── research.md          # Phase 0 — auditoria de conformidade
├── data-model.md        # N/A — componente sem dados próprios
├── quickstart.md        # Phase 1 — guia de validação
├── contracts/           # Phase 1 — contrato de props
└── tasks.md             # Phase 2 (speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── TeamLogo.tsx     # componente existente (validar, não reescrever)
├── __tests__/
│   └── team-logo.test.tsx  # NOVO — fallback/erro/alt (constitution III)
└── components/ui/       # shadcn — não tocar
```

**Structure Decision**: Componente já ocupa local canônico
(`src/components/TeamLogo.tsx`). Sem mover arquivos. Apenas adicionar teste em
`src/__tests__/` (padrão do repo).

## Complexity Tracking

> Sem violações de constitution — tabela vazia.

## Fases

### Phase 0 — research.md

Auditoria código vs spec: props/estados/a11y reais vs AC-001..005.

### Phase 1 — contracts/ + quickstart.md

- `contracts/team-logo.ts` — contrato de props (sem código de implementação).
- `quickstart.md` — como validar: teste + visual em PredictionCard/live.

### Phase 2 (tasks) — pendente, via /speckit.tasks

## Re-check Constitution (pós-design)

| Princípio | Status pós | Nota |
|---|---|---|
| VIII Accessibility | PARCIAL → resolver em tasks: teste a11y/fallback; validar contraste `muted`/`muted-foreground` | AC-002/003 sem teste automatizado hoje |
| III Test-First | NOVO gap: componente sem teste dedicado | task: `team-logo.test.tsx` |