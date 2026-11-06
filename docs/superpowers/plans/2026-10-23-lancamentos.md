# Implementação de lançamentos
Execução direta conforme autorização do usuário, usando desenvolvimento-de-software e testes.
Especificação: ../specs/2026-10-23-lancamentos.md
- [x] Testar cenários financeiros em SQLite temporário antes da implementação.
- [x] Core: FinanceCommand e FinanceSnapshot; Infrastructure: migração aditiva e FinanceService.Execute/Snapshot.
- [x] Ponte desktop: pedidos com requestId, resposta correlacionada e erros sem expor SQL.
- [x] React: formulários para conta, cartão, obrigação, compra parcelada, transferência e baixa; tabelas de parcelas/faturas e totais mensais.
- [x] Testar exemplo XPTO 12x10, não duplicação após pagamento, centavos, baixas parciais, reversão, persistência e repetição de pedido.
- [x] Compilar/publicar e registrar evidências, limitações e capturas.
Decisões: primeira fatura informada pelo usuário para evitar adivinhar fechamento; saldo disponível atual e despesas por mês de vencimento. Histórico pago não movimenta saldo atual.

## Resultado da execução
- 18 testes .NET aprovados; 1 teste de interface no Edge aprovado, com React conectado ao serviço real .NET/SQLite por adaptador de testes.
- Build TypeScript/Vite e publicação Windows x64 autocontida concluídos.
- Teste de interface: conta Itaú, reserva, Inter, XPTO 12x10, baixa de fatura sem duplicar despesa, recebimento parcial, transferência e recarga da página.
- Capturas da implementação conferidas em UX/capturas/2026-10-23-lancamentos-*.png; dados fictícios em banco temporário.
- Revisão independente apontou impossibilidade de cancelar histórico inicial pago. Teste reproduziu a falha; correção permite cancelar histórico importado, mas bloqueia compra com baixas ativas feitas no aplicativo.
- Primeiro teste de interface detectou seleção inacessível pelo rótulo exato; seletor recebeu aria-label. Adaptador de teste passou a usar UTF-8 para preservar acentos.
- Testes não alteraram o banco pessoal. A janela WPF não foi aberta manualmente nesta entrega; a publicação foi compilada, e a interface foi validada no Edge com o mesmo protocolo financeiro.
- Aviso do runner sobre NO_COLOR/FORCE_COLOR não afeta os testes.
- Alterações locais; sem commit/push automático.