import { useState } from 'react';
import { money, parseMoney, today, type Snapshot, type Command, type Item } from './api';
import { analyzeCardsBestDay } from './BestCardWidget';
import { 
  ShoppingBag, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  CreditCard, 
  Wallet, 
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';

interface PurchaseSimulatorModalProps {
  data: Snapshot;
  month: string;
  onSave?: (command: Command, id: string) => Promise<void>;
  onClose: () => void;
}

export function PurchaseSimulatorModal({ data, month, onSave, onClose }: PurchaseSimulatorModalProps) {
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paymentType, setPaymentType] = useState<'a_vista' | 'parcelado'>('a_vista');
  const [installments, setInstallments] = useState('3');
  const [selectedCardId, setSelectedCardId] = useState(data.cards[0]?.id || '');
  const [category, setCategory] = useState('Compras');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const cardAnalyses = analyzeCardsBestDay(data.cards);
  const bestCard = cardAnalyses.find(c => c.isBestToday) || cardAnalyses[0];

  // Current financial posture
  const availableCents = data.availableCents;
  const toPayCents = data.toPayCents;
  const currentNetMargin = availableCents - toPayCents; // Current cushion

  // Parse simulated purchase amount
  let purchaseCents = 0;
  let parseError = false;
  try {
    if (amountStr.trim()) {
      purchaseCents = parseMoney(amountStr);
    }
  } catch {
    parseError = true;
  }

  const numInstallments = paymentType === 'parcelado' ? Math.max(1, parseInt(installments, 10) || 1) : 1;
  const installmentCents = purchaseCents > 0 ? Math.round(purchaseCents / numInstallments) : 0;

  // Impact calculations
  let projectedCashAfter = availableCents;
  let projectedMarginAfter = currentNetMargin;
  let verdict: 'safe' | 'warning' | 'danger' = 'safe';
  let verdictTitle = '';
  let verdictMessage = '';

  if (purchaseCents > 0) {
    if (paymentType === 'a_vista') {
      projectedCashAfter = availableCents - purchaseCents;
      projectedMarginAfter = currentNetMargin - purchaseCents;

      if (projectedMarginAfter >= 30000) {
        verdict = 'safe';
        verdictTitle = '🟢 Compra Segura · Caixa com Folga';
        verdictMessage = `Você tem saldo de sobra. Após pagar todas as contas pendentes do mês (${money(toPayCents)}) e esta compra de ${money(purchaseCents)}, ainda sobrarão ${money(projectedMarginAfter)} de reserva.`;
      } else if (projectedMarginAfter >= 0) {
        verdict = 'warning';
        verdictTitle = '🟡 Atenção · Margem de Caixa Apertada';
        verdictMessage = `Você consegue pagar à vista, mas seu caixa ficará no limite. Restarão apenas ${money(projectedMarginAfter)} livres para emergências até o fim do mês.`;
      } else {
        verdict = 'danger';
        verdictTitle = '🔴 Não Recomendado · Gera Déficit Financeiro';
        verdictMessage = `Esta compra deixará suas contas no vermelho em ${money(Math.abs(projectedMarginAfter))}. Você precisará recorrer a limites bancários ou atrasar boletos para cobrir o mês.`;
      }
    } else {
      // Parcelado
      projectedMarginAfter = currentNetMargin - installmentCents;

      if (currentNetMargin < 0) {
        verdict = 'danger';
        verdictTitle = '🔴 Risco Alto · Seu Mês Já Está Deficitário';
        verdictMessage = `Você já possui um déficit projetado de ${money(Math.abs(currentNetMargin))} neste mês. Assumir mais ${numInstallments} parcelas de ${money(installmentCents)} aumentará seu endividamento futuro.`;
      } else if (installmentCents > currentNetMargin) {
        verdict = 'danger';
        verdictTitle = '🔴 Parcela Excede a Margem Disponível';
        verdictMessage = `A primeira parcela de ${money(installmentCents)} é maior do que a sobra livre do seu mês (${money(currentNetMargin)}).`;
      } else if (projectedMarginAfter < 20000) {
        verdict = 'warning';
        verdictTitle = '🟡 Alerta · Comprometimento Futuro';
        verdictMessage = `A parcela de ${money(installmentCents)} cabe no orçamento deste mês, mas comprometerá sua renda pelos próximos ${numInstallments} meses.`;
      } else {
        verdict = 'safe';
        verdictTitle = '🟢 Parcelamento Viável';
        verdictMessage = `A parcela de ${money(installmentCents)}/mês cabe confortavelmente na sua margem líquida atual (${money(currentNetMargin)}).`;
      }
    }
  }

  // Handle immediate registration of the simulated item
  const handleConfirmAndAdd = async () => {
    if (!onSave || purchaseCents <= 0) return;
    setBusy(true);
    try {
      if (paymentType === 'a_vista') {
        await onSave({
          action: 'addItem',
          name: description.trim() || 'Nova Compra Simulada',
          amountCents: purchaseCents,
          kind: 'pagar',
          date: today(),
          category,
          paymentMethod: 'pix',
          note: 'Lançado a partir do Simulador de Compras (Pierre)'
        }, crypto.randomUUID());
      } else {
        await onSave({
          action: 'addPurchase',
          name: description.trim() || 'Nova Compra Parcelada',
          amountCents: purchaseCents,
          count: numInstallments,
          cardId: selectedCardId || (data.cards[0]?.id || ''),
          date: month + '-01',
          paidCount: 0,
          category
        }, crypto.randomUUID());
      }
      setSuccessMsg('✅ Compra lançada e integrada ao seu orçamento com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      alert('Erro ao lançar: ' + (e?.message || 'Tente novamente'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog open style={{ display: 'block', maxWidth: '600px', width: '92vw' }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            color: '#fff'
          }}>
            <ShoppingBag size={15} />
          </div>
          <h2>Simulador: "Posso Comprar?" (Pierre IA)</h2>
        </div>
        <button className="ghost" onClick={onClose}>×</button>
      </header>

      <div style={{ padding: '8px 0' }}>
        {successMsg ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '10px',
            color: '#34d399',
            fontWeight: 600
          }}>
            {successMsg}
          </div>
        ) : (
          <>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Descubra se uma compra cabe no seu orçamento antes de passar o cartão ou fazer o Pix.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <label>
                O que você quer comprar?
                <input
                  type="text"
                  placeholder="Ex: Monitor novo, Tênis, Peça moto..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </label>

              <label>
                Valor Total (R$)
                <input
                  type="text"
                  placeholder="0,00"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  autoFocus
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <label>
                Forma de Pagamento
                <select 
                  value={paymentType} 
                  onChange={e => setPaymentType(e.target.value as any)}
                >
                  <option value="a_vista">À vista (Pix / Débito)</option>
                  <option value="parcelado">Cartão de Crédito Parcelado</option>
                </select>
              </label>

              {paymentType === 'parcelado' ? (
                <label>
                  Número de Parcelas
                  <select value={installments} onChange={e => setInstallments(e.target.value)}>
                    {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>
                        {n}x de {purchaseCents > 0 ? money(Math.round(purchaseCents / n)) : 'R$ 0,00'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  Categoria
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  />
                </label>
              )}
            </div>

            {/* Smart Verdict Box */}
            {purchaseCents > 0 && (
              <div style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: verdict === 'safe' 
                  ? 'rgba(16, 185, 129, 0.08)' 
                  : verdict === 'warning' 
                  ? 'rgba(245, 158, 11, 0.08)' 
                  : 'rgba(239, 68, 68, 0.08)',
                border: `1.5px solid ${verdict === 'safe' ? '#10b981' : verdict === 'warning' ? '#f59e0b' : '#ef4444'}`,
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Sparkles size={16} style={{ color: verdict === 'safe' ? '#34d399' : verdict === 'warning' ? '#fbbf24' : '#f87171' }} />
                  <strong style={{ fontSize: '14px', color: 'var(--text-heading)' }}>
                    {verdictTitle}
                  </strong>
                </div>

                <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {verdictMessage}
                </p>

                {/* Metrics Breakdown */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '11.5px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Saldo em Caixa Hoje</span>
                    <strong style={{ fontFamily: 'monospace' }}>{money(availableCents)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Contas a Pagar</span>
                    <strong style={{ fontFamily: 'monospace', color: '#f43f5e' }}>{money(toPayCents)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Sobra Prevista Pós-Compra</span>
                    <strong style={{ fontFamily: 'monospace', color: projectedMarginAfter >= 0 ? '#34d399' : '#f87171' }}>
                      {money(projectedMarginAfter)}
                    </strong>
                  </div>
                </div>

                {/* Card recommendation hint if buying with card */}
                {bestCard && paymentType === 'parcelado' && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <CreditCard size={13} />
                    <span>
                      Dica: Use o <strong>{bestCard.card.name}</strong> para ganhar {bestCard.daysGracePeriod} dias de prazo até a 1ª parcela!
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="secondary" onClick={onClose} disabled={busy}>
          Fechar
        </button>
        {onSave && purchaseCents > 0 && !successMsg && (
          <button 
            type="button" 
            onClick={handleConfirmAndAdd}
            disabled={busy}
            style={{
              backgroundColor: verdict === 'danger' ? '#dc2626' : undefined,
              borderColor: verdict === 'danger' ? '#b91c1c' : undefined
            }}
          >
            {busy ? 'Lançando…' : 'Efetivar e Adicionar ao Painel'}
          </button>
        )}
      </div>
    </dialog>
  );
}
