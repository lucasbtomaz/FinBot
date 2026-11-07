import { 
  Snapshot, 
  Command, 
  Account, 
  Card, 
  Item, 
  Purchase, 
  Invoice, 
  Payment, 
  Investment, 
  Plan, 
  TaxRecord 
} from './api';

interface StoredDb {
  accounts: Account[];
  cards: Card[];
  items: Item[];
  purchases: Purchase[];
  payments: Payment[];
  allocations: { paymentId: string; itemId: string; amountCents: number }[];
  cashMovements: { id: string; accountId: string; amountCents: number; date: string; paymentId: string }[];
  investments: Investment[];
  plans: Plan[];
  taxRecords: TaxRecord[];
  processedRequests: Record<string, { payload: string; result: string }>;
}

const STORAGE_KEY = 'finbot_local_db_v1';

export function getSpreadsheetPresetItems(): Item[] {
  const items: Item[] = [];

  const novBills = [
    { name: 'Tennis Bar (Yasmin)', day: 10, cents: 7124, category: 'Outras Despesas' },
    { name: 'Moto', day: 15, cents: 93300, category: 'Transporte / Moto' },
    { name: 'Acordo Assai (Lucas)', day: 17, cents: 3755, category: 'Acordo / Dívida' },
    { name: 'Agil', day: 17, cents: 18557, category: 'Empréstimo' },
    { name: 'Acordo BMG - Serasa', day: 24, cents: 1910, category: 'Acordo / Serasa' },
    { name: 'Placa de Video - Igor', day: 25, cents: 75000, category: 'Eletrônicos / Igor' },
    { name: 'Empréstimo Irmã', day: 27, cents: 51124, category: 'Empréstimo Família' },
    { name: 'Plano Odontológico - Odontocompany', day: 27, cents: 2499, category: 'Saúde / Odonto' },
    { name: 'Emprestimo - Pan (Moto)', day: 30, cents: 114439, category: 'Empréstimo Pan' },
    { name: 'RECEITA FEDERAL', day: 30, cents: 9425, category: 'Impostos / Tributos' },
    { name: 'Empréstimo Nubank', day: 30, cents: 10895, category: 'Empréstimo Nubank' },
    { name: 'Acordo Santander', day: 30, cents: 6768, category: 'Acordo Santander' }
  ];

  const dezBills = [
    { name: 'SHOPEE', day: 6, cents: 10727, category: 'Compras / Shopee' },
    { name: 'Super Sim', day: 8, cents: 20000, category: 'Empréstimo' },
    { name: 'Tennis Bar (Yasmin)', day: 10, cents: 7124, category: 'Outras Despesas' },
    { name: 'Moto', day: 15, cents: 93300, category: 'Transporte / Moto' },
    { name: 'Acordo Assai (Lucas)', day: 17, cents: 3755, category: 'Acordo / Dívida' },
    { name: 'Agil', day: 17, cents: 18557, category: 'Empréstimo' },
    { name: 'Acordo BMG - Serasa', day: 24, cents: 1910, category: 'Acordo / Serasa' },
    { name: 'Placa de Video - Igor', day: 25, cents: 75000, category: 'Eletrônicos / Igor' },
    { name: 'Empréstimo Irmã', day: 27, cents: 51124, category: 'Empréstimo Família' },
    { name: 'Plano Odontológico - Odontocompany', day: 27, cents: 2499, category: 'Saúde / Odonto' },
    { name: 'Emprestimo - Pan (Moto)', day: 30, cents: 114439, category: 'Empréstimo Pan' },
    { name: 'RECEITA FEDERAL', day: 30, cents: 9425, category: 'Impostos / Tributos' },
    { name: 'Empréstimo Nubank', day: 31, cents: 10895, category: 'Empréstimo Nubank' },
    { name: 'Acordo Santander', day: 31, cents: 6768, category: 'Acordo Santander' }
  ];

  for (const b of novBills) {
    items.push({
      id: `preset-nov-${b.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: b.name,
      kind: 'pagar',
      amountCents: b.cents,
      paidCents: 0,
      remainingCents: b.cents,
      dueDate: `2026-11-${String(b.day).padStart(2, '0')}`,
      category: b.category,
      purchaseId: '',
      cardId: '',
      number: 1,
      count: 1,
      cancelled: false,
      planId: '',
      paymentMethod: 'outro',
      baseCents: b.cents,
      extraCents: 0,
      note: 'Item da planilha',
      payer: '',
      confidence: 'confirmado',
      receivableCadence: 'mensal',
      notifyDaysBefore: 3
    });
  }

  for (const b of dezBills) {
    items.push({
      id: `preset-dez-${b.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: b.name,
      kind: 'pagar',
      amountCents: b.cents,
      paidCents: 0,
      remainingCents: b.cents,
      dueDate: `2026-12-${String(b.day).padStart(2, '0')}`,
      category: b.category,
      purchaseId: '',
      cardId: '',
      number: 1,
      count: 1,
      cancelled: false,
      planId: '',
      paymentMethod: 'outro',
      baseCents: b.cents,
      extraCents: 0,
      note: 'Item da planilha',
      payer: '',
      confidence: 'confirmado',
      receivableCadence: 'mensal',
      notifyDaysBefore: 3
    });
  }

  return items;
}

function getInitialDb(): StoredDb {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.items && parsed.items.length > 0) {
        parsed.items.forEach((item: Item) => {
          if (item.kind === 'pagar' && item.notifyDaysBefore === undefined) {
            item.notifyDaysBefore = 3;
          }
        });
        // Ensure cards have limitCents and closingDay
        if (!parsed.cards || parsed.cards.length === 0 || !parsed.cards.some((c: any) => c.name.includes('Bradesco'))) {
          parsed.cards = [
            { id: 'card-bradesco', name: 'Bradesco', dueDay: 5, closingDay: 25, limitCents: 500000, bank: 'bradesco', accountName: 'Bradesco' },
            { id: 'card-nubank', name: 'Nubank', dueDay: 21, closingDay: 14, limitCents: 83715, bank: 'nubank', accountName: 'Nubank' }
          ];
        }
        // Ensure investments has Cofrinho and Viagem
        if (!parsed.investments || parsed.investments.length <= 1 || !parsed.investments.some((i: any) => i.name.includes('Cofrinho'))) {
          parsed.investments = [
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
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar banco local, criando novo:', e);
    }
  }

  // Initial database seeded with user spreadsheet items and accounts
  return {
    accounts: [
      { id: 'acc-nubank', name: 'Conta Principal (Nubank)', kind: 'conta', balanceCents: 450000 },
      { id: 'acc-reserva', name: 'Reserva de Emergência', kind: 'reserva', balanceCents: 100000 }
    ],
    cards: [
      { id: 'card-bradesco', name: 'Bradesco', dueDay: 5, closingDay: 25, limitCents: 500000, bank: 'bradesco', accountName: 'Bradesco' },
      { id: 'card-nubank', name: 'Nubank', dueDay: 21, closingDay: 14, limitCents: 83715, bank: 'nubank', accountName: 'Nubank' }
    ],
    items: getSpreadsheetPresetItems(),
    purchases: [],
    payments: [],
    allocations: [],
    cashMovements: [],
    investments: [
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
    ],
    plans: [],
    taxRecords: [],
    processedRequests: {}
  };
}


let db: StoredDb = getInitialDb();

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatInvoiceId(cardId: string, dueDate: string): string {
  return `${cardId}|${dueDate}`;
}

export function generateSnapshot(month: string): Snapshot {
  const activeItems = db.items.filter(x => !x.cancelled);
  const monthlyItems = activeItems.filter(x => x.dueDate.startsWith(month + '-'));

  // Group invoices
  const invoiceMap = new Map<string, { cardId: string; dueDate: string; amountCents: number; paidCents: number }>();
  for (const item of activeItems) {
    if (item.cardId) {
      const invId = formatInvoiceId(item.cardId, item.dueDate);
      const existing = invoiceMap.get(invId);
      if (existing) {
        existing.amountCents += item.amountCents;
        existing.paidCents += item.paidCents;
      } else {
        invoiceMap.set(invId, {
          cardId: item.cardId,
          dueDate: item.dueDate,
          amountCents: item.amountCents,
          paidCents: item.paidCents
        });
      }
    }
  }

  const invoices: Invoice[] = Array.from(invoiceMap.entries()).map(([id, inv]) => ({
    id,
    cardId: inv.cardId,
    dueDate: inv.dueDate,
    amountCents: inv.amountCents,
    paidCents: inv.paidCents,
    remainingCents: Math.max(0, inv.amountCents - inv.paidCents)
  })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const availableCents = db.accounts
    .filter(x => x.kind === 'conta')
    .reduce((sum, x) => sum + x.balanceCents, 0);

  const reservedCents = db.accounts
    .filter(x => x.kind === 'reserva')
    .reduce((sum, x) => sum + x.balanceCents, 0);

  const expenseCents = monthlyItems
    .filter(x => x.kind === 'pagar')
    .reduce((sum, x) => sum + x.amountCents, 0);

  const toPayCents = monthlyItems
    .filter(x => x.kind === 'pagar')
    .reduce((sum, x) => sum + x.remainingCents, 0);

  const toReceiveCents = monthlyItems
    .filter(x => x.kind === 'receber')
    .reduce((sum, x) => sum + x.remainingCents, 0);

  const purchases: Purchase[] = db.purchases.map(p => ({
    ...p,
    canCancel: !db.allocations.some(a => {
      const it = db.items.find(i => i.id === a.itemId);
      return it?.purchaseId === p.id && a.amountCents > 0;
    })
  }));

  return {
    month,
    availableCents,
    reservedCents,
    expenseCents,
    toPayCents,
    toReceiveCents,
    accounts: [...db.accounts],
    cards: [...db.cards],
    items: [...db.items],
    purchases,
    invoices,
    payments: [...db.payments].reverse(),
    investments: [...db.investments],
    plans: [...db.plans],
    taxRecords: [...db.taxRecords],
    receiptEnabled: true,
    receiptDirectory: 'Documentos/FinBot/Comprovantes'
  };
}

export function executeCommand(cmd: Command, requestId: string, month: string): string {
  const id = crypto.randomUUID();

  switch (cmd.action) {
    case 'addAccount': {
      const name = String(cmd.name || '').trim();
      const kind = String(cmd.kind || 'conta');
      const amountCents = Number(cmd.amountCents || 0);

      if (!name) throw new Error('Informe um nome para a conta.');
      if (db.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Já existe uma conta com esse nome.');
      }
      if (kind !== 'conta' && kind !== 'reserva') {
        throw new Error('Tipo de conta inválido.');
      }

      db.accounts.push({ id, name, kind, balanceCents: amountCents });
      saveDb();
      return id;
    }

    case 'adjustBalance': {
      const targetId = String(cmd.targetId);
      const amountCents = Number(cmd.amountCents || 0);
      const acc = db.accounts.find(a => a.id === targetId);
      if (!acc) throw new Error('Conta não encontrada.');

      const diff = amountCents - acc.balanceCents;
      acc.balanceCents = amountCents;

      db.payments.push({
        id,
        name: `Ajuste de saldo: ${acc.name}`,
        accountId: acc.id,
        date: new Date().toISOString().slice(0, 10),
        amountCents: Math.abs(diff),
        reversed: false,
        receiptPath: ''
      });

      saveDb();
      return id;
    }

    case 'addCard': {
      const name = String(cmd.name || '').trim();
      const dueDay = Number(cmd.dueDay || 1);

      if (!name) throw new Error('Informe o nome do cartão.');
      if (dueDay < 1 || dueDay > 31) throw new Error('Dia de vencimento deve estar entre 1 e 31.');
      if (db.cards.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Já existe um cartão com esse nome.');
      }

      const closingDay = dueDay > 7 ? dueDay - 7 : dueDay + 23;
      db.cards.push({ id, name, dueDay, closingDay, limitCents: 0 });
      saveDb();
      return id;
    }

    case 'addItem': {
      const name = String(cmd.name || '').trim();
      const category = String(cmd.category || '').trim();
      const kind = String(cmd.kind || 'pagar');
      const amountCents = Number(cmd.amountCents || 0);
      const date = String(cmd.date || new Date().toISOString().slice(0, 10));
      const paymentMethod = String(cmd.paymentMethod || 'outro');
      const note = String(cmd.note || '');
      const notifyDaysBefore = cmd.notifyDaysBefore !== undefined && cmd.notifyDaysBefore !== null && cmd.notifyDaysBefore !== '' 
        ? Number(cmd.notifyDaysBefore) 
        : undefined;

      if (!name) throw new Error('Informe um nome.');
      if (amountCents <= 0) throw new Error('Valor inválido.');

      db.items.push({
        id,
        name,
        kind,
        amountCents,
        paidCents: 0,
        remainingCents: amountCents,
        dueDate: date,
        category,
        purchaseId: '',
        cardId: '',
        number: 1,
        count: 1,
        cancelled: false,
        planId: '',
        paymentMethod,
        baseCents: amountCents,
        extraCents: 0,
        note,
        payer: '',
        confidence: 'incerto',
        receivableCadence: 'unico',
        notifyDaysBefore
      });

      if (cmd.trackIr) {
        db.taxRecords.push({
          id: crypto.randomUUID(),
          sourceType: 'item',
          sourceId: id,
          name,
          document: '',
          category,
          note,
          confirmed: false
        });
      }

      saveDb();
      return id;
    }

    case 'addPlan': {
      const name = String(cmd.name || '').trim();
      const category = String(cmd.category || '').trim();
      const kind = String(cmd.kind || 'pagar');
      const amountCents = Number(cmd.amountCents || 0);
      const count = Number(cmd.count || 1);
      const paidCount = Number(cmd.paidCount || 0);
      const firstDate = String(cmd.date || new Date().toISOString().slice(0, 10));
      const cadence = String(cmd.cadence || 'mensal');
      const notifyDaysBefore = cmd.notifyDaysBefore !== undefined && cmd.notifyDaysBefore !== null && cmd.notifyDaysBefore !== '' 
        ? Number(cmd.notifyDaysBefore) 
        : undefined;

      const planId = id;
      db.plans.push({
        id: planId,
        name,
        paymentMethod: String(cmd.paymentMethod || 'outro'),
        cadence,
        baseCents: amountCents,
        startDate: firstDate,
        count,
        kind,
        category,
        cancelled: false
      });

      const [yearStr, monthStr, dayStr] = firstDate.split('-');
      let curYear = parseInt(yearStr, 10);
      let curMonth = parseInt(monthStr, 10);
      const originalDay = parseInt(dayStr || '10', 10);

      for (let n = 0; n < count; n++) {
        let dueDate = '';
        if (cadence === 'semanal') {
          const d = new Date(firstDate + 'T12:00:00');
          d.setDate(d.getDate() + 7 * n);
          dueDate = d.toISOString().slice(0, 10);
        } else {
          const day = Math.min(originalDay, daysInMonth(curYear, curMonth));
          dueDate = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          curMonth++;
          if (curMonth > 12) {
            curMonth = 1;
            curYear++;
          }
        }

        const isPaid = n < paidCount;
        const paidCents = isPaid ? amountCents : 0;

        db.items.push({
          id: crypto.randomUUID(),
          name,
          kind,
          amountCents,
          paidCents,
          remainingCents: amountCents - paidCents,
          dueDate,
          category,
          purchaseId: '',
          cardId: '',
          number: n + 1,
          count,
          cancelled: false,
          planId,
          paymentMethod: String(cmd.paymentMethod || 'outro'),
          baseCents: amountCents,
          extraCents: 0,
          note: '',
          payer: '',
          confidence: 'confirmado',
          receivableCadence: cadence,
          notifyDaysBefore
        });
      }
      saveDb();
      return planId;
    }

    case 'addPurchase': {
      const name = String(cmd.name || '').trim();
      const category = String(cmd.category || '').trim();
      const cardId = String(cmd.cardId);
      const amountCents = Number(cmd.amountCents || 0);
      const count = Number(cmd.count || 1);
      const paidCount = Number(cmd.paidCount || 0);
      const firstDate = String(cmd.date || new Date().toISOString().slice(0, 10));

      const card = db.cards.find(c => c.id === cardId);
      if (!card) throw new Error('Selecione um cartão.');
      if (count < 1 || count > 120) throw new Error('Número de parcelas deve ser de 1 a 120.');

      const [yearStr, monthStr] = firstDate.split('-');
      let curYear = parseInt(yearStr, 10);
      let curMonth = parseInt(monthStr, 10);

      db.purchases.push({
        id,
        name,
        cardId,
        amountCents,
        count,
        cancelled: false,
        canCancel: true
      });

      const baseInstallment = Math.floor(amountCents / count);
      const remainder = amountCents % count;

      for (let n = 0; n < count; n++) {
        const installmentAmount = baseInstallment + (n < remainder ? 1 : 0);
        const day = Math.min(card.dueDay, daysInMonth(curYear, curMonth));
        const dueDate = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isPaid = n < paidCount;
        const paidCents = isPaid ? installmentAmount : 0;

        db.items.push({
          id: crypto.randomUUID(),
          name,
          kind: 'pagar',
          amountCents: installmentAmount,
          paidCents,
          remainingCents: installmentAmount - paidCents,
          dueDate,
          category,
          purchaseId: id,
          cardId: card.id,
          number: n + 1,
          count,
          cancelled: false,
          planId: '',
          paymentMethod: 'cartao',
          baseCents: installmentAmount,
          extraCents: 0,
          note: '',
          payer: '',
          confidence: 'confirmado',
          receivableCadence: 'unico'
        });

        curMonth++;
        if (curMonth > 12) {
          curMonth = 1;
          curYear++;
        }
      }

      if (cmd.trackIr) {
        db.taxRecords.push({
          id: crypto.randomUUID(),
          sourceType: 'purchase',
          sourceId: id,
          name,
          document: '',
          category,
          note: '',
          confirmed: false
        });
      }

      saveDb();
      return id;
    }

    case 'payInvoice':
    case 'payItem':
    case 'settleItem': {
      const targetId = String(cmd.targetId);
      const accountId = String(cmd.accountId);
      const amountCents = Number(cmd.amountCents || 0);
      const date = String(cmd.date || new Date().toISOString().slice(0, 10));

      const acc = db.accounts.find(a => a.id === accountId);
      if (!acc) throw new Error('Selecione uma conta para a baixa.');

      let targets: Item[] = [];
      let paymentName = 'Pagamento de fatura';

      if (cmd.action === 'payInvoice') {
        targets = db.items.filter(x => !x.cancelled && x.cardId && formatInvoiceId(x.cardId, x.dueDate) === targetId);
      } else {
        const item = db.items.find(x => x.id === targetId && !x.cancelled);
        if (!item) throw new Error('Lançamento não encontrado.');
        targets = [item];
        paymentName = `${item.kind === 'pagar' ? 'Pagamento' : 'Recebimento'}: ${item.name}`;
      }

      const remainingTotal = targets.reduce((sum, x) => sum + x.remainingCents, 0);
      if (targets.length === 0 || amountCents > remainingTotal) {
        throw new Error('Valor maior que o saldo pendente.');
      }

      const isRecebimento = targets[0]?.kind === 'receber';
      const direction = isRecebimento ? 1 : -1;

      if (!isRecebimento && acc.kind === 'reserva' && acc.balanceCents < amountCents) {
        throw new Error('Saldo insuficiente na reserva.');
      }

      db.payments.push({
        id,
        name: paymentName,
        accountId: acc.id,
        date,
        amountCents,
        reversed: false,
        receiptPath: ''
      });

      acc.balanceCents += direction * amountCents;

      let leftToPay = amountCents;
      for (const item of targets) {
        const alloc = Math.min(leftToPay, item.remainingCents);
        if (alloc > 0) {
          item.paidCents += alloc;
          item.remainingCents = item.amountCents - item.paidCents;
          db.allocations.push({ paymentId: id, itemId: item.id, amountCents: alloc });
          leftToPay -= alloc;
        }
      }

      saveDb();
      return id;
    }

    case 'transfer': {
      const fromId = String(cmd.accountId);
      const toId = String(cmd.targetId);
      const amountCents = Number(cmd.amountCents || 0);
      const date = String(cmd.date || new Date().toISOString().slice(0, 10));

      const fromAcc = db.accounts.find(a => a.id === fromId);
      const toAcc = db.accounts.find(a => a.id === toId);

      if (!fromAcc || !toAcc) throw new Error('Selecione contas válidas.');
      if (fromAcc.id === toAcc.id) throw new Error('Origem e destino devem ser diferentes.');
      if (fromAcc.balanceCents < amountCents) throw new Error('Saldo insuficiente para transferir.');

      fromAcc.balanceCents -= amountCents;
      toAcc.balanceCents += amountCents;

      db.payments.push({
        id,
        name: `Transferência: ${fromAcc.name} → ${toAcc.name}`,
        accountId: fromAcc.id,
        date,
        amountCents,
        reversed: false,
        receiptPath: ''
      });

      saveDb();
      return id;
    }

    case 'reversePayment': {
      const targetId = String(cmd.targetId);
      const payment = db.payments.find(p => p.id === targetId && !p.reversed);
      if (!payment) throw new Error('Baixa não encontrada ou já desfeita.');

      payment.reversed = true;

      const paymentAllocs = db.allocations.filter(a => a.paymentId === payment.id);
      for (const alloc of paymentAllocs) {
        const item = db.items.find(i => i.id === alloc.itemId);
        if (item) {
          item.paidCents = Math.max(0, item.paidCents - alloc.amountCents);
          item.remainingCents = item.amountCents - item.paidCents;
        }
      }

      const acc = db.accounts.find(a => a.id === payment.accountId);
      if (acc) {
        acc.balanceCents += payment.amountCents;
      }

      saveDb();
      return id;
    }

    case 'addReceivable': {
      const name = String(cmd.name || '').trim();
      const category = String(cmd.category || '').trim();
      const payer = String(cmd.payer || '').trim();
      const amountCents = Number(cmd.amountCents || 0);
      const confidence = String(cmd.confidence || 'confirmado');
      const cadence = String(cmd.cadence || 'unico');
      const note = String(cmd.note || '');
      const count = Number(cmd.count || 1);
      const firstDate = cmd.date ? String(cmd.date) : '';

      if (!name) throw new Error('Informe o nome do recebível.');
      if (amountCents <= 0) throw new Error('Valor inválido.');

      for (let n = 0; n < count; n++) {
        const itemId = n === 0 ? id : crypto.randomUUID();
        let dueDate = firstDate;
        if (firstDate && cadence !== 'unico') {
          const d = new Date(firstDate);
          if (cadence === 'semanal') d.setDate(d.getDate() + 7 * n);
          else d.setMonth(d.getMonth() + n);
          dueDate = d.toISOString().slice(0, 10);
        }

        db.items.push({
          id: itemId,
          name,
          kind: 'receber',
          amountCents,
          paidCents: 0,
          remainingCents: amountCents,
          dueDate,
          category,
          purchaseId: '',
          cardId: '',
          number: n + 1,
          count,
          cancelled: false,
          planId: '',
          paymentMethod: 'outro',
          baseCents: amountCents,
          extraCents: 0,
          note,
          payer,
          confidence,
          receivableCadence: cadence
        });
      }

      saveDb();
      return id;
    }

    case 'addInvestment': {
      const name = String(cmd.name || '').trim();
      const institution = String(cmd.institution || '').trim();
      const subtitle = String(cmd.subtitle || '').trim();
      const kind = String(cmd.kind || 'cofrinho');
      const valueCents = Number(cmd.valueCents || cmd.amountCents || 0);
      const investedCents = Number(cmd.investedCents || valueCents);
      const targetCents = Number(cmd.targetCents || 0);
      const targetDate = String(cmd.targetDate || '');
      const monthPrefix = String(cmd.month || new Date().toISOString().slice(0, 7));

      db.investments.push({
        id,
        name,
        kind,
        institution,
        subtitle,
        accountId: '',
        targetCents,
        targetDate,
        values: [
          { month: monthPrefix, investedCents, valueCents }
        ]
      });

      if (kind === 'reserva') {
        db.accounts.push({ id, name, kind: 'reserva', balanceCents: valueCents });
      }

      saveDb();
      return id;
    }

    case 'updateInvestmentValue': {
      const investmentId = String(cmd.investmentId);
      const monthPrefix = String(cmd.month);
      const valueCents = Number(cmd.valueCents || 0);
      const investedCents = Number(cmd.investedCents || valueCents);

      const inv = db.investments.find(i => i.id === investmentId);
      if (!inv) throw new Error('Investimento não encontrado.');

      const existingVal = inv.values.find(v => v.month === monthPrefix);
      if (existingVal) {
        existingVal.valueCents = valueCents;
        existingVal.investedCents = investedCents;
      } else {
        inv.values.push({ month: monthPrefix, investedCents, valueCents });
        inv.values.sort((a, b) => a.month.localeCompare(b.month));
      }

      saveDb();
      return investmentId;
    }

    case 'saveTaxRecord': {
      const targetId = String(cmd.targetId);
      const name = String(cmd.name || '').trim();
      const document = String(cmd.document || '').trim();
      const category = String(cmd.category || '').trim();
      const note = String(cmd.note || '').trim();

      const rec = db.taxRecords.find(t => t.id === targetId);
      if (rec) {
        rec.name = name;
        rec.document = document;
        rec.category = category;
        rec.note = note;
        rec.confirmed = true;
      }

      saveDb();
      return targetId;
    }

    case 'openReceipt': {
      return id;
    }

    case 'unpayItem': {
      const targetId = String(cmd.targetId);
      const item = db.items.find(x => x.id === targetId && !x.cancelled);
      if (!item) throw new Error('Lançamento não encontrado.');
      if (item.paidCents === 0) throw new Error('Esta conta já está pendente.');

      const allocs = db.allocations.filter(a => a.itemId === item.id && a.amountCents > 0);
      for (const alloc of allocs) {
        const payment = db.payments.find(p => p.id === alloc.paymentId);
        if (payment && !payment.reversed) {
          const acc = db.accounts.find(a => a.id === payment.accountId);
          if (acc) {
            acc.balanceCents += alloc.amountCents;
          }
          alloc.amountCents = 0;
          payment.reversed = true;
        }
      }

      item.paidCents = 0;
      item.remainingCents = item.amountCents;
      saveDb();
      return item.id;
    }

    case 'loadSpreadsheetPreset': {
      db.items = getSpreadsheetPresetItems();
      const mainAcc = db.accounts.find(a => a.kind === 'conta') || db.accounts[0];
      if (mainAcc) {
        mainAcc.balanceCents = 450000;
      }
      saveDb();
      return id;
    }

    default:
      console.warn('Comando não reconhecido:', cmd.action);
      return id;
  }
}

/**
 * Installs the virtual window.chrome.webview bridge if running on the web
 */
export function setupWebBridge() {
  if (typeof window === 'undefined' || window.chrome?.webview) {
    return;
  }

  const listeners = new Set<(event: MessageEvent) => void>();

  window.chrome = {
    webview: {
      postMessage(value: unknown) {
        const req = value as { type: string; requestId: string; month: string; command?: Command };
        setTimeout(() => {
          try {
            if (req.type === 'command' && req.command) {
              executeCommand(req.command, req.requestId, req.month);
            }
            const data = generateSnapshot(req.month);
            const responseEvent = new MessageEvent('message', {
              data: {
                requestId: req.requestId,
                ok: true,
                data
              }
            });
            listeners.forEach(cb => cb(responseEvent));
          } catch (err: any) {
            const errorEvent = new MessageEvent('message', {
              data: {
                requestId: req.requestId,
                ok: false,
                error: err?.message || 'Erro ao processar solicitação'
              }
            });
            listeners.forEach(cb => cb(errorEvent));
          }
        }, 10);
      },
      addEventListener(type: string, callback: (event: MessageEvent) => void) {
        if (type === 'message') {
          listeners.add(callback);
        }
      },
      removeEventListener(type: string, callback: (event: MessageEvent) => void) {
        if (type === 'message') {
          listeners.delete(callback);
        }
      }
    } as any
  };
}
