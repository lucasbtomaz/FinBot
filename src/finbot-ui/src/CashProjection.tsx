import { money, type Snapshot } from './api';
import { ArrowDownLeft, ArrowUpRight, Wallet, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface CashProjectionProps {
  data: Snapshot;
  month: string;
}

export function CashProjection({ data, month }: CashProjectionProps) {
  const available = data.availableCents;
  const toReceive = data.toReceiveCents;
  const toPay = data.toPayCents;
  const projectedBalance = available + toReceive - toPay;
  const isDeficit = projectedBalance < 0;

  return (
    <section className="panel" aria-label="Projeção de Fluxo de Caixa" style={{ marginBottom: '20px' }}>
      <div className="panel-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wallet size={18} style={{ color: '#6366f1' }} />
          <h2>Projeção de Caixa · Fechamento do Mês ({month})</h2>
        </div>
        <span className={isDeficit ? 'status late' : 'status paid'}>
          {isDeficit ? 'Déficit Previsto' : 'Saldo Positivo'}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginTop: '12px'
      }}>
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Wallet size={14} /> Saldo Disponível Hoje
          </div>
          <strong style={{ display: 'block', fontSize: '18px', marginTop: '4px', fontFamily: 'monospace' }}>
            {money(available)}
          </strong>
          <small style={{ color: 'var(--text-muted)' }}>Contas bancárias</small>
        </div>

        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981' }}>
            <ArrowDownLeft size={14} /> (+) A Receber no Mês
          </div>
          <strong style={{ display: 'block', fontSize: '18px', marginTop: '4px', fontFamily: 'monospace', color: '#10b981' }}>
            {money(toReceive)}
          </strong>
          <small style={{ color: 'var(--text-muted)' }}>Entradas confirmadas</small>
        </div>

        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f43f5e' }}>
            <ArrowUpRight size={14} /> (-) Falta Pagar
          </div>
          <strong style={{ display: 'block', fontSize: '18px', marginTop: '4px', fontFamily: 'monospace', color: '#f43f5e' }}>
            {money(toPay)}
          </strong>
          <small style={{ color: 'var(--text-muted)' }}>Boletos e faturas</small>
        </div>

        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: isDeficit ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${isDeficit ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isDeficit ? '#f87171' : '#34d399', fontWeight: 600 }}>
            {isDeficit ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />} Saldo Projetado Final
          </div>
          <strong style={{
            display: 'block',
            fontSize: '19px',
            marginTop: '4px',
            fontFamily: 'monospace',
            color: isDeficit ? '#f87171' : '#34d399'
          }}>
            {money(projectedBalance)}
          </strong>
          <small style={{ color: 'var(--text-muted)' }}>
            {isDeficit ? 'Atenção aos vencimentos' : 'Caixa sob controle'}
          </small>
        </div>
      </div>
    </section>
  );
}
