# Parcelamentos e cobranças semanais — 23/10/2026
Autorização: implementar o pedido do usuário, usando a planilha anexada como referência de apresentação.
- [x] Testes: contrato boleto 20x412,17 começando 30/10/2026; fevereiro e retorno ao dia 30; moto semanal 189 + adicional individual; checkbox sincronizado com fatura.
- [x] Esquema aditivo v2, backup prévio, contratos fora de cartão, metadados por cobrança e estorno individual de parcela.
- [x] Aba Parcelamentos, cadastro com natureza/frequência/forma, calendário de parcelas, observações e check de pagamento.
- [x] Previsão por mês, cobranças semanais inicialmente por quantidade explícita (52 por padrão), extensão manual sem duplicar.
- [x] Compilar, testar interface, capturar telas e publicar.
Regras: cartão usa as mesmas parcelas já existentes em finance_items, sem novo lançamento de fatura. Marcar gera baixa real com conta/data; desmarcar estorna só o item e ajusta fatura e caixa. Histórico anterior ao cadastro não altera saldo ao desmarcar. Extra altera só ocorrência ainda não baixada. Recorrência semanal não é parcelamento com dívida total fixa e aparece em seção separada. Primeira data semanal determina dia da semana. Parcelas mensais preservam dia-base, limitando ao último dia quando necessário.

Validação: 25 testes .NET aprovados; build React aprovado; 1 cenário completo Playwright aprovado, incluindo cadastro único após parcelamento e estorno parcial. Revisão corrigiu retenção indevida do histórico pago ao trocar frequência e adicionou desfazer baixa parcial por item. Migração v1-v2 validada com preservação dos pagamentos e backup único. Captura visual conferida. Executável publicado em artifacts/FinBot. O teste de interface usa Edge e ponte .NET com banco temporário; esta rodada não incluiu homologação manual da janela WPF.

