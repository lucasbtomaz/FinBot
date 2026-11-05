import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('atualização de saldo, reserva, projeção e desfazer ajuste',async({page})=>{
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
  await page.getByRole('button',{name:'Contas e cartões',exact:true}).click();
  await page.getByRole('button',{name:'+ Adicionar',exact:true}).click();
  await fillName('Itaú');await page.getByLabel('Saldo que você já tem (R$)',{exact:true}).fill('1000');await save();
  const account=page.locator('.account-row').filter({hasText:'Itaú'});
  await account.getByRole('button',{name:'Atualizar saldo',exact:true}).click();
  await expect(page.getByLabel('Saldo atual correto (R$)',{exact:true})).toHaveValue('1000,00');
  await page.getByLabel('Saldo atual correto (R$)',{exact:true}).fill('1250');await save();
  await expect(page.getByTestId('available')).toContainText('1.250,00');
  await account.getByRole('button',{name:'Atualizar saldo',exact:true}).click();
  await page.getByLabel('Saldo atual correto (R$)',{exact:true}).fill('800');await save();
  await page.getByRole('button',{name:'+ Adicionar',exact:true}).click();
  await fillName('Caixinha');await page.getByLabel('Tipo',{exact:true}).selectOption('reserva');
  await page.getByLabel('Saldo que você já tem (R$)',{exact:true}).fill('100');await save();
  const reserve=page.locator('.account-row').filter({hasText:'Caixinha'});
  await reserve.getByRole('button',{name:'Atualizar saldo',exact:true}).click();
  await page.getByLabel('Saldo atual correto (R$)',{exact:true}).fill('250');await save();
  await expect(reserve).toContainText('250,00');await expect(page.getByTestId('available')).toContainText('800,00');
  await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-28-atualizar-saldo.png'),fullPage:true});
  await page.reload();
  await expect(page.getByTestId('available')).toContainText('800,00');
  await expect(page.getByTestId('projection-total')).toContainText('800,00');
  await expect(page.getByTestId('expense')).toContainText('0,00');
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.locator('.payment-row').filter({hasText:'Ajuste de saldo: Itaú'}).first().getByRole('button',{name:'Desfazer',exact:true}).click();
  await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  await expect(page.getByTestId('available')).toContainText('1.250,00');
 }finally{
  child.stdin.end();
  await new Promise<void>(resolve=>{child.on('exit',()=>resolve());setTimeout(()=>{child.kill();resolve()},5000).unref()});
  lines.close();
 }
});
