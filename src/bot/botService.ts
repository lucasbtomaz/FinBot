import { 
  InterpretedMessage, 
  BotMessage, 
  SheetsData 
} from '../types';
import { interpretarMensagem, interpretarConfiguracao } from '../ai/interpreter';
import { 
  registrarLancamento, 
  getResumoFinanceiro, 
  getSheetsData 
} from '../sheets/manager';
import { checkAlerts } from '../alerts/checker';

export function getWelcomeMessage(nome: string = 'Usuário'): string {
  return `Olá, ${nome}! 👋

Sou o *FinBot*, seu assistente financeiro pessoal.

Você pode me mandar mensagens naturais como:
• *Gastei 20 reais no VR*
• *Compra no crédito Nubank de 170 reais à vista*
• *Recebi 140 reais do freela*
• *Guardei 300 na poupança*

Digite */configurar* para cadastrar ou ajustar contas e limites, ou */resumo* para ver suas finanças.`;
}

export function getConfigWelcomeMessage(): string {
  return `⚙️ *Configuração inicial*

Me conte sobre seus meios de pagamento. Por exemplo:

_VR alimentação, limite 1200, recarrega dia 27, sempre guardar 100 de emergência_

_Cartão Nubank crédito, limite 3000, vencimento dia 1, fechamento dia 25, alertar se fatura passar de 700_

Pode mandar em linguagem natural ou ajustar diretamente nos painéis laterais 👇`;
}

/**
 * Processes incoming user message and returns bot response with updated state.
 */
