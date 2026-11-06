import { useEffect, useRef, useState } from 'react';
import { request, money, today, dateLabel, type Snapshot, type Command, type Item } from './api';
import { FinanceForm, type FormSpec } from './FinanceForm';
import { EntryForm } from './EntryForm';
import { Installments, ItemDetails } from './Installments';
import { CategoryChart } from './CategoryChart';
import { Investments } from './Investments';
import { Receivables, ReceivableForm, ReceivableSummary } from './Receivables';
import { CashProjection } from './CashProjection';
import { TaxRecords } from './TaxRecords';
import { categories } from './CategoryField';
import { BudgetSpreadsheet } from './BudgetSpreadsheet';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Layers, 
  CreditCard, 
  Clock, 
  ArrowDownLeft, 
  TrendingUp, 
  FileText, 
  Plus, 
  ArrowRightLeft, 
  Wallet,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Bell,
  BarChart3,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { FinancialCharts } from './FinancialCharts';
import { FinancialTipCard } from './FinancialTipCard';
import { CategoryBudgetsCard } from './CategoryBudgetsCard';
import { PurchaseSimulatorModal } from './PurchaseSimulatorModal';
import { CreditCardsView } from './CreditCardsView';
import './styles.css';

const views = [
  ['overview', LayoutDashboard, 'Visão geral'],
  ['pending', Clock, 'Contas a pagar'],
  ['charts', BarChart3, 'Gráficos e Indicadores'],
  ['entries', ReceiptText, 'Lançamentos'],
  ['installments', Layers, 'Parcelamentos'],
  ['accounts', CreditCard, 'Contas e cartões'],
  ['receivables', ArrowDownLeft, 'Contas a receber'],
  ['investments', TrendingUp, 'Investimentos'],
  ['tax', FileText, 'Imposto de Renda']
] as const;

