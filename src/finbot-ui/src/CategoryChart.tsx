import {money,type Item} from './api';

export function CategoryChart({items,month}:{items:Item[];month:string}){
 const palette=['#8eb5ff','#f2b66d','#81d3a5','#c4a0f0','#f18fa8','#73cdd6','#e1ce72','#e99975','#a9c984','#a7a2f4','#db9ad0','#80bfc2'];
 const categoryKey=(name:string)=>(name.trim()||'Sem categoria').toLocaleLowerCase('pt-BR');
 const categories=[...new Set(items.filter(item=>item.kind==='pagar').map(item=>categoryKey(item.category)))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const colors=new Map(categories.map((key,index)=>[key,palette[index]??('hsl('+((index*137.508)%360)+' 65% 72%)')]));
 const totals=new Map<string,{name:string;cents:number}>();
 for(const item of items){
  if(item.cancelled||item.kind!=='pagar'||!item.dueDate.startsWith(month))continue;
  const name=item.category.trim()||'Sem categoria';
  const key=name.toLocaleLowerCase('pt-BR');
  const group=totals.get(key)??{name,cents:0};
  group.cents+=item.amountCents;
  totals.set(key,group);
 }
 const rows=[...totals.values()].filter(x=>x.cents>0).sort((a,b)=>b.cents-a.cents||a.name.localeCompare(b.name,'pt-BR'));
 const total=rows.reduce((sum,x)=>sum+x.cents,0);
 const max=rows[0]?.cents??1;
 return <section className="panel category-chart" aria-labelledby="category-chart-title">
  <div className="panel-title"><h2 id="category-chart-title">Despesas por categoria</h2><strong>{money(total)}</strong></div>
  <p className="help">Do maior para o menor gasto · pagas e pendentes no mês de vencimento.</p>
  {rows.length?<ul className="category-bars">{rows.map(row=><li key={row.name}>
   <div className="category-label"><span>{row.name}</span><span><strong>{money(row.cents)}</strong><small>{(row.cents/total).toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})} do total</small></span></div>
   <div className="category-track" aria-hidden="true"><div style={{width:(row.cents/max*100)+'%',backgroundColor:colors.get(categoryKey(row.name))}}/></div>
  </li>)}</ul>:<p className="empty">Nenhuma despesa neste mês. Cadastre uma conta com categoria para ver o gráfico.</p>}
 </section>;
}
