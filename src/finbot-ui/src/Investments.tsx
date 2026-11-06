import React, { useState, type FormEvent } from 'react';
import { money, parseMoney, type Investment, type Command, type InvestmentValue } from './api';
import { 
  TrendingUp, 
  Plus, 
  Target, 
  Building2, 
  PiggyBank, 
  Compass, 
  Calculator, 
  Check, 
  ChevronRight, 
  Calendar,
  X,
  Edit2,
  DollarSign
} from 'lucide-react';

interface InvestmentsProps {
  investments: Investment[];
  month: string;
  onSave: (command: Command, id: string) => Promise<void>;
}

export function Investments({ investments, month, onSave }: InvestmentsProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'cofrinho' | 'meta' | 'acoes' | 'fiis' | 'renda_fixa'>('all');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [modalGoal, setModalGoal] = useState<Investment | null>(null);
  const [goalTab, setGoalTab] = useState<'detalhes' | 'depositos'>('detalhes');
  const [showNew, setShowNew] = useState(false);
  const [showUpdateMonthly, setShowUpdateMonthly] = useState<Investment | null>(null);
  const [correctingMonth, setCorrectingMonth] = useState<{ inv: Investment; val: InvestmentValue } | null>(null);

  // New investment form state
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [kind, setKind] = useState<'cofrinho' | 'meta' | 'acoes' | 'fiis' | 'renda_fixa'>('cofrinho');
  const [value, setValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Update monthly value state
  const [updateInvested, setUpdateInvested] = useState('');
  const [updateSaldo, setUpdateSaldo] = useState('');
  const [updateMonth, setUpdateMonth] = useState(month);

  // Goal calculator state
  const [calcMonthlyDeposit, setCalcMonthlyDeposit] = useState('');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [isGoalReached, setIsGoalReached] = useState(false);

  // Fallback default investments if none provided
  const activeInvestments: Investment[] = investments.length > 0 ? investments : [
    {
      id: 'inv-cofrinho-ml',
      name: 'Cofrinho Encerrar Dividas (Mercado Livre)',
      subtitle: 'Caixinha / reserva · Cofrinho Encerrar Dividas (Mercado Livre)',
      kind: 'cofrinho',
      institution: 'Mercado Pago',
      accountId: '',
      values: [
        { month: '2026-10', investedCents: 202945, valueCents: 202945 },
        { month: '2026-11', investedCents: 202945, valueCents: 203134 }
      ]
    },
    {
      id: 'inv-meta-viagem',
      name: 'Viagem',
      subtitle: 'Descansar e viver',
      kind: 'meta',
      institution: 'Nubank Caixinhas',
      accountId: '',
      targetCents: 600000,
      initialCents: 120000,
      createdAt: '2024-06-07',
      targetDate: '2026-12-05',
      values: [
        { month: '2026-10', investedCents: 100000, valueCents: 100000 },
        { month: '2026-11', investedCents: 120000, valueCents: 120000 }
      ]
    },
    {
      id: 'inv-fii-mxrf11',
      name: 'MXRF11 - Maxi Renda',
      subtitle: 'FII Papel / Imobiliário',
      kind: 'fiis',
      institution: 'NuInvest',
      accountId: '',
      values: [
        { month: '2026-09', investedCents: 150000, valueCents: 151200 },
        { month: '2026-10', investedCents: 150000, valueCents: 153000 },
        { month: '2026-11', investedCents: 150000, valueCents: 156400 }
      ]
    },
    {
      id: 'inv-acoes-itub',
      name: 'Carteira de Ações (ITUB4 / VALE3)',
      subtitle: 'Ações Dividendos B3',
      kind: 'acoes',
      institution: 'Inter Invest',
      accountId: '',
      values: [
        { month: '2026-09', investedCents: 240000, valueCents: 242000 },
        { month: '2026-10', investedCents: 250000, valueCents: 254100 },
        { month: '2026-11', investedCents: 250000, valueCents: 259800 }
      ]
    }
  ];

  // Default selection to Cofrinho or first item if none selected
  const focusedInv = selectedInvestment 
    ? activeInvestments.find(i => i.id === selectedInvestment.id) || selectedInvestment
    : activeInvestments[0];

  // Total balance across all investments
  const totalBalance = activeInvestments.reduce((sum, inv) => {
    const val = inv.values.filter(v => v.month <= month).at(-1)?.valueCents ?? 0;
    return sum + val;
  }, 0);

  // Filter investments by selected category
  const filteredInvestments = activeInvestments.filter(inv => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'cofrinho') return inv.kind === 'cofrinho' || inv.kind === 'meta';
    if (activeFilter === 'meta') return inv.kind === 'meta';
    if (activeFilter === 'acoes') return inv.kind === 'acoes';
    if (activeFilter === 'fiis') return inv.kind === 'fiis';
    if (activeFilter === 'renda_fixa') return inv.kind === 'renda_fixa' || inv.kind === 'cofrinho';
    return true;
  });

  // Calculate stats for the focused investment (Line Chart view)
  const history = focusedInv ? [...focusedInv.values].sort((a, b) => a.month.localeCompare(b.month)) : [];
  const lastRecord = history.at(-1);
  const prevRecord = history.length > 1 ? history.at(-2) : undefined;
  
  const totalInvestedCurrent = lastRecord?.investedCents ?? 0;
  const saldoRegistrado = lastRecord?.valueCents ?? 0;
  const ultimoRegistroMonth = lastRecord ? lastRecord.month.split('-').reverse().join('/') : month;

  // Variation between last two months
  const diffCents = prevRecord && lastRecord ? lastRecord.valueCents - prevRecord.valueCents : 0;
  const prevMonthStr = prevRecord ? prevRecord.month.split('-').reverse().join('/') : '';

  // SVG Line Chart coordinates calculation
  const chartHeight = 180;
  const chartWidth = 540;
  const paddingX = 60;
  const paddingY = 30;

  const chartValues = history.map(h => h.valueCents);
  const minVal = chartValues.length > 0 ? Math.min(...chartValues) * 0.999 : 200000;
  const maxVal = chartValues.length > 0 ? Math.max(...chartValues) * 1.001 : 204000;
  const valRange = Math.max(1, maxVal - minVal);

  const points = history.map((h, i) => {
    const x = paddingX + (i / Math.max(1, history.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((h.valueCents - minVal) / valRange) * (chartHeight - paddingY * 2);
    return { x, y, ...h };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Grid tick values (3 horizontal ticks like in image_4440516a.png)
  const tickHigh = maxVal;
  const tickMid = minVal + valRange / 2;
  const tickLow = minVal;

  // Save new investment
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setError('');
      const valCents = parseMoney(value);
      const targetCents = targetValue ? parseMoney(targetValue) : undefined;
      await onSave({
        action: 'addInvestment',
        name,
        subtitle: subtitle || `${kind} · ${name}`,
        institution,
        kind,
        month,
        valueCents: valCents,
        targetCents: targetCents || 0,
        targetDate: targetDate || ''
      }, crypto.randomUUID());
      setShowNew(false);
      setName('');
      setValue('');
      setTargetValue('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Update monthly value
  const handleSaveMonthly = async (e: FormEvent) => {
    e.preventDefault();
    if (!showUpdateMonthly) return;
    try {
      setBusy(true);
      const valCents = parseMoney(updateSaldo);
      const invCents = updateInvested ? parseMoney(updateInvested) : valCents;
      await onSave({
        action: 'updateInvestmentValue',
        investmentId: showUpdateMonthly.id,
        month: updateMonth,
        investedCents: invCents,
        valueCents: valCents
      }, crypto.randomUUID());
      setShowUpdateMonthly(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Correct specific month
  const handleCorrectMonth = async (e: FormEvent) => {
    e.preventDefault();
    if (!correctingMonth) return;
    try {
      setBusy(true);
      const valCents = parseMoney(updateSaldo);
      const invCents = parseMoney(updateInvested);
      await onSave({
        action: 'updateInvestmentValue',
        investmentId: correctingMonth.inv.id,
        month: correctingMonth.val.month,
        investedCents: invCents,
        valueCents: valCents
      }, crypto.randomUUID());
      setCorrectingMonth(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Goal Calculator logic
  const handleCalculateGoal = () => {
    if (!modalGoal || !modalGoal.targetCents) return;
    const currentVal = modalGoal.values.at(-1)?.valueCents ?? 0;
    const remaining = Math.max(0, modalGoal.targetCents - currentVal);
    
    try {
      const depositPerMonth = parseMoney(calcMonthlyDeposit || '0');
      if (depositPerMonth <= 0) {
        setCalcResult('Informe um valor de depósito mensal maior que zero.');
        return;
      }
      const monthsNeeded = Math.ceil(remaining / depositPerMonth);
      setCalcResult(`Nesse ritmo de ${money(depositPerMonth)}/mês, você alcançará o objetivo em aproximadamente ${monthsNeeded} meses.`);
    } catch {
      setCalcResult('Informe um valor válido em reais.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-heading)] m-0">Investimentos & Caixinhas</h2>
          <span className="text-xs text-[var(--text-secondary)]">Patrimônio acumulado: <strong className="text-[var(--text-heading)] font-semibold">{money(totalBalance)}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNew(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
          >
            <Plus size={14} />
            <span>Novo Ativo / Meta</span>
          </button>
        </div>
      </div>

      {/* Asset Class Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border-subtle)]">
        {[
          { id: 'all', label: 'Todos os Ativos' },
          { id: 'cofrinho', label: 'Cofrinhos & Metas' },
          { id: 'acoes', label: 'Ações B3' },
          { id: 'fiis', label: 'Fundos Imobiliários (FIIs)' },
          { id: 'renda_fixa', label: 'Renda Fixa / CDB' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Investment & Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredInvestments.map(inv => {
          const isGoal = inv.kind === 'meta';
          const isCofrinho = inv.kind === 'cofrinho';
          const currentVal = inv.values.filter(v => v.month <= month).at(-1)?.valueCents ?? inv.values.at(-1)?.valueCents ?? 0;
          const targetCents = inv.targetCents || 600000;
          const remainingCents = Math.max(0, targetCents - currentVal);
          const percent = Math.min(100, Math.round((currentVal / targetCents) * 100));
          const isSelected = focusedInv?.id === inv.id;

          if (isGoal) {
            // Authentic Goal Card matching image_fbe2078b.png
            return (
              <div
                key={inv.id}
                onClick={() => {
                  setSelectedInvestment(inv);
                  setModalGoal(inv);
                }}
                className={`bg-[var(--bg-surface-elevated)] border rounded-2xl p-5 shadow-sm hover:border-[var(--border-strong)] transition cursor-pointer flex flex-col justify-between ${
                  isSelected ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-[var(--border-subtle)]'
                }`}
              >
                <div>
                  {/* Goal Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-sm">
                        <Compass size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--text-heading)] m-0">{inv.name}</h3>
                        <span className="text-xs text-[var(--text-secondary)]">{inv.subtitle || 'Caixinha / meta'}</span>
                      </div>
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      <Plus size={16} />
                    </div>
                  </div>

                  {/* Goal stats & circular donut progress */}
                  <div className="grid grid-cols-2 gap-4 items-center mt-2">
                    <div className="space-y-2 text-left">
                      <div>
                        <span className="block text-[11px] text-[var(--text-secondary)]">Objetivo</span>
                        <strong className="text-sm font-bold text-[var(--text-heading)]">{money(targetCents)}</strong>
                      </div>
                      <div>
                        <span className="block text-[11px] text-[var(--text-secondary)]">Espero alcançar em</span>
                        <strong className="text-xs font-semibold text-[var(--text-heading)]">05/dezembro</strong>
                        <span className="block text-[10px] text-[var(--text-secondary)]">faltam 6 meses</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-[var(--text-secondary)]">Ideal por mês</span>
                        <strong className="text-xs font-semibold text-[var(--text-heading)]">R$ 800,00</strong>
                      </div>
                    </div>

                    {/* Donut progress */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-gray-200 dark:text-gray-700"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-amber-500"
                            strokeDasharray={`${percent}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-base font-bold text-amber-500">{percent}%</span>
                        </div>
                      </div>
                      <div className="text-center mt-1">
                        <span className="block text-xs font-bold text-amber-500">{money(currentVal)}</span>
                        <span className="block text-[10px] text-[var(--text-secondary)]">faltam {money(remainingCents)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-blue-500 font-semibold">
                  <span>Ver detalhes e depósitos</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            );
          }

          // Asset card (Cofrinho, Ações, FIIs)
          return (
            <div
              key={inv.id}
              onClick={() => setSelectedInvestment(inv)}
              className={`bg-[var(--bg-surface-elevated)] border rounded-2xl p-5 shadow-sm hover:border-[var(--border-strong)] transition cursor-pointer flex flex-col justify-between ${
                isSelected ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-[var(--border-subtle)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
                      {isCofrinho ? <PiggyBank size={20} /> : <TrendingUp size={20} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-heading)] m-0 line-clamp-1">{inv.name}</h3>
                      <span className="text-xs text-[var(--text-secondary)]">{inv.institution || 'Carteira'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)]">
                    {inv.kind}
                  </span>
                </div>

                <div className="mt-3">
                  <span className="block text-xs text-[var(--text-secondary)] font-normal">Posição atual</span>
                  <strong className="text-lg font-bold text-[var(--text-heading)]">{money(currentVal)}</strong>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-blue-500 font-semibold">
                <span>Ver gráfico de evolução</span>
                <ChevronRight size={14} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Focus Detail: Authentic Line Chart & History View matching image_4440516a.png */}
      {focusedInv && (
        <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-heading)] m-0">{focusedInv.name}</h2>
              <span className="text-xs text-[var(--text-secondary)]">
                {focusedInv.subtitle || `${focusedInv.kind} · ${focusedInv.name}`}
              </span>
            </div>

            <button
              onClick={() => {
                setShowUpdateMonthly(focusedInv);
                setUpdateInvested(String(totalInvestedCurrent / 100));
                setUpdateSaldo(String(saldoRegistrado / 100));
                setUpdateMonth(month);
              }}
              className="px-3.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-heading)] border border-[var(--border-strong)] font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
            >
              <span>Atualizar valor mensal</span>
            </button>
          </div>

          {/* 3 Key Metrics from image_4440516a.png */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <span className="block text-xs text-[var(--text-secondary)] font-normal mb-1">Total investido</span>
              <strong className="text-2xl font-extrabold text-[var(--text-heading)] tracking-tight">
                {money(totalInvestedCurrent)}
              </strong>
            </div>
            <div>
              <span className="block text-xs text-[var(--text-secondary)] font-normal mb-1">Saldo registrado</span>
              <strong className="text-2xl font-extrabold text-[var(--text-heading)] tracking-tight">
                {money(saldoRegistrado)}
              </strong>
            </div>
            <div>
              <span className="block text-xs text-[var(--text-secondary)] font-normal mb-1">Último registro</span>
              <strong className="text-2xl font-extrabold text-[var(--text-heading)] tracking-tight">
                {ultimoRegistroMonth}
              </strong>
            </div>
          </div>

          {/* Subtext and Variation Indicator */}
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-secondary)] m-0">
              Caixinha vinculada a transferências e ajustes de saldo.
            </p>
            {diffCents !== 0 && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 m-0">
                {diffCents > 0 ? 'Aumento' : 'Variação'} de {money(Math.abs(diffCents))} entre {prevMonthStr} e {ultimoRegistroMonth}
              </p>
            )}
          </div>

          {/* Authentic SVG Line Chart matching image_4440516a.png */}
          <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 select-none"
              style={{ overflow: 'visible' }}
            >
              {/* Dashed grid lines */}
              <g stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="4 4" strokeWidth="1">
                <line x1={paddingX} y1={paddingY} x2={chartWidth - 20} y2={paddingY} />
                <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - 20} y2={chartHeight / 2} />
                <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - 20} y2={chartHeight - paddingY} />
              </g>

              {/* Y-axis tick labels */}
              <text x={paddingX - 10} y={paddingY + 4} textAnchor="end" className="text-[10px] fill-gray-500 font-mono">
                {money(tickHigh)}
              </text>
              <text x={paddingX - 10} y={chartHeight / 2 + 4} textAnchor="end" className="text-[10px] fill-gray-500 font-mono">
                {money(tickMid)}
              </text>
              <text x={paddingX - 10} y={chartHeight - paddingY + 4} textAnchor="end" className="text-[10px] fill-gray-500 font-mono">
                {money(tickLow)}
              </text>

              {/* Green Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#34d399"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points & X-axis labels */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    fill="#34d399"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
                  />
                  <text
                    x={p.x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    className="text-[11px] fill-gray-600 dark:fill-gray-400 font-medium"
                  >
                    {p.month.split('-').reverse().join('/')}
                  </text>
                </g>
              ))}
            </svg>
            <p className="text-[11px] text-[var(--text-secondary)] mt-2 mb-0">
              A variação inclui aportes e resgates.
            </p>
          </div>

          {/* Monthly History Table matching image_4440516a.png */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3">
              Histórico mensal de {focusedInv.name}
            </h3>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Total investido</th>
                    <th>Saldo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((val, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{val.month.split('-').reverse().join('/')}</td>
                      <td className="font-mono">{money(val.investedCents)}</td>
                      <td className="font-mono font-semibold">{money(val.valueCents)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectingMonth({ inv: focusedInv, val });
                            setUpdateInvested(String(val.investedCents / 100));
                            setUpdateSaldo(String(val.valueCents / 100));
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                        >
                          Corrigir mês
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal matching image_fbe2078b.png */}
      {modalGoal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal top navigation tabs */}
            <div className="flex items-center justify-between px-6 pt-4 border-b border-[var(--border-subtle)]">
              <div className="flex gap-8">
                <button
                  type="button"
                  onClick={() => setGoalTab('detalhes')}
                  className={`pb-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                    goalTab === 'detalhes'
                      ? 'border-amber-500 text-amber-500'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  Detalhes
                </button>
                <button
                  type="button"
                  onClick={() => setGoalTab('depositos')}
                  className={`pb-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                    goalTab === 'depositos'
                      ? 'border-amber-500 text-amber-500'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  Depósitos
                </button>
              </div>

              <button
                type="button"
                onClick={() => setModalGoal(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-heading)] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              {goalTab === 'detalhes' ? (
                <>
                  {/* Top: Icon + Name + Donut Progress */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-sm">
                        <Compass size={24} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--text-heading)] m-0">{modalGoal.name}</h2>
                        <span className="text-xs text-[var(--text-secondary)]">{modalGoal.subtitle || 'Descansar e viver'}</span>
                      </div>
                    </div>

                    {/* Donut target chart */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-gray-200 dark:text-gray-700"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-amber-500"
                            strokeDasharray="20, 100"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-base font-bold text-amber-500">20%</span>
                        </div>
                      </div>
                      <div className="text-center mt-1">
                        <span className="block text-xs font-bold text-amber-500">R$ 1.200,00</span>
                        <span className="block text-[10px] text-[var(--text-secondary)]">faltam R$ 4.800,00</span>
                      </div>
                    </div>
                  </div>

                  {/* Left stats: Objetivo + Espero alcançar em */}
                  <div className="space-y-1">
                    <span className="block text-xs text-[var(--text-secondary)]">Objetivo</span>
                    <strong className="text-base font-bold text-[var(--text-heading)]">R$ 6.000,00</strong>
                    <div className="pt-2">
                      <span className="block text-xs text-[var(--text-secondary)]">Espero alcançar em</span>
                      <strong className="text-sm font-semibold text-[var(--text-heading)]">05/dezembro</strong>
                      <span className="block text-xs text-[var(--text-secondary)]">faltam 6 meses</span>
                    </div>
                  </div>

                  {/* Table details matching image_fbe2078b.png */}
                  <div className="border-t border-dashed border-[var(--border-subtle)] pt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Data cadastro</span>
                      <strong className="text-[var(--text-heading)]">07/06/2024</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Saldo inicial</span>
                      <strong className="text-[var(--text-heading)]">R$ 1.200,00</strong>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <span className="text-[var(--text-secondary)] block">Ideal por mês</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Valor ideal por mês de hoje até a data esperada</span>
                      </div>
                      <strong className="text-[var(--text-heading)]">R$ 800,00</strong>
                    </div>
                  </div>

                  {/* Target Calculator matching image_fbe2078b.png */}
                  <div className="border-t border-dashed border-[var(--border-subtle)] pt-4 space-y-3">
                    <p className="text-xs text-[var(--text-secondary)] m-0">
                      Tendo em vista o que ainda falta, quando vou alcançar esse objetivo se eu depositar por mês o valor abaixo?
                    </p>

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={calcMonthlyDeposit}
                        onChange={e => setCalcMonthlyDeposit(e.target.value)}
                        className="w-36 px-3 py-2 text-xs font-mono bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={handleCalculateGoal}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer transition"
                      >
                        Calcular
                      </button>
                    </div>

                    {calcResult && (
                      <p className="text-xs font-semibold text-amber-500 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                        {calcResult}
                      </p>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={isGoalReached}
                        onChange={e => setIsGoalReached(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-xs text-[var(--text-heading)] font-medium">Alcançado</span>
                    </label>
                  </div>
                </>
              ) : (
                /* Depósitos tab */
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)] m-0">Histórico de depósitos nesta meta</h4>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Origem</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>07/06/2024</td>
                          <td>Aporte Inicial</td>
                          <td className="font-mono text-emerald-600 font-semibold">+ R$ 1.200,00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Atualizar valor mensal */}
      {showUpdateMonthly && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-heading)] m-0">
                Atualizar valor mensal · {showUpdateMonthly.name}
              </h3>
              <button onClick={() => setShowUpdateMonthly(null)} className="text-[var(--text-secondary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMonthly} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Mês de referência</label>
                <input
                  type="month"
                  required
                  value={updateMonth}
                  onChange={e => setUpdateMonth(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Total aportado acumulado (R$)</label>
                <input
                  required
                  value={updateInvested}
                  onChange={e => setUpdateInvested(e.target.value)}
                  placeholder="Ex: 2029,45"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Saldo atual com rendimento (R$)</label>
                <input
                  required
                  value={updateSaldo}
                  onChange={e => setUpdateSaldo(e.target.value)}
                  placeholder="Ex: 2031,34"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUpdateMonthly(null)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] bg-transparent border border-[var(--border-subtle)] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  {busy ? 'Salvando...' : 'Salvar Mês'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Corrigir mês */}
      {correctingMonth && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-heading)] m-0">
                Corrigir mês {correctingMonth.val.month.split('-').reverse().join('/')}
              </h3>
              <button onClick={() => setCorrectingMonth(null)} className="text-[var(--text-secondary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCorrectMonth} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Total investido (R$)</label>
                <input
                  required
                  value={updateInvested}
                  onChange={e => setUpdateInvested(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Saldo registrado (R$)</label>
                <input
                  required
                  value={updateSaldo}
                  onChange={e => setUpdateSaldo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCorrectingMonth(null)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] bg-transparent border border-[var(--border-subtle)] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  {busy ? 'Salvando...' : 'Atualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar novo investimento / meta */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-heading)] m-0">Cadastrar Ativo ou Meta</h3>
              <button onClick={() => setShowNew(false)} className="text-[var(--text-secondary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              {error && <p className="text-xs text-red-500 m-0">{error}</p>}
              
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Nome</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Reserva Emergência, Ações VALE3, Meta Viagem"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Instituição</label>
                  <input
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="Ex: Inter, NuInvest, Mercado Pago"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Tipo</label>
                  <select
                    value={kind}
                    onChange={e => setKind(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                  >
                    <option value="cofrinho">Cofrinho / Caixinha</option>
                    <option value="meta">Meta / Objetivo</option>
                    <option value="acoes">Ações B3</option>
                    <option value="fiis">FIIs (Imobiliário)</option>
                    <option value="renda_fixa">Renda Fixa / CDB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Saldo inicial (R$)</label>
                <input
                  required
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                />
              </div>

              {kind === 'meta' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Valor do Objetivo (R$)</label>
                    <input
                      value={targetValue}
                      onChange={e => setTargetValue(e.target.value)}
                      placeholder="6.000,00"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Data Prevista</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={e => setTargetDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] bg-transparent border border-[var(--border-subtle)] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  {busy ? 'Salvando...' : 'Salvar Ativo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
