import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('recebíveis: sem data, variáveis, confirmação e recebimento parcial',async({page})=>{
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
  await fillName('Itaú');await page.getByLabel('Saldo que você já tem (R$)',{exact:true}).fill('0');await save();
  await page.getByRole('button',{name:'Contas a receber',exact:true}).click();
  await page.getByRole('button',{name:'+ Recebível',exact:true}).click();
  await page.getByLabel('Descrição do recebível',{exact:true}).fill('Empréstimo José');
  await page.getByLabel('Quem vai pagar / plataforma',{exact:true}).fill('José');
  await page.getByLabel('Valor previsto (R$)',{exact:true}).fill('200');
  await page.getByLabel('Origem / categoria',{exact:true}).selectOption('__new');await page.getByLabel('Nova categoria',{exact:true}).fill('Empréstimos');
  await save();
  const jose=page.getByRole('row').filter({hasText:'Empréstimo José'});
  await expect(jose).toContainText('Sem data');await expect(jose).not.toContainText('Em atraso');
  await expect(page.getByTestId('receive-uncertain')).toContainText('200,00');
  await page.getByRole('button',{name:'+ Recebível',exact:true}).click();
  await page.getByLabel('Descrição do recebível',{exact:true}).fill('Entregas da semana');
  await page.getByLabel('Quem vai pagar / plataforma',{exact:true}).fill('Plataforma');
  await page.getByLabel('Valor previsto (R$)',{exact:true}).fill('350');
  await page.getByLabel('Confirmação',{exact:true}).selectOption('confirmado');
  await page.getByLabel('Frequência',{exact:true}).selectOption('semanal');
  await page.getByLabel('Data prevista (opcional)',{exact:true}).fill('2026-10-30');
  await page.getByLabel('Quantidade de períodos a criar',{exact:true}).fill('2');
  await save();
  await expect(page.getByTestId('receive-confirmed')).toContainText('700,00');
  const second=page.getByRole('row').filter({hasText:'06/11/2026'});
  await second.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Valor previsto (R$)',{exact:true}).fill('420');await save();
  await expect(page.getByTestId('receive-confirmed')).toContainText('770,00');
  await jose.getByRole('button',{name:'Receber',exact:true}).click();
  await page.getByLabel('Conta da baixa',{exact:true}).selectOption({index:1});
  await page.getByLabel('Valor (R$)',{exact:true}).fill('50');await save();
  await expect(page.getByTestId('receive-uncertain')).toContainText('150,00');
  await expect(page.getByTestId('available')).toContainText('50,00');
  await jose.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Confirmação',{exact:true}).selectOption('confirmado');await save();
  await expect(page.getByTestId('receive-confirmed')).toContainText('920,00');
  await expect(page.getByTestId('receive-uncertain')).toContainText('0,00');
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2027-01');
  await expect(jose).toBeVisible();
  await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-28-contas-a-receber.png'),fullPage:true});
  await page.getByRole('button',{name:'Contas a pagar',exact:true}).click();
  await expect(page.getByRole('row').filter({hasText:'Empréstimo José'})).toHaveCount(0);
  await page.reload();
  await page.getByLabel('Mês de vencimento',{exact:true}).fill('2026-10');
  await expect(page.getByTestId('receive-confirmed')).toContainText('350,00');
  await expect(page.getByTestId('receive-undated-confirmed')).toContainText('150,00');
  await expect(page.getByTestId('available')).toContainText('50,00');
 }finally{
  child.stdin.end();
  await new Promise<void>(resolve=>{child.on('exit',()=>resolve());setTimeout(()=>{child.kill();resolve()},5000).unref()});
  lines.close();
 }
});
