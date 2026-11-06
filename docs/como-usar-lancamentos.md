# Como lançar seus valores

## Saldos e reservas
Em **Contas e cartões**, cadastre suas contas com o saldo atual e caixinhas como **Dinheiro guardado / reserva**. Saldo inicial não é receita. Para aportar ou resgatar, use **Transferir**.

## Cadastro de contas
Use **Cadastrar conta** e escolha separadamente:
- **Natureza:** a pagar ou a receber.
- **Frequência:** pagamento único, parcelado mensal ou recorrente semanal.
- **Forma de pagamento:** Pix, boleto, débito, dinheiro, outro ou cartão (para despesas únicas/mensais).

O cadastro cria pendências; o saldo muda quando você registra uma baixa. Despesas do mês consideram vencimentos, pagos ou pendentes. Saldos são atuais mesmo ao consultar outro mês.

## Empréstimo Luz: 20 parcelas de R$ 412,17
Em **Parcelamentos → Novo contrato**, informe nome, natureza a pagar, frequência parcelado mensal, forma de pagamento e **valor de cada parcela R$ 412,17**, quantidade 20 e primeiro vencimento 30/10/2026.
Informe parcelas já pagas somente para o histórico anterior ao cadastro, que já deve estar refletido no saldo inicial.
O contrato aparece em **Parcelamentos** com vencimentos, valores, notas, quantidade paga e check individual. Fevereiro usa seu último dia; março volta ao dia 30.

## Compra no Inter: 12 parcelas de R$ 10
Cadastre primeiro o cartão em **Contas e cartões**. Em **Cadastrar conta**, selecione parcelado mensal, cartão Inter, **valor de cada parcela R$ 10** e quantidade 12.
Informe o mês da primeira fatura de toda a compra, conferindo no banco. O fechamento automático ainda não é calculado.
No campo **Como informar o valor**, escolha **Valor total da compra** (R$ 120) ou **Valor de cada parcela** (R$ 10), com quantidade 12. Os dois modos estão disponíveis tanto no cadastro quanto no atalho **Compra no cartão**. Confira a prévia antes de salvar.

As parcelas aparecem no controle e nas faturas correspondentes. A fatura agrupa as mesmas parcelas, sem gerar outra despesa. **Não cadastre a fatura novamente como uma conta a pagar.**
Você pode pagar a fatura em **Contas a pagar** ou uma parcela pelo check em **Parcelamentos**. Ambos atualizam o mesmo controle.

## Moto: todo sábado, R$ 189 mais variáveis
Em **Cadastrar conta**, informe Assinatura da moto, a pagar, **recorrente semanal**, Pix (ou sua forma), **valor fixo R$ 189** e o primeiro sábado como início.
O padrão gera **52 semanas**; a quantidade é visível e pode ser alterada no cadastro.
Em **Parcelamentos → Cobranças semanais recorrentes**, abra a assinatura. Em cada cobrança, use **Nota / adicional** para informar o extra daquela semana e uma observação.
Exemplo: adicional R$ 25 gera uma cobrança de R$ 214; as outras continuam R$ 189.
O botão **+12 semanas** amplia a previsão quando necessário. A geração é limitada à quantidade escolhida, não é infinita. Variáveis futuras ainda não informadas não entram na previsão.

## Marcar e desfazer pagamentos
- Marque o check para informar conta, data e valor da baixa. É possível pagar parcialmente.
- Desmarque uma parcela paga para desfazer somente aquela parcela, ajustando saldo e fatura.
- Para uma parcela parcialmente paga, use **Desfazer baixa parcial**.
- Desmarcar histórico anterior ao cadastro não movimenta dinheiro.
- Extras só podem mudar antes de haver pagamento; notas podem ser atualizadas depois.
- **Lançamentos → Baixas e transferências → Desfazer** reverte a baixa/transferência. Se uma parcela daquela baixa já foi desfeita individualmente, somente o restante é revertido.

## Previsão e correções
A aba **Parcelamentos** mostra os valores pendentes dos próximos meses para contratos e semanas já gerados, a partir do mês selecionado.
Para corrigir um cadastro, cancele e cadastre novamente. Contratos com baixas realizadas exigem desfazê-las antes do cancelamento. Registros cancelados permanecem no histórico.
Edição de nomes de contas e de saldos iniciais, limites de cartão, fechamento automático e importação bancária ainda não estão disponíveis. Juros, multas e rotativo não são calculados automaticamente.
Pagamentos parciais de fatura são distribuídos automaticamente entre as parcelas e podem diferir da ordem do banco.

## Dados
Banco desktop: %LOCALAPPDATA%/FinBot/data/finbot-desktop.db. Uma instalação anterior já compatível pode continuar usando finbot.db.
A migração cria uma cópia em data/backups antes de atualizar o esquema. Isso não substitui backup periódico.
Para copiar manualmente seus dados, feche o aplicativo e copie o banco.
As capturas em UX usam dados fictícios e bancos temporários; os testes não cadastram valores no seu banco pessoal.

