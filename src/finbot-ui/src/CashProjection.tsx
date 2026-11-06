import {money,type Snapshot} from './api';
import './CashProjection.css';
export function CashProjection({data,month}:{data:Snapshot;month:string}){
 const income=data.items.filter(item=>!item.cancelled&&item.kind==='receber'&&item.dueDate.startsWith(month)).reduce((sum,item)=>sum+item.amountCents,0);
 const net=income-data.expenseCents;
 return <section className="panel cash-projection" aria-labelledby="cash-projection-title">
 <h2 id="cash-projection-title">Como vou fechar o mês?</h2>
 <div className="monthly-balance"><span><small>Receitas totais</small><strong className="green">{money(income)}</strong></span><b aria-hidden="true">−</b><span><small>Despesas totais</small><strong className="red">{money(data.expenseCents)}</strong></span><b aria-hidden="true">=</b><span><small>Resultado do mês</small><strong className={net<0?'red':'green'} data-testid="monthly-net">{money(net)}</strong></span></div>
 </section>;
}
