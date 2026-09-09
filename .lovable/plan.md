# Melhorias possíveis com a API que já temos

Hoje o app usa apenas uma pequena parte dos dados disponíveis: lista de jogos por data, classificação e resultados passados. A mesma API oferece muito mais (odds de várias casas, previsões prontas, escalações, incidentes, estatísticas de jogo e de jogadores, confrontos diretos, transmissão na TV, árbitro, estádio, elenco).

Abaixo estão as melhorias organizadas por impacto. Cada fase pode ser feita separadamente.

## Fase 1 — Página do jogo (maior impacto)

Hoje o cartão do jogo não abre nada. Criar uma página por partida com:

- Confronto direto: últimos encontros entre os dois times, com placares.
- Forma recente: últimos 5 jogos de cada time (V/E/D).
- Escalações (ou escalação provável, quando o jogo ainda não começou).
- Estatísticas do jogo: posse, finalizações, cantos, cartões.
- Onde assistir: canais de TV / transmissão.
- Estádio e árbitro.

## Fase 2 — Odds reais e valor da aposta

- Mostrar as melhores odds do mercado por jogo, com o nome da casa.
- Comparar as odds entre casas em vez de usar odds calculadas internamente.
- Destacar "valor": onde a nossa probabilidade é maior que a implícita pela odd.
- Página "Melhores oportunidades do dia" ordenada por valor.

## Fase 3 — Ao vivo de verdade

- Usar o recurso de jogos ao vivo da API para minuto, placar e eventos (gols, cartões, substituições) em tempo real.
- Atualização automática a cada ~30 s apenas na página ao vivo.
- Linha do tempo do jogo com os incidentes.

## Fase 4 — Precisão do modelo

- Combinar a nossa previsão com a previsão que a própria API fornece, e mostrar as duas.
- Calcular forma e média de gols a partir dos últimos jogos de cada time (dados por time), em vez de só do histórico da liga — deixa de precisar do palpite médio de fallback.
- Registrar acertos por mercado e mostrar a taxa real de acerto no painel de análise.

## Fase 5 — Navegação e descoberta

- Página por liga: classificação, próximos jogos, artilheiros.
- Página por time: elenco, próximos jogos, forma, transferências.
- Página por jogador: estatísticas da temporada e carreira.
- Filtro por liga e busca por time nas listas de jogos.

## Detalhes técnicos

- Todos os novos dados passam por server functions no padrão atual (`src/lib/*.functions.ts` + `*.server.ts`), mantendo o token fora do navegador.
- Reaproveitar o cliente em `src/lib/api/thesportsdb.ts` (fila serial, retry, cache) e o cache em banco para respostas mais caras (h2h, escalações, odds).
- Novas rotas em `src/routes`: `events.$eventId.tsx`, `leagues.$leagueId.tsx`, `teams.$teamId.tsx`, cada uma com `head()` próprio.
- Carregamento inicial via loader + `ensureQueryData`; atualização ao vivo via `refetchInterval` apenas na rota `/live`.
- Endpoints a usar: `events/{id}/h2h`, `/lineups`, `/predicted-lineup`, `/stats`, `/player-stats`, `/incidents`, `/broadcasts`, `/odds/comparison`, `odds/best`, `events/live`, `teams/{id}/fixtures`, `teams/{id}/squad`, `leagues/{id}/standings`, `players/{id}/stats`.

## Sugestão de ordem

Fase 1 primeiro (é o que o usuário mais sente falta ao clicar num jogo), depois Fase 2 e 3.
