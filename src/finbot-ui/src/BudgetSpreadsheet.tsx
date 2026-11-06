import React, { useState } from 'react';
import { 
  money, 
  today, 
  dateLabel, 
  type Snapshot, 
  type Command, 
  type Item 
} from './api';
import { 
  CheckCircle2, 
  Clock, 
  Wallet, 
  TrendingDown, 
  RotateCcw, 
  Plus, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Undo2, 
  Edit2, 
  HelpCircle,
  FileSpreadsheet,
  Bell,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { FinancialCharts } from './FinancialCharts';

interface BudgetSpreadsheetProps {
  data: Snapshot;
  month: string;
  onSave: (command: Command, id: string) => Promise<void>;
  onMonthChange: (month: string) => void;
  onOpenForm: (action: string, title: string, extra?: any) => void;
}

export function BudgetSpreadsheet({
  data,
  month,
  onSave,
  onMonthChange,
  onOpenForm
}: BudgetSpreadsheetProps) {
  const [activeViewMode, setActiveViewMode] = useState<'spreadsheet' | 'charts'>('spreadsheet');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'paid'>('all');
  const [adjustingBalance, setAdjustingBalance] = useState(false);
  const [newBalanceValue, setNewBalanceValue] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseName, setExpenseName] = useState('');
  const [expenseDay, setExpenseDay] = useState('10');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Outras Despesas');
  const [expenseNotifyEnabled, setExpenseNotifyEnabled] = useState(true);
  const [expenseNotifyDays, setExpenseNotifyDays] = useState('3');
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const mainAccount = data.accounts.find(a => a.kind === 'conta') || data.accounts[0];

  // Filter items of the current month that are expenses (kind === 'pagar')
  const monthlyExpenses = data.items
    .filter(x => !x.cancelled && x.kind === 'pagar' && x.dueDate.startsWith(month))
    .sort((a, b) => {
      const dayA = parseInt(a.dueDate.slice(8, 10), 10) || 0;
      const dayB = parseInt(b.dueDate.slice(8, 10), 10) || 0;
      return dayA - dayB;
    });

  // Calculate totals
  const totalPrevisto = monthlyExpenses.reduce((sum, x) => sum + x.amountCents, 0);
  const totalPago = monthlyExpenses.reduce((sum, x) => sum + x.paidCents, 0);
  const totalFaltaPagar = monthlyExpenses.reduce((sum, x) => sum + x.remainingCents, 0);
  const saldoAtual = mainAccount ? mainAccount.balanceCents : data.availableCents;
  const saldoAposQuitar = saldoAtual - totalFaltaPagar;

  // Active FinBot due date alerts for pending bills
  const todayStr = today();
  const upcomingAlerts = monthlyExpenses
    .filter(x => {
      if (x.remainingCents === 0) return false;
      const notifyDays = x.notifyDaysBefore !== undefined ? x.notifyDaysBefore : 3;
      const diffTime = new Date(x.dueDate + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= notifyDays;
    })
    .map(x => {
      const diffTime = new Date(x.dueDate + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { item: x, diffDays };
    })
    .sort((a, b) => a.diffDays - b.diffDays);

  // Filter rows based on toggle
  const visibleRows = monthlyExpenses.filter(x => {
    if (filterMode === 'pending') return x.remainingCents > 0;
    if (filterMode === 'paid') return x.remainingCents === 0;
    return true;
  });

  // 1-Click Pay: Quits the expense, deletes from remaining, debits account
  const handleQuickPay = async (item: Item) => {
    if (busyItem || item.remainingCents === 0) return;
    setBusyItem(item.id);
    try {
      await onSave(
        {
          action: 'settleItem',
          targetId: item.id,
          accountId: mainAccount?.id,
          amountCents: item.remainingCents,
          date: today()
        },
        crypto.randomUUID()
      );
    } catch (e: any) {
      alert(e.message || 'Erro ao realizar pagamento');
    } finally {
      setBusyItem(null);
    }
  };

  // 1-Click Undo: Restores money to account, restores remaining cents
  const handleQuickUndo = async (item: Item) => {
    if (busyItem || item.paidCents === 0) return;
    setBusyItem(item.id);
    try {
      await onSave(
        {
          action: 'unpayItem',
          targetId: item.id
        },
        crypto.randomUUID()
      );
    } catch (e: any) {
      alert(e.message || 'Erro ao desfazer pagamento');
    } finally {
      setBusyItem(null);
    }
  };

  // Adjust account balance
  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainAccount) return;
    const clean = newBalanceValue.trim().replace(/\./g, '').replace(',', '.');
    const cents = Math.round(parseFloat(clean) * 100);
    if (isNaN(cents)) return;

    try {
      await onSave(
        {
          action: 'adjustBalance',
          targetId: mainAccount.id,
          amountCents: cents
        },
        crypto.randomUUID()
      );
      setAdjustingBalance(false);
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar saldo');
    }
  };

  // Add new bill directly
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = expenseAmount.trim().replace(/\./g, '').replace(',', '.');
    const cents = Math.round(parseFloat(clean) * 100);
    if (!expenseName || isNaN(cents) || cents <= 0) return;

    const dayPadded = String(expenseDay).padStart(2, '0');
    const dueDate = `${month}-${dayPadded}`;

    try {
      await onSave(
        {
          action: 'addItem',
          name: expenseName.trim(),
          category: expenseCategory.trim() || 'Outras Despesas',
          kind: 'pagar',
          amountCents: cents,
          date: dueDate,
          paymentMethod: 'outro',
          note: 'Adicionado na planilha de orçamento',
          ...(expenseNotifyEnabled ? { notifyDaysBefore: Number(expenseNotifyDays) } : {})
        },
        crypto.randomUUID()
      );
      setExpenseName('');
      setExpenseAmount('');
      setAddingExpense(false);
    } catch (err: any) {
      alert(err?.message || 'Erro ao adicionar despesa');
    }
  };

  // Load the preset items from the user's photo
  const handleLoadPreset = async () => {
    if (confirm('Deseja recarregar a lista completa de contas da sua planilha (Shopee, Moto, Super Sim, etc.)?')) {
      try {
        await onSave(
          {
            action: 'loadSpreadsheetPreset'
          },
          crypto.randomUUID()
        );
      } catch (err: any) {
        alert(err?.message || 'Erro ao carregar dados');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Spreadsheet Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl transition-colors">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-heading)] tracking-tight m-0">
            Contas a Pagar
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Baixas imediatas, controle de saldo e parcelamentos
          </span>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-[var(--bg-card-inner)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={() => onMonthChange('2026-11')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                month === '2026-11'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              NOV 2026
            </button>
            <button
              onClick={() => onMonthChange('2026-12')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                month === '2026-12'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              DEZ 2026
            </button>
          </div>

          {/* Mode Switcher: Planilha vs Gráficos */}
          <div className="flex items-center bg-[var(--bg-card-inner)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveViewMode('spreadsheet')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'spreadsheet'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>Planilha</span>
            </button>
            <button
              onClick={() => setActiveViewMode('charts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'charts'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              <BarChart3 size={13} />
              <span>Gráficos</span>
            </button>
          </div>

          <button
            onClick={() => setAddingExpense(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            <span>Nova Despesa</span>
          </button>

          <button
            onClick={handleLoadPreset}
            title="Recarregar contas da foto (Novembro e Dezembro)"
            className="px-3 py-1.5 bg-[var(--btn-secondary-bg)] hover:bg-[var(--bg-surface-hover)] text-[var(--btn-secondary-color)] border border-[var(--btn-secondary-border)] rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Restaurar Planilha</span>
          </button>
        </div>
      </div>

      {/* FinBot Smart Due Date Alerts Banner */}
      {upcomingAlerts.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  Alertas de Vencimento · FinBot
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {upcomingAlerts.length} {upcomingAlerts.length === 1 ? 'conta próxima' : 'contas próximas'}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1 mb-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                {upcomingAlerts.slice(0, 3).map(({ item, diffDays }) => (
                  <span key={item.id} className="inline-flex items-center gap-1">
                    <span className="font-semibold text-white">{item.name}</span>
                    <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${
                      diffDays < 0 ? 'text-rose-400 bg-rose-500/10 font-bold' :
                      diffDays === 0 ? 'text-amber-400 bg-amber-500/10 font-bold' :
                      'text-sky-300 bg-sky-500/10'
                    }`}>
                      {diffDays < 0 ? `venceu há ${Math.abs(diffDays)}d` : diffDays === 0 ? 'vence HOJE' : diffDays === 1 ? 'vence amanhã' : `vence em ${diffDays}d`}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">({money(item.remainingCents)})</span>
                  </span>
                ))}
                {upcomingAlerts.length > 3 && (
                  <span className="text-slate-400 text-xs italic">
                    +{upcomingAlerts.length - 3} outra(s)
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleQuickPay(upcomingAlerts[0].item)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Check size={13} />
              <span>Pagar {upcomingAlerts[0].item.name.split(' ')[0]} ({money(upcomingAlerts[0].item.remainingCents)})</span>
            </button>
          </div>
        </div>
      )}

      {/* The 4 Core Cockpit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Saldo Atual na Conta */}
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl relative group transition-colors">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            <span>Saldo Atual na Conta</span>
            <Wallet className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-500 dark:text-sky-400 tabular-nums">
            {money(saldoAtual)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
            <span>{mainAccount?.name || 'Conta Ativa'}</span>
            <button
              onClick={() => {
                setNewBalanceValue((saldoAtual / 100).toFixed(2).replace('.', ','));
                setAdjustingBalance(true);
              }}
              className="text-sky-500 dark:text-sky-400 hover:underline font-medium flex items-center gap-1 bg-transparent p-0 border-0"
            >
              <Edit2 size={11} />
              Ajustar saldo
            </button>
          </div>
        </div>

        {/* 2. Ainda Falta Pagar */}
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl transition-colors">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            <span>Ainda Falta Pagar</span>
            <Clock className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-500 dark:text-rose-400 tabular-nums">
            {money(totalFaltaPagar)}
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
            <span>
              {monthlyExpenses.filter(x => x.remainingCents > 0).length} conta(s) pendente(s)
            </span>
          </div>
        </div>

        {/* 3. Já Pago no Mês */}
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl transition-colors">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            <span>Já Pago no Mês</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500 dark:text-emerald-400 tabular-nums">
            {money(totalPago)}
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
            <span>
              {monthlyExpenses.filter(x => x.paidCents > 0).length} conta(s) quitada(s)
            </span>
          </div>
        </div>

        {/* 4. Saldo Previsto ao Quitar Tudo */}
        <div className={`p-4 rounded-2xl border transition-colors ${
          saldoAposQuitar >= 0 
            ? 'bg-[var(--bg-surface)] border-[var(--border-subtle)]' 
            : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            <span>Saldo Previsto ao Quitar Tudo</span>
            <TrendingDown className={`w-4 h-4 ${saldoAposQuitar >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${saldoAposQuitar >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {money(saldoAposQuitar)}
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
            <span>{saldoAposQuitar >= 0 ? 'Sobra prevista após pagar tudo' : 'Risco de saldo negativo no mês'}</span>
          </div>
        </div>
      </div>

      {activeViewMode === 'charts' ? (
        <FinancialCharts
          data={data}
          month={month}
          onMonthChange={onMonthChange}
          onPayItem={handleQuickPay}
        />
      ) : (
        /* Spreadsheet Table View */
        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <h3 className="text-base font-bold text-[var(--text-heading)] m-0">
              Despesas e Contas do Mês ({month.slice(5)}/{month.slice(0, 4)})
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              ({monthlyExpenses.length} itens)
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 bg-[var(--bg-card-inner)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              Todas ({monthlyExpenses.length})
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                filterMode === 'pending'
                  ? 'bg-rose-500/20 text-rose-500 dark:text-rose-300 font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              Falta pagar ({monthlyExpenses.filter(x => x.remainingCents > 0).length})
            </button>
            <button
              onClick={() => setFilterMode('paid')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                filterMode === 'paid'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent'
              }`}
            >
              Pagas ({monthlyExpenses.filter(x => x.remainingCents === 0).length})
            </button>
          </div>
        </div>

        {/* Table matching the user's Excel layout */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--table-header-bg)] text-[var(--text-secondary)] font-semibold uppercase text-[11px] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-3 px-3.5 text-center w-16">DIA</th>
                <th className="py-3 px-4">ITEM / DESCRIÇÃO</th>
                <th className="py-3 px-3.5">CATEGORIA</th>
                <th className="py-3 px-4 text-right">VALOR PREVISTO</th>
                <th className="py-3 px-4 text-right">A PAGAR (PENDENTE)</th>
                <th className="py-3 px-3.5 text-center w-28">SITUAÇÃO</th>
                <th className="py-3 px-4 text-center w-36">AÇÃO (1 CLIQUE)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--table-border)] font-mono">
              {visibleRows.map(row => {
                const dayNumber = row.dueDate.slice(8, 10);
                const isPaid = row.remainingCents === 0;
                const isBusy = busyItem === row.id;

                const diffTime = new Date(row.dueDate + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const notifyDays = row.notifyDaysBefore !== undefined ? row.notifyDaysBefore : 3;
                const isAlerting = !isPaid && diffDays <= notifyDays;

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isPaid
                        ? 'bg-emerald-500/[0.04] text-[var(--text-muted)]'
                        : isAlerting
                        ? 'bg-amber-500/[0.05] text-[var(--text-primary)]'
                        : 'hover:bg-[var(--table-row-hover)] text-[var(--text-primary)]'
                    }`}
                  >
                    {/* DIA */}
                    <td className="py-3 px-3.5 text-center font-bold font-sans">
                      <span className="px-2 py-1 rounded-md bg-[var(--bg-surface-hover)] text-blue-500 dark:text-blue-400 text-xs border border-blue-500/20">
                        {parseInt(dayNumber, 10)}
                      </span>
                    </td>

                    {/* ITEM */}
                    <td className="py-3 px-4 font-sans font-semibold text-sm">
                      <div className="flex items-center gap-2">
                        <span className={isPaid ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-heading)]'}>
                          {row.name}
                        </span>
                        {isAlerting && (
                          <span
                            title={`Alerta do FinBot ativo: avisar ${notifyDays} dias antes`}
                            className="inline-flex items-center text-amber-500 dark:text-amber-400"
                          >
                            <Bell size={12} className="animate-pulse" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CATEGORIA */}
                    <td className="py-3 px-3.5 font-sans">
                      <span className="text-[11px] text-[var(--text-secondary)] px-2 py-0.5 rounded bg-[var(--bg-card-inner)] border border-[var(--border-subtle)]">
                        {row.category}
                      </span>
                    </td>

                    {/* VALOR PREVISTO */}
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {money(row.amountCents)}
                    </td>

                    {/* A PAGAR (PENDENTE) — Exactly like user's spreadsheet */}
                    <td className="py-3 px-4 text-right font-bold text-sm">
                      {isPaid ? (
                        <span className="text-[var(--text-muted)] font-sans font-normal">- (Quitado)</span>
                      ) : (
                        <span className="text-rose-500 dark:text-rose-400 font-mono">
                          {money(row.remainingCents)}
                        </span>
                      )}
                    </td>

                    {/* SITUAÇÃO */}
                    <td className="py-3 px-3.5 text-center font-sans">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                          <Check size={11} /> Pago
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                            <Clock size={11} /> Pendente
                          </span>
                          {isAlerting && (
                            <span 
                              title={`Configurado para avisar ${notifyDays} dias antes`}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                diffDays < 0 
                                  ? 'bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/30' 
                                  : diffDays === 0 
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30' 
                                  : 'bg-sky-500/15 text-sky-500 dark:text-sky-300 border border-sky-500/25'
                              }`}
                            >
                              <Bell size={9} />
                              {diffDays < 0 ? `${Math.abs(diffDays)}d atraso` : diffDays === 0 ? 'Vence HOJE' : diffDays === 1 ? 'Amanhã' : `em ${diffDays}d`}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* AÇÃO (1 CLIQUE) */}
                    <td className="py-3 px-4 text-center font-sans">
                      {isPaid ? (
                        <button
                          disabled={isBusy}
                          onClick={() => handleQuickUndo(row)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-[var(--btn-secondary-bg)] hover:bg-[var(--bg-surface-hover)] text-[var(--btn-secondary-color)] border border-[var(--btn-secondary-border)] rounded-lg transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Restaurar valor para a lista e devolver dinheiro ao saldo"
                        >
                          <Undo2 size={12} />
                          <span>Desfazer</span>
                        </button>
                      ) : (
                        <button
                          disabled={isBusy}
                          onClick={() => handleQuickPay(row)}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-100 disabled:opacity-50"
                        >
                          <Check size={13} />
                          <span>Pagar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[var(--text-muted)] font-sans">
                    Nenhuma despesa encontrada para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer Summary Row matching user's spreadsheet */}
            <tfoot className="bg-[var(--bg-card-inner)] border-t-2 border-[var(--border-subtle)] font-bold font-mono">
              <tr>
                <td colSpan={3} className="py-3.5 px-4 font-sans text-xs text-[var(--text-secondary)] uppercase tracking-wide">
                  TOTAL OUTRAS DESPESAS
                </td>
                <td className="py-3.5 px-4 text-right text-[var(--text-heading)]">
                  {money(totalPrevisto)}
                </td>
                <td className="py-3.5 px-4 text-right text-rose-500 dark:text-rose-400 text-sm">
                  {money(totalFaltaPagar)}
                </td>
                <td colSpan={2} className="py-3.5 px-4 text-center font-sans text-xs text-[var(--text-secondary)]">
                  Já pago: <span className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">{money(totalPago)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}

      {/* Modal: Ajustar Saldo em Conta */}
      {adjustingBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm p-6 bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-2xl shadow-2xl">
            <h3 className="text-base font-bold text-[var(--text-heading)] mb-2">
              Ajustar Saldo em Conta
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Informe o valor real disponível na sua conta hoje. A cada pagamento de conta, este saldo será debitado automaticamente.
            </p>
            <form onSubmit={handleSaveBalance}>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Novo Saldo em Conta (R$)
              </label>
              <input
                type="text"
                autoFocus
                value={newBalanceValue}
                onChange={e => setNewBalanceValue(e.target.value)}
                placeholder="Ex: 4.500,00"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-500 mb-5"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingBalance(false)}
                  className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer"
                >
                  Salvar Novo Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Nova Despesa */}
      {addingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-2xl shadow-2xl">
            <h3 className="text-base font-bold text-[var(--text-heading)] mb-2">
              Nova Despesa no Orçamento
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Adicione uma conta que vence no mês selecionado ({month.slice(5)}/{month.slice(0, 4)}).
            </p>
            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Nome da Despesa / Conta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel, Internet, Academia..."
                  value={expenseName}
                  onChange={e => setExpenseName(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={expenseDay}
                    onChange={e => setExpenseDay(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl px-3.5 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 150,00"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl px-3.5 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  placeholder="Outras Despesas"
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* FinBot Due Alert Setting */}
              <div className="p-3 bg-[var(--bg-card-inner)] border border-sky-500/25 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--text-heading)]">
                  <input
                    type="checkbox"
                    checked={expenseNotifyEnabled}
                    onChange={e => setExpenseNotifyEnabled(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>🔔 Notificação / Alerta de Vencimento</span>
                </label>

                {expenseNotifyEnabled && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] text-[var(--text-secondary)]">
                      Avisar com antecedência de:
                    </label>
                    <select
                      value={expenseNotifyDays}
                      onChange={e => setExpenseNotifyDays(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                    >
                      <option value="1">1 dia antes do vencimento</option>
                      <option value="2">2 dias antes do vencimento</option>
                      <option value="3">3 dias antes do vencimento (Recomendado)</option>
                      <option value="5">5 dias antes do vencimento</option>
                      <option value="7">7 dias antes (1 semana)</option>
                      <option value="0">No próprio dia do vencimento</option>
                    </select>
                    <p className="text-[10px] text-sky-500 dark:text-sky-400 m-0">
                      O FinBot exibirá um alerta em destaque {expenseNotifyDays === '0' ? 'no dia do vencimento' : `${expenseNotifyDays} dias antes de vencer`}.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setAddingExpense(false)}
                  className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-heading)] bg-transparent rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer"
                >
                  Cadastrar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