export function FinBotApp() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('finbot_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
    localStorage.setItem('finbot_theme', theme);
  }, [theme]);

  const [view, setView] = useState('overview');
  const [month, setMonth] = useState('2026-11');
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormSpec>();
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ text: string; command: Command; id: string }>();
  const [editing, setEditing] = useState<Item>();
  const [receivable, setReceivable] = useState<{ item?: Item }>();
  const [showAlertDrawer, setShowAlertDrawer] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const confirmation = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirm) confirmation.current?.showModal();
    else confirmation.current?.close();
  }, [confirm]);

  useEffect(() => {
    let active = true;
    setError('');
    request(month).then(x => {
      if (active) setData(x);
    }).catch(e => {
      if (active) setError(e.message);
    });
    return () => { active = false; };
  }, [month]);

  // Listen for storage events (e.g. from the quick chat assistant) to reload data
  useEffect(() => {
    const handleReload = () => {
      request(month).then(setData).catch(console.warn);
    };
    window.addEventListener('storage', handleReload);
    return () => window.removeEventListener('storage', handleReload);
  }, [month]);

  const save = async (command: Command, id: string) => {
    const result = await request(month, command, id);
    setData(result);
    setNotice('Dados salvos no seu computador com sucesso.');
  };

  const ask = (text: string, command: Command) => setConfirm({ text, command, id: crypto.randomUUID() });

  const runConfirm = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    setError('');
    try {
      await save(confirm.command, confirm.id);
      setConfirm(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const navigate = (name: string) => {
    setView(name);
    setAll(false);
    setNotice('');
  };

  const accountName = (id: string) => data?.accounts.find(x => x.id === id)?.name ?? 'Conta';
  const cardName = (id: string) => data?.cards.find(x => x.id === id)?.name ?? 'Cartão';
  const open = (action: string, title: string, extra: Partial<FormSpec> = {}) => setForm({ action, title, ...extra });

  const items = data?.items.filter(x => !x.cancelled && (all || (view === 'entries' && !x.dueDate) || x.dueDate.startsWith(month))) ?? [];

  const state = (item: Item) =>
    item.remainingCents === 0
      ? (item.kind === 'pagar' ? 'Pago' : 'Recebido')
      : item.paidCents > 0
      ? 'Parcial'
      : item.dueDate && item.dueDate < today()
      ? 'Em atraso'
      : 'Pendente';

  const itemTable = (rows: Item[]) =>
    rows.length ? (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Falta</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(x => (
              <tr key={x.id}>
                <td>
                  {x.name}
                  <small>
                    {x.cardId
                      ? cardName(x.cardId) + ' · parcela ' + x.number + '/' + x.count
                      : x.kind === 'pagar'
                      ? 'A pagar'
                      : 'A receber'}{' '}
                    · {x.category}
                  </small>
                </td>
                <td>{x.dueDate ? dateLabel(x.dueDate) : 'Sem data'}</td>
                <td>{money(x.amountCents)}</td>
                <td>{money(x.remainingCents)}</td>
                <td>
                  <span className={'status ' + (x.remainingCents === 0 ? 'paid' : x.dueDate && x.dueDate < today() ? 'late' : '')}>
                    {state(x)}
                  </span>
                </td>
                <td>
                  {!x.cardId && x.remainingCents > 0 && (
                    <button
                      className="text-button"
                      onClick={() =>
                        open(
                          'settleItem',
                          x.kind === 'pagar' ? 'Registrar pagamento' : 'Registrar recebimento',
                          { targetId: x.id, amountCents: x.remainingCents }
                        )
                      }
                    >
                      Dar baixa
                    </button>
                  )}
                  {!x.cardId && x.paidCents === 0 && (
                    <button
                      className="text-button danger"
                      onClick={() =>
                        ask('Cancelar “' + x.name + '”? O lançamento sairá dos totais, mantendo o histórico.', {
                          action: 'cancelItem',
                          targetId: x.id
                        })
                      }
                    >
                      Cancelar
                    </button>
                  )}
                  {x.cardId && <span className="help" style={{ margin: 0 }}>Fatura / Parcelamentos</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="empty">Nenhum lançamento neste período.</p>
    );

  const invoicePanel = () => (
    <section className="panel">
      <div className="panel-title">
        <h2>Faturas {all ? 'cadastradas' : 'do mês'}</h2>
      </div>
      {data?.invoices
        .filter(x => all || x.dueDate.startsWith(month))
        .map(x => (
          <div className="invoice" key={x.id}>
            <div>
              <strong>{cardName(x.cardId)}</strong>
              <small>Vence em {dateLabel(x.dueDate)}</small>
            </div>
            <div className="invoice-values">
              <strong>{money(x.remainingCents)}</strong>
              <small>
                Total {money(x.amountCents)} · Pago {money(x.paidCents)}
              </small>
            </div>
            {x.remainingCents > 0 ? (
              <button onClick={() => open('payInvoice', 'Pagar fatura ' + cardName(x.cardId), { targetId: x.id, amountCents: x.remainingCents })}>
                Pagar fatura
              </button>
            ) : (
              <span className="status paid">Fatura paga</span>
            )}
          </div>
        ))}
      {!data?.invoices.some(x => all || x.dueDate.startsWith(month)) && <p className="empty">Nenhuma fatura neste período.</p>}
    </section>
  );

  const accountPanel = (reserveOnly = false) => (
    <section className="panel">
      <div className="panel-title">
        <h2>{reserveOnly ? 'Dinheiro guardado' : 'Suas contas'}</h2>
        <button
          className="text-button"
          onClick={() => open('addAccount', reserveOnly ? 'Cadastrar reserva' : 'Cadastrar conta', { kind: reserveOnly ? 'reserva' : 'conta' })}
        >
          + Adicionar
        </button>
      </div>
      {data?.accounts
        .filter(x => !reserveOnly || x.kind === 'reserva')
        .map(x => (
          <div className="account-row" key={x.id}>
            <span className={'account-icon ' + (x.kind === 'reserva' ? 'purple' : '')}>
              {x.kind === 'reserva' ? <Building2 size={16} /> : <Wallet size={16} />}
            </span>
            <div>
              {x.name}
              <small>{x.kind === 'reserva' ? 'Investimento / caixinha · fora do disponível' : 'Conta disponível'}</small>
            </div>
            <strong>{money(x.balanceCents)}</strong>
            <button
              className="text-button"
              onClick={() => open('adjustBalance', 'Atualizar saldo · ' + x.name, { targetId: x.id, amountCents: x.balanceCents })}
            >
              Atualizar saldo
            </button>
          </div>
        ))}
      {!data?.accounts.some(x => !reserveOnly || x.kind === 'reserva') && <p className="empty">Cadastre o saldo que você tem hoje.</p>}
    </section>
  );

  const todayStr = today();
  const activeAlerts = (data?.items || [])
    .filter(x => !x.cancelled && x.kind === 'pagar' && x.remainingCents > 0 && x.dueDate)
    .filter(x => {
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

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 6px rgba(56, 189, 248, 0.3)'
          }}>
            <CreditCard size={16} />
          </div>
          <strong>fin<span>bot</span></strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
          {/* Theme Selector Toggle */}
          <button
            type="button"
            onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Alternar para Modo Claro (Light Mode)' : 'Alternar para Modo Escuro (Dark Mode)'}
            aria-label="Alternar tema de cores"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon size={14} className="text-blue-500" />
                <span className="hidden sm:inline">Modo Escuro</span>
              </>
            )}
          </button>

          {/* Notification Center Trigger */}
          <button
            type="button"
            onClick={() => setShowAlertDrawer(prev => !prev)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              height: '32px',
              padding: '0 0.65rem',
              borderRadius: '8px',
              backgroundColor: activeAlerts.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-surface-hover)',
              border: activeAlerts.length > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)',
              color: activeAlerts.length > 0 ? '#d97706' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              transition: 'all 0.15s ease'
            }}
            title={activeAlerts.length > 0 ? `${activeAlerts.length} conta(s) com alerta de vencimento` : 'Nenhum alerta de vencimento no momento'}
          >
            <Bell size={14} className={activeAlerts.length > 0 ? 'animate-bounce' : ''} />
            <span>Alertas</span>
            {activeAlerts.length > 0 && (
              <span
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '999px',
                  padding: '1px 5px',
                  lineHeight: 1
                }}
              >
                {activeAlerts.length}
              </span>
            )}
          </button>

          <span className="badge">● Uso pessoal · dados locais</span>

          {/* Alerts Dropdown Modal */}
          {showAlertDrawer && (
            <div
              style={{
                position: 'absolute',
                top: '42px',
                right: '0',
                width: '360px',
                maxHeight: '440px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: '14px',
                boxShadow: 'var(--shadow-elevation)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={14} style={{ color: '#f59e0b' }} />
                  <strong style={{ fontSize: '12px', color: 'var(--text-heading)' }}>
                    Alertas de Vencimento ({activeAlerts.length})
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAlertDrawer(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: 0
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeAlerts.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Nenhuma conta com vencimento próximo ou atrasada. Parabéns!
                  </div>
                ) : (
                  activeAlerts.map(({ item, diffDays }) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-card-inner)',
                        borderRadius: '10px',
                        border: diffDays <= 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: diffDays < 0 ? 'rgba(239, 68, 68, 0.2)' : diffDays === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                              color: diffDays < 0 ? '#f87171' : diffDays === 0 ? '#fbbf24' : '#38bdf8'
                            }}
                          >
                            {diffDays < 0 ? `${Math.abs(diffDays)}d atrasada` : diffDays === 0 ? 'Vence HOJE' : diffDays === 1 ? 'Amanhã' : `em ${diffDays}d`}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Vencimento: {dateLabel(item.dueDate)} · <strong style={{ color: '#f43f5e', fontFamily: 'monospace' }}>{money(item.remainingCents)}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAlertDrawer(false);
                          open(
                            'settleItem',
                            'Registrar pagamento · ' + item.name,
                            { targetId: item.id, amountCents: item.remainingCents }
                          );
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#059669',
                          color: '#fff',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Pagar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="layout">
        <aside>
          <p className="caption">MEU FINANCEIRO</p>
          <nav aria-label="Menu principal">
            {views.map(([id, Icon, label]) => (
              <button
                className={view === id ? 'selected' : ''}
                aria-current={view === id ? 'page' : undefined}
                onClick={() => navigate(id)}
                key={id}
              >
                <Icon size={16} aria-hidden="true" style={{ opacity: view === id ? 1 : 0.7 }} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main>
          <header>
            <div>
              <h1>{views.find(x => x[0] === view)?.[2]}</h1>
            </div>
            <label className="month">
              Mês de referência
              <input
                aria-label="Mês de vencimento"
                type="month"
                value={month}
                disabled={!!form || !!receivable || busy}
                onChange={e => {
                  if (e.target.value) setMonth(e.target.value);
                }}
              />
            </label>
          </header>

          {error && <p className="error" role="alert">{error}</p>}
          {notice && <p className="success" role="status">{notice}</p>}

          {!data ? (
            <p role="status">Conectando aos dados locais…</p>
          ) : (
            <>
              {view === 'charts' ? (
                <FinancialCharts
                  data={data}
                  month={month}
                  onMonthChange={setMonth}
                  onPayItem={(item: Item) => open('settleItem', 'Registrar pagamento · ' + item.name, { targetId: item.id, amountCents: item.remainingCents })}
                />
              ) : (
                <>
                  {view !== 'pending' && (
                    <div className="toolbar">
                      <button onClick={() => open('addItem', 'Cadastrar conta ou contrato')}>
                        <Plus size={15} />
                        <span>Nova Conta a Pagar</span>
                      </button>
                      <button className="secondary" onClick={() => open('addPurchase', 'Compra no cartão')}>
                        <CreditCard size={15} />
                        <span>Compra no Cartão</span>
                      </button>
                      <button 
                        className="secondary" 
                        onClick={() => setShowSimulator(true)}
                        style={{
                          borderColor: 'rgba(168, 85, 247, 0.35)',
                          backgroundColor: 'rgba(168, 85, 247, 0.08)',
                          color: 'var(--text-heading)'
                        }}
                      >
                        <Sparkles size={15} style={{ color: '#a855f7' }} />
                        <span>Simular: Posso Comprar?</span>
                      </button>
                      <button className="secondary" onClick={() => open('transfer', 'Guardar, resgatar ou transferir')}>
                        <ArrowRightLeft size={15} />
                        <span>Transferir</span>
                      </button>
                    </div>
                  )}

                  {view !== 'pending' && (
                    <section className="metrics" aria-label="Resumo financeiro">
                      <article>
                        <p>Disponível em contas</p>
                        <strong data-testid="available">{money(data.availableCents)}</strong>
                        <small>Saldo atual · investimentos separados</small>
                      </article>
                      <article>
                        <p>A receber no mês · total</p>
                        <strong className="green">{money(data.toReceiveCents)}</strong>
                        <small>Ainda não entrou nas contas</small>
                      </article>
                      <article>
                        <p>Despesas do mês</p>
                        <strong className="red" data-testid="expense">{money(data.expenseCents)}</strong>
                        <small>Pagas + pendentes · por vencimento</small>
                      </article>
                      <article>
                        <p>Investimentos</p>
                        <strong className="purple-text" data-testid="invested-total">
                          {money((data.investments ?? []).reduce((sum, i) => sum + (i.values.filter(x => x.month <= month).at(-1)?.valueCents ?? 0), 0))}
                        </strong>
                        <small>Últimos registros até o mês selecionado</small>
                      </article>
                    </section>
                  )}
                </>
              )}

              {view === 'overview' && <FinancialTipCard data={data} month={month} />}
              {view === 'overview' && <CategoryBudgetsCard data={data} month={month} />}
              {view === 'overview' && <CashProjection data={data} month={month} />}
              {['entries', 'pending'].includes(view) && (
                <label className="toggle">
                  <input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Mostrar todos os meses
                </label>
              )}
              {['overview', 'receivables'].includes(view) && <ReceivableSummary items={data.items} month={view === 'overview' ? month : undefined} />}
              {view === 'receivables' && <Receivables items={data.items} open={open} ask={ask} onEdit={item => setReceivable({ item })} onNew={() => setReceivable({})} />}
              {view === 'overview' && (
                <div className="overview-grid">
                  <div>
                    <CategoryChart items={data.items} month={month} />
                    {accountPanel()}
                    <section className="panel">
                      <div className="panel-title">
                        <h2>Lançamentos do mês</h2>
                        <button className="text-button" onClick={() => navigate('entries')}>
                          Ver todos
                        </button>
                      </div>
                      {itemTable(items.slice(0, 6))}
                    </section>
                  </div>
                  <div>
                    {invoicePanel()}
                    <section className="note">
                      <strong>Ainda falta pagar no mês</strong>
                      <h2>{money(data.toPayCents)}</h2>
                    </section>
                  </div>
                </div>
              )}
              {view === 'entries' && (
                <>
                  <section className="panel">
                    <h2>Todos os lançamentos</h2>
                    {itemTable(items)}
                  </section>
                  <section className="panel">
                    <h2>Baixas e transferências · todos os meses</h2>
                    {data.payments.map(p => (
                      <div className="payment-row" key={p.id}>
                        <div>
                          {p.name}
                          <small>
                            {dateLabel(p.date)} · {accountName(p.accountId)} · {money(p.amountCents)}
                          </small>
                        </div>
                        {p.receiptPath && (
                          <button
                            className="text-button"
                            onClick={() => {
                              request(month, { action: 'openReceipt', targetId: p.id }).catch(e => setError(e.message));
                            }}
                          >
                            Abrir comprovante
                          </button>
                        )}
                        {p.reversed ? (
                          <span style={{ color: '#64748b', fontSize: '12px' }}>Desfeito</span>
                        ) : (
                          <button
                            className="text-button"
                            onClick={() => ask('Desfazer esta movimentação? O saldo e as parcelas vinculadas serão restaurados.', { action: 'reversePayment', targetId: p.id })}
                          >
                            Desfazer
                          </button>
                        )}
                      </div>
                    ))}
                    {data.payments.length === 0 && <p className="empty">Nenhuma movimentação realizada.</p>}
                  </section>
                </>
              )}
              {view === 'pending' && (
                <>
                  <BudgetSpreadsheet
                    data={data}
                    month={month}
                    onSave={save}
                    onMonthChange={setMonth}
                    onOpenForm={open}
                  />
                  {invoicePanel()}
                </>
              )}
              {view === 'installments' && <Installments data={data} open={open} ask={ask} onEdit={setEditing} onNew={() => open('addItem', 'Novo contrato', { kind: 'parcelado' })} />}
              {view === 'accounts' && (
                <>
                  <CreditCardsView data={data} month={month} onOpenForm={open} onSave={save} />
                  {accountPanel()}
                </>
              )}
              {view === 'tax' && <TaxRecords data={data} onSave={save} />}
              {view === 'investments' && <Investments investments={data.investments ?? []} month={month} onSave={save} />}
            </>
          )}
          <footer>FinBot · Gestão Financeira Pessoal</footer>
        </main>
      </div>

      {form && data && (form.action === 'addItem' ? (
        <EntryForm data={data} installments={form.kind === 'parcelado'} onSave={save} onClose={() => setForm(undefined)} />
      ) : (
        <FinanceForm spec={form} data={data} onSave={save} onClose={() => setForm(undefined)} />
      ))}
      {receivable && data && <ReceivableForm categoryOptions={categories(data)} item={receivable.item} onSave={save} onClose={() => setReceivable(undefined)} />}
      {editing && <ItemDetails item={editing} onSave={save} onClose={() => setEditing(undefined)} />}
      {showSimulator && data && (
        <PurchaseSimulatorModal
          data={data}
          month={month}
          onSave={save}
          onClose={() => setShowSimulator(false)}
        />
      )}

      <dialog ref={confirmation} onCancel={e => { e.preventDefault(); if (!busy) setConfirm(undefined); }} aria-labelledby="confirm-title">
        <header>
          <h2 id="confirm-title">Confirmar alteração</h2>
          <button className="ghost" onClick={() => setConfirm(undefined)}>×</button>
        </header>
        <p>{confirm?.text}</p>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="actions">
          <button className="secondary" disabled={busy} onClick={() => setConfirm(undefined)}>Voltar</button>
          <button disabled={busy} onClick={runConfirm}>{busy ? 'Salvando…' : 'Confirmar'}</button>
        </div>
      </dialog>
    </>
  );
}

export default FinBotApp;
