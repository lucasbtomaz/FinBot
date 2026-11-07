# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tab-responsibilities.spec.ts >> cada aba exibe somente suas responsabilidades e separa contratos quitados
- Location: e2e\tab-responsibilities.spec.ts:3:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('monthly-net')
Expected substring: "200,00"
Received string:    "-R$ 100,00"
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByTestId('monthly-net') with timeout 5000ms
  - waiting for getByTestId('monthly-net')
    14 × locator resolved to <strong class="red" data-testid="monthly-net">-R$ 100,00</strong>
       - unexpected value "-R$ 100,00"

```

```yaml
- strong: "-R$ 100,00"
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | 
  3  | test('cada aba exibe somente suas responsabilidades e separa contratos quitados',async({page})=>{
  4  |  await page.addInitScript(()=>{
  5  |   const item=(id:string,name:string,kind:string,dueDate:string,remainingCents:number,extra:Record<string,unknown>={})=>({
  6  |    id,name,kind,dueDate,remainingCents,amountCents:10000,paidCents:10000-remainingCents,category:'Outros',cancelled:false,
  7  |    purchaseId:'',cardId:'',number:1,count:1,planId:'',paymentMethod:'boleto',baseCents:10000,extraCents:0,note:'',payer:'',confidence:'incerto',receivableCadence:'unico',...extra
  8  |   });
  9  |   const items=[
  10 |    item('ativo-1','Contrato ativo','pagar','2026-10-30',10000,{planId:'ativo'}),
  11 |    item('quitado-1','Contrato quitado','pagar','2026-10-20',0,{planId:'quitado'}),
  12 |    item('receita-1','Receita mensal','receber','2026-10-15',0,{amountCents:30000,paidCents:30000})
  13 |   ];
  14 |   const listeners=new Set<(event:{data:unknown})=>void>();
  15 |   Object.defineProperty(window,'chrome',{configurable:true,value:{webview:{
  16 |    addEventListener:(_:string,fn:(event:{data:unknown})=>void)=>listeners.add(fn),
  17 |    removeEventListener:(_:string,fn:(event:{data:unknown})=>void)=>listeners.delete(fn),
  18 |    postMessage:(request:{requestId:string;month:string})=>queueMicrotask(()=>listeners.forEach(fn=>fn({data:{requestId:request.requestId,ok:true,data:{
  19 |     month:request.month,availableCents:50000,reservedCents:0,expenseCents:10000,toPayCents:10000,toReceiveCents:0,
  20 |     accounts:[{id:'conta',name:'Conta',kind:'conta',balanceCents:50000}],cards:[],items,purchases:[],invoices:[],payments:[],investments:[],taxRecords:[],receiptEnabled:false,receiptDirectory:'',
  21 |     plans:[
  22 |      {id:'ativo',name:'Contrato ativo',paymentMethod:'boleto',cadence:'mensal',baseCents:10000,startDate:'2026-10-30',count:1,kind:'pagar',category:'Outros',cancelled:false},
  23 |      {id:'quitado',name:'Contrato quitado',paymentMethod:'boleto',cadence:'mensal',baseCents:10000,startDate:'2026-10-20',count:1,kind:'pagar',category:'Outros',cancelled:false}
  24 |     ]
  25 |    }}})))
  26 |   }}});
  27 |  });
  28 | 
  29 |  await page.goto('/');
  30 |  await expect(page.getByRole('region',{name:'Resumo financeiro'})).toBeVisible();
> 31 |  await expect(page.getByTestId('monthly-net')).toContainText('200,00');
     |                                                ^ Error: expect(locator).toContainText(expected) failed
  32 |  await expect(page.getByRole('button',{name:'+ Cadastrar conta',exact:true})).toHaveCount(0);
  33 |  await expect(page.getByRole('button',{name:'+ Compra no cartão',exact:true})).toHaveCount(0);
  34 |  await expect(page.getByRole('button',{name:'⇄ Transferir',exact:true})).toHaveCount(0);
  35 |  await expect(page.getByRole('heading',{name:'Lançamentos do mês',exact:true})).toHaveCount(0);
  36 |  await expect(page.getByRole('heading',{name:'Próximos meses · valores ainda pendentes',exact:true})).toBeVisible();
  37 | 
  38 |  await page.getByRole('button',{name:'Parcelamentos',exact:true}).click();
  39 |  await expect(page.getByRole('region',{name:'Resumo financeiro'})).toHaveCount(0);
  40 |  const active=page.locator('section').filter({has:page.getByRole('heading',{name:'Contratos e compras parceladas',exact:true})});
  41 |  await expect(active).toContainText('Contrato ativo');
  42 |  await expect(active).not.toContainText('Contrato quitado');
  43 |  const settled=page.locator('section').filter({has:page.getByRole('heading',{name:'Contratos Quitados',exact:true})});
  44 |  await expect(settled).toContainText('Contrato quitado');
  45 |  await expect(settled).not.toContainText('Contrato ativo');
  46 |  await expect(page.getByRole('heading',{name:'Próximos meses · valores ainda pendentes',exact:true})).toHaveCount(0);
  47 | 
  48 |  await page.getByRole('button',{name:'Contas e cartões',exact:true}).click();
  49 |  await expect(page.getByRole('button',{name:'+ Cadastrar conta',exact:true})).toBeVisible();
  50 |  await expect(page.getByRole('button',{name:'+ Compra no cartão',exact:true})).toBeVisible();
  51 |  await expect(page.getByRole('button',{name:'⇄ Transferir',exact:true})).toBeVisible();
  52 |  await page.getByRole('button',{name:'Imposto de Renda',exact:true}).click();
  53 |  await expect(page.getByRole('button',{name:'+ Cadastrar conta',exact:true})).toHaveCount(0);
  54 | });
  55 | 
  56 | test('a aplicação usa tema claro em todas as abas',async({page})=>{
  57 |  await page.goto('/');
  58 |  await expect(page.locator('body')).toHaveCSS('color-scheme','light');
  59 |  await expect(page.locator('body')).toHaveCSS('background-color','rgb(243, 245, 248)');
  60 | 
  61 |  for(const tab of ['Contas e cartões','Lançamentos','Parcelamentos','Contas a pagar','Contas a receber','Investimentos','Imposto de Renda']){
  62 |   await page.getByRole('button',{name:tab,exact:true}).click();
  63 |   await expect(page.locator('main')).toBeVisible();
  64 |   await expect(page.locator('body')).toHaveCSS('background-color','rgb(243, 245, 248)');
  65 |  }
  66 | });
  67 | 
```