export type TaxRecord={id:string;sourceType:string;sourceId:string;name:string;document:string;category:string;note:string;confirmed:boolean};
export type Account = {id:string;name:string;kind:string;balanceCents:number};
export type Card = {id:string;name:string;dueDay:number};
export type Item = {id:string;name:string;kind:string;amountCents:number;paidCents:number;remainingCents:number;dueDate:string;category:string;purchaseId:string;cardId:string;number:number;count:number;cancelled:boolean;planId:string;paymentMethod:string;baseCents:number;extraCents:number;note:string;payer:string;confidence:string;receivableCadence:string};
export type Purchase = {id:string;name:string;cardId:string;amountCents:number;count:number;cancelled:boolean;canCancel:boolean};
export type Invoice = {id:string;cardId:string;dueDate:string;amountCents:number;paidCents:number;remainingCents:number};
export type Payment = {id:string;name:string;accountId:string;date:string;amountCents:number;reversed:boolean;receiptPath:string};
export type Snapshot = {month:string;availableCents:number;reservedCents:number;expenseCents:number;toPayCents:number;toReceiveCents:number;accounts:Account[];cards:Card[];items:Item[];purchases:Purchase[];invoices:Invoice[];payments:Payment[];investments:Investment[];plans:Plan[];taxRecords:TaxRecord[];receiptEnabled:boolean;receiptDirectory:string};
export type Command = {action:string; [key:string]:string|number|boolean};
type Response = {requestId:string;ok:boolean;data:Snapshot;error:string};
type Bridge = {postMessage(value:unknown):void;addEventListener(type:'message',callback:(event:MessageEvent<Response>)=>void):void;removeEventListener(type:'message',callback:(event:MessageEvent<Response>)=>void):void};
declare global { interface Window { chrome?:{webview?:Bridge} } }
export function request(month:string,command?:Command,requestId:string=crypto.randomUUID()):Promise<Snapshot> {
  const bridge=window.chrome?.webview;
  if(!bridge) return Promise.reject(new Error('Abra pelo FinBot.exe para acessar e salvar seus dados.'));
  return new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);bridge.removeEventListener('message',receive)};
    const receive=(event:MessageEvent<Response>)=>{
      if(event.data.requestId!==requestId) return;
      cleanup(); event.data.ok?resolve(event.data.data):reject(new Error(event.data.error));
    };
    const timer=setTimeout(()=>{cleanup();reject(new Error('O aplicativo não respondeu. Tente novamente; o pedido não será duplicado.'))},30000);
    bridge.addEventListener('message',receive);
    bridge.postMessage({type:command?'command':'snapshot',requestId,month,command});
  });
}
export const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const today=()=>new Date().toLocaleDateString('sv-SE');
export const dateLabel=(value:string)=>value.split('-').reverse().join('/');
export function parseMoney(value:string):number {
  const clean=value.trim();
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(clean)) throw new Error('Use um valor como 120,00 ou 1.200,00.');
  const [whole,decimal='']=clean.replaceAll('.','').split(',');
  const cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)||cents>100000000000) throw new Error('Valor fora do limite permitido.');
  return cents;
}
export type Plan={id:string;name:string;paymentMethod:string;cadence:string;baseCents:number;startDate:string;count:number;kind:string;category:string;cancelled:boolean};

export type InvestmentValue={month:string;investedCents:number;valueCents:number};
export type Investment={id:string;name:string;kind:string;institution:string;accountId:string;values:InvestmentValue[]};