export async function processUserMessage(
  texto: string, 
  currentData: SheetsData = getSheetsData()
): Promise<{ reply: string; parsed: InterpretedMessage; success: boolean; alertTip?: string }> {
  const clean = texto.trim();
  const lower = clean.toLowerCase();

  // Handle Telegram slash commands
  if (lower === '/start') {
    return {
      reply: getWelcomeMessage(),
      parsed: {
        tipo: 'consulta',
        valor: 0,
        descricao: '/start',
        meio_pagamento: 'outro',
        categoria: 'outro',
        confianca: 1,
        _raw: clean
      },
      success: true
    };
  }

  if (lower === '/configurar' || lower === 'configurar') {
    return {
      reply: getConfigWelcomeMessage(),
      parsed: {
        tipo: 'configuracao',
        valor: 0,
        descricao: '/configurar',
        meio_pagamento: 'outro',
        categoria: 'outro',
        confianca: 1,
        _raw: clean
      },
      success: true
    };
  }

  if (lower === '/resumo' || lower === 'resumo' || lower === '/extrato') {
    const resumo = getResumoFinanceiro(currentData);
    const reply = `📊 *Resumo Financeiro Consolidado*

💰 *Saldos em Conta*: R$ ${resumo.saldoContas.toFixed(2).replace('.', ',')}
💳 *Faturas de Cartão*: R$ ${resumo.totalFaturas.toFixed(2).replace('.', ',')}
📈 *Investimentos*: R$ ${resumo.totalInvestido.toFixed(2).replace('.', ',')}
⚖️ *Patrimônio Líquido*: R$ ${resumo.patrimonioLiquido.toFixed(2).replace('.', ',')}

*Movimentação do Mês:*
🟢 Receitas: R$ ${resumo.totalReceitas.toFixed(2).replace('.', ',')}
🔴 Despesas: R$ ${resumo.totalDespesas.toFixed(2).replace('.', ',')}
Saldo Mensal: R$ ${resumo.balancoMes.toFixed(2).replace('.', ',')}`;

    return {
      reply,
      parsed: {
        tipo: 'consulta',
        valor: 0,
        descricao: 'Resumo Geral',
        meio_pagamento: 'outro',
        categoria: 'outro',
        confianca: 1,
        _raw: clean
      },
      success: true
    };
  }

  // Check if it's a configuration sentence
  if (lower.includes('limite') && (lower.includes('vencimento') || lower.includes('fechamento') || lower.includes('recarrega') || lower.includes('emergencia') || lower.includes('emergência'))) {
    const config = interpretarConfiguracao(clean);
    
    // Apply configuration to card or account
    if (config.tipo_conta === 'cartao') {
      const card = currentData.cartoes.find(c => c.meio === 'nubank_credito') || currentData.cartoes[0];
      if (card) {
        if (config.limite) card.limiteTotal = config.limite;
        if (config.alerta_valor) card.alertaTeto = config.alerta_valor;
        if (config.fechamento) card.diaFechamento = config.fechamento;
        if (config.vencimento) card.diaVencimento = config.vencimento;
      }
    } else if (config.tipo_conta === 'beneficio') {
      const vr = currentData.contas.find(c => c.meio === 'vr');
      if (vr) {
        if (config.limite) vr.limiteMensal = config.limite;
        if (config.vencimento) vr.diaRecarga = config.vencimento;
        if (config.reserva_emergencia) vr.reservaEmergencia = config.reserva_emergencia;
      }
    }

    return {
      reply: `⚙️ *Configurações salvas na planilha!*

• Meio: *${config.nome}*
${config.limite ? `• Limite: R$ ${config.limite.toFixed(2).replace('.', ',')}\n` : ''}${config.alerta_valor ? `• Teto de Alerta: R$ ${config.alerta_valor.toFixed(2).replace('.', ',')}\n` : ''}${config.vencimento ? `• Dia de vencimento/recarga: ${config.vencimento}\n` : ''}${config.reserva_emergencia ? `• Reserva de emergência: R$ ${config.reserva_emergencia.toFixed(2).replace('.', ',')}\n` : ''}
Tudo pronto para receber seus lançamentos!`,
      parsed: {
        tipo: 'configuracao',
        valor: config.limite || 0,
        descricao: `Configuração ${config.nome}`,
        meio_pagamento: 'outro',
        categoria: 'outro',
        confianca: 0.95,
        _raw: clean
      },
      success: true
    };
  }

  // Parse natural language message
  const parsed = interpretarMensagem(clean);

  // If query type
  if (parsed.tipo === 'consulta') {
    const vrConta = currentData.contas.find(c => c.meio === 'vr');
    const nubankCard = currentData.cartoes.find(c => c.meio === 'nubank_credito');
    const contaCorrente = currentData.contas.find(c => c.tipo === 'corrente');

    let reply = `🔍 *Consulta Financeira:*\n\n`;
    if (vrConta) {
      reply += `🍽️ *VR*: R$ ${vrConta.saldo.toFixed(2).replace('.', ',')} restantes (recarga dia ${vrConta.diaRecarga})\n`;
    }
    if (nubankCard) {
      const pct = Math.round((nubankCard.faturaAtual / nubankCard.alertaTeto) * 100);
      reply += `💳 *Fatura Nubank*: R$ ${nubankCard.faturaAtual.toFixed(2).replace('.', ',')} / R$ ${nubankCard.alertaTeto.toFixed(2).replace('.', ',')} (${pct}%)\n`;
    }
    if (contaCorrente) {
      reply += `🏦 *Saldo Conta*: R$ ${contaCorrente.saldo.toFixed(2).replace('.', ',')}\n`;
    }

    return {
      reply,
      parsed,
      success: true
    };
  }

  // If unknown
  if (parsed.tipo === 'desconhecido' || parsed.valor <= 0) {
    return {
      reply: `❓ Não compreendi o valor ou operação financeira nessa mensagem:
_${clean}_

Exemplos aceitos:
• *Gastei 20 reais no VR*
• *Compra no crédito Nubank de 170 reais à vista*
• *Recebi 140 reais do freela*
• *Guardei 300 na poupança*`,
      parsed,
      success: false
    };
  }

  // Register in sheets
  const regResult = registrarLancamento(parsed);

  // Check if any alert was triggered
  const alerts = checkAlerts(currentData);
  let alertTip: string | undefined = undefined;
  const cardAlert = alerts.find(a => a.meioRelacionado === parsed.meio_pagamento);
  if (cardAlert) {
    alertTip = cardAlert.mensagem;
  }

  return {
    reply: regResult.mensagem,
    parsed,
    success: true,
    alertTip
  };
}
