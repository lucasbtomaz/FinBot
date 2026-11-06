import { parseMoney, money } from './api';

export function purchaseTotal(amountStr: string, basis: string, count: number): number {
  const baseCents = parseMoney(amountStr);
  if (basis === 'parcela') {
    return baseCents * Math.max(1, count);
  }
  return baseCents;
}

export function purchasePreview(totalCents: number, count: number): string {
  const safeCount = Math.max(1, count);
  const installmentCents = Math.round(totalCents / safeCount);
  return `${safeCount} × ${money(installmentCents)} = ${money(totalCents)}`;
}
