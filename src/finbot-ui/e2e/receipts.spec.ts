import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('baixas com e sem comprovante e vínculo no histórico',async({page})=>{
 const child=spawn('dotnet',[path.resolve('../../tests/FinBot.Driver/bin/Release/net10.0/FinBot.Driver.dll'),'--receipts'],{stdio:['pipe','pipe','pipe']});
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
 await fillName('Conta teste');
 await page.getByLabel('Saldo que você já tem (R$)',{exact:true}).fill('1000');await save();
 await page.getByRole('button',{name:'+ Cadastrar conta',exact:true}).click();
 await fillName('Conta com comprovante');await page.getByLabel('Valor (R$)',{exact:true}).fill('100');await save();
 await page.getByRole('button',{name:'Contas a pagar',exact:true}).click();
 await page.getByRole('button',{name:'Dar baixa',exact:true}).click();
 await page.getByLabel('Conta da baixa',{exact:true}).selectOption({index:1});
 await expect(page.getByLabel('Comprovante de pagamento',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Comprovante de pagamento',{exact:true})).not.toHaveAttribute('required');
 await page.getByLabel('Valor (R$)',{exact:true}).fill('40');
 await save();
 await expect(page.getByTestId('available')).toContainText('960,00');
 await page.getByRole('button',{name:'Dar baixa',exact:true}).click();
 await page.getByLabel('Conta da baixa',{exact:true}).selectOption({index:1});
 await page.getByLabel('Comprovante de pagamento',{exact:true}).setInputFiles({name:'comprovante.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\ncomprovante de teste\n%%EOF')});
 await save();
 await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
 await expect(page.getByRole('button',{name:'Abrir comprovante',exact:true})).toBeVisible();
 await expect(page.getByTestId('available')).toContainText('900,00');
 await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-29-comprovante-baixa.png'),fullPage:true});
 }finally{child.stdin.end();await new Promise<void>(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill();resolve()},5000).unref()});lines.close()}
});
