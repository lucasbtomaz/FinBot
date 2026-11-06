import {money,type Snapshot} from '../api';
import './FinancialMetrics.css';

export function FinancialMetrics({data,month}:{data:Snapshot;month:string}){
 const invested=(data.investments??[]).reduce((sum,investment)=>sum+(investment.values.filter(value=>value.month<=month).at(-1)?.valueCents??0),0);
 return <section className="metrics" aria-label="Resumo financeiro">
  <article><p>Disponível em contas</p><strong data-testid="available">{money(data.availableCents)}</strong><small>Saldo atual · investimentos separados</small></article>
  <article><p>A receber no mês · total</p><strong className="green" data-testid="to-receive">{money(data.toReceiveCents)}</strong><small>Ainda não entrou nas contas</small></article>
  <article><p>Despesas do mês</p><strong className="red" data-testid="expense">{money(data.expenseCents)}</strong><small>Pagas + pendentes · por vencimento</small></article>
  <article><p>Investimentos</p><strong className="purple-text" data-testid="invested-total">{money(invested)}</strong><small>Últimos registros até o mês selecionado</small></article>
 </section>;
}
