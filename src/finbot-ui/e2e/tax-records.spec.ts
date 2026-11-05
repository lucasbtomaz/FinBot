import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('IR pendente, confirmação e reutilização de categorias',async({page})=>{
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
  await fillName('Consulta teste IR');
  await page.getByLabel('Valor (R$)',{exact:true}).fill('250');
  await page.getByRole('checkbox',{name:'IR',exact:true}).check();
  await expect(page.getByLabel('CPF/CNPJ',{exact:true})).toHaveCount(0);
  await page.getByLabel('Categoria',{exact:true}).selectOption('__new');
  await page.getByLabel('Nova categoria',{exact:true}).fill('Saúde pessoal');
  await save();
  await page.getByRole('button',{name:'Imposto de Renda',exact:true}).click();
  const row=page.getByRole('row').filter({hasText:'Consulta teste IR'});
  await expect(row).toContainText('Pendente');
  await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-29-ir-pendente.png'),fullPage:true});
  await row.getByRole('button',{name:'Completar dados'}).click();
  await page.getByLabel('CPF/CNPJ',{exact:true}).fill('12345678901');
  await page.getByLabel('Categoria / natureza no IR',{exact:true}).fill('Consulta médica');
  await save();
  await expect(row).toContainText('Confirmado');
  await page.getByRole('button',{name:'Visão geral',exact:true}).click();
  await page.getByRole('button',{name:'+ Cadastrar conta',exact:true}).click();
  await expect(page.getByLabel('Categoria',{exact:true}).locator('option')).toContainText(['Outros','Saúde pessoal','Nova categoria…']);
  await page.getByLabel('Categoria',{exact:true}).selectOption('__new');
  await page.getByLabel('Nova categoria',{exact:true}).fill('  saúde pessoal  ');
  await fillName('Consulta seguinte');
  await page.getByLabel('Valor (R$)',{exact:true}).fill('100');
  await save();
  await page.getByRole('button',{name:'Imposto de Renda',exact:true}).click();
  await expect(page.getByRole('row').filter({hasText:'Consulta seguinte'})).toHaveCount(0);
  await page.getByRole('button',{name:'+ Cadastrar conta',exact:true}).click();
  await expect(page.getByLabel('Categoria',{exact:true}).locator('option')).toHaveText(['Outros','Saúde pessoal','Nova categoria…']);
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.screenshot({path:path.resolve('../../UX/capturas/2026-10-29-imposto-de-renda.png'),fullPage:true});
 }finally{child.stdin.end();await new Promise<void>(resolve=>{const timer=setTimeout(()=>{child.kill();resolve()},5000);child.once('exit',()=>{clearTimeout(timer);resolve()})});lines.close()}
});
