import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('aluguel mensal recorrente e extensão da previsão',async({page})=>{
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
  await page.getByRole('button',{name:'+ Cadastrar conta',exact:true}).click();
  await fillName('Aluguel');
  await page.getByLabel('Frequência',{exact:true}).selectOption('mensal-recorrente');
  await page.getByLabel('Valor mensal (R$)',{exact:true}).fill('1500');
  await expect(page.getByLabel('Quantidade de parcelas',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Quantos meses prever agora?',{exact:true})).toHaveValue('12');
  await page.getByLabel('Primeiro vencimento',{exact:true}).fill('2026-01-31');
  await save();
  await page.getByRole('button',{name:'Parcelamentos',exact:true}).click();
  const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Cobranças mensais recorrentes',exact:true})});
  await section.locator('summary').click();
  await expect(section.locator('tbody tr')).toHaveCount(12);
  await expect(section).toContainText('28/02/2026');
  await expect(section).toContainText('31/03/2026');
  await expect(section).not.toContainText('Total do contrato');
  await section.getByRole('button',{name:'+ 12 meses',exact:true}).click();
  await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  await expect(section.locator('tbody tr')).toHaveCount(24);
  await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-28-recorrente-mensal.png'),fullPage:true});
  await page.getByRole('button',{name:'Contas a pagar',exact:true}).click();
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-02');
  await expect(page.getByRole('row').filter({hasText:'Aluguel'})).toContainText('1.500,00');
 }finally{
  child.stdin.end();
  await new Promise<void>(resolve=>{child.on('exit',()=>resolve());setTimeout(()=>{child.kill();resolve()},5000).unref()});
  lines.close();
 }
});
