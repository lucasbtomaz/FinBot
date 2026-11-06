import {money,type Snapshot} from '../api';
import './MonthlyForecast.css';

export function MonthlyForecast({data,month}:{data:Snapshot;month:string}){
 const forecasts=new Map<string,{pay:number;receive:number}>();
 data.items.filter(item=>!item.cancelled&&item.remainingCents>0&&(item.purchaseId||item.planId)).forEach(item=>{
  const key=item.dueDate.slice(0,7),value=forecasts.get(key)??{pay:0,receive:0};
  if(item.kind==='pagar')value.pay+=item.remainingCents;else value.receive+=item.remainingCents;
  forecasts.set(key,value);
 });
 const months=[...forecasts].sort(([left],[right])=>left.localeCompare(right)).filter(([key,value])=>key>=month&&(value.pay>0||value.receive>0));
 return <section className="panel monthly-forecast" aria-labelledby="monthly-forecast-title">
  <h2 id="monthly-forecast-title">Próximos meses · valores ainda pendentes</h2>
  <div className="forecast-grid">{months.map(([key,value])=><article key={key}><strong>{key.slice(5)}/{key.slice(0,4)}</strong><small>A pagar</small><span>{money(value.pay)}</span>{value.receive>0&&<small>A receber {money(value.receive)}</small>}</article>)}</div>
  {!months.length&&<p className="empty">Nenhum valor parcelado ou recorrente pendente nos próximos meses.</p>}
 </section>;
}