## Gráfico por categoria
Em Visão geral, o gráfico de barras mostra as despesas do mês selecionado da maior para a menor, com valor e percentual por categoria. Inclui pagas e pendentes pelo vencimento; recebimentos, transferências e cancelados ficam fora. Faturas não são somadas novamente. Categorias com diferenças de maiúsculas/minúsculas ou espaços nas pontas são agrupadas. Valores sem categoria aparecem em Sem categoria.

## Investimentos
A aba Investimentos é separada de Reservas. Use + Investimento para informar nome, tipo (ações, fundos imobiliários, Tesouro Selic, renda fixa, fundos ou outro), instituição, mês, total investido e saldo daquele mês.
Use Atualizar valor mensal para registrar os meses seguintes. Corrigir mês substitui os valores daquele mês sem duplicar o registro.
O gráfico e a tabela mostram somente os registros até o mês selecionado no topo. Meses não preenchidos não são estimados. O resumo soma o último saldo disponível de cada investimento, cuja data aparece na tela.
Atualize manualmente o total investido quando houver aportes ou resgates. A variação do saldo não é uma taxa de rentabilidade; ela pode incluir movimentações. Os registros não movimentam contas, reservas, receitas ou despesas e não consultam cotações.
A atualização do aplicativo cria backup antes de adicionar as tabelas de investimentos ao banco existente.

## Contas a receber
Contas a pagar contém as despesas e faturas. Use Contas a receber → + Recebível para registrar descrição, pessoa ou plataforma, origem/categoria, valor, confirmação, frequência, data opcional e observações.
Para entregas com valores variáveis, escolha Semanal ou Mensal e mantenha 1 período para lançar o valor daquela ocorrência. Para gerar várias previsões, informe a primeira data e a quantidade de períodos (até 120); cada ocorrência pode ser editada depois, inclusive para reduzir ou aumentar o valor previsto, respeitando o já recebido.
Uma dívida sem previsão pode ficar sem data e não será marcada automaticamente como atrasada.
Confirmado por mim e Incerto / pode entrar são classificações manuais, independentes da data. Recebíveis anteriores começam como incertos; use Editar para classificá-los. Editar uma ocorrência de contrato altera somente aquela ocorrência.
Os cartões confirmado e incerto da tela inicial somam apenas saldos em aberto com previsão no mês selecionado. Recebíveis sem data aparecem em um bloco separado, fora dos totais mensais. Na aba Contas a receber, os cartões continuam mostrando todos os períodos. O indicador A receber no mês continua restrito ao mês selecionado e inclui ambas as classificações.
A lista de recebíveis mostra todos os períodos e permite pesquisar pessoa/plataforma e filtrar abertos ou recebidos. Receber permite baixa total ou parcial, com conta e data efetiva. Só essa baixa movimenta o saldo. Para desfazer, use Baixas e transferências em Lançamentos.
Repetições são limitadas à quantidade cadastrada; não geram indefinidamente.

## Aluguel e recorrência mensal
Em Cadastrar conta, selecione Frequência → Recorrente mensal, informe Valor mensal e Primeiro vencimento. O padrão prevê 12 meses, com quantidade ajustável: isso representa apenas a previsão, não parcelas nem prazo final do aluguel.
As cobranças aparecem em Contas a pagar no mês correspondente e em Parcelamentos → Cobranças mensais recorrentes. Use + 12 meses para ampliar a previsão manualmente. Meses curtos usam o último dia, voltando ao dia original no mês seguinte. A geração não é infinita nem automática após o período previsto.

## Como vou fechar o mês?
Na Visão geral, a projeção principal considera todas as entradas previstas com data, inclusive incertas. O cenário ao lado considera somente confirmadas. Verde indica sobra, vermelho indica falta e zero indica no limite.
O cálculo parte do disponível atual e soma apenas entradas pendentes, descontando apenas pagamentos pendentes. Valores já baixados e faturas não são somados novamente. Reservas e investimentos ficam fora.
Use Ver próximos 12 meses e saldo anterior para ver a sobra ou déficit sendo transportado entre meses. Isso é uma previsão recalculada, não uma nova receita na conta. Troque o mês no topo para destacar o período desejado dentro desse horizonte.
Conferir entradas, saídas e saldo por dia mostra se haverá falta antes de um recebimento, mesmo com fechamento positivo. A conta é feita ao final do dia, sem horários.
Pendências vencidas são consideradas hoje apenas como hipótese e aparecem em aviso. Confira se algo já foi pago/recebido ou se precisa de nova data. Recebíveis sem data ficam fora da simulação.
Mantenha as previsões futuras cadastradas: valores variáveis desconhecidos e cobranças recorrentes ainda não geradas não são estimados. Meses passados não são reconstruídos a partir do saldo atual.

## Atualizar saldo de conta ou reserva
Em Contas e cartões, clique em Atualizar saldo ao lado da conta. Informe o saldo total correto de agora, não o valor que entrou ou saiu. Contas disponíveis aceitam saldo negativo com sinal de menos; reservas não podem ficar negativas.
O FinBot registra a diferença como Ajuste de saldo na data de hoje, preservando o saldo inicial e as movimentações anteriores. O disponível ou a reserva e a projeção são atualizados. Salvar o mesmo saldo não cria movimentação desnecessária.
Esse ajuste não é receita ou despesa e não quita pendências. Se a diferença corresponde a uma conta a pagar/receber cadastrada, use a baixa/recebimento para manter o controle correto. Para transferências entre contas cadastradas, use Transferir.
Para desfazer um ajuste, vá a Lançamentos → Baixas e transferências → Desfazer. O histórico mostra o saldo anterior e o novo saldo.

