# Tasks — Spec 007 (Favoritos + settlement feed)

## Favoritos

- [X] Helpers puros `favorites.ts` (toggle/read/write/isFavorite, SSR-safe)
- [X] 10 testes (toggle add/remove, parse, inválido, persist, null storage)
- [X] Página `/favoritos` com atalhos + remoção
- [X] Botão ★ na página de liga
- [X] Nav `⭐ Favoritos`

## Settlement feed

- [X] `getValueBets` liquida pendentes a cada consulta (try/catch)

## Qualidade

- [X] Testes 75/75
- [X] ESLint 0 erros
- [X] Build ok

## Deferido

- [ ] Web Push (VAPID env + browser test — próximo round)
- [ ] Cron CF (não testável local)