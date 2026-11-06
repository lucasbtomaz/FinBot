import React, { useState } from 'react';
import { money, today, type Snapshot, type Item } from './api';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Zap,
  Target,
  FileDown,
  Printer,
  Check
} from 'lucide-react';
import { exportMonthlyFinancialPdf } from './exportPdf';

interface FinancialChartsProps {
  data: Snapshot;
  month: string;
  onMonthChange?: (m: string) => void;
  onPayItem?: (item: Item) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Transporte / Moto': '#38bdf8', // sky-400
  'Empréstimo Pan': '#6366f1', // indigo-500
  'Eletrônicos / Igor': '#a855f7', // purple-500
  'Empréstimo Família': '#ec4899', // pink-500
  'Empréstimo': '#f43f5e', // rose-500
  'Empréstimo Nubank': '#8b5cf6', // violet-500
  'Acordo / Dívida': '#eab308', // yellow-500
  'Acordo / Serasa': '#f59e0b', // amber-500
  'Acordo Santander': '#ef4444', // red-500
  'Impostos / Tributos': '#14b8a6', // teal-500
  'Saúde / Odonto': '#10b981', // emerald-500
  'Compras / Shopee': '#f97316', // orange-500
  'Outras Despesas': '#64748b' // slate-500
};

const DEFAULT_COLOR_PALETTE = [
  '#38bdf8', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', 
  '#f59e0b', '#10b981', '#14b8a6', '#f97316', '#8b5cf6', '#64748b'
];

