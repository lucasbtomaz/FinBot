import { 
  SheetsData, 
  Lancamento, 
  CartaoCredito, 
  ContaBancaria, 
  Investimento, 
  InterpretedMessage,
  PaymentMethod 
} from '../types';

export const ABA_LANCAMENTOS   = "Lançamentos";
export const ABA_CARTOES       = "Cartões";
export const ABA_CONTAS        = "Contas";
export const ABA_RESUMO        = "Resumo";
export const ABA_INVESTIMENTOS = "Investimentos";

/**
 * Returns default baseline financial data matching the README exact walkthrough scenarios.
 */
export function getInitialSheetsData(): SheetsData {
  const hoje = new Date().toISOString().split('T')[0];
  const hora = '12:00';

  return {
    lancamentos: [
      {
        id: 'lanc-1',
        data: hoje,
        hora: '09:30',
        descricao: 'Almoço Restaurante Por Quilo',
        categoria: 'alimentacao',
        meio_pagamento: 'vr',
        tipo: 'gasto',
        valor: 35.00
      },
      {
        id: 'lanc-2',
        data: hoje,
        hora: '10:15',
        descricao: 'Supermercado Mensal',
        categoria: 'alimentacao',
        meio_pagamento: 'nubank_credito',
        tipo: 'gasto',
        valor: 250.00,
        parcelas: '1x'
      },
      {
        id: 'lanc-3',
        data: hoje,
        hora: '11:00',
        descricao: 'Salário Empresa XYZ',
        categoria: 'freela',
        meio_pagamento: 'nubank_debito',
        tipo: 'receita',
        valor: 1200.00
      }
    ],
    cartoes: [
      {
        id: 'card-1',
        nome: 'Nubank Crédito',
        meio: 'nubank_credito',
        limiteTotal: 3000.00,
        alertaTeto: 700.00, // Alert threshold specified in README
        faturaAtual: 250.00,
        diaFechamento: 25,
        diaVencimento: 1
      },
      {
        id: 'card-2',
        nome: 'Banco Inter Black',
        meio: 'inter',
        limiteTotal: 5000.00,
        alertaTeto: 2000.00,
        faturaAtual: 0.00,
        diaFechamento: 20,
        diaVencimento: 28
      }
    ],
    contas: [
      {
        id: 'acc-1',
        nome: 'VR Alimentação',
        meio: 'vr',
        tipo: 'beneficio',
        saldo: 250.00,
        diaRecarga: 27,
        limiteMensal: 600.00,
        reservaEmergencia: 50.00
      },
      {
        id: 'acc-2',
        nome: 'Nubank Conta Corrente',
        meio: 'nubank_debito',
        tipo: 'corrente',
        saldo: 1200.00,
        reservaEmergencia: 300.00
      },
      {
        id: 'acc-3',
        nome: 'Poupança / Reserva Emergência',
        meio: 'poupanca',
        tipo: 'poupanca',
        saldo: 500.00,
        reservaEmergencia: 1000.00
      }
    ],
    investimentos: [
      {
        id: 'inv-1',
        nome: 'Tesouro Selic 2029',
        tipo: 'Tesouro',
        valor: 1500.00,
        rendimentoMensalEst: 14.50,
        dataAporte: '2026-01-15'
      },
      {
        id: 'inv-2',
        nome: 'CDB 110% CDI Liquidez Diária',
        tipo: 'CDB',
        valor: 2000.00,
        rendimentoMensalEst: 20.20,
        dataAporte: '2026-02-10'
      }
    ]
  };
}

/**
 * In-memory store for sheets data (and synced with localStorage on client)
 */
let currentSheetsData: SheetsData = getInitialSheetsData();

export function getSheetsData(): SheetsData {
  return currentSheetsData;
}

export function setSheetsData(data: SheetsData): void {
  currentSheetsData = data;
}

export function resetSheetsData(): SheetsData {
  currentSheetsData = getInitialSheetsData();
  return currentSheetsData;
}

export interface RegistrationResult {
  sucesso: boolean;
  mensagem: string;
  saldoRestante?: number;
  faturaAtual?: number;
  tetoAlerta?: number;
  percentualTeto?: number;
  contaOuCartao?: string;
  diaRecarga?: number;
}

/**
 * Registers a new transaction into the spreadsheet and updates balances / invoices.
 */
