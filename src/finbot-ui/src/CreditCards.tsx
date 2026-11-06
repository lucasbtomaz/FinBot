import {money,type Snapshot} from './api';
import type {FormSpec} from './FinanceForm';
import './CreditCards.css';

export function CreditCards({data,month,open}:{data:Snapshot;month:string;open:(action:string,title:string,extra?:Partial<FormSpec>)=>void}){
 return <section className="panel credit-cards"><div className="panel-title"><h2>Cartões de crédito</h2><button onClick={()=>open('addCard','Cadastrar cartão')}>+ Cartão</button></div>
  <div className="credit-card-grid">{data.cards.map(card=>{
   const openTotal=data.invoices.filter(invoice=>invoice.cardId===card.id).reduce((sum,invoice)=>sum+invoice.remainingCents,0);
   const available=Math.max(0,card.limitCents-openTotal);
   const exceeded=Math.max(0,openTotal-card.limitCents);
   const usage=card.limitCents>0?Math.min(100,Math.round(openTotal/card.limitCents*100)):0;
   const selectedInvoice=data.invoices.find(invoice=>invoice.cardId===card.id&&invoice.dueDate.startsWith(month)&&invoice.remainingCents>0);
   return <article className={'credit-card '+(card.limitCents>0&&exceeded>0?'limit-exceeded':'')} aria-label={'Cartão '+card.name} key={card.id}>
    <header><span className="card-avatar">{card.name.slice(0,2).toUpperCase()}</span><h3>{card.name}</h3><button className="text-button" aria-label={'Editar '+card.name} onClick={()=>open('editCard','Editar cartão',{targetId:card.id,name:card.name,dueDay:card.dueDay,closingDay:card.closingDay,limitCents:card.limitCents})}>Editar</button></header>
    <div className="card-values"><span><small>Limite</small><strong>{card.limitCents>0?money(card.limitCents):'Não informado'}</strong></span><span><small>Em aberto</small><strong data-testid="card-open">{money(openTotal)}</strong></span><span><small>Limite disponível</small><strong data-testid="card-available">{card.limitCents>0?money(available):'Não informado'}</strong></span></div>
    <div className="card-progress" role="progressbar" aria-label={'Uso do limite de '+card.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={usage}><i style={{width:usage+'%'}}/></div>
    {exceeded>0&&card.limitCents>0&&<p className="card-warning">Limite excedido em {money(exceeded)}</p>}
    <div className="card-dates"><span>{card.closingDay>0?'Fecha dia '+card.closingDay:'Fechamento não informado'}</span><span>Vence dia {card.dueDay}</span></div>
    <footer>{selectedInvoice?<><span><small>Fatura do mês</small><strong>{money(selectedInvoice.remainingCents)}</strong></span><button onClick={()=>open('payInvoice','Pagar fatura '+card.name,{targetId:selectedInvoice.id,amountCents:selectedInvoice.remainingCents})}>Pagar fatura</button></>:<span className="card-paid">Sem fatura pendente no mês</span>}</footer>
   </article>})}</div>
  {!data.cards.length&&<p className="empty">Nenhum cartão cadastrado.</p>}
 </section>;
}
