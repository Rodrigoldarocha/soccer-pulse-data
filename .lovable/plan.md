# Identidade visual própria para o app de futebol

O app hoje usa Inter + Space Grotesk, verde de destaque e blocos arredondados iguais — o
conjunto padrão que qualquer app de estatística usa. A skill de design serve para dar ao
app uma cara reconhecível, sem mexer nos dados nem nas previsões.

## Direção proposta

Referência: caderno de resultados impresso e placar de estádio. Números grandes e
precisos, fundo escuro de noite de jogo, um único destaque quente para o que está ao vivo.

- **Cores (6 tokens):** `#0C1116` fundo de noite, `#141C24` superfície, `#E8E4DA` texto
  claro, `#8A99A8` texto secundário, `#F2542D` destaque único (ao vivo / maior confiança),
  `#3F8F6B` verde discreto apenas para resultado confirmado.
- **Tipografia:** uma família condensada de alto contraste para placares e números
  (Archivo / Archivo Narrow), e uma humanista sóbria para texto corrido (Source Sans 3).
  Números tabulares em toda tabela e placar.
- **Layout:** lista densa em linhas, não cartões repetidos. Cada jogo é uma linha com
  hora à esquerda, times ao centro, probabilidades alinhadas à direita em colunas fixas.
  Divisores finos separam campeonatos; cartão só para o destaque do dia.

```text
HOJE  domingo, 13 set                            18 jogos

19:30 ── Palmeiras          2.1 xG   58% ─┐
      ── Grêmio            0.9 xG   19%  │ barra fina 1X2
──────────────────────────────────────────┘
21:00 ── Real Madrid ...
```

- **Princípios:** um só elemento ousado (o destaque do dia, em laranja); tudo mais quieto.
  Movimento apenas quando o placar muda ao vivo. Sem etiquetas em caixa alta, sem
  "01 / 02 / 03", sem gradiente decorativo.

## Escopo do trabalho

1. Trocar os tokens de cor, raio e tipografia no tema global (claro e escuro).
2. Redesenhar a linha de jogo e o destaque do dia com a nova hierarquia.
3. Ajustar navegação, cabeçalhos de página e estados vazios/erro ao novo tom de voz:
   frases curtas, em português, dizendo o que fazer.
4. Revisar no celular, foco de teclado visível e movimento reduzido respeitado.
5. Conferir cada tela com captura de tela antes de encerrar.

## Fora do escopo

Nada de mudanças em previsões, cache, chamadas de API ou lógica de negócio. Só aparência,
textos de interface e organização das telas.

## Detalhes técnicos

- Tokens em `src/styles.css` (`@theme inline` + `:root`/`.dark`); nenhum componente recebe
  cor fixa como `text-white` ou `bg-[#...]`.
- Fontes carregadas via `@fontsource` (import local no topo de `styles.css`), substituindo
  Inter e Space Grotesk.
- Componentes afetados: `src/components/AppLayout.tsx`, `src/components/MatchCard.tsx` e as
  rotas `today`, `tomorrow`, `live`, `analytics`, `league.$leagueId`, `match.$matchId`.
- `framer-motion` mantido, mas só nas transições de estado (entrada de placar, abertura de
  menu), removendo as animações escalonadas de cada item.
