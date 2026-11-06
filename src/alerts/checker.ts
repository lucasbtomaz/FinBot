import { SheetsData, AlertNotification } from '../types';

/**
 * Checks all active financial rules and generates smart alerts.
 */
export function checkAlerts(data: SheetsData): AlertNotification[] {
  const alerts: AlertNotification[] = [];
  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const timestamp = hoje.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Credit Cards Check
  for (const card of data.cartoes) {
    const percentualTeto = Math.round((card.faturaAtual / card.alertaTeto) * 100);
    
    if (card.faturaAtual >= card.alertaTeto) {
      alerts.push({
        id: `alert-card-limit-${card.id}`,
        tipo: 'danger',
        titulo: `🚨 Teto de Fatura Excedido: ${card.nome}`,
        mensagem: `A fatura atual está em R$ ${card.faturaAtual.toFixed(2).replace('.', ',')}, ultrapassando o teto definido de R$ ${card.alertaTeto.toFixed(2).replace('.', ',')} (${percentualTeto}%).`,
        timestamp,
        meioRelacionado: card.meio
      });
    } else if (percentualTeto >= 60) {
      alerts.push({
        id: `alert-card-warning-${card.id}`,
        tipo: 'warning',
        titulo: `⚠️ Atenção à Fatura: ${card.nome}`,
        mensagem: `Fatura em R$ ${card.faturaAtual.toFixed(2).replace('.', ',')} atingiu ${percentualTeto}% do seu teto de segurança (R$ ${card.alertaTeto.toFixed(2).replace('.', ',')}).`,
        timestamp,
        meioRelacionado: card.meio
      });
    }
  }

  // 2. VR / Benefício Pace Check
  const vrConta = data.contas.find(c => c.meio === 'vr');
  if (vrConta) {
    const diaRecarga = vrConta.diaRecarga || 27;
    let diasRestantes = diaRecarga - diaDoMes;
    if (diasRestantes <= 0) {
      diasRestantes += 30; // next month
    }

    const orcamentoDiario = diasRestantes > 0 ? (vrConta.saldo / diasRestantes) : vrConta.saldo;

    if (vrConta.saldo <= (vrConta.reservaEmergencia || 50)) {
      alerts.push({
        id: 'alert-vr-low',
        tipo: 'danger',
        titulo: '🍽️ Saldo Crítico no VR',
        mensagem: `Resta apenas R$ ${vrConta.saldo.toFixed(2).replace('.', ',')} até a recarga no dia ${diaRecarga} (${diasRestantes} dias restantes). Média de R$ ${orcamentoDiario.toFixed(2).replace('.', ',')}/dia.`,
        timestamp,
        meioRelacionado: 'vr'
      });
    } else {
      alerts.push({
        id: 'alert-vr-pace',
        tipo: 'info',
        titulo: '💡 Ritmo do VR Alimentação',
        mensagem: `Saldo: R$ ${vrConta.saldo.toFixed(2).replace('.', ',')}. Ritmo recomendado: R$ ${orcamentoDiario.toFixed(2).replace('.', ',')} por dia até dia ${diaRecarga}.`,
        timestamp,
        meioRelacionado: 'vr'
      });
    }
  }

  // 3. Emergency Reserve Check
  const contaCorrente = data.contas.find(c => c.tipo === 'corrente');
  if (contaCorrente && contaCorrente.reservaEmergencia) {
    if (contaCorrente.saldo < contaCorrente.reservaEmergencia) {
      alerts.push({
        id: 'alert-reserva-breach',
        tipo: 'warning',
        titulo: '🛡️ Abaixo da Reserva de Emergência',
        mensagem: `Saldo atual na conta (R$ ${contaCorrente.saldo.toFixed(2).replace('.', ',')}) está abaixo da reserva mínima recomendada de R$ ${contaCorrente.reservaEmergencia.toFixed(2).replace('.', ',')}.`,
        timestamp,
        meioRelacionado: contaCorrente.meio
      });
    }
  }

  return alerts;
}
