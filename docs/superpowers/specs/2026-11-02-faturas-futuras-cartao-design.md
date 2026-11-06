# Faturas futuras e limite comprometido do cartão

## Intenção

Permitir que o usuário registre os totais já conhecidos das próximas faturas de cada cartão. Esses valores devem alimentar o limite comprometido, as contas a pagar mensais e a previsão anual, sem exigir ajustes manuais de limite, disponível ou percentual.

## Comportamento

- Cada cartão terá a ação **Cadastrar próximas faturas**.
- O cadastro aceitará mês de vencimento e valor total da fatura, permitindo registrar vários meses do mesmo cartão.
- Uma fatura informada manualmente será o total oficial daquele cartão naquele mês.
- Se já houver parcelas, compras ou assinaturas calculadas no mesmo mês, o total manual substituirá o total calculado, evitando duplicidade.
- A fatura continuará editável e poderá ser removida antes de qualquer pagamento.
- O valor **Em aberto** do cartão será a soma restante de todas as faturas não pagas, independentemente do mês selecionado.
- **Limite disponível** será `limite cadastrado - total em aberto`, nunca abaixo de zero.
- A barra e o percentual usarão o total em aberto global do cartão.
- O rodapé **Fatura do mês** continuará mostrando somente a fatura do mês selecionado.
- Ao pagar uma fatura, apenas o restante daquela fatura deixa de comprometer o limite; as faturas futuras continuam comprometendo-o.
- Cada fatura futura aparecerá em **Contas a pagar** no mês correspondente e em **Próximos meses** na visão geral.

## Dados e segurança

- O limite já cadastrado no cartão não será alterado.
- Disponível, utilizado e percentual serão sempre calculados, nunca digitados.
- A alteração exigirá migração aditiva e backup prévio do banco real.
- Compras, parcelas, assinaturas e pagamentos existentes serão preservados.

## Abordagens consideradas

1. **Saldo utilizado digitado no cartão:** simples, mas não distribui valores por mês e não alimenta a previsão anual. Rejeitada.
2. **Somar faturas manuais aos lançamentos automáticos:** alimenta a previsão, mas duplica parcelas e assinaturas. Rejeitada.
3. **Total mensal manual substitui o cálculo automático do mês:** mantém previsão, limite e contas a pagar coerentes sem duplicação. Escolhida.

## Critérios de aceite

- Inter com limite de R$ 6.350,00 e faturas futuras pendentes somando R$ 4.008,89 exibe R$ 2.341,11 disponível e aproximadamente 63,13% de uso.
- Pagar novembro não remove do limite as faturas pendentes de dezembro em diante.
- Uma fatura manual e parcelas automáticas do mesmo cartão/mês geram somente um total em Contas a pagar e na previsão anual.
- Editar ou remover uma fatura futura atualiza imediatamente limite, percentual e projeções.
