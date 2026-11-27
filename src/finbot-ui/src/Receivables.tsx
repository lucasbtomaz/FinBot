import {useState,useRef,useEffect,type FormEvent} from 'react';
import {type Item,type Command,money,parseMoney,dateLabel,today} from './api';
import {CategoryField,canonicalCategory,IrCheck} from './CategoryField';
import {type FormSpec} from './FinanceForm';
export function ReceivableSummary({items,month}:{items:Item[];month?:string}){
 const pending=items.filter(x=>x.kind==='receber'&&!x.cancelled&&x.remainingCents>0);
 const total=(confirmed:boolean)=>pending.filter(x=>(!month||x.dueDate.startsWith(month+'-'))&&(x.confidence==='confirmado')===confirmed).reduce((s,x)=>s+x.remainingCents,0);
 return <section className="metrics receivable-metrics" aria-label="Valores que podem entrar">
 <article><p>A receber · confirmado</p><strong className="green" data-testid="receive-confirmed">{money(total(true))}</strong><small>{month?'Em aberto · mês selecionado':'Em aberto · todos os períodos'} · conforme sua classificação</small></article>
 <article><p>A receber · incerto</p><strong className="purple-text" data-testid="receive-uncertain">{money(total(false))}</strong><small>{month?'Em aberto · mês selecionado':'Em aberto · todos os períodos · inclui valores sem data'}</small></article>
 {month&&pending.some(x=>!x.dueDate)&&<article className="undated-receivables"><p>A receber sem data · fora do total mensal</p><div>Confirmado: <b data-testid="receive-undated-confirmed">{money(pending.filter(x=>!x.dueDate&&x.confidence==='confirmado').reduce((s,x)=>s+x.remainingCents,0))}</b> · Incerto: <b data-testid="receive-undated-uncertain">{money(pending.filter(x=>!x.dueDate&&x.confidence!=='confirmado').reduce((s,x)=>s+x.remainingCents,0))}</b></div><small>Defina uma previsão em Contas a receber para incluir no mês correspondente.</small></article>}
 </section>;
}
export function ReceivableForm({item,categoryOptions,onSave,onClose}:{item?:Item;categoryOptions:string[];onSave:(c:Command,id:string)=>Promise<void>;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useRef(crypto.randomUUID());
 const [v,set]=useState({name:item?.name??'',payer:item?.payer||item?.name||'',category:item?.category??'Outros',amount:item?(item.amountCents/100).toFixed(2).replace('.',','):'',date:item?.dueDate??'',confidence:item?.confidence??'incerto',cadence:item?.receivableCadence??'unico',count:'1',note:item?.note??''});
 const [trackIr,setTrackIr]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 const change=(key:keyof typeof v,value:string)=>{set(old=>({...old,[key]:value,...(key==='cadence'&&value==='unico'?{count:'1'}:{})}));id.current=crypto.randomUUID()};
 const field=(key:keyof typeof v,label:string,type='text',required=true)=><label>{label}<input aria-label={label} type={type} required={required} value={v[key]} onChange={e=>change(key,e.target.value)}/></label>;
 const select=(key:keyof typeof v,label:string,options:Record<string,string>)=><label>{label}<select aria-label={label} value={v[key]} onChange={e=>change(key,e.target.value)}>{Object.entries(options).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>;
 const submit=async(e:FormEvent)=>{e.preventDefault();setError('');try{setBusy(true);await onSave({trackIr,action:item?'editReceivable':'addReceivable',targetId:item?.id??'',name:v.name,payer:v.payer,category:canonicalCategory(categoryOptions,v.category),amountCents:parseMoney(v.amount),date:v.date,confidence:v.confidence,cadence:v.cadence,count:Number(v.count),note:v.note},id.current);onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 return <dialog ref={dialog} aria-labelledby="receivable-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><form onSubmit={submit}><h2 id="receivable-title">{item?'Editar recebível':'Cadastrar recebível'}</h2><fieldset disabled={busy}>
 {field('name','Descrição do recebível')}{field('payer','Quem vai pagar / plataforma')}<CategoryField label="Origem / categoria" options={categoryOptions} value={v.category} onChange={value=>change('category',value)}/>{field('amount','Valor previsto (R$)')}
 {select('confidence','Confirmação',{incerto:'Incerto / pode entrar',confirmado:'Confirmado por mim'})}
 {select('cadence','Frequência',{unico:'Uma vez',semanal:'Semanal',mensal:'Mensal'})}
 {field('date','Data prevista (opcional)','date',false)}
 {!item&&v.cadence!=='unico'&&<>{field('count','Quantidade de períodos a criar','number')}<p className="help">Use 1 para lançar o valor variável desta semana ou mês. Mais períodos repetem o valor inicial, exigem data e podem ser editados individualmente depois.</p></>}
 <label>Observações<textarea maxLength={1000} value={v.note} onChange={e=>change('note',e.target.value)}/></label>
 <p className="help">Sem data? Deixe em branco. O registro continuará aberto até você receber ou cancelar. Confirmado não significa recebido.</p>
 {!item&&<IrCheck checked={trackIr} onChange={value=>{setTrackIr(value);id.current=crypto.randomUUID()}}/>}
 </fieldset>{error&&<p role="alert" className="error">{error}</p>}<div className="actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy}>{busy?'Salvando…':'Salvar'}</button></div></form></dialog>;
}
export function Receivables({items,open,ask,onEdit,onNew}:{items:Item[];open:(action:string,title:string,extra?:Partial<FormSpec>)=>void;ask:(text:string,c:Command)=>void;onEdit:(item:Item)=>void;onNew:()=>void}){
 const [filter,setFilter]=useState('abertos'),[search,setSearch]=useState('');
 const rows=items.filter(x=>x.kind==='receber'&&!x.cancelled&&(filter==='todos'||(filter==='recebidos'?x.remainingCents===0:x.remainingCents>0))&&(x.name+' '+x.payer+' '+x.category).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
 return <section className="panel"><div className="panel-title"><h2>Recebíveis de todos os períodos</h2><button onClick={onNew}>+ Recebível</button></div>
 <div className="toolbar"><label>Buscar pessoa ou plataforma <input value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Situação <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="abertos">Em aberto</option><option value="recebidos">Recebidos</option><option value="todos">Todos</option></select></label></div>
 <p className="help">Esta lista inclui todos os meses e valores sem data, independentemente do mês selecionado no topo.</p>
 {rows.length?<div className="table-wrap"><table><thead><tr><th>Quem / descrição</th><th>Previsão</th><th>Valor</th><th>Falta receber</th><th>Confirmação</th><th>Ações</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}>
 <td>{x.payer||x.name}<small>{x.name} · {x.category} · {x.receivableCadence==='semanal'?'Semanal':x.receivableCadence==='mensal'?'Mensal':'Uma vez'}</small>{x.note&&<small>{x.note}</small>}</td>
 <td>{x.dueDate?dateLabel(x.dueDate):'Sem data'}<small>{x.remainingCents===0?'Recebido':x.paidCents>0?'Recebido parcialmente':x.dueDate&&x.dueDate<today()?'Em atraso':'Em aberto'}</small></td>
 <td>{money(x.amountCents)}</td><td>{money(x.remainingCents)}</td><td>{x.confidence==='confirmado'?'Confirmado':'Incerto'}</td>
 <td>{x.remainingCents>0&&<button className="text-button" onClick={()=>open('settleItem','Registrar recebimento',{targetId:x.id,amountCents:x.remainingCents})}>Receber</button>}<button className="text-button" onClick={()=>onEdit(x)}>Editar</button>{x.paidCents===0&&<button className="text-button danger" onClick={()=>ask('Cancelar este recebível? Ele sairá dos valores previstos.',{action:'cancelItem',targetId:x.id})}>Cancelar</button>}</td>
 </tr>)}</tbody></table></div>:<p className="empty">Nenhum recebível neste filtro.</p>}
 </section>;
}
