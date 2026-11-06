import { useState } from 'react';
import { type Snapshot, type Command, type TaxRecord } from './api';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface TaxRecordsProps {
  data: Snapshot;
  onSave: (command: Command, id: string) => Promise<void>;
}

export function TaxRecords({ data, onSave }: TaxRecordsProps) {
  const records = data.taxRecords || [];
  const [busy, setBusy] = useState(false);

  const toggleConfirm = async (rec: TaxRecord) => {
    try {
      setBusy(true);
      await onSave({
        action: 'updateTaxRecord',
        targetId: rec.id,
        confirmed: !rec.confirmed
      }, crypto.randomUUID());
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-label="Controle de Imposto de Renda">
      <div className="panel-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} style={{ color: '#0284c7' }} />
          <h2>Registros e Deduções do Imposto de Renda</h2>
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
        Lançamentos marcados com rastreamento de IR (médicos, odontológicos, previdência, educação e informes bancários).
      </p>

      {records.length === 0 ? (
        <p className="empty">
          Nenhum registro de IR arquivado. Ao cadastrar consultas ou despesas dedutíveis (como o plano odontológico), marque a caixa "Acompanhar no Imposto de Renda".
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Documento / CNPJ</th>
                <th>Categoria</th>
                <th>Status da Comprovação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small>{r.note || 'Sem anotações'}</small>
                  </td>
                  <td>{r.document || 'Pendente'}</td>
                  <td>{r.category}</td>
                  <td>
                    <span className={'status ' + (r.confirmed ? 'paid' : 'pending')}>
                      {r.confirmed ? 'Comprovado' : 'Aguardando doc'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => toggleConfirm(r)}
                    >
                      {r.confirmed ? 'Desmarcar' : 'Confirmar Comprovante'}
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
