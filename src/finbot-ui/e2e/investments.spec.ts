import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('investimentos: histórico, correção mensal e evolução sem movimentar contas',async({page})=>{
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
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-09');
  await page.getByRole('button',{name:'Investimentos',exact:true}).click();
  await page.getByRole('button',{name:'+ Investimento',exact:true}).click();
  await page.getByLabel('Nome do investimento',{exact:true}).fill('Tesouro Selic');
  await page.getByLabel('Onde está investido',{exact:true}).fill('Inter');
  await page.getByLabel('Tipo de investimento',{exact:true}).selectOption('selic');
  await page.getByLabel('Total investido até este mês (R$)',{exact:true}).fill('1000');
  await page.getByLabel('Saldo neste mês (R$)',{exact:true}).fill('1010');
  await save();
  await expect(page.getByRole('table')).toContainText('1.010,00');
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-10');
  await page.getByRole('button',{name:'Atualizar valor mensal',exact:true}).click();
  await page.getByLabel('Saldo neste mês (R$)',{exact:true}).fill('980');
  await save();
  await expect(page.getByText(/Queda de/)).toContainText('30,00');
  await expect(page.locator('.investment-chart circle')).toHaveCount(2);
  await page.getByRole('row').filter({hasText:'10/2026'}).getByRole('button',{name:'Corrigir mês'}).click();
  await page.getByLabel('Saldo neste mês (R$)',{exact:true}).fill('990');
  await expect(page.getByRole('dialog')).toContainText('substituirá');
  await save();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(2);
  await expect(page.getByText(/Queda de/)).toContainText('20,00');
  await expect(page.getByTestId('available')).toContainText('0,00');
  await expect(page.getByTestId('expense')).toContainText('0,00');
  await page.reload();
  await page.getByRole('button',{name:'Investimentos',exact:true}).click();
  await expect(page.getByRole('table')).toContainText('990,00');
  await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-28-investimentos.png'),fullPage:true});
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-09');
  await expect(page.locator('.investment-chart circle')).toHaveCount(1);
  await expect(page.getByRole('table')).not.toContainText('990,00');
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-08');
  await expect(page.getByText('Nenhum registro até o mês selecionado.')).toBeVisible();
 }finally{
  child.stdin.end();
  await new Promise<void>(resolve=>{child.on('exit',()=>resolve());setTimeout(()=>{child.kill();resolve()},5000).unref()});
  lines.close();
 }
});
