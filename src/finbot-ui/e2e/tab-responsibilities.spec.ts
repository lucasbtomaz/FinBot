import {test,expect} from '@playwright/test';

test('cada aba exibe somente suas responsabilidades e separa contratos quitados',async({page})=>{
 await page.addInitScript(()=>{
  const item=(id:string,name:string,kind:string,dueDate:string,remainingCents:number,extra:Record<string,unknown>={})=>({
   id,name,kind,dueDate,remainingCents,amountCents:10000,paidCents:10000-remainingCents,category:'Outros',cancelled:false,
   purchaseId:'',cardId:'',number:1,count:1,planId:'',paymentMethod:'boleto',baseCents:10000,extraCents:0,note:'',payer:'',confidence:'incerto',receivableCadence:'unico',...extra
  });
  const items=[
   item('ativo-1','Contrato ativo','pagar','2026-10-30',10000,{planId:'ativo'}),
   item('quitado-1','Contrato quitado','pagar','2026-10-20',0,{planId:'quitado'}),
   item('receita-1','Receita mensal','receber','2026-10-15',0,{amountCents:30000,paidCents:30000})
  ];
  const listeners=new Set<(event:{data:unknown})=>void>();
  Object.defineProperty(window,'chrome',{configurable:true,value:{webview:{
   addEventListener:(_:string,fn:(event:{data:unknown})=>void)=>listeners.add(fn),
   removeEventListener:(_:string,fn:(event:{data:unknown})=>void)=>listeners.delete(fn),
   postMessage:(request:{requestId:string;month:string})=>queueMicrotask(()=>listeners.forEach(fn=>fn({data:{requestId:request.requestId,ok:true,data:{
    month:request.month,availableCents:50000,reservedCents:0,expenseCents:10000,toPayCents:10000,toReceiveCents:0,
    accounts:[{id:'conta',name:'Conta',kind:'conta',balanceCents:50000}],cards:[],items,purchases:[],invoices:[],payments:[],investments:[],taxRecords:[],receiptEnabled:false,receiptDirectory:'',
    plans:[
     {id:'ativo',name:'Contrato ativo',paymentMethod:'boleto',cadence:'mensal',baseCents:10000,startDate:'2026-10-30',count:1,kind:'pagar',category:'Outros',cancelled:false},
     {id:'quitado',name:'Contrato quitado',paymentMethod:'boleto',cadence:'mensal',baseCents:10000,startDate:'2026-10-20',count:1,kind:'pagar',category:'Outros',cancelled:false}
    ]
   }}})))
  }}});
 });

 await page.goto('/');
 await expect(page.getByRole('region',{name:'Resumo financeiro'})).toBeVisible();
 await expect(page.getByTestId('monthly-net')).toContainText('200,00');
 await expect(page.getByRole('button',{name:'+ Cadastrar conta',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'+ Compra no cartão',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'⇄ Transferir',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Lançamentos do mês',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Próximos meses · valores ainda pendentes',exact:true})).toBeVisible();

 await page.getByRole('button',{name:'Parcelamentos',exact:true}).click();
 await expect(page.getByRole('region',{name:'Resumo financeiro'})).toHaveCount(0);
 const active=page.locator('section').filter({has:page.getByRole('heading',{name:'Contratos e compras parceladas',exact:true})});
 await expect(active).toContainText('Contrato ativo');
 await expect(active).not.toContainText('Contrato quitado');
 const settled=page.locator('section').filter({has:page.getByRole('heading',{name:'Contratos Quitados',exact:true})});
 await expect(settled).toContainText('Contrato quitado');
 await expect(settled).not.toContainText('Contrato ativo');
 await expect(page.getByRole('heading',{name:'Próximos meses · valores ainda pendentes',exact:true})).toHaveCount(0);

 await page.getByRole('button',{name:'Contas e cartões',exact:true}).click();
 await expect(page.getByRole('button',{name:'+ Cadastrar conta',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'+ Compra no cartão',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'⇄ Transferir',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Imposto de Renda',exact:true}).click();
 await expect(page.getByRole('button',{name:'+ Cadastrar conta',exact:true})).toHaveCount(0);
});

test('a aplicação usa tema claro em todas as abas',async({page})=>{
 await page.goto('/');
 await expect(page.locator('body')).toHaveCSS('color-scheme','light');
 await expect(page.locator('body')).toHaveCSS('background-color','rgb(243, 245, 248)');

 for(const tab of ['Contas e cartões','Lançamentos','Parcelamentos','Contas a pagar','Contas a receber','Investimentos','Imposto de Renda']){
  await page.getByRole('button',{name:tab,exact:true}).click();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(243, 245, 248)');
 }
});
