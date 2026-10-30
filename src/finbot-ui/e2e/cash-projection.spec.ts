import {test,expect} from '@playwright/test';
import path from 'node:path';
test('projeção diária, saldo anterior e seleção de mês',async({page})=>{
 await page.clock.install({time:new Date('2026-10-28T12:00:00')});
 await page.addInitScript(()=>{
  const item=(id:string,kind:string,dueDate:string,remainingCents:number,extra={})=>({id,name:id,kind,dueDate,remainingCents,amountCents:remainingCents,paidCents:0,category:'Outros',cancelled:false,confidence:'incerto',cardId:'',...extra});
  const items=[item('Fatura Inter','pagar','2026-10-29',50000,{cardId:'inter',number:1,count:1}),item('Entregas','receber','2026-10-30',80000),item('Aluguel','pagar','2026-11-05',60000),item('Pagamento confirmado','receber','2026-12-10',50000,{confidence:'confirmado'}),item('José sem data','receber','',70000),item('Já pago','pagar','2026-10-10',0,{paidCents:50000,amountCents:50000})];
  const listeners=new Set<any>();
  Object.defineProperty(window,'chrome',{configurable:true,value:{webview:{
   addEventListener:(_:string,fn:any)=>listeners.add(fn),removeEventListener:(_:string,fn:any)=>listeners.delete(fn),
   postMessage:(request:any)=>queueMicrotask(()=>listeners.forEach(fn=>fn({data:{requestId:request.requestId,ok:true,data:{
    month:request.month,availableCents:10000,reservedCents:999000,expenseCents:100000,toPayCents:50000,toReceiveCents:80000,
    accounts:[],cards:[{id:'inter',name:'Inter',dueDay:29}],items,purchases:[],plans:[],payments:[],investments:[],
    invoices:[{id:'fatura',cardId:'inter',dueDate:'2026-10-29',amountCents:50000,paidCents:0,remainingCents:50000}]
   }}})))
  }}});
 });
 await page.goto('/');
 const panel=page.getByRole('region',{name:'Como vou fechar o mês?'});
 await expect(page.getByTestId('projection-total')).toContainText('400,00');
 await expect(page.getByTestId('projection-confirmed')).toContainText('400,00');
 await expect(page.getByTestId('projection-warning')).toContainText('29/10/2026');
 await expect(panel).toContainText('R$ 700,00 a receber sem data'.replace('R$ ','R$\u00a0'));
 await panel.getByRole('button',{name:'Ver próximos 12 meses e saldo anterior'}).click();
 const table=panel.locator('.projection-table');
 await expect(table.locator('tbody tr')).toHaveCount(12);
 await expect(table.locator('tbody tr').nth(1)).toContainText('-R$');
 await panel.locator('.projection-daily summary').click();
 await expect(panel.locator('.projection-daily tbody tr')).toHaveCount(2);
 await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-28-projecao-financeira.png'),fullPage:true});
 await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-11');
 await expect(panel).toContainText('Saldo previsto do mês anterior');
 await expect(page.getByTestId('projection-total')).toContainText('200,00');
 await expect(panel.locator('.projection-main')).toContainText('Vai faltar');
 await expect(panel.locator('.projection-formula')).toContainText('400,00');
 await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-12');
 await expect(page.getByTestId('projection-total')).toContainText('300,00');
 await expect(panel.locator('.projection-formula')).toContainText('-R$');
 await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-09');
 await expect(panel).toContainText('Este é um mês passado');
 await expect(page.getByTestId('projection-total')).toHaveCount(0);
});
