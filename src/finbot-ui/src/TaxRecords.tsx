import {useState,useRef,useEffect,type FormEvent} from 'react';
import {type Snapshot,type TaxRecord,type Command,money,dateLabel} from './api';
function source(data:Snapshot,t:TaxRecord){
 const items=data.items.filter(x=>t.sourceType==='item'?x.id===t.sourceId:t.sourceType==='plan'?x.planId===t.sourceId:t.sourceType==='purchase'?x.purchaseId===t.sourceId:false);
 const investment=t.sourceType==='investment'?data.investments.find(x=>x.id===t.sourceId):undefined;
 return {items,investment,name:investment?.name??items[0]?.name??'Registro de origem',category:items[0]?.category??investment?.institution??''};
}
function TaxForm({record,data,onSave,onClose}:{record:TaxRecord;data:Snapshot;onSave:(c:Command,id:string)=>Promise<void>;onClose:()=>void}){
 const origin=source(data,record),dialog=useRef<HTMLDialogElement>(null),id=useRef(crypto.randomUUID());
 const [v,set]=useState({name:record.name||origin.name,document:record.document,category:record.category,note:record.note});
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 const change=(key:keyof typeof v,value:string)=>{set(old=>({...old,[key]:value}));id.current=crypto.randomUUID()};
 async function submit(e:FormEvent){e.preventDefault();setError('');setBusy(true);try{await onSave({action:'saveTaxRecord',targetId:record.id,...v},id.current);onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <dialog ref={dialog} aria-labelledby="tax-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><form onSubmit={submit}><h2 id="tax-title">Completar informações de IR</h2>
 <p>{origin.name} · {origin.category}</p><fieldset disabled={busy}>
 <label>Nome / razão social<input required maxLength={150} value={v.name} onChange={e=>change('name',e.target.value)}/></label>
 <label>CPF/CNPJ<input required maxLength={30} value={v.document} onChange={e=>change('document',e.target.value)}/></label>
 <label>Categoria / natureza no IR<input required maxLength={150} value={v.category} onChange={e=>change('category',e.target.value)}/></label>
 <label>Observações<textarea maxLength={1000} value={v.note} onChange={e=>change('note',e.target.value)}/></label>
 <p className="help">Salvar confirma que você completou estes dados. O lançamento financeiro continua vinculado e mantém seu próprio status de pagamento.</p>
 </fieldset>{error&&<p role="alert" className="error">{error}</p>}<footer className="actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy}>{busy?'Salvando…':'Salvar'}</button></footer></form></dialog>;
}
export function TaxRecords({data,onSave}:{data:Snapshot;onSave:(c:Command,id:string)=>Promise<void>}){
 const [editing,setEditing]=useState<TaxRecord>(),[filter,setFilter]=useState('todos');
 const records=data.taxRecords??[],rows=records.filter(x=>filter==='todos'||(filter==='confirmados'?x.confirmed:!x.confirmed));
 return <section className="panel"><h2>Informações para o Imposto de Renda</h2>
 <p className="help">Todos os períodos. Marque IR no cadastro de uma conta, recebível, compra no cartão ou investimento. Complete aqui os dados que faltam.</p>
 <div className="toolbar"><label>Situação do IR<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="todos">Todos</option><option value="pendentes">Pendentes</option><option value="confirmados">Confirmados</option></select></label><span>{records.filter(x=>!x.confirmed).length} pendentes · {records.filter(x=>x.confirmed).length} confirmados</span></div>
 {rows.length?<div className="table-wrap"><table><thead><tr><th>Registro original</th><th>CPF/CNPJ e natureza</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{rows.map(t=>{
 const s=source(data,t);return <tr key={t.id}><td>{s.name}<small>{s.category}</small><details><summary>Valores e datas vinculados</summary>
 {s.items.map(x=><p key={x.id}>{x.dueDate?dateLabel(x.dueDate):'Sem data'} · {money(x.amountCents)} · {x.cancelled?'Cancelado':x.remainingCents===0?'Quitado':x.paidCents>0?'Parcialmente quitado':'Em aberto'}{x.count>1?' · '+x.number+'/'+x.count:''}</p>)}
 {s.investment?.values.map(x=><p key={x.month}>{x.month} · Investido: {money(x.investedCents)} · Saldo: {money(x.valueCents)}</p>)}
 </details></td><td>{t.name||'Nome a completar'}<small>{t.document||'CPF/CNPJ pendente'}</small><small>{t.category||'Natureza pendente'}</small>{t.note&&<small>{t.note}</small>}</td>
 <td><span className={t.confirmed?'tax-confirmed':'tax-pending'}>{t.confirmed?'Confirmado':'Pendente'}</span></td><td><button className="text-button" onClick={()=>setEditing(t)}>{t.confirmed?'Editar dados':'Completar dados'}</button></td></tr>
 })}</tbody></table></div>:<p className="empty">Nenhum registro neste filtro.</p>}
 <p className="help">Controle de organização pessoal. A marcação IR não determina dedutibilidade nem envia declaração. Os valores acima acompanham os registros originais, incluindo previsões e cancelamentos.</p>
 {editing&&<TaxForm record={editing} data={data} onSave={onSave} onClose={()=>setEditing(undefined)}/>}
 </section>;
}
