# Lançamentos e parcelas
Objetivo: cadastrar saldos disponíveis/guardados, valores a pagar/receber e compras parceladas no cartão, sem duplicar despesas.
Interface: seguir a hierarquia e tema da UX v01; navegação Visão geral, Lançamentos, Contas e cartões, A pagar e receber e Reservas.
Contas: saldo inicial e tipo conta/reserva. Transferências entre contas não são receita/despesa.
Obrigações: descrição, valor total em centavos, vencimento, categoria, pagar/receber. Baixas parciais usam conta e data; estorno de baixa restaura obrigação e saldo.
Cartão: nome e dia de vencimento. Compra: valor TOTAL, quantidade, mês da primeira fatura e número de parcelas previamente pagas. O usuário confere a primeira fatura; fechamento automático fora desta entrega.
Parcela é a única obrigação financeira da compra. Fatura é agrupamento de parcelas por cartão/data; nunca um segundo lançamento de despesa. Pagamento aloca valor às parcelas e gera saída de caixa, sem despesa adicional.
Despesas do mês = obrigações a pagar com vencimento no mês, inclusive parcelas, pagas ou pendentes. É visão por vencimento, não fluxo de caixa. Saldos são atuais; UI deve dizer isso.
Histórico já pago não altera saldo inicial. Recebimentos não são antecipados. Guardar/resgatar é transferência.
Regras: inteiro em centavos, soma exata das parcelas, transações atômicas, chave de repetição, validação no .NET, cancelamento apenas sem baixas ativas no aplicativo; histórico pago importado pode ser cancelado com a compra, backup antes de ampliar esquema existente.
Limites explícitos: sem juros, rotativo, importação bancária, recorrências automáticas ou cálculo de fechamento. Ajustes de lançamentos não baixados por cancelar/recriar; histórico de baixas reversível.
