import {test,expect} from '@playwright/test';
test('resultado mensal mostra somente receitas menos despesas',async({page})=>{
 await page.clock.install({time:new Date('2026-10-28T12:00:00')});
 await page.addInitScript(()=>{
  const item=(id:string,kind:string,dueDate:string,remainingCents:number,extra={})=>({id,name:id,kind,dueDate,remainingCents,amountCents:remainingCents,paidCents:0,category:'Outros',cancelled:false,confidence:'incerto',cardId:'',...extra});
  const items=[item('Fatura Inter','pagar','2026-10-29',50000,{cardId:'inter',number:1,count:1}),item('Entregas','receber','2026-10-30',80000),item('Aluguel','pagar','2026-11-05',60000,{planId:'aluguel'}),item('Pagamento confirmado','receber','2026-12-10',50000,{confidence:'confirmado'}),item('José sem data','receber','',70000),item('Já pago','pagar','2026-10-10',0,{paidCents:50000,amountCents:50000})];
  const listeners=new Set<any>();
  Object.defineProperty(window,'chrome',{configurable:true,value:{webview:{
   addEventListener:(_:string,fn:any)=>listeners.add(fn),removeEventListener:(_:string,fn:any)=>listeners.delete(fn),
   postMessage:(request:any)=>queueMicrotask(()=>listeners.forEach(fn=>fn({data:{requestId:request.requestId,ok:true,data:{
    month:request.month,availableCents:10000,reservedCents:999000,expenseCents:100000,toPayCents:50000,toReceiveCents:80000,
    accounts:[],cards:[{id:'inter',name:'Inter',dueDay:29}],items,purchases:[],plans:[{id:'aluguel',name:'Aluguel',paymentMethod:'boleto',cadence:'mensal-recorrente',baseCents:60000,startDate:'2026-11-05',count:1,kind:'pagar',category:'Moradia',cancelled:false}],payments:[],investments:[],taxRecords:[],receiptEnabled:false,receiptDirectory:'',
    invoices:[{id:'fatura',cardId:'inter',dueDate:'2026-10-29',amountCents:50000,paidCents:0,remainingCents:50000}]
   }}})))
  }}});
 });
 await page.goto('/');
 const panel=page.getByRole('region',{name:'Como vou fechar o mês?'});
 await expect(panel).toContainText('Receitas totais');
 await expect(panel).toContainText('Despesas totais');
 await expect(page.getByTestId('monthly-net')).toContainText('-R$');
 await expect(page.getByTestId('monthly-net')).toContainText('200,00');
 await expect(panel).not.toContainText('Previsão, não saldo bancário');
 const forecast=page.getByRole('region',{name:'Próximos meses · valores ainda pendentes'});
 await expect(forecast).toContainText('11/2026');
 await expect(forecast).toContainText('600,00');
});
