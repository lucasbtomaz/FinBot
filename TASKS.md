# Ordem de desenvolvimento
## Etapa 0 — Base desktop (esta alteração)
- [x] Solução .NET, React e SQLite inicial.
- [x] Painel inicial conectado ao banco local.
- [x] Publicação executável e script de atalho.
- [x] Testes automatizados e documentação.
- [x] Homologação manual: abrir, fechar, reabrir pelo ícone no Windows.
## Etapa 1 — Contas e lançamentos
- [x] Cadastro de contas e reservas com saldo inicial.
- [ ] Edição de contas/saldos e regras específicas de VR.
- [x] Pagar/receber, transferências e baixas em centavos; cancelamento e estorno de baixas.
- [x] Testes de persistência, validação, transações e fluxo da interface.
## Etapa 2 — Cartões e pendências
- [x] Cartões com vencimento, compras parceladas, histórico pago e faturas sem despesa duplicada.
- [ ] Limites e cálculo automático do fechamento.
- [x] Contas a pagar/receber com baixa parcial.
- [ ] Fluxo específico de empréstimos vinculado à saída inicial.
## Etapa 3 — Painel financeiro
- [x] Aplicar a referência v01 às telas de lançamentos, contas, pendências e reservas.
- [ ] Completar gráficos e demais telas da referência v01.
- [x] Filtros por mês, categorias nos lançamentos e indicadores de atraso.
- [ ] Gráficos por categoria e alertas de limites.
- [x] Salvar e conferir capturas das telas de lançamentos em UX.
## Etapa 4 — Proteção e distribuição
- [ ] Backup/restauração, exportação e migrações versionadas.
- [ ] Instalador Windows, ícone próprio e atualização sem perda de dados.
## Etapa 5 — Opcional
- [ ] Chat local por texto; avaliar interpretação sem mensalidade.
- [ ] Avaliar Telegram, sincronização e outros dispositivos separadamente.

## Complemento — Parcelamentos e cobranças semanais
- [x] Cadastro com natureza, frequência e forma de pagamento.
- [x] Aba Parcelamentos para cartão e demais formas, com histórico e check individual.
- [x] Recorrência semanal com fixo, extra por ocorrência e extensão manual.
- [x] Previsão de valores pendentes nos próximos meses.
- [x] Migração aditiva v2 com backup, testes de pagamento parcial e estorno individual.

- [x] Gráfico de barras por categoria na Visão geral, ordenado por valor e filtrado por mês de vencimento. Alertas de limites continuam pendentes.

## Investimentos — 28/10/2026
- [x] Cadastro separado das reservas, com tipo e instituição.
- [x] Total investido e saldo mensal, com correção sem duplicação.
- [x] Gráfico de evolução por investimento e histórico filtrado pelo mês.
- [x] Migração v3 com backup e preservação de saldos.
- [ ] Integração de aportes/resgates com as contas e cálculo de rentabilidade.

## Contas a receber — 28/10/2026
- [x] Separar navegação de contas a pagar e contas a receber.
- [x] Recebíveis com pessoa/plataforma, categoria, observações, data opcional e confirmação.
- [x] Ocorrências semanais/mensais com valores editáveis individualmente.
- [x] Indicadores de confirmados e incertos em aberto na tela inicial.
- [x] Recebimento parcial, persistência e migração v4 com backup.

- [x] Recorrência mensal para aluguel e contas contínuas, separada de parcelamento, com previsão extensível e validação dos vencimentos.

- [x] Corrigir filtro mensal dos recebíveis confirmados/incertos na Visão geral; separar sem data. Regressão: Yasmin R$ 550 em novembro e dezembro, outubro zerado.

## Projeção financeira — 28/10/2026
- [x] Sobra/falta no mês com todas as entradas previstas e cenário só com confirmadas.
- [x] Transporte do saldo positivo ou negativo entre os próximos 12 meses.
- [x] Alerta de falta durante o mês e detalhamento por dia.
- [x] Separar vencidos, sem data e valores já baixados; testes de cálculo e interface.
- [ ] Reconstrução histórica com data-base dos saldos iniciais.

- [x] Atualização do saldo atual de contas e reservas por ajuste reversível, preservando lançamentos e o saldo inicial.

## Cartões e formas de informar parcelas — 29/10/2026
- [x] Permitir recorrência mensal no cartão, com faturas e extensão no cartão escolhido.
- [x] Aceitar valor total ou valor de cada parcela nos dois formulários de compra.
- [x] Conferir centavos, pagamento de fatura sem duplicação e preservação do histórico.

## IR e seleção de categorias — 29/10/2026
- [x] Adicionar check IR no final dos cadastros de contas, compras, recebíveis e investimentos.
- [x] Criar aba Imposto de Renda com pendência amarela e complementação para confirmação verde.
- [x] Vincular os dados originais, incluindo parcelas e recorrências, sem duplicar despesas.
- [x] Reutilizar categorias existentes com seleção e criação explícita, evitando duplicação por maiúsculas ou espaços.
- [x] Validar migração com backup, persistência, idempotência e fluxo da interface.

## Comprovantes locais — 29/10/2026
- [x] Exigir comprovante em novos pagamentos de contas, parcelas e faturas no aplicativo Windows.
- [x] Copiar PDF/PNG/JPG para D:\Financeiro\ANO\MÊS conforme a data da baixa.
- [x] Vincular o comprovante ao histórico e permitir abrir pelo aplicativo.
- [x] Preservar comprovantes ao desfazer pagamentos e manter baixas antigas.
- [x] Validar arquivo, limite de tamanho, idempotência, falha de gravação, migração e interface.

## Unificar reservas e investimentos — 29/10/2026
- [x] Remover navegação Reservas e apresentar as caixinhas em Investimentos.
- [x] Migrar reservas existentes com backup, saldo inicial do mês atual e vínculo às contas originais.
- [x] Preservar movimentações, transferências, resgates e ajustes sem duplicar valores.
- [x] Exibir gráfico, histórico e último registro; sincronizar o saldo atual e preservar correções históricas.
- [x] Permitir cadastro de Caixinha / reserva em Investimentos e atualizar os totais do resumo.
- [x] Validar migração idempotente, persistência e fluxos da interface.

- [x] 30/10/2026: tornar comprovantes opcionais nas baixas, mantendo o campo e o armazenamento dos anexos selecionados.
