# Spec 004 — Forma recente + Confronto direto (H2H)

**Status:** implementado
**Data:** 2026-08-14

## Objetivo

Enriquecer a página de detalhe do evento (`/events/$eventId`) com forma
recente dos dois times e confronto direto — sinais que apostadores buscam
junto da previsão CatBoost.

## Descobertas da API (schema `/api/schema/`)

- `EventDetailV2Schema` **já embute** `head_to_head` agregado
  (`total_matches`, `home_wins`, `draws`, `away_wins`, `home_goals`,
  `away_goals`, `avg_total_goals`, `home_win_rate`, `away_win_rate`,
  `recent_matches`) — **zero chamada extra** para H2H.
- Forma **não** vem no detail nem na lista de predictions (só
  `PredictionDetailV2Single` tem `home_form_score`/`away_form_score`, e a
  lista não expõe). Solução: `/api/v2/teams/{id}/fixtures/` retorna
  `EventDetailV2Schema[]` → `computeTeamForm` puro deriva últimos 5
  finalizados (W/D/L). Custo: 2 chamadas (time casa + fora), cache 5 min.

## Escopo

1. **Tipos** — `HeadToHead`, `HeadToHeadRecentMatch`, campo
   `head_to_head?` em `EventDetail` (`src/lib/bzzoiro/types.ts`).
2. **`computeTeamForm` / `formSummary`** — helpers puros exportados em
   `src/lib/events.functions.ts`, com testes.
3. **`getTeamForm`** — server fn com rate limit por IP (60/min), busca
   fixtures `status=finished` de `now − 1y` a `now`, `limit=5`, cache 5 min.
4. **UI** — blocos `H2HBlock` (totais + taxas + últimos confrontos) e
   `FormBlock` (chips W/D/L coloridos + resumo) na aba Detalhes.
   `FormBlock` só monta quando ambos `team_id` existem (hooks condicionais
   seguros).

## Fora de escopo

- Forma por liga específica (fixtures são todas as competições).
- Histórico de confrontos completo (só últimos 5).

## Verificação

- `npm run test` — 51/51 pass (6 novos).
- `npx eslint` nos arquivos tocados — 0 erros.
- `npm run build` — ok.