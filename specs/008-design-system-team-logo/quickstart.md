# Quickstart: Validar TeamLogo (spec 008)

**Prereq**: `bun install` (lockfile autoritativo), deps de teste presentes.

## 1. Testes automatizados

```bash
bun test src/__tests__/team-logo.test.tsx
```

Esperado: cobre AC-001 (img+alt), AC-002 (fallback+aria-label), AC-003 (onError
→ fallback), AC-004 (size). Contrato: `specs/008-design-system-team-logo/contracts/team-logo.ts`.

## 2. Suíte completa (regressão)

```bash
bun test
bun lint
bun build
```

Esperado: 75+ testes passando, 0 erros ESLint, build OK (CI gate constitution).

## 3. Validação visual manual

- `bun dev` → rota live (`/live`): TeamLogo size 48, time sem escudo deve
  mostrar iniciais.
- `src/components/PredictionCard.tsx`: TeamLogo size 56, escudo com erro de
  rede → fallback após `onError`.

## 4. Contraste (check manual)

- Fallback usa `bg-muted`/`text-muted-foreground` (`src/styles.css` `:root`).
- Relação esperada ≥ 4.5:1 (WCAG AA, constitution VIII). Se < 4.5:1 → abrir
  task de token (não editar token nesta iteração).

## Referências

- Spec: `specs/008-design-system-team-logo/spec.md`
- Código: `src/components/TeamLogo.tsx`
- Research: `specs/008-design-system-team-logo/research.md`