export function registrarLancamento(dados: InterpretedMessage): RegistrationResult {
  const agora = new Date();
  const dataFormatada = agora.toISOString().split('T')[0];
  const horaFormatada = agora.toTimeString().split(' ')[0].substring(0, 5);

  const novoLancamento: Lancamento = {
    id: `lanc-${Date.now()}`,
    data: dataFormatada,
    hora: horaFormatada,
    descricao: dados.descricao || (dados.tipo === 'gasto' ? 'Despesa' : 'Receita'),
    categoria: dados.categoria,
    meio_pagamento: dados.meio_pagamento,
    tipo: (dados.tipo === 'gasto' || dados.tipo === 'receita' || dados.tipo === 'transferencia') 
      ? dados.tipo 
      : 'gasto',
    valor: dados.valor,
    parcelas: dados.parcelas ? `${dados.parcelas}x` : '1x'
  };

  currentSheetsData.lancamentos.unshift(novoLancamento);

  // 1. Credit Card Expense
  if (dados.tipo === 'gasto' && dados.meio_pagamento === 'nubank_credito') {
    const card = currentSheetsData.cartoes.find(c => c.meio === 'nubank_credito') || currentSheetsData.cartoes[0];
    if (card) {
      card.faturaAtual += dados.valor;
      const percentual = Math.round((card.faturaAtual / card.alertaTeto) * 100);
      return {
        sucesso: true,
        mensagem: `✅ Registrado! Fatura Nubank: R$ ${card.faturaAtual.toFixed(2).replace('.', ',')} / R$ ${card.alertaTeto.toFixed(2).replace('.', ',')} (${percentual}%)`,
        faturaAtual: card.faturaAtual,
        tetoAlerta: card.alertaTeto,
        percentualTeto: percentual,
        contaOuCartao: card.nome
      };
    }
  }

  // 2. VR Expense
  if (dados.tipo === 'gasto' && dados.meio_pagamento === 'vr') {
    const vrConta = currentSheetsData.contas.find(c => c.meio === 'vr');
    if (vrConta) {
      vrConta.saldo = Math.max(0, vrConta.saldo - dados.valor);
      const diaRecarga = vrConta.diaRecarga || 27;
      return {
        sucesso: true,
        mensagem: `✅ Lançado! Saldo VR: R$ ${vrConta.saldo.toFixed(2).replace('.', ',')} restantes (até dia ${diaRecarga})`,
        saldoRestante: vrConta.saldo,
        contaOuCartao: vrConta.nome,
        diaRecarga
      };
    }
  }

  // 3. Regular Account Expense
  if (dados.tipo === 'gasto') {
    const conta = currentSheetsData.contas.find(c => c.meio === dados.meio_pagamento) || currentSheetsData.contas[1]; // fallback Nubank Conta
    if (conta) {
      conta.saldo = Math.max(0, conta.saldo - dados.valor);
      return {
        sucesso: true,
        mensagem: `✅ Despesa registrada! Saldo ${conta.nome}: R$ ${conta.saldo.toFixed(2).replace('.', ',')}`,
        saldoRestante: conta.saldo,
        contaOuCartao: conta.nome
      };
    }
  }

  // 4. Income / Receita
  if (dados.tipo === 'receita') {
    const conta = currentSheetsData.contas.find(c => c.meio === dados.meio_pagamento) || currentSheetsData.contas[1]; // default Nubank Corrente
    if (conta) {
      conta.saldo += dados.valor;
      return {
        sucesso: true,
        mensagem: `✅ Receita registrada! Saldo conta: R$ ${conta.saldo.toFixed(2).replace('.', ',')}`,
        saldoRestante: conta.saldo,
        contaOuCartao: conta.nome
      };
    }
  }

  // 5. Transfer / Guardar na Poupança
  if (dados.tipo === 'transferencia') {
    const poupanca = currentSheetsData.contas.find(c => c.tipo === 'poupanca') || currentSheetsData.contas[2];
    const corrente = currentSheetsData.contas.find(c => c.tipo === 'corrente') || currentSheetsData.contas[1];
    if (poupanca && corrente) {
      corrente.saldo = Math.max(0, corrente.saldo - dados.valor);
      poupanca.saldo += dados.valor;
      return {
        sucesso: true,
        mensagem: `✅ Transferência realizada! Saldo poupança: R$ ${poupanca.saldo.toFixed(2).replace('.', ',')} (Conta: R$ ${corrente.saldo.toFixed(2).replace('.', ',')})`,
        saldoRestante: poupanca.saldo,
        contaOuCartao: poupanca.nome
      };
    }
  }

  return {
    sucesso: true,
    mensagem: `✅ Lançamento registrado na planilha com sucesso! (R$ ${dados.valor.toFixed(2).replace('.', ',')})`
  };
}

/**
 * Returns complete financial summary matching ABA_RESUMO
 */
export function getResumoFinanceiro(data: SheetsData = currentSheetsData) {
  const totalReceitas = data.lancamentos
    .filter(l => l.tipo === 'receita')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const totalDespesas = data.lancamentos
    .filter(l => l.tipo === 'gasto')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const saldoContas = data.contas.reduce((acc, curr) => acc + curr.saldo, 0);
  const totalFaturas = data.cartoes.reduce((acc, curr) => acc + curr.faturaAtual, 0);
  const totalInvestido = data.investimentos.reduce((acc, curr) => acc + curr.valor, 0);
  const patrimonioLiquido = (saldoContas + totalInvestido) - totalFaturas;

  return {
    totalReceitas,
    totalDespesas,
    saldoContas,
    totalFaturas,
    totalInvestido,
    patrimonioLiquido,
    balancoMes: totalReceitas - totalDespesas
  };
}