export function FinancialCharts({ data, month, onMonthChange, onPayItem }: FinancialChartsProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'categories' | 'timeline' | 'comparison' | 'top'>('categories');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      exportMonthlyFinancialPdf(data, month);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Falha ao exportar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const mainAccount = data.accounts.find(a => a.kind === 'conta') || data.accounts[0];
  const saldoAtual = mainAccount ? mainAccount.balanceCents : data.availableCents;

  // Monthly active expenses
  const monthlyExpenses = data.items
    .filter(x => !x.cancelled && x.kind === 'pagar' && x.dueDate.startsWith(month))
    .sort((a, b) => {
      const dayA = parseInt(a.dueDate.slice(8, 10), 10) || 0;
      const dayB = parseInt(b.dueDate.slice(8, 10), 10) || 0;
      return dayA - dayB;
    });

  const totalDespesas = monthlyExpenses.reduce((sum, x) => sum + x.amountCents, 0);
  const totalPago = monthlyExpenses.reduce((sum, x) => sum + x.paidCents, 0);
  const totalFaltaPagar = monthlyExpenses.reduce((sum, x) => sum + x.remainingCents, 0);
  const percentPago = totalDespesas > 0 ? Math.round((totalPago / totalDespesas) * 100) : 0;

  // 1. Category Breakdown
  const categoryMap = new Map<string, { name: string; amountCents: number; paidCents: number; items: Item[] }>();
  for (const item of monthlyExpenses) {
    const cat = item.category.trim() || 'Outras Despesas';
    const existing = categoryMap.get(cat) || { name: cat, amountCents: 0, paidCents: 0, items: [] };
    existing.amountCents += item.amountCents;
    existing.paidCents += item.paidCents;
    existing.items.push(item);
    categoryMap.set(cat, existing);
  }

  const categoryList = Array.from(categoryMap.values())
    .sort((a, b) => b.amountCents - a.amountCents);

  // Pre-calculate colors and SVG donut slices
  let cumulativeAngle = 0;
  const donutSlices = categoryList.map((cat, idx) => {
    const percent = totalDespesas > 0 ? cat.amountCents / totalDespesas : 0;
    const sliceAngle = percent * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle += sliceAngle;
    const color = CATEGORY_COLORS[cat.name] || DEFAULT_COLOR_PALETTE[idx % DEFAULT_COLOR_PALETTE.length];

    // Coordinates for SVG arc (Radius 80, Center 100, 100, Inner radius 54)
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);

    const ix1 = 100 + 54 * Math.cos(endRad);
    const iy1 = 100 + 54 * Math.sin(endRad);
    const ix2 = 100 + 54 * Math.cos(startRad);
    const iy2 = 100 + 54 * Math.sin(startRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A 80 80 0 ${largeArc} 1 ${x2} ${y2}
      L ${ix1} ${iy1}
      A 54 54 0 ${largeArc} 0 ${ix2} ${iy2}
      Z
    `;

    return {
      name: cat.name,
      amountCents: cat.amountCents,
      percent: Math.round(percent * 100),
      color,
      pathData,
      items: cat.items
    };
  });

  // 2. Timeline Daily Burn Analysis (Days 1 to 31)
  const daysInCurMonth = new Date(parseInt(month.slice(0, 4), 10), parseInt(month.slice(5, 7), 10), 0).getDate();
  const dayGroups: { day: number; dateStr: string; amountCents: number; items: Item[] }[] = [];
  
  for (let d = 1; d <= daysInCurMonth; d++) {
    const dayPadded = String(d).padStart(2, '0');
    const dateStr = `${month}-${dayPadded}`;
    const dayItems = monthlyExpenses.filter(x => x.dueDate === dateStr);
    const dayTotal = dayItems.reduce((sum, x) => sum + x.amountCents, 0);
    dayGroups.push({ day: d, dateStr, amountCents: dayTotal, items: dayItems });
  }

  // Calculate day-by-day running balance starting from the total budget requirement
  const maxDayExpense = Math.max(...dayGroups.map(g => g.amountCents), 100000);

  // Peak payment day
  const peakDay = [...dayGroups].sort((a, b) => b.amountCents - a.amountCents)[0];

  // 3. Comparison with other month (NOV vs DEZ 2026)
  const novItems = data.items.filter(x => !x.cancelled && x.kind === 'pagar' && x.dueDate.startsWith('2026-11'));
  const dezItems = data.items.filter(x => !x.cancelled && x.kind === 'pagar' && x.dueDate.startsWith('2026-12'));
  const novTotal = novItems.reduce((sum, x) => sum + x.amountCents, 0);
  const dezTotal = dezItems.reduce((sum, x) => sum + x.amountCents, 0);
  const diffNovDez = dezTotal - novTotal;

  // 4. Top 5 Largest Bills
  const topBills = [...monthlyExpenses].sort((a, b) => b.amountCents - a.amountCents).slice(0, 5);
  const topBillsSum = topBills.reduce((sum, x) => sum + x.amountCents, 0);
  const topBillsPercent = totalDespesas > 0 ? Math.round((topBillsSum / totalDespesas) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card for Charts */}
      <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-500 dark:text-purple-400 font-mono text-[11px] font-semibold uppercase">
              Análise Visual & Gráficos
            </span>
            <span className="text-xs text-[var(--text-secondary)]">· Inteligência Financeira</span>
          </div>
          <h2 className="text-lg font-bold text-[var(--text-heading)] tracking-tight m-0">
            Raio-X das suas Contas ({month.slice(5)}/{month.slice(0, 4)})
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-0">
            Veja para onde seu dinheiro vai, os dias mais críticos do mês e o comparativo de gastos.
          </p>
        </div>

        {/* Actions & Tabs */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* View Switcher Tabs */}
          <div className="flex items-center flex-wrap gap-1 bg-[var(--bg-card-inner)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              <PieChartIcon size={13} />
              <span>Categorias</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              <TrendingDown size={13} />
              <span>Fluxo Diário</span>
            </button>

            <button
              onClick={() => setActiveTab('top')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'top'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              <BarChart3 size={13} />
              <span>Top Despesas</span>
            </button>

            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              <Layers size={13} />
              <span>NOV vs DEZ</span>
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            title="Exportar resumo financeiro mensal como arquivo PDF formatado para impressão ou arquivamento"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 dark:text-sky-300 shadow-sm active:scale-95 disabled:opacity-50"
          >
            {exportSuccess ? (
              <>
                <Check size={14} className="text-emerald-500 dark:text-emerald-400" />
                <span className="text-emerald-500 dark:text-emerald-400 font-bold">PDF Baixado!</span>
              </>
            ) : (
              <>
                <FileDown size={14} className={isExporting ? 'animate-bounce text-sky-500' : 'text-sky-500 dark:text-sky-400'} />
                <span>{isExporting ? 'Gerando PDF…' : 'Exportar PDF'}</span>
              </>
            )}
          </button>
        </div>
      </div>


      {/* Progress Strip: Quitado vs Pendente */}
      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <Target className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <span>Progresso de Quitação das Contas do Mês</span>
          </div>
          <div className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
            <span className="text-emerald-500 dark:text-emerald-400 font-bold">{money(totalPago)}</span> pagos ({percentPago}%) de{' '}
            <span className="text-[var(--text-heading)] font-bold">{money(totalDespesas)}</span>
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-3.5 bg-[var(--bg-card-inner)] rounded-full overflow-hidden border border-[var(--border-subtle)] flex p-0.5">
          <div
            style={{ width: `${percentPago}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-sm"
            title={`Já pago: ${money(totalPago)} (${percentPago}%)`}
          />
          <div
            style={{ width: `${100 - percentPago}%` }}
            className="h-full bg-rose-500/20 rounded-full transition-all duration-500"
            title={`Falta pagar: ${money(totalFaltaPagar)} (${100 - percentPago}%)`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-2">
          <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 size={12} /> {percentPago}% Quitado
          </span>
          <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-mono">
            Faltam {money(totalFaltaPagar)} ({monthlyExpenses.filter(x => x.remainingCents > 0).length} contas)
          </span>
        </div>
      </div>

      {/* TAB 1: Categorias (Donut Chart & Breakdown) */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Donut Chart Card */}
          <div className="lg:col-span-5 p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl flex flex-col items-center justify-center transition-colors">
            <h3 className="text-sm font-bold text-[var(--text-heading)] mb-1 w-full text-left">
              Distribuição por Categoria
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4 w-full text-left">
              Passe o mouse sobre o gráfico para inspecionar os detalhes
            </p>

            {/* SVG Donut */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {donutSlices.map((slice) => (
                  <path
                    key={slice.name}
                    d={slice.pathData}
                    fill={slice.color}
                    className={`transition-all duration-200 cursor-pointer ${
                      hoveredCategory && hoveredCategory !== slice.name ? 'opacity-30' : 'opacity-100'
                    } ${hoveredCategory === slice.name ? 'scale-105 transform origin-center' : ''}`}
                    onMouseEnter={() => setHoveredCategory(slice.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                ))}
              </svg>

              {/* Center Info in Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                  {hoveredCategory ? hoveredCategory : 'Total do Mês'}
                </span>
                <span className="text-base font-bold font-mono text-[var(--text-heading)] tabular-nums">
                  {hoveredCategory
                    ? money(categoryMap.get(hoveredCategory)?.amountCents || 0)
                    : money(totalDespesas)}
                </span>
                <span className="text-[10px] text-sky-500 dark:text-sky-400 font-mono font-medium">
                  {hoveredCategory
                    ? `${Math.round(((categoryMap.get(hoveredCategory)?.amountCents || 0) / (totalDespesas || 1)) * 100)}% das contas`
                    : `${monthlyExpenses.length} despesas`}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-secondary)] mt-4 text-center">
              💡 {categoryList.length} categorias diferentes compõem suas despesas este mês.
            </div>
          </div>

          {/* Categories List Breakdown */}
          <div className="lg:col-span-7 p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-heading)] m-0">
                  Detalhamento por Categoria
                </h3>
                <span className="text-xs text-[var(--text-secondary)] font-mono">
                  Ordenado por valor
                </span>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {categoryList.map((cat, idx) => {
                  const percent = totalDespesas > 0 ? (cat.amountCents / totalDespesas) * 100 : 0;
                  const color = CATEGORY_COLORS[cat.name] || DEFAULT_COLOR_PALETTE[idx % DEFAULT_COLOR_PALETTE.length];
                  const isHovered = hoveredCategory === cat.name;

                  return (
                    <div
                      key={cat.name}
                      onMouseEnter={() => setHoveredCategory(cat.name)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isHovered 
                          ? 'bg-[var(--bg-surface-hover)] border-blue-500/40 shadow-md' 
                          : 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)] hover:border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-md shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-semibold text-[var(--text-heading)]">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            ({cat.items.length} {cat.items.length === 1 ? 'item' : 'itens'})
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-xs font-bold text-[var(--text-heading)]">
                            {money(cat.amountCents)}
                          </span>
                          <span className="text-[11px] text-[var(--text-secondary)] ml-2">
                            {percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Mini Bar */}
                      <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: color
                          }}
                        />
                      </div>

                      {/* Show item names on hover */}
                      {isHovered && (
                        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-1.5">
                          {cat.items.map(it => (
                            <span
                              key={it.id}
                              className="text-[10.5px] px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans flex items-center gap-1 border border-[var(--border-subtle)]"
                            >
                              {it.name}: <strong className="font-mono text-[var(--text-heading)]">{money(it.amountCents)}</strong>
                              {it.remainingCents === 0 ? ' (Pago)' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
              <span>Total Geral do Mês</span>
              <strong className="text-sm font-mono text-[var(--text-heading)]">{money(totalDespesas)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Fluxo Diário & Calendário de Desembolsos */}
      {activeTab === 'timeline' && (
        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-heading)] m-0">
                Calendário e Concentração Diária de Despesas
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-0">
                Identifique os dias de maior saída de dinheiro para proteger seu saldo bancário.
              </p>
            </div>
            {peakDay && peakDay.amountCents > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-mono">
                🚨 Pico do mês: <strong>Dia {peakDay.day}</strong> ({money(peakDay.amountCents)})
              </div>
            )}
          </div>

          {/* Bar Timeline Chart for all days of the month */}
          <div className="pt-6 pb-2">
            <div className="h-48 flex items-end gap-1 sm:gap-1.5 px-2 bg-[var(--bg-card-inner)] p-4 rounded-xl border border-[var(--border-subtle)]">
              {dayGroups.map(g => {
                const heightPercent = g.amountCents > 0 ? Math.max((g.amountCents / maxDayExpense) * 100, 10) : 0;
                const hasBills = g.amountCents > 0;
                const isHovered = hoveredDay === g.day;

                return (
                  <div
                    key={g.day}
                    className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                    onMouseEnter={() => setHoveredDay(g.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* Tooltip on hover */}
                    {isHovered && hasBills && (
                      <div className="absolute -top-16 z-30 bg-[var(--bg-surface-elevated)] border border-sky-400/50 text-[var(--text-primary)] p-2 rounded-xl text-xs shadow-xl whitespace-nowrap pointer-events-none">
                        <div className="font-bold text-sky-500 dark:text-sky-400">Dia {g.day} de {month.slice(5)}/{month.slice(0, 4)}</div>
                        <div className="font-mono text-[var(--text-heading)] font-bold">{money(g.amountCents)}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          {g.items.map(it => it.name).join(', ')}
                        </div>
                      </div>
                    )}

                    {/* Bar */}
                    {hasBills ? (
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          g.day === peakDay.day
                            ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-md shadow-amber-500/20'
                            : isHovered
                            ? 'bg-blue-500'
                            : 'bg-gradient-to-t from-blue-700 to-sky-500'
                        }`}
                      />
                    ) : (
                      <div className="w-full h-1 bg-[var(--border-subtle)] rounded-t" />
                    )}

                    {/* Day label */}
                    <span className={`text-[10px] mt-2 font-mono ${
                      hasBills ? (isHovered ? 'text-sky-500 dark:text-sky-400 font-bold' : 'text-[var(--text-primary)] font-semibold') : 'text-[var(--text-muted)]'
                    }`}>
                      {g.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Days with scheduled bills table */}
          <div className="mt-4">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              Cronograma de Saídas do Mês ({month})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {dayGroups.filter(g => g.amountCents > 0).map(g => (
                <div
                  key={g.day}
                  className={`p-3 rounded-xl border transition ${
                    g.day === peakDay.day 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 font-mono text-xs font-bold border border-blue-500/20">
                      Dia {g.day}
                    </span>
                    <strong className="font-mono text-xs text-[var(--text-heading)]">
                      {money(g.amountCents)}
                    </strong>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate">
                    {g.items.map(it => it.name).join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Top 5 Maiores Despesas (Impacto no Orçamento) */}
      {activeTab === 'top' && (
        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-heading)] m-0">
                Top 5 Maiores Contas (Impacto Pareto)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-0">
                Estas 5 despesas representam <strong>{topBillsPercent}%</strong> de todo o seu orçamento de {month}.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-mono">
              Total Top 5: <strong>{money(topBillsSum)}</strong>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {topBills.map((bill, index) => {
              const percentOfTotal = totalDespesas > 0 ? (bill.amountCents / totalDespesas) * 100 : 0;
              const isPaid = bill.remainingCents === 0;

              return (
                <div
                  key={bill.id}
                  className="p-3.5 bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-mono font-bold text-xs text-blue-500 dark:text-blue-400 shrink-0">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-heading)]">
                          {bill.name}
                        </span>
                        <span className="text-[10.5px] text-[var(--text-secondary)] px-2 py-0.2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                          Vence dia {bill.dueDate.slice(8, 10)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] m-0">
                        {bill.category} · {percentOfTotal.toFixed(1)}% do orçamento total
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:justify-end">
                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-[var(--text-heading)]">
                        {money(bill.amountCents)}
                      </div>
                      <span className={`text-[10px] font-semibold ${isPaid ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
                        {isPaid ? 'Quitado' : 'Pendente'}
                      </span>
                    </div>

                    {!isPaid && onPayItem && (
                      <button
                        onClick={() => onPayItem(bill)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pareto Insight Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-[var(--text-primary)] flex items-start gap-3">
            <Zap className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-heading)] block mb-0.5">Diagnóstico de Impacto Financeiro:</strong>
              Focar na negociação ou quitação das 3 primeiras contas (Pan Moto, Moto e Placa de Vídeo) reduz seu custo fixo em mais de 60%.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Comparativo Mensal (Novembro vs Dezembro) */}
      {activeTab === 'comparison' && (
        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl space-y-5 transition-colors">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-heading)] m-0">
              Evolução e Comparativo Mensal (2026)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-0">
              Compare as despesas entre Novembro e Dezembro conforme planejado na sua planilha.
            </p>
          </div>

          {/* Comparative Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Novembro 2026 */}
            <div className={`p-4 rounded-xl border ${
              month === '2026-11' ? 'bg-[var(--bg-surface-hover)] border-blue-500/40' : 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--text-heading)] uppercase">Novembro 2026</span>
                {month === '2026-11' && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded font-semibold">
                    Mês Selecionado
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--text-heading)] tabular-nums mb-3">
                {money(novTotal)}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {novItems.length} contas programadas
              </div>
              <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(novTotal / Math.max(novTotal, dezTotal)) * 100}%` }}
                />
              </div>
              {onMonthChange && (
                <button
                  onClick={() => onMonthChange('2026-11')}
                  className="mt-4 w-full py-1.5 text-xs font-semibold bg-[var(--btn-secondary-bg)] hover:bg-[var(--bg-surface-hover)] text-[var(--btn-secondary-color)] border border-[var(--btn-secondary-border)] rounded-lg transition"
                >
                  Abrir Novembro
                </button>
              )}
            </div>

            {/* Dezembro 2026 */}
            <div className={`p-4 rounded-xl border ${
              month === '2026-12' ? 'bg-[var(--bg-surface-hover)] border-blue-500/40' : 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--text-heading)] uppercase">Dezembro 2026</span>
                {month === '2026-12' && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded font-semibold">
                    Mês Selecionado
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-rose-500 dark:text-rose-400 tabular-nums mb-3">
                {money(dezTotal)}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {dezItems.length} contas programadas (+R$ 307,27)
              </div>
              <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              {onMonthChange && (
                <button
                  onClick={() => onMonthChange('2026-12')}
                  className="mt-4 w-full py-1.5 text-xs font-semibold bg-[var(--btn-secondary-bg)] hover:bg-[var(--bg-surface-hover)] text-[var(--btn-secondary-color)] border border-[var(--btn-secondary-border)] rounded-lg transition"
                >
                  Abrir Dezembro
                </button>
              )}
            </div>
          </div>

          {/* Why it increased in Dec */}
          <div className="p-4 bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] rounded-xl text-xs space-y-2">
            <div className="font-bold text-[var(--text-heading)] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Por que Dezembro é R$ 307,27 mais alto que Novembro?</span>
            </div>
            <p className="text-[var(--text-secondary)] m-0">
              Conforme sua planilha original, em Dezembro entram duas novas obrigações que não existiam em Novembro:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono">
              <div className="p-2 rounded bg-[var(--bg-surface)] text-[var(--text-primary)] flex justify-between border border-[var(--border-subtle)]">
                <span>• SHOPEE (Dia 06)</span>
                <strong className="text-sky-500 dark:text-sky-400">R$ 107,27</strong>
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface)] text-[var(--text-primary)] flex justify-between border border-[var(--border-subtle)]">
                <span>• Super Sim (Dia 08)</span>
                <strong className="text-sky-500 dark:text-sky-400">R$ 200,00</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialCharts;
