import { useState, type FormEvent } from 'react';
import { money, dateLabel, parseMoney, type Snapshot, type Item, type Command } from './api';
import { Layers, Plus, Calendar, CreditCard } from 'lucide-react';

interface InstallmentsProps {
  data: Snapshot;
  open: (action: string, title: string, extra?: any) => void;
  ask: (text: string, command: Command) => void;
  onEdit: (item: Item) => void;
  onNew: () => void;
}

export function Installments({ data, open, ask, onEdit, onNew }: InstallmentsProps) {
  // Purchases (cartão de crédito) and multi-installment items
  const installmentItems = data.items.filter(
    i => !i.cancelled && (i.cardId || (i.count && i.count > 1))
  );

  return (
    <section className="panel" aria-label="Contratos e Parcelamentos">
      <div className="panel-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#6366f1' }} />
          <h2>Parcelamentos e Contratos Ativos</h2>
        </div>
        <button onClick={onNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={14} /> Novo Parcelamento
        </button>
      </div>

      {installmentItems.length === 0 ? (
        <p className="empty">Nenhum parcelamento ativo cadastrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contrato / Compra</th>
                <th>Parcela Atual</th>
                <th>Vencimento</th>
                <th>Valor Parcela</th>
                <th>Saldo Restante</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {installmentItems.map(item => {
                const isPaid = item.remainingCents === 0;
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>
                        {item.cardId ? 'Cartão de crédito' : 'Boleto / Carnê'} · {item.category}
                      </small>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {item.number} / {item.count}
                      </span>
                    </td>
                    <td>{item.dueDate ? dateLabel(item.dueDate) : 'Sem data'}</td>
                    <td>{money(item.amountCents)}</td>
                    <td>{money(item.remainingCents)}</td>
                    <td>
                      <span className={'status ' + (isPaid ? 'paid' : 'pending')}>
                        {isPaid ? 'Quitado' : 'Em andamento'}
                      </span>
                    </td>
                    <td>
                      {!isPaid && !item.cardId && (
                        <button
                          className="text-button"
                          onClick={() => open('settleItem', 'Registrar pagamento · ' + item.name, { targetId: item.id, amountCents: item.remainingCents })}
                        >
                          Pagar
                        </button>
                      )}
                      <button className="text-button" onClick={() => onEdit(item)}>
                        Detalhes
                      </button>
                      <button
                        className="text-button danger"
                        onClick={() => ask(`Cancelar parcela "${item.name}"?`, { action: 'cancelItem', targetId: item.id })}
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface ItemDetailsProps {
  item: Item;
  onSave: (command: Command, id: string) => Promise<void>;
  onClose: () => void;
}

export function ItemDetails({ item, onSave, onClose }: ItemDetailsProps) {
  const [name, setName] = useState(item.name);
  const [dueDate, setDueDate] = useState(item.dueDate || '');
  const [category, setCategory] = useState(item.category || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      await onSave({
        action: 'updateItem',
        targetId: item.id,
        name,
        dueDate,
        category
      }, crypto.randomUUID());
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
        <h2>Detalhes do Lançamento</h2>
        <button className="ghost" onClick={onClose}>×</button>
      </header>
      <form onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}
        <label>
          Descrição
          <input required value={name} onChange={e => setName(e.target.value)} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label>
            Valor Total
            <input disabled value={money(item.amountCents)} />
          </label>
          <label>
            Falta Pagar
            <input disabled value={money(item.remainingCents)} />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label>
            Data de Vencimento
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </label>
          <label>
            Categoria
            <input value={category} onChange={e => setCategory(e.target.value)} />
          </label>
        </div>
        <div className="actions" style={{ marginTop: '16px' }}>
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>Fechar</button>
          <button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar Alterações'}</button>
        </div>
      </form>
    </dialog>
  );
}
