import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('recorrência em cartão e compras por total ou por parcela',async({page})=>{
 const child=spawn('dotnet',[path.resolve('../../tests/FinBot.Driver/bin/Release/net10.0/FinBot.Driver.dll')],{stdio:['pipe','pipe','pipe']});
 const pending:((value:unknown)=>void)[]=[];
 const lines=createInterface({input:child.stdout});
 lines.on('line',line=>{pending.shift()?.(JSON.parse(line))});
 await page.exposeFunction('finbotTestRequest',(value:unknown)=>new Promise(resolve=>{pending.push(resolve);child.stdin.write(JSON.stringify(value)+'\n')}));
 await page.addInitScript(()=>{
  const listeners=new Set<(event:{data:unknown})=>void>();
  Object.defineProperty(window,'chrome',{configurable:true,value:{webview:{
   addEventListener:(_:string,callback:(event:{data:unknown})=>void)=>listeners.add(callback),
   removeEventListener:(_:string,callback:(event:{data:unknown})=>void)=>listeners.delete(callback),
   postMessage:(value:unknown)=>(window as any).finbotTestRequest(value).then((data:unknown)=>listeners.forEach(fn=>fn({data})))
  }}});
 });
 const save=async()=>{await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)};
 const fillName=async(value:string)=>page.getByLabel('Descrição / nome',{exact:true}).fill(value);

 try{
  await page.goto('/');
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-10');
  await page.getByRole('button',{name:'Contas e cartões',exact:true}).click();
  for(const name of ['Inter','Nubank']){
   await page.getByRole('button',{name:'+ Cartão',exact:true}).click();await fillName(name);
   await page.getByLabel('Dia de vencimento da fatura',{exact:true}).fill(name==='Inter'?'25':'10');await save();
  }
  await page.getByRole('button',{name:'+ Cadastrar conta',exact:true}).click();
  await fillName('Anuidade Inter');
  await page.getByLabel('Frequência',{exact:true}).selectOption('mensal-recorrente');
  await page.getByLabel('Forma de pagamento',{exact:true}).selectOption('cartao');
  await page.getByLabel('Cartão',{exact:true}).selectOption({label:'Inter'});
  await page.getByLabel('Valor mensal (R$)',{exact:true}).fill('30');
  await page.getByLabel('Quantos meses prever agora?',{exact:true}).fill('3');
  await page.getByLabel('Mês da primeira fatura',{exact:true}).fill('2026-10');
  await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-29-recorrencia-cartao.png'),fullPage:true});
  await save();await expect(page.getByTestId('expense')).toContainText('30,00');
  for(const basis of ['total','parcela']){
   await page.getByRole('button',{name:'+ Compra no cartão',exact:true}).click();
   await fillName('Compra '+basis);await page.getByLabel('Cartão',{exact:true}).selectOption({label:'Inter'});
   await page.getByLabel('Como informar o valor',{exact:true}).selectOption(basis);
   await page.getByLabel(basis==='total'?'Valor TOTAL da compra (R$)':'Valor de cada parcela (R$)',{exact:true}).fill(basis==='total'?'180':'15');
   await page.getByLabel('Quantidade de parcelas',{exact:true}).fill('12');
   await page.getByLabel('Mês da PRIMEIRA fatura da compra',{exact:true}).fill('2026-10');
   await expect(page.getByRole('dialog')).toContainText('180,00');
   await save();
  }
  await expect(page.getByTestId('expense')).toContainText('60,00');
  for(const basis of ['total','parcela']){
   await page.getByRole('button',{name:'+ Cadastrar conta',exact:true}).click();
   await fillName('Cadastro '+basis);await page.getByLabel('Frequência',{exact:true}).selectOption('parcelado');
   await page.getByLabel('Forma de pagamento',{exact:true}).selectOption('cartao');
   await page.getByLabel('Cartão',{exact:true}).selectOption({label:'Inter'});
   await page.getByLabel('Como informar o valor',{exact:true}).selectOption(basis);
   await page.getByLabel(basis==='total'?'Valor TOTAL da compra (R$)':'Valor de cada parcela (R$)',{exact:true}).fill(basis==='total'?'100':'33,33');
   await page.getByLabel('Quantidade de parcelas',{exact:true}).fill('3');
   await page.getByLabel('Mês da primeira fatura',{exact:true}).fill('2026-10');
   await save();
  }
  await expect(page.getByTestId('expense')).toContainText('126,67');
  await page.getByRole('button',{name:'Contas a pagar',exact:true}).click();
  await expect(page.locator('.invoice')).toHaveCount(1);
  await expect(page.locator('.invoice')).toContainText('Inter');
  await expect(page.locator('.invoice')).toContainText('25/10/2026');
  await expect(page.locator('.invoice')).toContainText('126,67');
  await page.getByRole('button',{name:'Parcelamentos',exact:true}).click();
  const recurring=page.locator('details.contract').filter({hasText:'Anuidade Inter'});
  await expect(recurring.locator('summary')).toContainText('Inter');
  await recurring.locator('summary').click();await expect(recurring.locator('tbody tr')).toHaveCount(3);
  await recurring.getByRole('button',{name:'+ 12 meses',exact:true}).click();
  await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  await expect(recurring.locator('tbody tr')).toHaveCount(15);
  await page.reload();
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2027-10');
  await page.getByRole('button',{name:'Contas a pagar',exact:true}).click();
  await expect(page.locator('.invoice')).toContainText('30,00');
  await expect(page.locator('.invoice')).toContainText('Inter');
 }finally{
  child.stdin.end();
  await new Promise<void>(resolve=>{child.on('exit',()=>resolve());setTimeout(()=>{child.kill();resolve()},5000).unref()});
  lines.close();
 }
});
