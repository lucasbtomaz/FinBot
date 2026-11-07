import { InterpretedMessage, InterpretedConfig, PaymentMethod, Category, TransactionType } from '../types';

export const SYSTEM_PROMPT = `
Você é um interpretador financeiro pessoal. Analise a mensagem do usuário e extraia as informações financeiras.

Responda APENAS com um JSON válido no seguinte formato:
{
    "tipo": "gasto | receita | transferencia | configuracao | consulta | desconhecido",
    "valor": 0.00,
    "descricao": "descrição curta",
    "meio_pagamento": "vr | nubank_credito | nubank_debito | itau | inter | dinheiro | poupanca | outro",
    "parcelamento": null,
    "parcelas": null,
    "destinatario": null,
    "categoria": "alimentacao | transporte | lazer | saude | educacao | moradia | investimento | outro",
    "confianca": 0.0
}

Exemplos:
- "Gastei 20 reais no VR" → tipo: gasto, valor: 20.0, meio_pagamento: vr, categoria: alimentacao
- "Compra no crédito Nubank de 300 em 2x" → tipo: gasto, valor: 300.0, parcelamento: true, parcelas: 2
- "Recebi 500 do freela" → tipo: receita, valor: 500.0
- "Guardei 300 na poupança" → tipo: transferencia, descricao: deposito poupança
`;

/**
 * Extracts a numeric value in Brazilian currency / number formats from text.
 * Examples: "20", "20 reais", "R$ 170,00", "1.340,50", "300 em 2x" -> 300
 */
export function extrairValor(texto: string): number {
  // First look for R$ notation
  const cifraoMatch = texto.match(/r\$\s*([0-9]+(?:[\.,][0-9]{1,2})?)/i);
  if (cifraoMatch && cifraoMatch[1]) {
    const raw = cifraoMatch[1].replace(',', '.');
    const val = parseFloat(raw);
    if (!isNaN(val)) return val;
  }

  // Look for "X reais" or "de X" or "X conto"
  const reaisMatch = texto.match(/(?:de\s+|gastei\s+|recebi\s+|guardei\s+|paguei\s+|compra\s+de\s+)?([0-9]+(?:[\.,][0-9]{1,2})?)\s*(?:reais|real|conto|pila)?/i);
  if (reaisMatch && reaisMatch[1]) {
    const raw = reaisMatch[1].replace(',', '.');
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) return val;
  }

  // Generic number detection
  const anyNum = texto.match(/([0-9]+(?:[\.,][0-9]{1,2})?)/);
  if (anyNum && anyNum[1]) {
    const raw = anyNum[1].replace(',', '.');
    const val = parseFloat(raw);
    if (!isNaN(val)) return val;
  }

  return 0.0;
}

/**
 * Detects payment method based on keywords.
 */
export function detectarMeioPagamento(textoLower: string): PaymentMethod {
  if (textoLower.includes('vr') || textoLower.includes('vale refeicao') || textoLower.includes('vale-refeição') || textoLower.includes('vale refeição') || textoLower.includes('alelo') || textoLower.includes('sodexo')) {
    return 'vr';
  }
  if (textoLower.includes('nubank credito') || textoLower.includes('nubank crédito') || textoLower.includes('crédito nubank') || textoLower.includes('credito nubank') || (textoLower.includes('nubank') && textoLower.includes('crédito')) || (textoLower.includes('nubank') && textoLower.includes('credito'))) {
    return 'nubank_credito';
  }
  if (textoLower.includes('nubank debito') || textoLower.includes('nubank débito') || textoLower.includes('débito nubank') || textoLower.includes('debito nubank')) {
    return 'nubank_debito';
  }
  if (textoLower.includes('nubank')) {
    // Default Nubank: if mentions compra or crédito, credit; else debit/corrente
    if (textoLower.includes('compra') || textoLower.includes('fatura') || textoLower.includes('parcel')) {
      return 'nubank_credito';
    }
    return 'nubank_debito';
  }
  if (textoLower.includes('itau') || textoLower.includes('itaú')) {
    return 'itau';
  }
  if (textoLower.includes('inter') || textoLower.includes('banco inter')) {
    return 'inter';
  }
  if (textoLower.includes('poupança') || textoLower.includes('poupanca')) {
    return 'poupanca';
  }
  if (textoLower.includes('dinheiro') || textoLower.includes('em maos') || textoLower.includes('em mãos') || textoLower.includes('saque')) {
    return 'dinheiro';
  }
  if (textoLower.includes('crédito') || textoLower.includes('credito') || textoLower.includes('cartao') || textoLower.includes('cartão')) {
    return 'nubank_credito';
  }
  return 'outro';
}

