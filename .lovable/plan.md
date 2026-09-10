# Escudos dos times faltando

Hoje o escudo só aparece quando o time está em um dos 9 campeonatos consultados e joga naquele mesmo dia. Fora disso o card mostra a bolinha ⚽. O plano amplia a cobertura e melhora o visual do caso sem escudo.

## O que muda

1. **Buscar os escudos por elenco, não por jogo do dia**
   Em vez de olhar só os jogos de hoje, carregar a lista de times de cada campeonato (que já inclui o escudo) e guardar em cache por algumas horas. Assim um jogo de amanhã ou de uma rodada futura também recebe o escudo.

2. **Cobrir mais campeonatos**
   Ampliar de 9 para cerca de 30 competições (Brasileirão A e B, Libertadores, Sul-Americana, Copa do Brasil, Portugal, Holanda, Bélgica, Turquia, México, Argentina, EUA, Escócia, Championship, Copas nacionais, seleções).

3. **Casar nomes com mais tolerância**
   Lista de apelidos para casos frequentes (ex.: "Atlético-MG"/"Atletico Mineiro", "Man Utd"/"Manchester United", sufixos FC/SC/CF/AC, "Wolves", "PSG"). Guardar também a sigla do time como chave.

4. **Substituto elegante quando não houver escudo**
   Em vez da bolinha genérica, mostrar um círculo com as iniciais do time e uma cor derivada do nome — fica claro e consistente. A bolinha deixa de aparecer.

5. **Escudo quebrado não fica vazio**
   Se a imagem falhar ao carregar, cai automaticamente no círculo com iniciais.

## Onde aparece

Cards de jogos em Hoje, Amanhã, Ao Vivo e nas telas de detalhe/análises que usam o mesmo card.

## Detalhes técnicos

- `src/lib/api/espn.ts`: adicionar `getLeagueTeams(slug)` usando o endpoint `.../<slug>/teams`, e ampliar `LEAGUE_MAP`.
- `src/lib/team-logos.ts`: montar o mapa a partir dos elencos (com fallback para os scoreboards atuais), cache em memória com TTL de 6h, tabela de apelidos aplicada em `normalizeTeamName`, e manter `applyLogos`/`findLogo` puros e testáveis. Sem escudo, o campo `logo` fica vazio (não `⚽`).
- `src/components/MatchCard.tsx`: `TeamCrest` renderiza `<img>` com `onError` → monograma (iniciais + cor por hash do nome).
- Timeouts e `catch` do pipeline permanecem: falha de escudo nunca derruba a lista de jogos.
- Testes em `src/lib/*.test.ts` para o casamento por apelido e para o fallback de monograma.
