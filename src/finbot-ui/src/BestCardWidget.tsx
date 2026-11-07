import { useState } from 'react';
import { money, today, type Card, type Snapshot } from './api';
import { CreditCard, Calendar, CheckCircle2, Sparkles, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface BestCardWidgetProps {
  data: Snapshot;
  month?: string;
  onSelectCard?: (card: Card) => void;
}

export interface CardAnalysis {
  card: Card;
  dueDay: number;
  closingDay: number;
  daysUntilClosing: number;
  daysGracePeriod: number;
  nextDueDateStr: string;
  isBestToday: boolean;
  explanation: string;
}

export function analyzeCardsBestDay(cards: Card[]): CardAnalysis[] {
  // If no cards are registered, provide sample standard cards for simulation
  const targetCards = cards.length > 0 ? cards : [
    { id: 'sample-inter', name: 'Banco Inter Mastercard', dueDay: 10, closingDay: 3, limitCents: 0 },
    { id: 'sample-nubank', name: 'Nubank Roxinho', dueDay: 25, closingDay: 18, limitCents: 0 }
  ];

  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const results: CardAnalysis[] = targetCards.map(c => {
    // Standard Brazilian bank closing is typically 7 days before due date
    let closingDay = c.dueDay - 7;
    if (closingDay <= 0) {
      closingDay = 30 + closingDay; // wrap around for days 1-7
    }

    // Determine when the purchase made today will be paid
    // If today is on or after closing day, the purchase goes to NEXT month's bill!
    let nextDueMonth = currentMonth;
    let nextDueYear = currentYear;

    if (currentDay >= closingDay) {
      // Goes to next month's invoice
      nextDueMonth += 1;
      if (nextDueMonth > 11) {
        nextDueMonth = 0;
        nextDueYear += 1;
      }
    }

    // Next due date object
    const nextDueDate = new Date(nextDueYear, nextDueMonth, c.dueDay);
    const timeDiff = nextDueDate.getTime() - now.getTime();
    const daysGracePeriod = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

    // Days until closing
    let daysUntilClosing = closingDay - currentDay;
    if (daysUntilClosing < 0) {
      daysUntilClosing += 30;
    }

    const nextDueDateStr = nextDueDate.toLocaleDateString('pt-BR');

    let explanation = '';
    if (currentDay === closingDay || currentDay === closingDay + 1) {
      explanation = `Melhor momento! Fatura acabou de fechar. Você ganha até ${daysGracePeriod} dias para pagar.`;
    } else if (daysUntilClosing <= 3) {
      explanation = `Fatura fecha em ${daysUntilClosing} dias. Aguardar até o dia ${closingDay} estenderá seu prazo em +30 dias!`;
    } else {
      explanation = `Fatura fecha dia ${closingDay}. Comprando hoje, você paga em ${nextDueDateStr} (${daysGracePeriod} dias de prazo).`;
    }

    return {
      card: c,
      dueDay: c.dueDay,
      closingDay,
      daysUntilClosing,
      daysGracePeriod,
      nextDueDateStr,
      isBestToday: false,
      explanation
    };
  });

  // Pick the card that gives the maximum grace period
  const bestCard = [...results].sort((a, b) => b.daysGracePeriod - a.daysGracePeriod)[0];
  if (bestCard) {
    bestCard.isBestToday = true;
  }

  return results.sort((a, b) => b.daysGracePeriod - a.daysGracePeriod);
}

export function BestCardWidget({ data }: BestCardWidgetProps) {
  const analyses = analyzeCardsBestDay(data.cards);
  const best = analyses.find(a => a.isBestToday) || analyses[0];
  const [selectedCardId, setSelectedCardId] = useState<string>(best?.card.id || '');

  const activeCard = analyses.find(a => a.card.id === selectedCardId) || best;

  return (
    <section 
      className="panel" 
      aria-label="Calculadora do Melhor Dia de Compra"
      style={{
        border: '1px solid var(--border-strong)',
        borderRadius: '14px',
        padding: '20px 22px',
        marginBottom: '20px',
        background: 'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-card-inner) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Ambient background accent */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '160px',
        height: '160px',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
          }}>
            <CreditCard size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>
                Melhor Dia de Compra do Cartão
              </h2>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}>
                Inteligência Mobills
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Compre hoje no cartão ideal para empurrar o pagamento em até 40 dias
            </p>
          </div>
        </div>

        {/* Selected best card highlight badge */}
        {best && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 11px',
            borderRadius: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            fontSize: '11.5px',
            fontWeight: 600
          }}>
            <Sparkles size={13} />
            <span>Recomendado Hoje: <strong>{best.card.name}</strong> ({best.daysGracePeriod} dias)</span>
          </div>
        )}
      </div>

      {/* Cards Comparison Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {analyses.map(item => {
          const isSelected = item.card.id === selectedCardId;
          return (
            <div
              key={item.card.id}
              onClick={() => setSelectedCardId(item.card.id)}
              style={{
                cursor: 'pointer',
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-subtle)',
                border: `1.5px solid ${item.isBestToday ? '#38bdf8' : isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {item.isBestToday && (
                <div style={{
                  position: 'absolute',
                  top: '-9px',
                  right: '12px',
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  color: '#fff',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                }}>
                  ★ Melhor Escolha
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {item.card.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Vence dia {item.dueDay} · Fecha dia {item.closingDay}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '18px',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: item.isBestToday ? '#38bdf8' : 'var(--text-primary)'
                  }}>
                    {item.daysGracePeriod}
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>dias de prazo</span>
                </div>
              </div>

              {/* Progress bar of grace period */}
              <div style={{
                height: '5px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (item.daysGracePeriod / 40) * 100)}%`,
                  backgroundColor: item.isBestToday ? '#38bdf8' : '#64748b',
                  borderRadius: '999px'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Paga só em: <strong>{item.nextDueDateStr}</strong></span>
                <span>Fecha em: <strong>{item.daysUntilClosing} dias</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Diagnostic & Practical Advice */}
      {activeCard && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <ShieldCheck size={20} style={{ color: activeCard.isBestToday ? '#38bdf8' : '#94a3b8', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '12.5px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
              Diagnóstico para {activeCard.card.name}:{' '}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {activeCard.explanation}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
