# Confiança Alta/Média/Baixa por força da probabilidade

Hoje, quando a previsão vem da API oficial (quase todos os jogos), o código grava
`confidence: "low"` fixo em `src/lib/ml/pipeline.ts` — por isso a lista inteira mostra
"Baixa". O selo deixa de ser fixo e passa a refletir a força da probabilidade do melhor
mercado do jogo.

## Mudança

Em `buildPrediction`, no caminho `trustSource` (previsões oficiais da API), calcular a
confiança a partir da probabilidade em vez de fixar `"low"`:

- **Alta:** probabilidade ≥ 72%
- **Média:** probabilidade entre 55% e 72%
- **Baixa:** abaixo de 55%

Os limites ficam em constantes nomeadas no topo do arquivo, fáceis de ajustar depois.

O caminho "local" (ensemble + calibração) não muda — continua usando
`computeEnsembleConfidence`.

## Efeito nas telas

- Lista de jogos e detalhe da partida passam a mostrar Alta/Média/Baixa variados, com as
  cores já existentes no tema.
- A página "Melhor aposta de hoje" (que filtra por confiança/probabilidade) volta a ter
  resultados úteis.
- Nada muda nos números das probabilidades, odds, fontes de dados ou velocidade de
  carregamento.

## Observação honesta

"Alta" aqui significa probabilidade alta segundo a fonte — não é medida de acerto
comprovada. A medição de precisão real (contra resultados confirmados) continua como
melhoria futura possível.

## Detalhes técnicos

- Arquivo: `src/lib/ml/pipeline.ts` (ramo `opts?.trustSource`).
- Teste: ajustar/estender testes existentes em `src/lib/ml/pipeline.test.ts` cobrindo os
  três níveis nos limites (71.9%/72%, 54.9%/55%).
- Verificação: rodar vitest e conferir `/today` e `/melhor-aposta` no preview.
