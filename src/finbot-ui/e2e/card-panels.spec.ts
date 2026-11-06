import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';

test('cartão visual calcula limite, aberto e disponível e permite edição',async({page})=>{
 const child=spawn('dotnet',[path.resolve('../../tests/FinBot.Driver/bin/Release/net10.0/FinBot.Driver.dll')],{stdio:['pipe','pipe','pipe']});
 const pending:((value:unknown)=>void)[]=[];
 const lines=createInterface({input:child.stdout});
 lines.on('line',line=>pending.shift()?.(JSON.parse(line)));
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
 try{
  await page.goto('/');
  await page.getByRole('button',{name:'Contas e cartões',exact:true}).click();
  await page.getByRole('button',{name:'+ Cartão',exact:true}).click();
  await page.getByLabel('Descrição / nome',{exact:true}).fill('Inter');
  await page.getByLabel('Limite total (R$)',{exact:true}).fill('5.000');
  await page.getByLabel('Dia de fechamento',{exact:true}).fill('15');
  await page.getByLabel('Dia de vencimento da fatura',{exact:true}).fill('25');
  await save();
  const card=page.getByRole('article',{name:'Cartão Inter'});
  await expect(card).toContainText('R$ 5.000,00');
  await expect(card).toContainText('R$ 0,00');
  await expect(card).toContainText('Fecha dia 15');
  await expect(card).toContainText('Vence dia 25');

  await page.getByRole('button',{name:'+ Compra no cartão',exact:true}).click();
  await page.getByLabel('Descrição / nome',{exact:true}).fill('Notebook');
  await page.getByLabel('Cartão',{exact:true}).selectOption({label:'Inter'});
  await page.getByLabel('Valor TOTAL da compra (R$)',{exact:true}).fill('1.200');
  await page.getByLabel('Quantidade de parcelas',{exact:true}).fill('2');
  await page.getByLabel('Mês da PRIMEIRA fatura da compra',{exact:true}).fill('2026-10');
  await save();
  await expect(card.getByTestId('card-open')).toContainText('1.200,00');
  await expect(card.getByTestId('card-available')).toContainText('3.800,00');
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow','24');

  await card.getByRole('button',{name:'Editar Inter',exact:true}).click();
  await page.getByLabel('Limite total (R$)',{exact:true}).fill('1.000');
  await save();
  await expect(card.getByTestId('card-available')).toContainText('0,00');
  await expect(card).toContainText('Limite excedido em R$ 200,00'.replace('R$ ','R$\u00a0'));
 }finally{
  child.stdin.end();
  await new Promise<void>(resolve=>{child.on('exit',()=>resolve());setTimeout(()=>{child.kill();resolve()},5000).unref()});
  lines.close();
 }
});
