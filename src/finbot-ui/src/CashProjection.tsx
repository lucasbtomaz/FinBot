import {useState} from 'react';
import {money,today,dateLabel,type Snapshot} from './api';
import {projectCash} from './projectionMath';
const label=(month:string)=>month.slice(5)+'/'+month.slice(0,4);
const tone=(value:number)=>value<0?'red':value>0?'green':'projection-neutral';
const result=(value:number)=>value<0?'Vai faltar':value>0?'Sobra prevista':'No limite';
export function CashProjection({data,month}:{data:Snapshot;month:string}){
 const asOf=today();
 const months=projectCash(data.items,data.availableCents,asOf);
 const selected=months.find(x=>x.month===month);
 const next=months.find(x=>x.month>month);
 const [expanded,setExpanded]=useState(false);
 const pending=data.items.filter(x=>!x.cancelled&&x.remainingCents>0);
 const overdue=pending.filter(x=>x.dueDate&&x.dueDate<asOf);
 const overdueOut=overdue.filter(x=>x.kind==='pagar').reduce((s,x)=>s+x.remainingCents,0);
 const overdueIn=overdue.filter(x=>x.kind==='receber').reduce((s,x)=>s+x.remainingCents,0);
 const unknown=pending.filter(x=>!x.dueDate&&x.kind==='receber').reduce((s,x)=>s+x.remainingCents,0);
 return <section className="panel cash-projection" aria-labelledby="cash-projection-title">
 <div className="panel-title"><div><h2 id="cash-projection-title">Como vou fechar o mês?</h2><small>Projeção de caixa · {label(month)} · base em {dateLabel(asOf)}</small></div><span className="badge">Previsão, não saldo bancário</span></div>
 {selected?<><div className="projection-scenarios">
 <article className={'projection-main '+(selected.closing<0?'projection-negative':'')}><p>Com todas as entradas previstas</p><h3 className={tone(selected.closing)}>{result(selected.closing)}</h3><strong className={tone(selected.closing)} data-testid="projection-total">{money(Math.abs(selected.closing))}</strong><small>Inclui recebimentos incertos com data.</small></article>
 <article><p>Só com entradas confirmadas</p><h3 className={tone(selected.confirmedClosing)}>{result(selected.confirmedClosing)}</h3><strong className={tone(selected.confirmedClosing)} data-testid="projection-confirmed">{money(Math.abs(selected.confirmedClosing))}</strong><small>Também exclui entradas incertas dos meses anteriores.</small></article>
 </div>
 <dl className="projection-formula"><div><dt>{month===asOf.slice(0,7)?'Disponível hoje':'Saldo previsto do mês anterior'}</dt><dd>{money(selected.opening)}</dd></div><div><dt>+ Entradas confirmadas</dt><dd>{money(selected.confirmedIn)}</dd></div><div><dt>+ Entradas incertas</dt><dd>{money(selected.uncertainIn)}</dd></div><div><dt>− Pagamentos pendentes</dt><dd>{money(selected.out)}</dd></div></dl>
 {selected.firstShortfall?<p className="projection-alert" data-testid="projection-warning"><strong>Pode faltar dinheiro em {dateLabel(selected.firstShortfall)}, mesmo contando com as entradas previstas.</strong> Maior falta simulada no mês: {money(-selected.minimum)}. {selected.closing>=0?'O mês pode fechar positivo, mas há contas antes das entradas.':''}</p>:<p className="projection-positive">As datas cadastradas não indicam saldo negativo neste cenário.</p>}
 {selected.confirmedFirstShortfall&&<p className="help">Só com confirmados, o saldo fica negativo em {dateLabel(selected.confirmedFirstShortfall)}. Maior falta: {money(-selected.confirmedMinimum)}.</p>}
 {next&&<p className="projection-next"><strong>Próximo mês · {label(next.month)}:</strong> <span className={tone(next.closing)}>{result(next.closing)} de {money(Math.abs(next.closing))}</span>{next.firstShortfall?' · há risco de falta durante o mês.':''}</p>}
 </>:<p className="help">{month<asOf.slice(0,7)?'Este é um mês passado. Não reconstruímos seu saldo histórico usando o saldo atual.':'O mês selecionado está além do horizonte de 12 meses.'} A tabela abaixo mostra a projeção a partir de hoje.</p>}
 {(overdue.length>0)&&<p className="projection-alert"><strong>Pendências vencidas incluídas hoje, apenas na simulação:</strong> {money(overdueOut)} a pagar e {money(overdueIn)} a receber. Confira baixas e datas; receber hoje é uma hipótese, não uma confirmação.</p>}
 {unknown>0&&<p className="help">Fora da projeção: {money(unknown)} a receber sem data.</p>}
 <button className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Recolher próximos meses':'Ver próximos 12 meses e saldo anterior'}</button>
 {expanded&&<div className="table-wrap"><table className="projection-table"><caption>Saldo transportado automaticamente entre meses · somente valores cadastrados</caption><thead><tr><th>Mês</th><th>Saldo anterior / hoje</th><th>Confirmados</th><th>Incertos</th><th>A pagar</th><th>Saldo final previsto</th><th>Saldo final só confirmados</th></tr></thead><tbody>{months.map(row=><tr key={row.month} className={row.month===month?'projection-selected':''}><td>{label(row.month)}{row.firstShortfall&&<small className="red">Falta em {dateLabel(row.firstShortfall)}</small>}</td><td>{money(row.opening)}</td><td>{money(row.confirmedIn)}</td><td>{money(row.uncertainIn)}</td><td>{money(row.out)}</td><td className={tone(row.closing)}>{money(row.closing)}</td><td className={tone(row.confirmedClosing)}>{money(row.confirmedClosing)}</td></tr>)}</tbody></table></div>}
 {selected&&<details className="projection-daily"><summary>Conferir entradas, saídas e saldo por dia</summary><p className="help">Saldo calculado ao final de cada dia com movimentações previstas. Entradas e saídas no mesmo dia são compensadas; horários não são considerados.</p>{selected.days.length?<div className="table-wrap"><table><thead><tr><th>Data / lançamentos</th><th>Entradas confirmadas</th><th>Entradas incertas</th><th>Saídas</th><th>Saldo previsto</th><th>Só confirmados</th></tr></thead><tbody>{selected.days.map(day=><tr key={day.date}><td>{dateLabel(day.date)}<small>{day.names.join(' · ')}</small></td><td>{money(day.confirmedIn)}</td><td>{money(day.uncertainIn)}</td><td>{money(day.out)}</td><td className={tone(day.projected)}>{money(day.projected)}</td><td className={tone(day.confirmed)}>{money(day.confirmed)}</td></tr>)}</tbody></table></div>:<p className="empty">Nenhuma movimentação pendente prevista neste mês.</p>}</details>}
 <p className="help">Base: saldo disponível atual, sem reservas e investimentos. Pagamentos e recebimentos já baixados não são contados novamente. As faturas usam as mesmas parcelas. O saldo anterior é calculado, sem criar uma nova receita. Confira os meses futuros: receitas e cobranças ainda não cadastradas ou não geradas não entram na previsão.</p>
 </section>;
}
