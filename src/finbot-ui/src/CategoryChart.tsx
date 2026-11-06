import { useMemo } from 'react';
import { money, type Item } from './api';

interface CategoryChartProps {
  items: Item[];
  month: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Transporte': '#38bdf8',
  'Transporte / Moto': '#0284c7',
  'Eletrônicos': '#818cf8',
  'Eletrônicos / Igor': '#6366f1',
  'Empréstimo': '#f43f5e',
  'Empréstimo Família': '#fb7185',
  'Empréstimo Pan': '#e11d48',
  'Empréstimo Nubank': '#be123c',
  'Acordo': '#f59e0b',
  'Acordo / Serasa': '#d97706',
  'Acordo Santander': '#b45309',
  'Acordo / Dívida': '#92400e',
  'Saúde / Odonto': '#10b981',
  'Compras / Shopee': '#ec4899',
  'Impostos / Tributos': '#64748b',
  'Outras Despesas': '#a855f7',
  'Outros': '#94a3b8'
};

export function CategoryChart({ items, month }: CategoryChartProps) {
  const categoryStats = useMemo(() => {
    const monthItems = items.filter(
      i => !i.cancelled && i.kind === 'pagar' && (i.dueDate ? i.dueDate.startsWith(month) : true)
    );

    const map = new Map<string, { totalCents: number; paidCents: number; count: number }>();

    for (const item of monthItems) {
      const cat = item.category || 'Outros';
      const existing = map.get(cat) || { totalCents: 0, paidCents: 0, count: 0 };
      existing.totalCents += item.amountCents;
      existing.paidCents += item.paidCents;
      existing.count += 1;
      map.set(cat, existing);
    }

    const totalMonth = monthItems.reduce((acc, i) => acc + i.amountCents, 0);

    return Array.from(map.entries())
      .map(([category, stats]) => ({
        category,
        totalCents: stats.totalCents,
        paidCents: stats.paidCents,
        count: stats.count,
        percent: totalMonth > 0 ? (stats.totalCents / totalMonth) * 100 : 0,
        color: CATEGORY_COLORS[category] || '#6366f1'
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }, [items, month]);

  const totalSpent = categoryStats.reduce((sum, c) => sum + c.totalCents, 0);

  return (
    <section className="panel" aria-label="Gastos por Categoria">
      <div className="panel-title">
        <h2>Despesas por Categoria</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Total: {money(totalSpent)}
        </span>
      </div>

      {categoryStats.length === 0 ? (
        <p className="empty">Nenhuma despesa registrada para {month}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
          {categoryStats.map(stat => (
            <div key={stat.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {stat.category}
                  <small style={{ marginLeft: '6px', color: 'var(--text-muted)' }}>
                    ({stat.count} {stat.count === 1 ? 'item' : 'itens'})
                  </small>
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {money(stat.totalCents)}{' '}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({stat.percent.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div style={{
                height: '7px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-surface-hover)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${stat.percent}%`,
                  backgroundColor: stat.color,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
