---
description: "Task list for spec 008 TeamLogo design system"
---

# Tasks: 008 — TeamLogo (Design System)

**Input**: Design documents from `/specs/008-design-system-team-logo/`
**Prerequisites**: plan.md, spec.md, research.md, contracts/, quickstart.md
**Tests**: OBRIGATÓRIOS — constitution III (Test-First NON-NEGOTIABLE) + spec AC-002/003/006.

## Contexto

Componente já implementado e em produção. Spec 008 documenta contrato.
Gap real (research D-002): sem teste automatizado. Nenhuma mudança de API,
nenhum refactor. Tasks cobrem: teste + verificação de contraste + doc.

## Phase 1: Verificação de conformidade

- [x] T001 [P] Auditar `src/components/TeamLogo.tsx` contra AC-001..006 da spec
      (img+alt, fallback, onError, size, tokens, contraste) — esperado: 100% conforme
      (research D-001)

---

## Phase 2: Gap de testes (MVP)

**Goal**: cobertura automatizada dos estados do TeamLogo
**Independent Test**: `bun test src/__tests__/team-logo.test.tsx` passa sozinho

- [x] T002 [P] Verificar setup de RTL/jsdom em `vitest.config.ts` (radix deps
      presentes; confirmar environment p/ testes de componente)
- [x] T003 [P] [AC-002] Teste: `teamId={null}` renderiza fallback com iniciais
      e `aria-label={teamName}` em `src/__tests__/team-logo.test.tsx`
- [x] T004 [P] [AC-003] Teste: `onError` do `<img>` → fallback de iniciais em
      `src/__tests__/team-logo.test.tsx`
- [x] T005 [P] [AC-001/004] Teste: img com src proxy correto, `alt`, `width/height`
      de `size`, `loading="lazy"` em `src/__tests__/team-logo.test.tsx`
- [x] T006 [AC-005] Teste: fallback usa classes `bg-muted`/`text-muted-foreground`
      e nenhum `style` com cor inline (sem hardcode) em `src/__tests__/team-logo.test.tsx`
- [x] T006b [P] [AC-006] Teste: contraste `bg-muted`/`text-muted-foreground` ≥ 4.5:1
      (parse tokens de `src/styles.css` `:root`, fórmula WCAG) em
      `src/__tests__/team-logo.test.tsx`

**Checkpoint**: TeamLogo com estados cobertos — componente validável sozinho.

---

## Phase 3: Cross-cutting

- [x] T007 [P] Verificar contraste `bg-muted` vs `text-muted-foreground` ≥ 4.5:1
      (tokens em `src/styles.css` `:root`) — agora automatizado em T006b; T007
      vira validação visual manual (se < 4.5:1, registrar sem alterar token —
      spec própria de tokens na próxima iteração)
- [x] T008 Rodar `bun test`, `bun lint`, `bun build` — gates CI da constitution
- [x] T009 Atualizar status da spec 008 para "Implementado" em
      `specs/008-design-system-team-logo/spec.md`

---

## Dependências & Execução

- **T001** → bloqueia nada (auditoria confirmatória)
- **T002** → bloqueia T003–T006 (setup RTL primeiro)
- **T003–T006b** → paralelos entre si, depois de T002
- **T007** → paralelo
- **T008** → depois de T003–T006b
- **T009** → depois de T008

### Paralelo

```bash
# Verificação + setup de teste juntos:
Task: "T001 auditar conformidade TeamLogo"
Task: "T002 verificar RTL/jsdom em vitest.config.ts"
Task: "T007 verificar contraste tokens"

# Testes após T002, em paralelo:
Task: "T003 fallback iniciais + aria-label"
Task: "T004 onError → fallback"
Task: "T005 img src/alt/size/lazy"
Task: "T006 tokens sem hardcode"
Task: "T006b contraste ≥ 4.5:1"
```

## Estratégia

### MVP

1. T001 + T002
2. T003–T006b (testes red→green: componente já implementado, testes devem
   passar de primeira — validar comportamento real)
3. **STOP**: `bun test src/__tests__/team-logo.test.tsx`
4. T007, T008, T009

## Notes

- [P] = arquivos diferentes, sem dependência
- Zero mudança em `src/components/TeamLogo.tsx` (constitution VII — sem reescrita sem justificativa)
- Commit por grupo lógico, conventional commits (constitution governance)

---

## Phase 4: Convergence

- [x] T010 Parsear tokens reais de `src/styles.css` `:root` em
      `src/__tests__/team-logo.test.tsx` (AC-006, partial) — substituir valores
      oklch hardcoded por leitura do arquivo (fs + regex) p/ teste quebrar se
      `--muted`/`--muted-foreground` mudarem; manter fórmula WCAG existente