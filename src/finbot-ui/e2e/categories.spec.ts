import {test,expect} from '@playwright/test';
import path from 'node:path';

test('categorias: ranking, mês, cancelamentos e nenhuma duplicação da fatura',async({page})=>{
 await page.addInitScript(()=>{
  const item=(id:string,category:string,amountCents:number,extra={})=>({id,name:id,kind:'pagar',category,amountCents,paidCents:0,remainingCents:amountCents,dueDate:'2026-10-24',cancelled:false,cardId:'',number:1,count:1,...extra});
  const items=[
   item('Mercado','Alimentação',20000),
   item('Almoço',' alimentação ',5000,{paidCents:5000,remainingCents:0,cardId:'inter'}),
   item('Moto','Transporte',18900),
   item('Freela','Trabalho',90000,{kind:'receber'}),
   item('Cancelado','Outros',80000,{cancelled:true}),
   item('Novembro','Transporte',10000,{dueDate:'2026-11-24'}),
   item('Avulso',' ',1000)
  ];
  const listeners=new Set<any>();
  Object.defineProperty(window,'chrome',{configurable:true,value:{webview:{
   addEventListener:(_:string,fn:any)=>listeners.add(fn),
   removeEventListener:(_:string,fn:any)=>listeners.delete(fn),
   postMessage:(request:any)=>queueMicrotask(()=>listeners.forEach(fn=>fn({data:{requestId:request.requestId,ok:true,data:{
    month:request.month,availableCents:100000,reservedCents:0,expenseCents:request.month==='2026-10'?44900:10000,toPayCents:39900,toReceiveCents:90000,
    accounts:[],cards:[{id:'inter',name:'Inter',dueDay:24}],items,purchases:[],plans:[],payments:[],
    invoices:[{id:'invoice',cardId:'inter',dueDate:'2026-10-24',amountCents:5000,paidCents:5000,remainingCents:0}]
   }}})))
  }}});
 });
 await page.goto('/');
 await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-10');
 const chart=page.getByRole('region',{name:'Despesas por categoria'});
 await expect(chart.getByRole('listitem')).toHaveCount(3);
 await expect(chart.getByRole('listitem').nth(0)).toContainText('Alimentação');
 await expect(chart.getByRole('listitem').nth(0)).toContainText('250,00');
 await expect(chart.getByRole('listitem').nth(0)).toContainText('55,7%');
 await expect(chart.getByRole('listitem').nth(1)).toContainText('189,00');
 await expect(chart.getByRole('listitem').nth(2)).toContainText('Sem categoria');
 await expect(chart.locator('.panel-title')).toContainText('449,00');
 const colors=await chart.locator('.category-track>div').evaluateAll(bars=>bars.map(bar=>getComputedStyle(bar).backgroundColor));
 expect(new Set(colors).size).toBe(3);
 await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-23-grafico-categorias-colorido.png'),fullPage:true});
 await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-11');
 await expect(chart.getByRole('listitem')).toHaveCount(1);
 await expect(chart.getByRole('listitem')).toContainText('100,00');
 await expect(chart.locator('.category-track>div')).toHaveCSS('background-color',colors[1]);
 await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-12');
 await expect(chart.getByRole('listitem')).toHaveCount(0);
 await expect(chart).toContainText('Nenhuma despesa neste mês');
});
