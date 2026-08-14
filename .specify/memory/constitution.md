<!-- Sync Impact Report:
- Version change: 0.0.0 (template) → 1.0.0
- Modified principles: none (initial adoption)
- Added sections: Core Principles (I–V), Technology Stack Constraints,
  Development Workflow & Quality Gates, Governance
- Removed sections: none
- Follow-up TODOs: none
-->

# Zagueiro Constitution

## Core Principles

### I. Spec-First Development

Every feature starts as a specification written in `.specify/specs/` and follows the
Speckit flow: constitution → specify → plan → tasks → implement → converge.
No feature work begins without an approved spec; specs are the source of truth for
scope and acceptance criteria.

### II. Type-Safe Contracts (NON-NEGOTIABLE)

TypeScript strict mode everywhere. Every server function input is validated with
Zod before processing; shared schemas define the contract between client and server.
No `any`, no untyped API responses. A type error is a build failure, not a warning.

### III. Test-First (NON-NEGOTIABLE)

TDD mandatory for `src/lib/` and server functions: tests written → user approved →
tests fail → then implement. Red-Green-Refactor cycle strictly enforced. Every
integration with external APIs (Bzzoiro) and every data transform MUST have tests
in `src/__tests__/`.

### IV. Resilient Data Access

External API calls MUST be cache-first with stale-if-error fallback: on upstream
failure, serve expired cache instead of failing the request. Rate limiting MUST be
enforced on all external calls (Supabase RPC in production, in-memory in dev).
Client components MUST never call the Bzzoiro API directly — only via server
functions.

### V. Security & Secrets

Secrets (BZZOIRO_TOKEN, SUPABASE_SERVICE_ROLE_KEY) MUST never reach the client
bundle or be committed to git; `.env` is gitignored and `.env.example` is the only
template. The Supabase `service_role` client is server-only. SSR must set security
headers. Any credential leak is a critical incident.

## Technology Stack Constraints

Runtime: Node.js 22 / Bun. Framework: TanStack Start + React 19 + TypeScript 5.8.
Styling: Tailwind CSS v4 + shadcn/ui. Database/cache: Supabase (PostgreSQL 14.5).
Deploy: Cloudflare Workers (Nitro build output in `.output/`).

Lockfile: `bun.lock` is authoritative; `package.json` scripts are the only entry
points (`dev`, `build`, `test`, `lint`, `format`).

Server-only code (external API clients, service_role access) MUST live in
`src/lib/` modules and MUST NOT be imported from client components or route
loaders that execute in the browser.

## Development Workflow & Quality Gates

- CI (`.github/workflows/ci.yml`) MUST pass lint + typecheck + build on every
  push/PR to `main` before merge.
- `npm run test` MUST pass — no skipped or disabled tests without documented
  rationale approved in review.
- Every PR MUST be checked against this constitution; non-compliant changes are
  rejected.
- Commits follow conventional commits; the connected branch (Lovable) must stay
  in a working state — no history rewrites of published commits.

## Governance

This constitution supersedes all other development practices in this repository.
Amendments require: documented rationale, version bump per semver rules
(MAJOR: principle removal/redefinition; MINOR: new principle/section; PATCH:
clarification/typo), and `LAST_AMENDED_DATE` updated to today.

Compliance is verified in every code review and CI run. Runtime development
guidance lives in `AGENTS.md`; spec workflow state lives in `.specify/`.

**Version**: 1.0.0 | **Ratified**: 2026-08-14 | **Last Amended**: 2026-08-14
