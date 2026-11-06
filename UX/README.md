# UX do FinBot

## Referência para desenvolver as telas
A base visual é o protótipo v01 recuperado da pasta anterior do projeto. As telas de lançamentos seguem o tema e a organização da v01; os gráficos e o assistente permanecem etapas futuras.

- [Abrir o protótipo navegável](prototipos/2026-09-09-finbot-v01.html): abra este arquivo no navegador para explorar as telas.
- [Fonte editável do desenho](prototipos/2026-09-09-finbot-v01.fragment.html): referência para implementar os componentes React.
- [Captura desktop](capturas/2026-09-09-finbot-v01-desktop.png).
- [Captura do chat](capturas/2026-09-09-finbot-v01-chat.png).
- [Captura estreita](capturas/2026-09-09-finbot-v01-mobile.png).
- [capturar.cjs](ferramentas/capturar.cjs): gera capturas do HTML; não é o código das telas.
- [Histórico original](HISTORICO-v01.md): documentação preservada da versão anterior; seus caminhos para o escopo antigo são históricos.

## Trabalhar a partir desta referência
Preserve a v01. Para alterar o desenho, crie uma v02 e ajuste o script de captura para ler o novo HTML e salvar imagens com nomes novos. A página navegável é uma exportação que incorpora a prévia; editar somente o fragmento não atualiza automaticamente essa exportação.

A implementação definitiva fica em src/finbot-ui, com recursos locais e dados do SQLite. Os valores do protótipo são fictícios; seus recursos externos podem exigir internet. As capturas PNG funcionam offline.

O script original depende do pacote Node playwright e do Microsoft Edge. Foi recuperado sem modificações; não foi executado nesta recuperação para evitar sobrescrever as capturas históricas.

## Recuperação em 23/10/2026
Copiados protótipos, ferramentas, referências e capturas de Meu Financeiro/FinBot/UX para este repositório, com comparação SHA-256 de cada arquivo. A imagem referencia-original.png adicionada na reorganização também foi preservada.
## Implementação de lançamentos — 23/10/2026
- [Visão geral](capturas/2026-10-23-lancamentos-desktop.png).
- [Controle de parcelas](capturas/2026-10-23-lancamentos-parcelas.png).
Capturas geradas pelo teste Playwright com banco .NET/SQLite temporário: compra XPTO 12x10, uma fatura paga, recebimento parcial e transferência para reserva. Os números são fictícios.
O capturar.cjs original continua preservado para a v01; as capturas da implementação vêm de src/finbot-ui/e2e/finance.spec.ts.
## Parcelamentos — v02, 23/10/2026
- [Planilha enviada como referência](referencias/2026-10-23-planilha-parcelas.png).
- [Tela implementada: contratos e previsão](capturas/2026-10-23-parcelamentos-v02-contratos.png).
Teste com empréstimo 20x412,17, cartão e moto semanal com adicional. Os valores são fictícios. A referência e as capturas anteriores foram preservadas.

## Gráfico por categoria — 23/10/2026
[Captura do gráfico na Visão geral](capturas/2026-10-23-grafico-categorias.png), com dados fictícios do teste de interface.

## Investimentos — 28/10/2026
[Histórico e gráfico de investimentos](capturas/2026-10-28-investimentos.png). Dados fictícios, gerados com banco temporário pelo teste de interface.

## Contas a receber — 28/10/2026
[Recebíveis com datas opcionais e classificação](capturas/2026-10-28-contas-a-receber.png), com dados fictícios do teste automatizado.

[Recorrência mensal de aluguel](capturas/2026-10-28-recorrente-mensal.png): dados fictícios do teste automatizado.

## Projeção financeira — 28/10/2026
[Painel de fechamento e fluxo por dia](capturas/2026-10-28-projecao-financeira.png), com valores fictícios. Mostra um mês com sobra no fechamento e falta antes da entrada, seguido de um mês negativo.

[Atualização de saldo em Contas e cartões](capturas/2026-10-28-atualizar-saldo.png), com dados fictícios de validação.

[Recorrência mensal no cartão](capturas/2026-10-29-recorrencia-cartao.png), com dados fictícios de validação.

## Imposto de Renda — 29/10/2026
- [Registro pendente em amarelo](capturas/2026-10-29-ir-pendente.png).
- [Registro confirmado em verde](capturas/2026-10-29-imposto-de-renda.png).
As capturas usam dados fictícios dos testes. Referências originais preservadas em referencias/2026-10-29-ir-planilha.png e referencias/2026-10-29-ir-informe.png.

[Comprovante vinculado à baixa](capturas/2026-10-29-comprovante-baixa.png), com dados fictícios de validação.

[Reservas reunidas em Investimentos](capturas/2026-10-29-reservas-em-investimentos.png), com dados fictícios. A migração inicia o histórico mensal com o saldo atual.
