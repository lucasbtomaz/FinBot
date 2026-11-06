import { useState, type FormEvent } from 'react';
import { money, dateLabel, parseMoney, today, type Item, type Command } from './api';
import { ArrowDownLeft, Plus, CheckCircle, Clock } from 'lucide-react';

interface ReceivableSummaryProps {
  items: Item[];
  month?: string;
}

export function ReceivableSummary({ items, month }: ReceivableSummaryProps) {
  const filtered = items.filter(
    i => !i.cancelled && i.kind === 'receber' && (month ? (i.dueDate ? i.dueDate.startsWith(month) : true) : true)
  );

  const total = filtered.reduce((acc, i) => acc + i.amountCents, 0);
  const received = filtered.reduce((acc, i) => acc + i.paidCents, 0);
  const remaining = filtered.reduce((acc, i) => acc + i.remainingCents, 0);

  if (filtered.length === 0) return null;

  return (
    <section className="panel" aria-label="Resumo de Recebíveis" style={{ marginBottom: '20px' }}>
      <div className="panel-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowDownLeft size={18} style={{ color: '#10b981' }} />
          <h2>Contas a Receber {month ? `· ${month}` : '· Todos os Períodos'}</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
          <small style={{ color: 'var(--text-muted)' }}>Total Previsto</small>
          <strong style={{ display: 'block', fontSize: '16px', fontFamily: 'monospace' }}>{money(total)}</strong>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
          <small style={{ color: 'var(--text-muted)' }}>Já Recebido</small>
          <strong style={{ display: 'block', fontSize: '16px', fontFamily: 'monospace', color: '#10b981' }}>{money(received)}</strong>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
          <small style={{ color: 'var(--text-muted)' }}>Falta Entrar</small>
          <strong style={{ display: 'block', fontSize: '16px', fontFamily: 'monospace', color: '#f59e0b' }}>{money(remaining)}</strong>
        </div>
      </div>
    </section>
  );
}

interface ReceivablesProps {
  items: Item[];
  open: (action: string, title: string, extra?: any) => void;
  ask: (text: string, command: Command) => void;
  onEdit: (item: Item) => void;
  onNew: () => void;
}

export function Receivables({ items, open, ask, onEdit, onNew }: ReceivablesProps) {
  const receivables = items.filter(i => !i.cancelled && i.kind === 'receber');

  return (
    <section className="panel" aria-label="Lista de Contas a Receber">
      <div className="panel-title">
        <h2>Contas a Receber</h2>
        <button onClick={onNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={14} /> Nova Receita Prevista
        </button>
      </div>

      {receivables.length === 0 ? (
        <p className="empty">Nenhum recebível cadastrado. Clique no botão acima para adicionar.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição / Fonte</th>
                <th>Previsão</th>
                <th>Valor Total</th>
                <th>Falta Entrar</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {receivables.map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small>{r.payer || 'Cliente'} · {r.category}</small>
                  </td>
                  <td>{r.dueDate ? dateLabel(r.dueDate) : 'Sem data'}</td>
                  <td>{money(r.amountCents)}</td>
                  <td>{money(r.remainingCents)}</td>
                  <td>
                    <span className={'status ' + (r.remainingCents === 0 ? 'paid' : 'pending')}>
                      {r.remainingCents === 0 ? 'Recebido' : 'Aguardando'}
                    </span>
                  </td>
                  <td>
                    {r.remainingCents > 0 && (
                      <button
                        className="text-button"
                        onClick={() => open('settleItem', 'Registrar recebimento · ' + r.name, { targetId: r.id, amountCents: r.remainingCents })}
                      >
                        Dar baixa
                      </button>
                    )}
                    <button className="text-button" onClick={() => onEdit(r)}>
                      Editar
                    </button>
                    <button
                      className="text-button danger"
                      onClick={() => ask(`Excluir o recebível "${r.name}"?`, { action: 'cancelItem', targetId: r.id })}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface ReceivableFormProps {
  categoryOptions: string[];
  item?: Item;
  onSave: (command: Command, id: string) => Promise<void>;
  onClose: () => void;
}

export function ReceivableForm({ categoryOptions, item, onSave, onClose }: ReceivableFormProps) {
  const [name, setName] = useState(item?.name || '');
  const [payer, setPayer] = useState(item?.payer || '');
  const [amount, setAmount] = useState(item ? (item.amountCents / 100).toFixed(2).replace('.', ',') : '');
  const [dueDate, setDueDate] = useState(item?.dueDate || today());
  const [category, setCategory] = useState(item?.category || 'Receitas');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setBusy(true);
      const amountCents = parseMoney(amount);
      const cmd: Command = item ? {
        action: 'updateItem',
        targetId: item.id,
        name,
        payer,
        amountCents,
        dueDate,
        category,
        kind: 'receber'
      } : {
        action: 'addReceivable',
        name,
        payer,
        amountCents,
        date: dueDate,
        category,
        kind: 'receber',
        confidence: 'confirmado',
        cadence: 'unico',
        count: 1
      };

      await onSave(cmd, crypto.randomUUID());
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog open style={{ display: 'block' }}>
      <header>
        <h2>{item ? 'Editar Recebível' : 'Novo Contas a Receber'}</h2>
        <button className="ghost" onClick={onClose}>×</button>
      </header>
      <form onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}
        <label>
          Descrição / Origem
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Salário, Freela site, Reembolso" />
        </label>
        <label>
          Pagador / Fonte
          <input value={payer} onChange={e => setPayer(e.target.value)} placeholder="Ex: Empresa X, Cliente Y" />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label>
            Valor (R$)
            <input required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </label>
          <label>
            Data Prevista
            <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </label>
        </div>
        <label>
          Categoria
          <input list="rec-cats" value={category} onChange={e => setCategory(e.target.value)} />
          <datalist id="rec-cats">
            {categoryOptions.map(c => <option key={c} value={c} />)}
          </datalist>
        </label>
        <div className="actions" style={{ marginTop: '16px' }}>
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar Receita'}</button>
        </div>
      </form>
    </dialog>
  );
}
