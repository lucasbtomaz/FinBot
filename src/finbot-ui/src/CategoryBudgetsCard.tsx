import { useState, useEffect, useMemo } from 'react';
import { money, parseMoney, type Snapshot } from './api';
import { Target, AlertTriangle, CheckCircle2, SlidersHorizontal, Plus, Trash2, X, TrendingUp } from 'lucide-react';

interface CategoryBudgetsCardProps {
  data: Snapshot;
  month: string;
}

interface BudgetLimit {
  category: string;
  limitCents: number;
}

const DEFAULT_BUDGETS: Record<string, number> = {
  'Transporte / Moto': 100000, // R$ 1.000
  'Eletrônicos / Igor': 80000,  // R$ 800
  'Empréstimo Pan': 120000,    // R$ 1.200
  'Empréstimo Família': 60000, // R$ 600
  'Empréstimo': 40000,         // R$ 400
  'Compras / Shopee': 20000,   // R$ 200
  'Acordo / Dívida': 10000,    // R$ 100
  'Saúde / Odonto': 5000,      // R$ 50
  'Outras Despesas': 50000     // R$ 500
};

export function CategoryBudgetsCard({ data, month }: CategoryBudgetsCardProps) {
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('finbot_category_budgets');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_BUDGETS;
  });

  const [showConfig, setShowConfig] = useState(false);
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('');

  // Persist budgets whenever changed
  const saveBudgets = (newBudgets: Record<string, number>) => {
    setBudgets(newBudgets);
    try {
      localStorage.setItem('finbot_category_budgets', JSON.stringify(newBudgets));
    } catch (e) {
      console.warn('Failed to save budgets to localStorage', e);
    }
  };

  // Calculate actual spending in current month per category
  const actualSpendingByCategory = useMemo(() => {
    const map = new Map<string, number>();
    const monthItems = (data.items || []).filter(
      i => !i.cancelled && i.kind === 'pagar' && (i.dueDate ? i.dueDate.startsWith(month) : true)
    );

    for (const item of monthItems) {
      const cat = item.category || 'Outras Despesas';
      const cur = map.get(cat) || 0;
      map.set(cat, cur + item.amountCents);
    }
    return map;
  }, [data.items, month]);

  // Combine categories from budgets and active items
  const budgetList = useMemo(() => {
    const allCategories = Array.from(
      new Set([...Object.keys(budgets), ...Array.from(actualSpendingByCategory.keys())])
    );

    return allCategories.map(cat => {
      const spentCents = actualSpendingByCategory.get(cat) || 0;
      const limitCents = budgets[cat] || (spentCents > 0 ? Math.ceil((spentCents * 1.1) / 100) * 100 : 50000);
      const percent = limitCents > 0 ? (spentCents / limitCents) * 100 : 0;
      const remainingCents = limitCents - spentCents;
      const isOver = spentCents > limitCents;
      const isWarning = percent >= 80 && !isOver;

      return {
        category: cat,
        spentCents,
        limitCents,
        percent,
        remainingCents,
        isOver,
        isWarning
      };
    }).sort((a, b) => b.spentCents - a.spentCents);
  }, [budgets, actualSpendingByCategory]);

  const totalBudgeted = budgetList.reduce((sum, b) => sum + b.limitCents, 0);
  const totalSpent = budgetList.reduce((sum, b) => sum + b.spentCents, 0);
  const totalPercent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const overCount = budgetList.filter(b => b.isOver).length;

  const openConfig = () => {
    const initialStrings: Record<string, string> = {};
    budgetList.forEach(b => {
      initialStrings[b.category] = (b.limitCents / 100).toFixed(2).replace('.', ',');
    });
    setEditingBudgets(initialStrings);
    setShowConfig(true);
  };

  const handleSaveConfig = () => {
    const updated: Record<string, number> = {};
    for (const [cat, strVal] of Object.entries(editingBudgets)) {
      try {
        updated[cat] = parseMoney(strVal);
      } catch {
        updated[cat] = budgets[cat] || 50000;
      }
    }
    saveBudgets(updated);
    setShowConfig(false);
  };

  const handleAddCategoryLimit = () => {
    if (!newCategoryName.trim() || !newCategoryLimit.trim()) return;
    try {
      const cents = parseMoney(newCategoryLimit);
      setEditingBudgets(prev => ({
        ...prev,
        [newCategoryName.trim()]: (cents / 100).toFixed(2).replace('.', ',')
      }));
      setNewCategoryName('');
      setNewCategoryLimit('');
    } catch {
      // ignore
    }
  };

  const handleRemoveCategoryLimit = (cat: string) => {
    setEditingBudgets(prev => {
      const copy = { ...prev };
      delete copy[cat];
      return copy;
    });
  };

  return (
    <section 
      className="panel" 
      aria-label="Tetos de Gastos por Categoria"
      style={{
        border: '1px solid var(--border-strong)',
        borderRadius: '14px',
        padding: '20px 22px',
        marginBottom: '20px',
        background: 'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-card-inner) 100%)',
        position: 'relative'
      }}
    >
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
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
          }}>
            <Target size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>
                Tetos de Gastos por Categoria
              </h2>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                Estilo Organizze
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Controle por envelopes e termômetros visuais com alertas em 80% e 100%
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {overCount > 0 ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}>
              <AlertTriangle size={12} />
              {overCount} {overCount === 1 ? 'teto estourado' : 'tetos estourados'}
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              <CheckCircle2 size={12} />
              Dentro do planejado
            </span>
          )}

          <button
            onClick={openConfig}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '5px 11px',
              borderRadius: '7px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--btn-secondary-bg)',
              color: 'var(--btn-secondary-color)',
              cursor: 'pointer'
            }}
          >
            <SlidersHorizontal size={13} />
            <span>Ajustar Tetos</span>
          </button>
        </div>
      </div>

      {/* Global Thermometer Bar */}
      <div style={{
        padding: '12px 14px',
        backgroundColor: 'var(--bg-subtle)',
        borderRadius: '9px',
        border: '1px solid var(--border-subtle)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
            Consumo Total do Orçamento Mensal
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
            <span style={{ color: totalPercent >= 100 ? '#f87171' : totalPercent >= 80 ? '#fbbf24' : '#34d399' }}>
              {money(totalSpent)}
            </span>
            {' / '}
            <span style={{ color: 'var(--text-secondary)' }}>{money(totalBudgeted)}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
              ({totalPercent.toFixed(1)}%)
            </span>
          </span>
        </div>

        {/* Bar */}
        <div style={{
          height: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '999px',
          overflow: 'hidden',
          display: 'flex'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, totalPercent)}%`,
            backgroundColor: totalPercent >= 100 ? '#ef4444' : totalPercent >= 80 ? '#f59e0b' : '#10b981',
            borderRadius: '999px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Categories Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px'
      }}>
        {budgetList.slice(0, 8).map(b => {
          const barColor = b.isOver ? '#ef4444' : b.isWarning ? '#f59e0b' : '#10b981';
          return (
            <div
              key={b.category}
              style={{
                padding: '12px 14px',
                borderRadius: '9px',
                backgroundColor: 'var(--bg-subtle)',
                border: `1px solid ${b.isOver ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-heading)' }}>
                  {b.category}
                </strong>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: b.isOver ? 'rgba(239, 68, 68, 0.15)' : b.isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: barColor
                }}>
                  {b.isOver ? `+${money(Math.abs(b.remainingCents))} acima` : `${b.percent.toFixed(0)}%`}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, b.percent)}%`,
                  backgroundColor: barColor,
                  borderRadius: '999px',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Gasto: <strong>{money(b.spentCents)}</strong></span>
                <span>Teto: <strong>{money(b.limitCents)}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adjust Budgets Modal */}
      {showConfig && (
        <dialog open style={{ display: 'block', maxWidth: '520px', width: '92vw' }}>
          <header>
            <h2>Configurar Tetos de Gastos por Categoria</h2>
            <button className="ghost" onClick={() => setShowConfig(false)}>×</button>
          </header>
          <div style={{ padding: '4px 0' }}>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Defina o valor máximo que você planeja gastar por mês em cada categoria. Avisaremos automaticamente se atingir 80% ou estourar o teto.
            </p>

            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {Object.entries(editingBudgets).map(([cat, val]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)' }}>
                    {cat}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>R$</span>
                    <input
                      type="text"
                      value={val}
                      onChange={e => setEditingBudgets(prev => ({ ...prev, [cat]: e.target.value }))}
                      style={{ width: '100px', padding: '4px 8px', fontSize: '12.5px', textAlign: 'right' }}
                    />
                    <button
                      type="button"
                      className="ghost danger"
                      title="Remover teto desta categoria"
                      onClick={() => handleRemoveCategoryLimit(cat)}
                      style={{ padding: '4px 6px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new category limit */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <input
                type="text"
                placeholder="Nova Categoria..."
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                style={{ flex: 1, fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="Teto (R$)"
                value={newCategoryLimit}
                onChange={e => setNewCategoryLimit(e.target.value)}
                style={{ width: '90px', fontSize: '12px' }}
              />
              <button
                type="button"
                onClick={handleAddCategoryLimit}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '12px' }}
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          <div className="actions" style={{ marginTop: '18px' }}>
            <button type="button" className="secondary" onClick={() => setShowConfig(false)}>Cancelar</button>
            <button type="button" onClick={handleSaveConfig}>Salvar Tetos</button>
          </div>
        </dialog>
      )}
    </section>
  );
}