## Mensalidades e anuidade no cartão
Em Cadastrar conta, selecione Tenho que pagar → Recorrente mensal → Cartão de crédito. Escolha o cartão, informe o valor mensal, quantos meses prever e o mês da primeira fatura.
As cobranças entram nas faturas do cartão escolhido, usando seu dia de vencimento. Não lance a mesma cobrança novamente como fatura ou conta a pagar. A recorrência aparece em Parcelamentos → Cobranças mensais recorrentes e pode ser ampliada com +12 meses, mantendo o cartão.
Para uma anuidade ou compra com quantidade fixa de parcelas, use Parcelado mensalmente: escolha se está informando o total ou cada parcela. Quando o total não dividir exatamente, os centavos são distribuídos entre as primeiras parcelas, preservando o valor total. Recorrência semanal no cartão continua indisponível.

## Organizar informações para IR
No final de um novo cadastro de conta, compra no cartão, recebível ou investimento, marque **IR** e salve normalmente. Não é necessário preencher informações fiscais nesse formulário.

Abra **Imposto de Renda**: o registro estará **Pendente**, em amarelo. Clique em **Completar dados**, confira nome/razão social, preencha CPF/CNPJ e categoria/natureza no IR e salve. A situação ficará **Confirmado**, em verde. A confirmação indica preenchimento dos dados; não altera o status de pagamento.

A aba mostra todos os períodos. Expanda **Valores e datas vinculados** para consultar valores, vencimentos, quitações, cancelamentos ou o histórico do investimento. Contratos e compras agrupam suas parcelas; recebíveis repetidos aparecem individualmente. Informações financeiras continuam vindo do cadastro original, sem lançar outra despesa.

## Reutilizar categorias
Os formulários de contas, compras e recebíveis oferecem as categorias já usadas nos seus lançamentos e contratos, independentemente do mês selecionado. Escolha uma delas. Para criar outra, selecione **Nova categoria…**. Nomes iguais, desconsiderando maiúsculas/minúsculas e espaços nas pontas, reutilizam a grafia existente. Categorias históricas não são renomeadas automaticamente.

## Comprovantes de pagamento
Ao dar baixa em conta a pagar, pagar parcela ou pagar fatura, selecione um comprovante PDF, PNG ou JPG de até 10 MB. O comprovante é opcional: você pode salvar novos pagamentos sem anexar arquivo. Recebimentos, transferências, ajustes de saldo e baixas antigas não exigem anexos.

O FinBot copia o arquivo para D:\Financeiro\ANO\MÊS, usando a data da movimentação, não o vencimento. Exemplo: pagamento em novembro de 2026 fica em D:\Financeiro\2026\NOVEMBRO. As subpastas são criadas conforme os pagamentos. O nome contém a data e um identificador único; o arquivo original não é alterado.

Em Lançamentos → Baixas e transferências, use Abrir comprovante. Desfazer a baixa preserva o arquivo e o vínculo no histórico. Não mova ou renomeie manualmente a cópia, pois o aplicativo guarda o caminho dela.

Se você selecionar um anexo e o FinBot não conseguir gravar o arquivo, a baixa não será registrada. Corrija o acesso à pasta e tente novamente. Esta configuração é local, sem envio ou sincronização com OneDrive.

## Reservas reunidas em Investimentos
A aba Reservas foi removida. As reservas existentes aparecem automaticamente em Investimentos como Caixinha / reserva, com gráfico, último registro e histórico mensal.

Na primeira abertura após a atualização, o FinBot faz backup do banco e cria um registro do mês atual para cada reserva usando seu saldo atual. Não são inventados saldos de meses anteriores. O saldo migrado também serve como referência inicial do total investido; confira e ajuste esse campo pelo extrato. As movimentações antigas continuam em Lançamentos.

O vínculo com a conta é mantido para preservar transferências, resgates, comprovantes e ajustes anteriores. Transferências e ajustes atualizam o saldo do mês atual no investimento. O total investido continua sendo informado manualmente conforme os aportes e resgates, como nos demais investimentos.

Atualizar o valor mensal de uma caixinha no mês atual também ajusta seu saldo, sem criar despesa. Corrigir meses anteriores altera apenas o histórico. Para guardar ou resgatar dinheiro que já está em outra conta cadastrada, use Transferir.

Para cadastrar uma caixinha nova diretamente em Investimentos, escolha o tipo Caixinha / reserva e informe o saldo atual no mês atual. O cadastro representa dinheiro que você já possui e não desconta uma conta de origem. Os demais tipos de investimento continuam com atualização manual de valores.

O cartão Investimentos no resumo e o total da aba somam os últimos registros até o mês selecionado, contando cada investimento uma vez. Esse dinheiro permanece separado do disponível para pagar contas.