/**
 * Detects category based on context.
 */
export function detectarCategoria(textoLower: string, meio: PaymentMethod): Category {
  if (meio === 'vr' || textoLower.includes('almoço') || textoLower.includes('almoco') || textoLower.includes('jantar') || textoLower.includes('lanche') || textoLower.includes('comida') || textoLower.includes('mercado') || textoLower.includes('restaurante') || textoLower.includes('café') || textoLower.includes('cafe') || textoLower.includes('padaria') || textoLower.includes('ifood')) {
    return 'alimentacao';
  }
  if (textoLower.includes('uber') || textoLower.includes('99') || textoLower.includes('gasolina') || textoLower.includes('combustivel') || textoLower.includes('combustível') || textoLower.includes('estacionamento') || textoLower.includes('onibus') || textoLower.includes('ônibus') || textoLower.includes('metro') || textoLower.includes('metrô') || textoLower.includes('pedágio')) {
    return 'transporte';
  }
  if (textoLower.includes('cinema') || textoLower.includes('jogo') || textoLower.includes('show') || textoLower.includes('festa') || textoLower.includes('bar') || textoLower.includes('cerveja') || textoLower.includes('viagem') || textoLower.includes('netflix') || textoLower.includes('spotify')) {
    return 'lazer';
  }
  if (textoLower.includes('farmacia') || textoLower.includes('farmácia') || textoLower.includes('remedio') || textoLower.includes('remédio') || textoLower.includes('medico') || textoLower.includes('médico') || textoLower.includes('dentista') || textoLower.includes('consulta medica')) {
    return 'saude';
  }
  if (textoLower.includes('curso') || textoLower.includes('livro') || textoLower.includes('faculdade') || textoLower.includes('escola') || textoLower.includes('udemy') || textoLower.includes('alura')) {
    return 'educacao';
  }
  if (textoLower.includes('aluguel') || textoLower.includes('condominio') || textoLower.includes('condomínio') || textoLower.includes('luz') || textoLower.includes('agua') || textoLower.includes('água') || textoLower.includes('internet')) {
    return 'moradia';
  }
  if (textoLower.includes('investimento') || textoLower.includes('cdb') || textoLower.includes('tesouro') || textoLower.includes('ações') || textoLower.includes('acoes') || textoLower.includes('fii')) {
    return 'investimento';
  }
  if (textoLower.includes('freela') || textoLower.includes('freelance') || textoLower.includes('projeto') || textoLower.includes('salario') || textoLower.includes('salário')) {
    return 'freela';
  }
  return 'outro';
}

/**
 * Interprets natural language financial messages with Brazilian Portuguese rule engine.
 */
export function interpretarMensagem(texto: string): InterpretedMessage {
  const clean = texto.trim();
  const lower = clean.toLowerCase();

  // Handle consultation
  if (lower.startsWith('quanto') || lower.includes('saldo') || lower.includes('fatura') || lower.includes('extrato') || lower.includes('resumo') || lower.includes('gastei hoje') || lower.includes('relatorio')) {
    return {
      tipo: 'consulta',
      valor: 0.0,
      descricao: clean,
      meio_pagamento: detectarMeioPagamento(lower),
      categoria: 'outro',
      confianca: 0.95,
      _raw: clean
    };
  }

  // Handle configuration command or intent
  if (lower.startsWith('/configurar') || lower.includes('configurar') || lower.includes('cadastrar conta') || lower.includes('cadastrar cartao')) {
    return {
      tipo: 'configuracao',
      valor: 0.0,
      descricao: clean,
      meio_pagamento: 'outro',
      categoria: 'outro',
      confianca: 0.98,
      _raw: clean
    };
  }

  // Determine transaction type
  let tipo: TransactionType = 'desconhecido';
  let confianca = 0.5;

  const isReceita = lower.includes('recebi') || lower.includes('ganhei') || lower.includes('caiu') || lower.includes('salario') || lower.includes('salário') || lower.includes('pix recebido') || lower.includes('pagamento recebido') || lower.includes('entrada');
  const isTransferencia = lower.includes('guardei') || lower.includes('guardar') || lower.includes('transferi') || lower.includes('mandei') || lower.includes('investi') || lower.includes('poupança') || lower.includes('poupanca');
  const isGasto = lower.includes('gastei') || lower.includes('compra') || lower.includes('comprei') || lower.includes('paguei') || lower.includes('despesa') || lower.includes('saque') || lower.includes('custou') || lower.includes('pagamento');

  if (isReceita) {
    tipo = 'receita';
    confianca = 0.95;
  } else if (isTransferencia) {
    tipo = 'transferencia';
    confianca = 0.90;
  } else if (isGasto) {
    tipo = 'gasto';
    confianca = 0.95;
  } else {
    // Fallback: If amount and payment method exist, likely a expense
    const val = extrairValor(lower);
    if (val > 0) {
      tipo = 'gasto';
      confianca = 0.75;
    }
  }

  const valor = extrairValor(clean);
  const meio = detectarMeioPagamento(lower);
  const categoria = detectarCategoria(lower, meio);

  // Check installment (ex: "em 2x", "em 3 parcelas", "10x")
  let parcelamento = false;
  let parcelas: number | null = null;
  const parcelasMatch = lower.match(/(?:em\s+)?([0-9]{1,2})\s*x\b/i) || lower.match(/([0-9]{1,2})\s*parcelas/i);
  if (parcelasMatch && parcelasMatch[1]) {
    const num = parseInt(parcelasMatch[1], 10);
    if (!isNaN(num) && num > 1) {
      parcelamento = true;
      parcelas = num;
    }
  }

  // Clean description
  let descricao = clean;
  if (clean.length > 50) {
    descricao = clean.substring(0, 47) + '...';
  }

  return {
    tipo,
    valor,
    descricao,
    meio_pagamento: meio,
    parcelamento,
    parcelas,
    destinatario: null,
    categoria,
    confianca,
    _raw: clean
  };
}

