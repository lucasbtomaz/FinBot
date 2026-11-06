# Responsabilidades das abas e simplificação visual

## Intenção

Reduzir a poluição da interface e deixar cada aba responsável apenas pelas ações e informações do seu assunto. As imagens enviadas servem como referência de organização, não de cores ou identidade visual.

## Objetivos

- Manter na Visão Geral somente o mês de vencimento, os quatro indicadores financeiros, o resultado de receitas totais menos despesas totais e a previsão dos próximos meses.
- Remover lançamentos, contas, faturas e botões de cadastro da Visão Geral.
- Exibir os botões de cadastrar conta, compra no cartão e transferência somente nas abas em que a ação pertence.
- Exibir os quatro indicadores gerais somente na Visão Geral.
- Separar contratos ativos e quitados na aba Parcelamentos, reunindo os quitados em “Contratos Quitados”.
- Mover “Próximos meses · valores ainda pendentes” para a Visão Geral.
- Separar o CSS por aba e por componente, preservando as cores atuais.

## Não objetivos

- Alterar cores, identidade visual ou regras financeiras.
- Alterar banco de dados, migrações, lançamentos ou contratos existentes.
- Excluir registros quitados; eles apenas mudam de seção na interface.

## Regras

- Um contrato está quitado quando possui cobranças ativas e todas têm `remainingCents === 0`.
- Cobranças canceladas não impedem a classificação como quitado.
- Contratos sem cobranças ativas não são classificados como quitados.
- O resultado mensal é `receitas totais - despesas totais`, usando os totais já fornecidos pelo snapshot.
- A publicação deve preservar `%LOCALAPPDATA%\FinBot\data` e ser precedida por cópia de segurança do banco.

## Abordagens consideradas

1. Renderização condicional por aba, com componentes e CSS próprios. Escolhida por tornar responsabilidades explícitas e facilitar manutenção.
2. Ocultação por CSS da estrutura global atual. Rejeitada porque mantém acoplamento e elementos indevidos no DOM.

## Estrutura proposta

- `main.tsx` fica responsável apenas por navegação, estado e composição das telas.
- A Visão Geral ganha componente próprio para indicadores, resultado mensal e previsão anual.
- Parcelamentos classifica contratos em ativos e quitados antes da renderização.
- Estilos globais ficam restritos a variáveis, reset, tipografia e layout base.
- Cada tela e componente relevante importa seu próprio CSS.

## Proteção dos dados

Nenhum código de persistência será modificado. Antes da publicação, o banco atual será copiado para a pasta de backups e sua existência será conferida depois da atualização do executável.
