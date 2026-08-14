# Spec 003 — Engajamento: página de liga, compartilhar e API pública

**Status:** implementado
**Data:** 2026-08-14

## Objetivo

Três entregas leves de engajamento e integração, sem mudar o contrato do
modelo CatBoost nem tocar no pipeline de previsões.

## Escopo

1. **Página de liga** — rota `/liga/$leagueId` reutilizando
   `PredictionsBoard` com `dayFilter="all"` e filtro de liga fixo. Links
   diretos para `/tabela` e `/acertividade` da mesma liga. `head` com
   meta/OG básicos para compartilhamento.
2. **Compartilhar previsão** — botão na página de detalhe do evento
   (`/events/$eventId`) usando `navigator.share` com fallback para
   clipboard + toast (sonner). Nenhum link aninhado (botão fora do `Link`).
3. **API pública** — rota de servidor `/api/v1/predictions` com rate limit
   por IP (60 req/min), cache upstream 5 min, suporte a `limit`
   (1–200) e `league_id`, CORS aberto, `cache-control: public, max-age=300`.
   Payload normalizado e documentado no próprio código (sem gerador OpenAPI
   nesta entrega).

## Fora de escopo

- Histórico de forma e H2H (precisam de pesquisa do schema v2 da API).
- Auth/API keys por tier.
- OpenAPI/Swagger.

## Decisões

- `PredictionCard` continua 100% `Link` — não recebe botão de share para
  evitar link aninhado inválido.
- Payload público expõe apenas probabilidades e metadados; sem token, sem
  dados de usuário.
- CRLF: arquivos novos seguem `eol=lf` (`.gitattributes`).

## Verificação

- `npm run test` — 45/45 pass.
- `npx eslint` nos 3 arquivos — 0 erros.
- `npm run build` — ok, routeTree regenerado.
