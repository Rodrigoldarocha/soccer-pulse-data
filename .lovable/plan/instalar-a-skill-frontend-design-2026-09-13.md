# Instalar a skill frontend-design

## Objetivo
Adicionar a skill **frontend-design**, do repositório `anthropics/skills` indicado, sem alterar o visual ou as funcionalidades do aplicativo.

## Etapas
1. Importar somente `frontend-design` para revisão, usando o instalador de skills.
2. Ler o conteúdo importado para confirmar a origem e o escopo.
3. Encaminhar a skill para aprovação e ativação pelo fluxo de Skills do Lovable; apenas baixar os arquivos não a torna ativa.
4. Informar o resultado e qualquer aprovação ainda necessária.

## Detalhes técnicos
Comando de importação compatível com o fluxo de revisão:

```sh
npx -y skills add https://github.com/anthropics/skills --skill frontend-design -a amp --yes
```

Após a importação, encaminhar o diretório da skill ao mecanismo de ativação do Lovable. Não modificar código do aplicativo nem aplicar uma reformulação visual.