/**
 * Interprets account or credit card configuration setup message.
 * Ex: "VR alimentação, limite 1200, recarrega dia 27, sempre guardar 100 de emergência"
 * Ex: "Cartão Nubank crédito, limite 3000, vencimento dia 1, fechamento dia 25, alertar se fatura passar de 700"
 */
export function interpretarConfiguracao(texto: string): InterpretedConfig {
  const lower = texto.toLowerCase();

  let tipoConta = 'outro';
  if (lower.includes('vr') || lower.includes('vale')) tipoConta = 'beneficio';
  else if (lower.includes('crédito') || lower.includes('credito') || lower.includes('cartao') || lower.includes('cartão')) tipoConta = 'cartao';
  else if (lower.includes('poupança') || lower.includes('poupanca')) tipoConta = 'poupanca';
  else if (lower.includes('conta') || lower.includes('corrente')) tipoConta = 'corrente';

  // Extract limit
  let limite: number | null = null;
  const limiteMatch = lower.match(/limite\s*(?:de\s*)?([0-9]+(?:[\.,][0-9]{1,2})?)/);
  if (limiteMatch && limiteMatch[1]) {
    limite = parseFloat(limiteMatch[1].replace(',', '.'));
  }

  // Extract closing day
  let fechamento: number | null = null;
  const fechaMatch = lower.match(/fechamento\s*(?:dia\s*)?([0-9]{1,2})/);
  if (fechaMatch && fechaMatch[1]) {
    fechamento = parseInt(fechaMatch[1], 10);
  }

  // Extract due day / recharge day
  let vencimento: number | null = null;
  const vencMatch = lower.match(/(?:vencimento|recarrega|recarga)\s*(?:dia\s*)?([0-9]{1,2})/);
  if (vencMatch && vencMatch[1]) {
    vencimento = parseInt(vencMatch[1], 10);
  }

  // Extract alert threshold
  let alertaValor: number | null = null;
  const alertaMatch = lower.match(/alerta(?:r)?(?:\s*se)?(?:\s*fatura)?(?:\s*passar)?(?:\s*de)?\s*([0-9]+(?:[\.,][0-9]{1,2})?)/);
  if (alertaMatch && alertaMatch[1]) {
    alertaValor = parseFloat(alertaMatch[1].replace(',', '.'));
  }

  // Extract emergency reserve
  let reserva: number | null = null;
  const reservaMatch = lower.match(/(?:emergência|emergencia|reserva)\s*(?:de\s*)?([0-9]+(?:[\.,][0-9]{1,2})?)/);
  if (reservaMatch && reservaMatch[1]) {
    reserva = parseFloat(reservaMatch[1].replace(',', '.'));
  }

  let nome = 'Novo Meio';
  if (lower.includes('vr')) nome = 'VR Alimentação';
  else if (lower.includes('nubank')) nome = 'Nubank Crédito';
  else if (lower.includes('itau')) nome = 'Itaú';
  else if (lower.includes('inter')) nome = 'Banco Inter';

  return {
    tipo_conta: tipoConta,
    nome,
    limite,
    vencimento,
    fechamento,
    alerta_valor: alertaValor,
    reserva_emergencia: reserva,
    _raw: texto
  };
}
