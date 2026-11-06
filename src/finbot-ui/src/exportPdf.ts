import { jsPDF } from 'jspdf';
import { money, dateLabel, type Snapshot, type Item } from './api';

export function exportMonthlyFinancialPdf(data: Snapshot, month: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Month formatted
  const [yearStr, monthStr] = month.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthName = monthNames[monthIndex] || monthStr;
  const formattedMonthLabel = `${monthName} de ${yearStr}`;

  // Expenses for the month
  const monthlyExpenses = data.items
    .filter(x => !x.cancelled && x.kind === 'pagar' && (x.dueDate ? x.dueDate.startsWith(month) : false))
    .sort((a, b) => {
      const dayA = parseInt(a.dueDate.slice(8, 10), 10) || 0;
      const dayB = parseInt(b.dueDate.slice(8, 10), 10) || 0;
      return dayA - dayB;
    });

  const totalDespesas = monthlyExpenses.reduce((sum, x) => sum + x.amountCents, 0);
  const totalPago = monthlyExpenses.reduce((sum, x) => sum + x.paidCents, 0);
  const totalFaltaPagar = monthlyExpenses.reduce((sum, x) => sum + x.remainingCents, 0);
  const percentPago = totalDespesas > 0 ? Math.round((totalPago / totalDespesas) * 100) : 0;
  const saldoAtual = data.availableCents;
  const saldoProjetado = saldoAtual + data.toReceiveCents - totalFaltaPagar;

  // Category summary
  const categoryMap = new Map<string, { amountCents: number; paidCents: number; count: number }>();
  for (const item of monthlyExpenses) {
    const cat = item.category?.trim() || 'Outras Despesas';
    const cur = categoryMap.get(cat) || { amountCents: 0, paidCents: 0, count: 0 };
    cur.amountCents += item.amountCents;
    cur.paidCents += item.paidCents;
    cur.count += 1;
    categoryMap.set(cat, cur);
  }
  const categoryList = Array.from(categoryMap.entries())
    .map(([cat, stats]) => ({
      name: cat,
      amountCents: stats.amountCents,
      paidCents: stats.paidCents,
      count: stats.count,
      percent: totalDespesas > 0 ? Math.round((stats.amountCents / totalDespesas) * 100) : 0
    }))
    .sort((a, b) => b.amountCents - a.amountCents);

  // Helper: check page break
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = margin;
      renderPageHeader();
    }
  };

  const renderPageHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`FinBot · Relatório Financeiro Mensal · ${formattedMonthLabel}`, margin, y - 4);
    doc.setDrawColor(220, 225, 230);
    doc.line(margin, y - 2, margin + contentWidth, y - 2);
  };

  // =====================
  // 1. TOP HEADER BANNER
  // =====================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // FinBot logo text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FinBot', margin + 7, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Relatório Financeiro & Demonstrativo Mensal', margin + 7, y + 15);
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin + 7, y + 20);

  // Right side badge in header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(margin + contentWidth - 62, y + 5, 56, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text('MÊS DE REFERÊNCIA', margin + contentWidth - 60, y + 10.5);
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(formattedMonthLabel, margin + contentWidth - 60, y + 16.5);

  y += 32;

  // =====================
  // 2. EXECUTIVE METRICS CARDS (4 cards)
  // =====================
  const cardW = (contentWidth - 9) / 4;
  const cardH = 20;

  const metrics = [
    { label: 'TOTAL DESPESAS', val: money(totalDespesas), sub: `${monthlyExpenses.length} contas listadas`, color: [30, 41, 59] },
    { label: 'JÁ QUITADO', val: money(totalPago), sub: `${percentPago}% do orçamento pago`, color: [16, 185, 129] },
    { label: 'FALTA PAGAR', val: money(totalFaltaPagar), sub: `${monthlyExpenses.filter(x => x.remainingCents > 0).length} pendentes`, color: [244, 63, 94] },
    { label: 'SALDO DISPONÍVEL', val: money(saldoAtual), sub: saldoProjetado < 0 ? 'Déficit no fechamento' : 'Caixa positivo', color: [2, 132, 199] }
  ];

  metrics.forEach((m, idx) => {
    const cx = margin + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'FD');

    // Accent line at top of card
    doc.setFillColor(m.color[0], m.color[1], m.color[2]);
    doc.rect(cx + 2, y, cardW - 4, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, cx + 3.5, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, cx + 3.5, y + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.sub, cx + 3.5, y + 17);
  });

  y += cardH + 7;

  // =====================
  // 3. CATEGORIES SUMMARY
  // =====================
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Distribuição de Gastos por Categoria', margin, y);
  y += 4;

  // Mini table for categories (2 columns of cards/rows)
  const catRowH = 6.2;
  const catColW = (contentWidth - 6) / 2;

  categoryList.slice(0, 8).forEach((cat, idx) => {
    const isSecondCol = idx % 2 === 1;
    const rowIndex = Math.floor(idx / 2);
    const rowY = y + rowIndex * (catRowH + 2);
    const colX = isSecondCol ? margin + catColW + 6 : margin;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(235, 240, 245);
    doc.roundedRect(colX, rowY, catColW, catRowH, 1.5, 1.5, 'FD');

    // Progress bar inside
    const barW = Math.max(2, (catColW - 8) * (cat.percent / 100));
    doc.setFillColor(224, 231, 255);
    doc.rect(colX + 3, rowY + catRowH - 1.8, catColW - 6, 1, 'F');
    doc.setFillColor(99, 102, 241);
    doc.rect(colX + 3, rowY + catRowH - 1.8, barW, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${cat.name} (${cat.count})`, colX + 3.5, rowY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${money(cat.amountCents)} (${cat.percent}%)`, colX + catColW - 4, rowY + 3.5, { align: 'right' });
  });

  const catRowsCount = Math.ceil(Math.min(categoryList.length, 8) / 2);
  y += catRowsCount * (catRowH + 2) + 6;

  // =====================
  // 4. DETAILED BILLS TABLE
  // =====================
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. Detalhamento de Lançamentos do Mês (${monthlyExpenses.length} contas)`, margin, y);
  y += 5;

  // Table Columns
  // Dia (12mm) | Descrição (60mm) | Categoria (36mm) | Valor Total (25mm) | Pago (24mm) | Falta (25mm)
  const cols = [
    { header: 'VENC.', width: 14, align: 'center' },
    { header: 'DESCRIÇÃO DA CONTA', width: 62, align: 'left' },
    { header: 'CATEGORIA', width: 34, align: 'left' },
    { header: 'VALOR', width: 24, align: 'right' },
    { header: 'PAGO', width: 24, align: 'right' },
    { header: 'FALTA', width: 24, align: 'right' }
  ];

  // Table Header row
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);

  let currentX = margin;
  cols.forEach(col => {
    const textX = col.align === 'right' ? currentX + col.width - 2 : col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
    doc.text(col.header, textX, y + 4.5, { align: col.align as any });
    currentX += col.width;
  });
  y += 7.5;

  // Table rows
  doc.setFontSize(7.5);

  monthlyExpenses.forEach((item, index) => {
    checkPageBreak(7.5);

    const isEven = index % 2 === 0;
    const isPaid = item.remainingCents === 0;
    const rowH = 6.2;

    if (isEven) {
      doc.setFillColor(252, 253, 255);
      doc.rect(margin, y - 0.5, contentWidth, rowH, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowH - 0.8, margin + contentWidth, y + rowH - 0.8);

    let cellX = margin;

    // 1. Due date day
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const dayStr = item.dueDate ? item.dueDate.slice(8, 10) : '--';
    doc.text(`Dia ${dayStr}`, cellX + cols[0].width / 2, y + 3.8, { align: 'center' });
    cellX += cols[0].width;

    // 2. Name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isPaid ? 100 : 15, isPaid ? 116 : 23, isPaid ? 139 : 42);
    // Truncate name if too long
    const safeName = item.name.length > 36 ? item.name.slice(0, 33) + '…' : item.name;
    doc.text(safeName, cellX + 2, y + 3.8);
    cellX += cols[1].width;

    // 3. Category
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const safeCat = (item.category || 'Outros').length > 20 ? (item.category || 'Outros').slice(0, 18) + '…' : (item.category || 'Outros');
    doc.text(safeCat, cellX + 2, y + 3.8);
    cellX += cols[2].width;

    // 4. Amount
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(money(item.amountCents), cellX + cols[3].width - 2, y + 3.8, { align: 'right' });
    cellX += cols[3].width;

    // 5. Paid
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(item.paidCents > 0 ? 16 : 148, item.paidCents > 0 ? 185 : 163, item.paidCents > 0 ? 129 : 184);
    doc.text(item.paidCents > 0 ? money(item.paidCents) : '-', cellX + cols[4].width - 2, y + 3.8, { align: 'right' });
    cellX += cols[4].width;

    // 6. Remaining
    doc.setFont('helvetica', 'bold');
    if (isPaid) {
      doc.setTextColor(16, 185, 129); // green
      doc.text('PAGO', cellX + cols[5].width - 2, y + 3.8, { align: 'right' });
    } else {
      doc.setTextColor(244, 63, 94); // red
      doc.text(money(item.remainingCents), cellX + cols[5].width - 2, y + 3.8, { align: 'right' });
    }

    y += rowH;
  });

  // Table Totals Footer
  checkPageBreak(12);
  y += 2;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL DO MÊS:', margin + 4, y + 5);

  doc.text(money(totalDespesas), margin + cols[0].width + cols[1].width + cols[2].width + cols[3].width - 2, y + 5, { align: 'right' });
  doc.setTextColor(16, 185, 129);
  doc.text(money(totalPago), margin + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width - 2, y + 5, { align: 'right' });
  doc.setTextColor(244, 63, 94);
  doc.text(money(totalFaltaPagar), margin + contentWidth - 2, y + 5, { align: 'right' });

  y += 13;

  // =====================
  // 5. OBSERVATIONS / SIGN-OFF
  // =====================
  checkPageBreak(25);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('RESUMO DO FLUXO DE CAIXA & STATUS:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const statusMsg = saldoProjetado >= 0
    ? `O saldo disponível em contas de ${money(saldoAtual)} cobre o total pendente de ${money(totalFaltaPagar)}, resultando em sobra projetada de ${money(saldoProjetado)}.`
    : `Atenção: O total pendente de ${money(totalFaltaPagar)} excede o saldo disponível atual de ${money(saldoAtual)}, projetando um saldo final negativo de ${money(saldoProjetado)}. Priorize contas essenciais.`;

  doc.text(statusMsg, margin + 4, y + 10, { maxWidth: contentWidth - 8 });
  doc.text('FinBot · Armazenamento Local Seguro · Documento gerado para controle e arquivamento pessoal.', margin + 4, y + 14.5);

  // =====================
  // 6. PAGE NUMBERS (for all pages)
  // =====================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${p} de ${totalPages} · FinBot Personal Finance · Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      margin + contentWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Trigger download
  const filename = `relatorio-financeiro-finbot-${month}.pdf`;
  doc.save(filename);
}
