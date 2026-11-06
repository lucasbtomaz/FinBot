import {useEffect,useRef,useState,type FormEvent} from 'react';
import {type Command,type Snapshot,money,parseMoney,today} from './api';
import {CategoryField,categories,canonicalCategory,IrCheck} from './CategoryField';
import {purchaseTotal,purchasePreview} from './purchaseAmounts';
export type FormSpec={action:string;title:string;targetId?:string;amountCents?:number;kind?:string;name?:string;dueDay?:number;closingDay?:number;limitCents?:number};
export function FinanceForm({spec,data,onSave,onClose}:{spec:FormSpec;data:Snapshot;onSave:(command:Command,id:string)=>Promise<void>;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const requestId=useRef(crypto.randomUUID());
  const [values,setValues]=useState<Record<string,string>>({name:spec.name??'',kind:spec.kind??'pagar',amount:spec.amountCents!==undefined?(spec.amountCents/100).toFixed(2).replace('.',','):'',limit:spec.limitCents!==undefined?(spec.limitCents/100).toFixed(2).replace('.',','):'',date:today(),firstMonth:today().slice(0,7),category:'Outros',count:'1',paidCount:'0',dueDay:String(spec.dueDay??10),closingDay:spec.closingDay?String(spec.closingDay):'',accountId:'',cardId:'',targetId:'',basis:'total'});
  const [receipt,setReceipt]=useState<File>();
  const [trackIr,setTrackIr]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
  const change=(key:string,value:string)=>{setValues(v=>({...v,[key]:value}));requestId.current=crypto.randomUUID();setError('')};
  const field=(key:string,label:string,type='text',extra:Record<string,string|number>={})=><label htmlFor={'form-'+key} key={key}>{label}<input id={'form-'+key} type={type} required value={values[key]} onChange={e=>change(key,e.target.value)} {...extra}/></label>;
  const optionalField=(key:string,label:string,type='text',extra:Record<string,string|number>={})=><label htmlFor={'form-'+key} key={key}>{label}<input id={'form-'+key} type={type} value={values[key]} onChange={e=>change(key,e.target.value)} {...extra}/></label>;
  const select=(key:string,label:string,options:{id:string;name:string}[])=><label htmlFor={'form-'+key} key={key}>{label}<select aria-label={label} id={'form-'+key} required value={values[key]} onChange={e=>change(key,e.target.value)}><option value="">Selecione</option>{options.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>;
  const a=spec.action;
  const outgoing=a==='payInvoice'||(['settleItem','payItem'].includes(a)&&data.items.find(x=>x.id===spec.targetId)?.kind==='pagar');
  const accountOptions=data.accounts.map(x=>({id:x.id,name:x.name+' · '+money(x.balanceCents)}));
  const submit=async(e:FormEvent)=>{
    e.preventDefault();if(busy)return;setError('');
    try {
      const command:Command={action:a,trackIr};
      if(spec.targetId) command.targetId=spec.targetId;
      if(['addAccount','addCard','editCard','addItem','addPurchase'].includes(a))command.name=values.name.trim();
      if(!['addCard','editCard'].includes(a)){const text=values.amount.trim();command.amountCents=a==='adjustBalance'&&text.startsWith('-')?-parseMoney(text.slice(1)):parseMoney(text);}
      if(a==='addPurchase')command.amountCents=purchaseTotal(values.amount,values.basis,Number(values.count));
      if(a==='addAccount') command.kind=values.kind;
      if(['addCard','editCard'].includes(a)){command.dueDay=Number(values.dueDay);command.closingDay=values.closingDay?Number(values.closingDay):0;command.limitCents=values.limit.trim()?parseMoney(values.limit):0;}
      if(a==='addItem') Object.assign(command,{kind:values.kind,date:values.date,category:canonicalCategory(categories(data),values.category)});
      if(a==='addPurchase')Object.assign(command,{cardId:values.cardId,date:values.firstMonth+'-01',count:Number(values.count),paidCount:Number(values.paidCount),category:canonicalCategory(categories(data),values.category)});
      if(['settleItem','payInvoice','payItem','transfer'].includes(a))Object.assign(command,{accountId:values.accountId,date:values.date});
      if(a==='transfer')command.targetId=values.targetId;
      if(receipt){if(receipt.size>10*1024*1024)throw new Error('O comprovante deve ter até 10 MB.');command.receiptName=receipt.name;}
      setBusy(true);
      if(receipt)command.receiptData=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Não foi possível ler o comprovante.'));reader.readAsDataURL(receipt)});
      await onSave(command,requestId.current);onClose();
    } catch(e){setError((e as Error).message)} finally {setBusy(false)}
  };
  let preview='';if(a==='addPurchase'){try{const count=Number(values.count);preview=purchasePreview(purchaseTotal(values.amount,values.basis,count),count)}catch{/* Validação ao salvar. */}}
  return <dialog ref={dialog} onCancel={e=>{e.preventDefault();if(!busy)onClose()}} aria-labelledby="form-title"><form onSubmit={submit}>
    <header><h2 id="form-title">{spec.title}</h2><button type="button" className="ghost" aria-label="Fechar formulário" disabled={busy} onClick={onClose}>×</button></header>
    <fieldset disabled={busy}>
    {['addAccount','addCard','editCard','addItem','addPurchase'].includes(a)&&field('name','Descrição / nome','text',{maxLength:150})}
    {a==='addAccount'&&select('kind','Tipo',[{id:'conta',name:'Conta disponível'},{id:'reserva',name:'Investimento / caixinha'}])}
    {a==='addItem'&&select('kind','Tipo',[{id:'pagar',name:'A pagar (fora do cartão)'},{id:'receber',name:'A receber'}])}
    {a==='addPurchase'&&select('cardId','Cartão',data.cards)}
    {a==='addPurchase'&&select('basis','Como informar o valor',[{id:'total',name:'Valor total da compra'},{id:'parcela',name:'Valor de cada parcela'}])}
    {!['addCard','editCard'].includes(a)&&field('amount',a==='adjustBalance'?'Saldo atual correto (R$)':a==='addAccount'?'Saldo que você já tem (R$)':a==='addPurchase'?(values.basis==='parcela'?'Valor de cada parcela (R$)':'Valor TOTAL da compra (R$)'):'Valor (R$)','text',{inputMode:'decimal',placeholder:'0,00'})}
    {['addCard','editCard'].includes(a)&&<div className="form-grid">{optionalField('limit','Limite total (R$)','text',{inputMode:'decimal',placeholder:'Não informado'})}{optionalField('closingDay','Dia de fechamento','number',{min:1,max:31,step:1})}{field('dueDay','Dia de vencimento da fatura','number',{min:1,max:31,step:1})}</div>}
    {a==='addItem'&&field('date','Vencimento','date')}
    {a==='addPurchase'&&<><div className="form-grid">{field('count','Quantidade de parcelas','number',{min:1,max:120,step:1})}{field('paidCount','Parcelas já pagas antes do cadastro','number',{min:0,max:Number(values.count)||1,step:1})}</div>{field('firstMonth','Mês da PRIMEIRA fatura da compra','month')}<p className="help">{preview}</p><p className="help">Confira a primeira fatura no banco. Parcelas já pagas não alteram o saldo atual.</p></>}
    {['addItem','addPurchase'].includes(a)&&<CategoryField options={categories(data)} value={values.category} onChange={value=>change('category',value)}/>}
    {a==='addItem'&&<p className="help">Compra no cartão? Use “Compra no cartão”. Não cadastre a fatura novamente como conta a pagar.</p>}
    {a==='adjustBalance'&&<><p className="help">Registrado: {money(data.accounts.find(x=>x.id===spec.targetId)?.balanceCents??0)}. Informe o saldo total atual.</p><p className="help">O ajuste não baixa contas pendentes e pode ser desfeito em Lançamentos.</p></>}
    {a==='addAccount'&&<p className="help">Saldo inicial não é receita. Para movimentar entre contas, use Transferir.</p>}
    {['settleItem','payInvoice','payItem','transfer'].includes(a)&&<>{select('accountId',a==='transfer'?'Conta de origem':'Conta da baixa',accountOptions)}{a==='transfer'&&select('targetId','Conta de destino',accountOptions.filter(x=>x.id!==values.accountId))}{field('date','Data da movimentação','date',{max:today()})}</>}
    {a==='payInvoice'&&<p className="help">Atualiza as parcelas sem gerar outra despesa.</p>}
    {['addItem','addPurchase'].includes(a)&&<IrCheck checked={trackIr} onChange={value=>{setTrackIr(value);requestId.current=crypto.randomUUID()}}/>}
    {outgoing&&data.receiptEnabled&&<><label>Comprovante de pagamento (opcional)<input aria-label="Comprovante de pagamento" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>{setReceipt(e.target.files?.[0]);requestId.current=crypto.randomUUID();setError('')}}/></label><p className="help">PDF, PNG ou JPG, até 10 MB. Cópia salva em {data.receiptDirectory}.</p></>}
    </fieldset>
    {error&&<p role="alert" className="error">{error}</p>}
    <footer className="actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" disabled={busy}>{busy?'Salvando…':'Salvar'}</button></footer>
  </form></dialog>;
}
