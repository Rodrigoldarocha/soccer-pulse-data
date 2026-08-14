# Spec 007 — Favoritos + settlement no feed

**Status:** implementado
**Data:** 2026-08-14

## Favoritos (localStorage)

Pinar ligas sem backend: persistência local por dispositivo (sem auth, sem
migration). Mesma API de storage permite trocar por conta depois.

- `src/lib/favorites.ts` — helpers puros (toggle/read/write/isFavorite) +
  `safeLocalStorage` (try/catch, SSR-safe). Testados.
- `src/routes/favoritos.tsx` — lista de ligas favoritas com atalhos
  (Previsões/Tabela/Acertividade) e remoção.
- `src/routes/liga.$leagueId.tsx` — botão ★ Favoritar.
- Nav: `⭐ Favoritos` no header.

## Settlement no feed

`getValueBets` agora liquida pendentes a cada consulta (antes só o backtest
fazia). ROI anda sem depender de o usuário abrir o backtest. Falha só loga.

## Fora de escopo

- Web Push — **deferido**: requer VAPID keys em env (provisionamento do
  usuário), SW testável só em browser e desenho de anti-spam. Próximo round.
- Cron Cloudflare — nitro config fica no wrapper lovable, não testável local.
- Favoritos sincronizados entre dispositivos (exige auth).

## Verificação

- Testes 75/75 (10 novos favoritos).
- ESLint 0 erros.
- Build ok.