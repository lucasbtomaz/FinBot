import {useEffect,useRef,useState,type FormEvent} from 'react';
import {money,parseMoney,today,type Command,type Investment,type InvestmentValue} from './api';
import {IrCheck} from './CategoryField';
const types:Record<string,string>={reserva:'Caixinha / reserva',acao:'Ações',fii:'Fundos imobiliários',selic:'Tesouro Selic','renda-fixa':'Renda fixa',fundo:'Fundos de investimento',outro:'Outro'};
const monthLabel=(month:string)=>month.slice(5)+'/'+month.slice(0,4);
const decimal=(value:number)=>(value/100).toFixed(2).replace('.',',');
function Evolution({values}:{values:InvestmentValue[]}){
 if(!values.length)return <p className="empty">Nenhum registro até o mês selecionado.</p>;
 const high=Math.max(...values.map(v=>v.valueCents)),low=Math.min(...values.map(v=>v.valueCents));
 const padding=Math.max(100,(high-low)*0.15),min=Math.max(0,low-padding),max=high+padding;
 const monthNumber=(month:string)=>Number(month.slice(0,4))*12+Number(month.slice(5));
 const x=(i:number)=>values.length===1?330:110+(monthNumber(values[i].month)-monthNumber(values[0].month))*445/(monthNumber(values[values.length-1].month)-monthNumber(values[0].month));
 const y=(v:number)=>170-(v-min)/(max-min)*140;
 const first=values[0],last=values[values.length-1],difference=last.valueCents-first.valueCents;
 return <><p className={difference<0?'red':'green'}>{values.length===1?'Registre outro mês para comparar.':(difference<0?'Queda de ':difference>0?'Aumento de ':'Sem alteração: ')+money(Math.abs(difference))+' entre '+monthLabel(first.month)+' e '+monthLabel(last.month)}</p>
 <svg className="investment-chart" viewBox="0 0 600 210" role="img" aria-label="Evolução do saldo nos meses registrados">
  {[min,(min+max)/2,max].map(tick=><g key={tick}><line x1="110" y1={y(tick)} x2="555" y2={y(tick)} stroke="#495367" strokeDasharray="4 4"/><text x="100" y={y(tick)+4} textAnchor="end" fill="#b7c3d5">{money(Math.round(tick))}</text></g>)}
 <polyline points={values.map((v,i)=>x(i)+','+y(v.valueCents)).join(' ')} fill="none" stroke={difference<0?'#ff8d98':'#81d3a5'} strokeWidth="3"/>
 {values.map((v,i)=><circle key={v.month} cx={x(i)} cy={y(v.valueCents)} r="5" fill={difference<0?'#ff8d98':'#81d3a5'}><title>{monthLabel(v.month)+': '+money(v.valueCents)}</title></circle>)}
 <text x="110" y="198" fill="#b7c3d5">{monthLabel(first.month)}</text>
 {values.length>1&&<text x="555" y="198" textAnchor="end" fill="#b7c3d5">{monthLabel(last.month)}</text>}
 </svg><p className="help">Somente meses informados. A variação do saldo pode incluir aportes e resgates; não representa rentabilidade calculada.</p></>;
}
function InvestmentForm({investment,month,onSave,onClose}:{investment?:Investment;month:string;onSave:(c:Command,id:string)=>Promise<void>;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useRef(crypto.randomUUID());
 const initial=investment?.values.filter(x=>x.month<=month).at(-1);
 const [v,set]=useState({name:'',institution:'',kind:'acao',month,invested:initial?decimal(initial.investedCents):'',value:initial?decimal(initial.valueCents):''});
 const [trackIr,setTrackIr]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 const change=(key:keyof typeof v,value:string)=>{set(old=>{const next={...old,[key]:value};if(key==='month'){const existing=investment?.values.find(x=>x.month===value);if(existing){next.invested=decimal(existing.investedCents);next.value=decimal(existing.valueCents)}}return next});id.current=crypto.randomUUID();setError('')};
 const field=(key:keyof typeof v,label:string,type='text')=><label>{label}<input required type={type} value={v[key]} max={type==='month'?today().slice(0,7):undefined} maxLength={type==='text'?150:undefined} onChange={e=>change(key,e.target.value)}/></label>;
 const submit=async(e:FormEvent)=>{e.preventDefault();setError('');try{setBusy(true);await onSave({trackIr,action:investment?'saveInvestmentValue':'addInvestment',targetId:investment?.id??'',name:v.name,institution:v.institution,kind:v.kind,date:v.month+'-01',investedCents:parseMoney(v.invested),amountCents:parseMoney(v.value)},id.current);onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 return <dialog ref={dialog} aria-labelledby="investment-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><form onSubmit={submit}>
 <h2 id="investment-title">{investment?'Atualizar '+investment.name:'Cadastrar investimento'}</h2>
 <fieldset disabled={busy}>{!investment&&<>{field('name','Nome do investimento')}{field('institution','Onde está investido')}<label>Tipo de investimento<select aria-label="Tipo de investimento" value={v.kind} onChange={e=>change('kind',e.target.value)}>{Object.entries(types).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></>}
 {field('month','Mês do registro','month')}{field('invested','Total investido até este mês (R$)')}{field('value','Saldo neste mês (R$)')}
 <p className="help">{investment?.accountId||(!investment&&v.kind==='reserva')?'Caixinha vinculada ao seu saldo: atualizar o mês atual ajusta o saldo da caixinha; corrigir meses anteriores altera somente o histórico. Para aportar ou resgatar a partir de outra conta, use Transferir.':'Informe os valores do seu extrato. Ajuste o total investido ao fazer aportes ou resgates. Este registro não movimenta contas.'}</p>
 {investment?.values.some(x=>x.month===v.month)&&<p className="help">Já existe um registro neste mês. Salvar substituirá os dois valores desse mês.</p>}
 {!investment&&<IrCheck checked={trackIr} onChange={value=>{setTrackIr(value);id.current=crypto.randomUUID()}}/>}
 </fieldset>{error&&<p className="error" role="alert">{error}</p>}<div className="actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy}>{busy?'Salvando…':'Salvar'}</button></div>
 </form></dialog>;
}
export function Investments({investments,month,onSave}:{investments:Investment[];month:string;onSave:(c:Command,id:string)=>Promise<void>}){
 const [editing,setEditing]=useState<{investment?:Investment;month:string}>();
 const latest=investments.map(i=>i.values.filter(x=>x.month<=month).at(-1)).filter((x):x is InvestmentValue=>!!x);
 return <><section className="panel"><div className="panel-title"><h2>Seus investimentos</h2><button onClick={()=>setEditing({month})}>+ Investimento</button></div>
 <p>Saldo dos últimos registros até {monthLabel(month)}: <strong>{money(latest.reduce((s,v)=>s+v.valueCents,0))}</strong></p>
 <p className="help">Inclui suas caixinhas e antigas reservas, sem somar novamente seus saldos. Fora do disponível em contas. Os últimos registros podem ser de meses diferentes; confira a data em cada investimento.</p></section>
 {!investments.length&&<p className="empty">Cadastre ações, fundos imobiliários, Tesouro Selic e outros investimentos.</p>}
 {investments.map(investment=>{const values=investment.values.filter(x=>x.month<=month);const last=values.at(-1);return <section className="panel" key={investment.id}>
 <div className="panel-title"><div><h2>{investment.name}</h2><small>{types[investment.kind]??investment.kind} · {investment.institution}</small></div><button className="secondary" onClick={()=>setEditing({investment,month})}>Atualizar valor mensal</button></div>
 {last&&<div className="investment-summary"><div>Total investido<strong>{money(last.investedCents)}</strong></div><div>Saldo registrado<strong>{money(last.valueCents)}</strong></div><div>Último registro<strong>{monthLabel(last.month)}</strong></div></div>}
 {investment.accountId&&<p className="help">Caixinha vinculada às transferências e aos ajustes de saldo. Na migração, o saldo atual foi usado como referência inicial; confira o total investido no seu extrato. As movimentações anteriores continuam em Lançamentos.</p>}
 <Evolution values={values}/>
 <div className="table-wrap"><table><caption>Histórico mensal de {investment.name}</caption><thead><tr><th>Mês</th><th>Total investido</th><th>Saldo</th><th>Ações</th></tr></thead><tbody>{values.map(value=><tr key={value.month}><td>{monthLabel(value.month)}</td><td>{money(value.investedCents)}</td><td>{money(value.valueCents)}</td><td><button className="text-button" onClick={()=>setEditing({investment,month:value.month})}>Corrigir mês</button></td></tr>)}</tbody></table></div>
 </section>})}
 {editing&&<InvestmentForm investment={editing.investment} month={editing.month} onSave={onSave} onClose={()=>setEditing(undefined)}/>}
 </>;
}
