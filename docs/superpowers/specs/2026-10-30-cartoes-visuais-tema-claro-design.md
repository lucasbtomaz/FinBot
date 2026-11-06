# Cartões visuais, tema claro e redução de textos

## Intenção

Transformar o FinBot em uma aplicação mais visual, com menos texto explicativo e leitura rápida por cartões, valores, estados e barras. O fundo passa a ser claro em toda a aplicação; as cores de destaque poderão ser refinadas manualmente depois.

## Objetivos

- Apresentar cada cartão de crédito como um bloco visual completo.
- Mostrar limite total, valor em aberto, limite disponível, uso do limite, fechamento, vencimento e ação de pagamento.
- Permitir cadastrar e editar limite total e dia de fechamento.
- Manter cartões antigos funcionando com limite e fechamento “não informados”.
- Aplicar tema claro a todas as abas.
- Reduzir textos auxiliares longos em todas as telas, preservando mensagens necessárias para evitar erros financeiros.
- Manter CSS próximo de cada tela ou componente.

## Não objetivos

- Definir uma paleta final de marca.
- Alterar cálculos de parcelas, faturas, pagamentos ou saldos.
- Excluir ou recriar cartões e lançamentos existentes.
- Calcular automaticamente o fechamento de compras antigas.

## Regras dos cartões

- `Em aberto` é a soma do saldo restante de todas as parcelas ativas do cartão.
- `Limite disponível` é `limite total - em aberto`, nunca exibido abaixo de zero; excesso é indicado visualmente.
- A barra usa a proporção `em aberto / limite total`, limitada visualmente a 100%.
- Limite zero significa “não informado”, não “sem limite”.
- Fechamento zero significa “não informado”.
- Vencimento continua obrigatório entre 1 e 31.
- Cartões antigos recebem limite e fechamento zero durante a migração.
- A ação de pagamento atua sobre a fatura do mês selecionado; sem fatura pendente, fica indisponível.

## Tema e densidade de texto

- Fundo geral cinza muito claro e painéis brancos.
- Texto principal escuro, texto secundário cinza e bordas suaves.
- Cores de estado continuam distinguindo positivo, negativo, atenção e seleção.
- Parágrafos explicativos permanentes são removidos quando o título, rótulo ou estado já explica a função.
- Avisos de prevenção de duplicidade, efeitos financeiros e ações irreversíveis permanecem nos formulários ou confirmações.

## Abordagens consideradas

1. Componentes visuais e dados reais, com migração de banco e CSS modular. Escolhida porque entrega os valores pedidos e melhora a manutenção.
2. Simular limite apenas na interface. Rejeitada porque mostraria números inventados e não permitiria manutenção correta dos cartões.

## Proteção dos dados

A migração adiciona colunas com valores padrão, sem alterar registros existentes. O banco real deve ser copiado e validado por hash antes da publicação, e o teste de migração deve provar que cartões, compras, parcelas e pagamentos anteriores continuam presentes.
