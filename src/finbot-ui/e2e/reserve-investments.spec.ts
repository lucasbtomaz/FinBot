import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('reserva em investimentos sem duplicar saldo',async({page})=>{
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
 await page.getByRole('button',{name:'Contas e cartões'}).click();
 await page.getByRole('button',{name:'+ Adicionar',exact:true}).click();
 await fillName('Caixinha antiga');await page.getByLabel('Tipo',{exact:true}).selectOption('reserva');
 await page.getByLabel('Saldo que você já tem (R$)',{exact:true}).fill('500');await save();
 await expect(page.getByRole('button',{name:'Reservas',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Investimentos',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Caixinha antiga',exact:true})).toBeVisible();
 await expect(page.getByRole('table')).toContainText('500,00');
 await expect(page.locator('.investment-chart circle')).toHaveCount(1);
 await page.getByRole('button',{name:'Atualizar valor mensal',exact:true}).click();
 await page.getByLabel('Saldo neste mês (R$)',{exact:true}).fill('550');await save();
 await expect(page.getByRole('table')).toContainText('550,00');
 await expect(page.getByTestId('available')).toContainText('0,00');
 await expect(page.getByTestId('expense')).toContainText('0,00');
 await expect(page.getByTestId('invested-total')).toContainText('550,00');
 await page.reload();await page.getByRole('button',{name:'Investimentos',exact:true}).click();
 await expect(page.getByRole('table')).toContainText('550,00');
 await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-29-reservas-em-investimentos.png'),fullPage:true});
 }finally{child.stdin.end();await new Promise<void>(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill();resolve()},5000).unref()});lines.close()}
});
