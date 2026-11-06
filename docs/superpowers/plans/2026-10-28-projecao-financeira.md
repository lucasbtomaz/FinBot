# Projeção financeira — 28/10/2026

## Objetivo
Mostrar na Visão geral se faltará ou sobrará dinheiro, com projeção por data e transporte do saldo para os próximos meses. Pedido autorizado pelo usuário para validação no aplicativo pessoal.

## Regras implementadas
- Base: disponível atual em contas, com data de hoje. Reservas e investimentos ficam fora.
- Cenário principal inclui todas as entradas pendentes com data, mesmo incertas.
- Cenário confirmado exclui entradas incertas de toda a sequência, inclusive do saldo anterior.
- Soma apenas valores ainda pendentes; baixas já realizadas estão refletidas no saldo atual.
- Parcela de cartão entra uma vez; fatura é um agrupamento e não outra saída.
- O saldo final, positivo ou negativo, vira abertura do mês seguinte em cada cenário. Nenhum lançamento fictício é criado.
- Horizonte: mês atual e os 11 seguintes. O mês selecionado determina o destaque.
- Detalhamento por dia, com primeira data negativa e maior falta simulada. Movimentos na mesma data são compensados no fechamento do dia; horários não estão disponíveis.
- Pendências vencidas entram na data de hoje como hipótese explícita, com aviso para revisar datas e baixas.
- Recebíveis sem data ficam fora; o total excluído aparece no painel.
- Meses passados não são reconstruídos com o saldo atual. O aplicativo informa essa limitação.
- Somente receitas e despesas cadastradas ou ocorrências já geradas entram na previsão. Meses sem registros não são estimados.

## Validação
11 testes Playwright passaram: 4 de cálculo e 7 de interface. Cobertura de sobra/déficit acumulado, sequência confirmada independente, falta antes do recebimento, baixa parcial, vencidos, cancelados, sem data, mês vazio, ano novo e troca de mês na tela.
Build React aprovado. Captura visual conferida em UX/capturas/2026-10-28-projecao-financeira.png. Não há alteração de esquema ou dos dados pessoais nesta funcionalidade.
