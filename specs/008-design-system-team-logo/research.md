# Research: 008 — Auditoria TeamLogo vs Spec

**Data**: 2026-08-20 | **Input**: `specs/008-design-system-team-logo/spec.md`

## Decisões

### D-001: Componente existente conforme — sem reescrita

- **Decision**: Manter `src/components/TeamLogo.tsx` como está (44 linhas).
- **Rationale**: Implementação atual satisfaz AC-001..005 da spec:
  - AC-001 ✅ `<img>` com src proxy + `alt` (linha 34-35)
  - AC-002 ✅ `teamId == null` → fallback iniciais + `aria-label` (linha 20-30)
  - AC-003 ✅ `onError` → `failed` → fallback (linha 39)
  - AC-004 ✅ `size` controla width/height + `fontSize = size * 0.32` (linha 24)
  - AC-005 ✅ cores via `bg-muted`/`text-muted-foreground` — zero hardcode
- **Alternatives**: reescrever com shadcn Avatar — rejeitado: Avatar traz slot
  complexo, TeamLogo resolve caso simples; duplicaria API (constitution VII).

### D-002: Gap real = teste automatizado

- **Decision**: Criar `src/__tests__/team-logo.test.tsx`.
- **Rationale**: Constitution III (Test-First, NON-NEGOTIABLE) — componente
  crítico (2 consumers, usado em SSR) sem teste. Nenhum teste cobre fallback
  nem erro de load hoje.
- **Alternatives**: testar indiretamente via PredictionCard — rejeitado:
  acoplado a dados Bzzoiro, cobertura opaca.

### D-003: Contraste fallback — validar, não mudar agora

- **Decision**: Auditoria de contraste `bg-muted` vs `text-muted-foreground`
  como tarefa de verificação, sem alteração de token nesta iteração.
- **Rationale**: tokens `:root` usam `oklch(0.93...)` / `oklch(0.5...)` —
  relação provável ≥ 4.5:1, mas não há teste de contraste no repo. Verificação
  entra em tasks; mudança de token seria MAJOR e exige spec própria.
- **Alternatives**: criar token dedicado agora — fora de escopo (spec de tokens
  é artefato separado, já planejado como próxima iteração).

### D-004: `fontSize = size * 0.32` — regra documentada, não hardcode

- **Decision**: Manter proporção, registrar na spec como padrão do fallback.
- **Rationale**: valor derivado de prop, não valor visual mágico hardcoded;
  constitution VI visa cores/valores recorrentes do tema.

## Dependências / Integrações

- Proxy Bzzoiro (`sports.bzzoiro.com/img/team/{id}`): público, sem token
  (confirmado no header do componente). Cache 365d no proxy — sem custo.
- Sem Storybook, sem Figma (documentado na spec) — validação visual via
  `PredictionCard` (size 56) e `live.tsx` (size 48).

## Resultado

1 mudança de código (teste novo) + 1 verificação (contraste). Zero mudança de
API. Zero breaking change. Compatível com constitution I–XI.