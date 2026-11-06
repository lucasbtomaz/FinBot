import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('recebíveis da Yasmin respeitam mês da visão geral',async({page})=>{
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
  await page.getByRole('button',{name:'Contas a receber',exact:true}).click();
  await page.getByRole('button',{name:'+ Recebível',exact:true}).click();
  await page.getByLabel('Descrição do recebível',{exact:true}).fill('Metade do aluguel');
  await page.getByLabel('Quem vai pagar / plataforma',{exact:true}).fill('Yasmin');
  await page.getByLabel('Valor previsto (R$)',{exact:true}).fill('550');
  await page.getByLabel('Confirmação',{exact:true}).selectOption('confirmado');
  await page.getByLabel('Frequência',{exact:true}).selectOption('mensal');
  await page.getByLabel('Quantidade de períodos a criar',{exact:true}).fill('2');
  await page.getByLabel('Data prevista (opcional)',{exact:true}).fill('2026-11-05');
  await save();
  await expect(page.getByTestId('receive-confirmed')).toContainText('1.100,00');
  await page.getByRole('button',{name:'Visão geral',exact:true}).click();
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-10');
  await expect(page.getByTestId('to-receive')).toHaveText(/R\$\s*0,00/);
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-11');
  await expect(page.getByTestId('to-receive')).toHaveText(/R\$\s*550,00/);
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-12');
  await expect(page.getByTestId('to-receive')).toHaveText(/R\$\s*550,00/);
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2027-01');
  await expect(page.getByTestId('to-receive')).toHaveText(/R\$\s*0,00/);
 }finally{
  child.stdin.end();
  await new Promise<void>(resolve=>{child.on('exit',()=>resolve());setTimeout(()=>{child.kill();resolve()},5000).unref()});
  lines.close();
 }
});
