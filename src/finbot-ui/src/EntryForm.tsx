import {useEffect,useRef,useState,type FormEvent} from 'react';
import {type Snapshot,type Command,money,parseMoney,today} from './api';
import {CategoryField,categories,canonicalCategory,IrCheck} from './CategoryField';
import {purchaseTotal,purchasePreview} from './purchaseAmounts';
export function EntryForm({data,onSave,onClose,installments=false}:{data:Snapshot;onSave:(command:Command,id:string)=>Promise<void>;onClose:()=>void;installments?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),requestId=useRef(crypto.randomUUID());
 const [v,set]=useState({name:'',kind:'pagar',frequency:installments?'parcelado':'unico',method:'pix',amount:'',count:installments?'2':'1',paid:'0',date:today(),firstMonth:today().slice(0,7),cardId:'',category:'Outros',basis:'parcela'});
 const [trackIr,setTrackIr]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 const change=(key:keyof typeof v,value:string)=>{set(old=>{const next={...old,[key]:value};if(key==='frequency')next.paid='0';if(key==='frequency')next.count=value==='mensal-recorrente'?'12':value==='semanal'?'52':value==='parcelado'?'2':'1';if((key==='kind'&&value==='receber')||(key==='frequency'&&value==='semanal'))next.method='pix';return next});requestId.current=crypto.randomUUID();setError('')};
 const field=(key:keyof typeof v,label:string,type='text',extra:Record<string,string|number>={})=><label>{label}<input aria-label={label} required value={v[key]} type={type} onChange={e=>change(key,e.target.value)} {...extra}/></label>;
 const select=(key:keyof typeof v,label:string,options:{id:string;name:string}[])=><label>{label}<select aria-label={label} required value={v[key]} onChange={e=>change(key,e.target.value)}>{options.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>;
 const card=v.method==='cartao';
 const submit=async(e:FormEvent)=>{e.preventDefault();setError('');try{
  const amount=parseMoney(v.amount),count=v.frequency==='unico'?1:Number(v.count);
  const common={trackIr,name:v.name.trim(),kind:v.kind,category:canonicalCategory(categories(data),v.category),paymentMethod:v.method};
  let command:Command;
  if(card&&v.frequency==='mensal-recorrente')command={...common,action:'addPlan',cardId:v.cardId,amountCents:amount,count,paidCount:Number(v.paid),date:v.firstMonth+'-01',cadence:'mensal-recorrente'};
  else if(card)command={...common,action:'addPurchase',cardId:v.cardId,amountCents:purchaseTotal(v.amount,v.frequency==='unico'?'total':v.basis,count),count,paidCount:v.frequency==='unico'?0:Number(v.paid),date:v.firstMonth+'-01'};
  else if(v.frequency==='unico')command={...common,action:'addItem',amountCents:amount,date:v.date};
  else command={...common,action:'addPlan',amountCents:amount,count,paidCount:Number(v.paid),date:v.date,cadence:v.frequency==='mensal-recorrente'?'mensal-recorrente':v.frequency==='semanal'?'semanal':'mensal'};
  setBusy(true);await onSave(command,requestId.current);onClose();
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 let preview='';try{const amount=parseMoney(v.amount),count=v.frequency==='unico'?1:Number(v.count);if(count>0)preview=card&&v.frequency==='parcelado'?purchasePreview(purchaseTotal(v.amount,v.basis,count),count):count+' × '+money(amount)+' = '+money(amount*count)}catch{}
 const weekday=v.date?new Date(v.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long'}):'';
 return <dialog ref={dialog} aria-labelledby="entry-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><form onSubmit={submit}>
 <header><h2 id="entry-title">Cadastrar conta ou contrato</h2><button className="ghost" type="button" aria-label="Fechar formulário" disabled={busy} onClick={onClose}>×</button></header>
 <fieldset disabled={busy}>
 {field('name','Descrição / nome','text',{maxLength:150})}
 <div className="form-grid">{select('kind','Natureza',[{id:'pagar',name:'Tenho que pagar'},{id:'receber',name:'Tenho que receber'}])}{select('frequency','Frequência',[{id:'unico',name:'Uma vez / à vista'},{id:'parcelado',name:'Parcelado mensalmente'},{id:'semanal',name:'Recorrente toda semana'},{id:'mensal-recorrente',name:'Recorrente mensal'}])}</div>
 {select('method','Forma de pagamento',[{id:'pix',name:'Pix'},{id:'boleto',name:'Boleto'},{id:'debito',name:'Débito'},{id:'dinheiro',name:'Dinheiro'},{id:'outro',name:'Outra forma'},...(v.kind==='pagar'&&v.frequency!=='semanal'?[{id:'cartao',name:'Cartão de crédito'}]:[])])}
 {card&&select('cardId','Cartão',[{id:'',name:'Selecione'},...data.cards])}
 {card&&v.frequency==='parcelado'&&select('basis','Como informar o valor',[{id:'parcela',name:'Valor de cada parcela'},{id:'total',name:'Valor total da compra'}])}
 {field('amount',v.frequency==='mensal-recorrente'?'Valor mensal (R$)':v.frequency==='semanal'?'Valor fixo por semana (R$)':v.frequency==='parcelado'?(card&&v.basis==='total'?'Valor TOTAL da compra (R$)':'Valor de cada parcela (R$)'):'Valor (R$)','text',{inputMode:'decimal',placeholder:'0,00'})}
 {v.frequency!=='unico'&&<div className="form-grid">{field('count',v.frequency==='mensal-recorrente'?'Quantos meses prever agora?':v.frequency==='semanal'?'Quantas semanas gerar agora?':'Quantidade de parcelas','number',{min:1,max:card?120:520,step:1})}{field('paid','Quantas já foram pagas antes do cadastro?','number',{min:0,max:Number(v.count)||1,step:1})}</div>}
 {card?field('firstMonth','Mês da primeira fatura','month'):field('date',v.frequency==='unico'?'Vencimento':'Primeiro vencimento','date')}
 <CategoryField options={categories(data)} value={v.category} onChange={value=>change('category',value)}/>
 <p className="help">{preview}{['semanal','mensal-recorrente'].includes(v.frequency)?' · previsão do período gerado, sem adicionais':''}</p>
 {v.frequency==='semanal'&&<p className="help">A partir da data escolhida, repetir toda {weekday}. Para a moto, escolha um sábado e informe 189,00. Os valores variáveis são adicionados separadamente em cada cobrança. Você pode gerar mais semanas depois.</p>}
 {v.frequency==='mensal-recorrente'&&<p className="help">Cobrança contínua, como aluguel, assinatura ou anuidade mensal no cartão. A quantidade acima limita somente a previsão, não a duração da obrigação. Você pode acrescentar mais meses no controle de recorrências. Meses mais curtos usam o último dia, preservando o dia original nos seguintes.</p>}
 {v.frequency==='parcelado'&&<p className="help">Todas as parcelas aparecerão na aba Parcelamentos. As datas mensais preservam o dia inicial; meses mais curtos usam o último dia.</p>}
 {card&&<p className="help">As cobranças também compõem automaticamente as faturas deste cartão, no dia de vencimento cadastrado. Não cadastre a fatura novamente. Confira o mês inicial no banco; fechamento automático ainda não é calculado.</p>}
 {v.frequency!=='unico'&&<p className="help">Pagamentos anteriores ao cadastro são somente histórico: não descontam novamente do saldo inicial.</p>}
 <IrCheck checked={trackIr} onChange={value=>{setTrackIr(value);requestId.current=crypto.randomUUID()}}/>
 </fieldset>{error&&<p role="alert" className="error">{error}</p>}
 <footer className="actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy}>{busy?'Salvando…':'Salvar'}</button></footer>
 </form></dialog>
}
