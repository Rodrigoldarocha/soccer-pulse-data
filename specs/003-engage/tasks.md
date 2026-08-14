# Tasks — Spec 003 (Engajamento)

## Página de liga

- [x] Rota `/liga/$leagueId` com `PredictionsBoard` (leagueId fixo, dayFilter all)
- [x] `onLeagueChange` navega para `/liga/$leagueId`
- [x] Links para `/tabela` e `/acertividade` da liga
- [x] `head` com title/description/OG

## Compartilhar

- [x] Botão `navigator.share` no detalhe do evento
- [x] Fallback clipboard + toast sonner

## API pública

- [x] Rota `/api/v1/predictions` com rate limit por IP
- [x] Params `limit` (1–200) e `league_id`
- [x] Payload normalizado, CORS aberto, cache-control 300s

## Qualidade

- [x] Testes 45/45
- [x] ESLint 0 erros (arquivos novos)
- [x] Build ok + routeTree regenerado
