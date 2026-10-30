import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import path from 'node:path';
import fs from 'node:fs/promises';

test('cadastro, 12 parcelas, baixa sem duplicação, recebimento e reserva',async({page})=>{
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
  await expect(page.getByTestId('available')).toContainText('0,00');
  await page.getByRole('button',{name:'Contas e cartões'}).click();
  await page.getByRole('button',{name:'+ Adicionar',exact:true}).click();
  await fillName('Itaú');await page.getByLabel('Saldo que você já tem (R$)',{exact:true}).fill('1.000,00');await save();
  await page.getByRole('button',{name:'+ Adicionar',exact:true}).click();
  await fillName('Caixinha');await page.getByLabel('Tipo',{exact:true}).selectOption('reserva');
  await page.getByLabel('Saldo que você já tem (R$)',{exact:true}).fill('500');await save();
  await page.getByRole('button',{name:'+ Cartão',exact:true}).click();await fillName('Inter');await save();
  await page.getByRole('button',{name:'+ Compra no cartão',exact:true}).click();
  await fillName('XPTO');await page.getByLabel('Cartão',{exact:true}).selectOption({label:'Inter'});
  await page.getByLabel('Valor TOTAL da compra (R$)',{exact:true}).fill('120');
  await page.getByLabel('Quantidade de parcelas',{exact:true}).fill('12');await save();
  await expect(page.getByTestId('expense')).toContainText('10,00');
  await page.getByRole('button',{name:'Contas a pagar',exact:true}).click();
  await page.getByRole('button',{name:'Pagar fatura',exact:true}).click();
  await page.getByLabel('Conta da baixa',{exact:true}).selectOption({index:1});await save();
  await expect(page.getByTestId('expense')).toContainText('10,00');
  await expect(page.getByTestId('available')).toContainText('990,00');
  await page.getByRole('button',{name:'Parcelamentos',exact:true}).click();
  await expect(page.locator('details summary')).toContainText('1 pagas de 12');
  await page.locator('details summary').click();
  await expect(page.locator('details tbody tr')).toHaveCount(12);
  await page.getByRole('button',{name:'+ Cadastrar conta',exact:true}).click();
  await fillName('Freela');await page.getByLabel('Natureza',{exact:true}).selectOption('receber');await page.getByLabel('Valor (R$)',{exact:true}).fill('140');await save();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.getByRole('row').filter({hasText:'Freela'}).getByRole('button',{name:'Dar baixa'}).click();
  await page.getByLabel('Valor (R$)',{exact:true}).fill('70');await page.getByLabel('Conta da baixa',{exact:true}).selectOption({index:1});await save();
  await expect(page.getByTestId('available')).toContainText('1.060,00');
  await page.getByRole('button',{name:'⇄ Transferir',exact:true}).click();
  await page.getByLabel('Valor (R$)',{exact:true}).fill('100');
  await page.getByLabel('Conta de origem',{exact:true}).selectOption({index:1});
  await page.getByLabel('Conta de destino',{exact:true}).selectOption({index:1});await save();
  await expect(page.getByTestId('available')).toContainText('960,00');
  await expect(page.getByTestId('expense')).toContainText('10,00');
  await page.reload();await expect(page.getByTestId('available')).toContainText('960,00');
  const output=path.resolve('../../UX/capturas');
  await fs.mkdir(output,{recursive:true});
  await page.screenshot({path:path.join(output,'2026-10-23-parcelamentos-v02-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Parcelamentos',exact:true}).click();
  await page.locator('details summary').click();
  await page.screenshot({path:path.join(output,'2026-10-23-parcelamentos-v02-cartao.png'),fullPage:true});

  await page.getByRole('button',{name:'+ Novo contrato',exact:true}).click();
  await fillName('Empréstimo Luz');
  await page.getByLabel('Forma de pagamento',{exact:true}).selectOption('boleto');
  await page.getByLabel('Valor de cada parcela (R$)',{exact:true}).fill('412,17');
  await page.getByLabel('Quantidade de parcelas',{exact:true}).fill('20');
  await page.getByLabel('Primeiro vencimento',{exact:true}).fill('2026-10-30');await save();
  const loan=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Empréstimo Luz'})});
  await loan.locator('summary').click();
  await expect(loan.locator('tbody tr')).toHaveCount(20);
  await expect(loan.locator('tbody tr').nth(4)).toContainText('28/02/2027');
  await expect(loan.locator('tbody tr').nth(5)).toContainText('30/03/2027');
  await loan.getByRole('checkbox',{name:'Parcela 1 paga de Empréstimo Luz',exact:true}).click();
  await page.getByLabel('Conta da baixa',{exact:true}).selectOption({index:1});await save();
  await expect(loan.getByRole('checkbox',{name:'Parcela 1 paga de Empréstimo Luz',exact:true})).toBeChecked();
  await expect(page.getByTestId('available')).toContainText('547,83');
  await loan.getByRole('checkbox',{name:'Parcela 1 paga de Empréstimo Luz',exact:true}).click();
  await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  await expect(loan.getByRole('checkbox',{name:'Parcela 1 paga de Empréstimo Luz',exact:true})).not.toBeChecked();
  await expect(page.getByTestId('available')).toContainText('960,00');
  await page.getByRole('button',{name:'+ Cadastrar conta',exact:true}).click();
  await fillName('Assinatura da moto');
  await page.getByLabel('Frequência',{exact:true}).selectOption('semanal');
  await page.getByLabel('Valor fixo por semana (R$)',{exact:true}).fill('189');
  await page.getByLabel('Primeiro vencimento',{exact:true}).fill('2026-10-24');await save();
  const moto=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Assinatura da moto'})});
  await moto.locator('summary').click();
  await expect(moto.locator('tbody tr')).toHaveCount(52);
  await moto.locator('tbody tr').first().getByRole('button',{name:'Nota / adicional'}).click();
  await page.getByLabel('Adicional desta cobrança (R$)',{exact:true}).fill('25');
  await page.getByLabel('Observação',{exact:true}).fill('Quilometragem extra');await save();
  await expect(moto.locator('tbody tr').first()).toContainText('214,00');
  await expect(moto.locator('tbody tr').nth(1)).toContainText('189,00');
  await moto.getByRole('button',{name:'+ 12 semanas',exact:true}).click();
  await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  await expect(moto.locator('tbody tr')).toHaveCount(64);
  await moto.locator('summary').click();
  await page.screenshot({path:path.join(output,'2026-10-23-parcelamentos-v02-contratos.png'),fullPage:true});
  await page.reload();
  await page.getByRole('button',{name:'Parcelamentos',exact:true}).click();
  await moto.locator('summary').click();
  await expect(moto.locator('tbody tr').first()).toContainText('Quilometragem extra');


  await page.getByRole('button',{name:'+ Novo contrato',exact:true}).click();
  await fillName('Compra única após alteração');
  await page.getByLabel('Quantas já foram pagas antes do cadastro?',{exact:true}).fill('1');
  await page.getByLabel('Frequência',{exact:true}).selectOption('unico');
  await page.getByLabel('Forma de pagamento',{exact:true}).selectOption('cartao');
  await page.getByLabel('Cartão',{exact:true}).selectOption({label:'Inter'});
  await page.getByLabel('Valor (R$)',{exact:true}).fill('20');await save();
  const single=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Compra única após alteração'})});
  await expect(single.locator('summary')).toContainText('0 pagas de 1');
  await single.locator('summary').click();
  await single.getByRole('checkbox').click();
  await page.getByLabel('Conta da baixa',{exact:true}).selectOption({index:1});
  await page.getByLabel('Valor (R$)',{exact:true}).fill('5');await save();
  await expect(single.locator('tbody tr')).toContainText('Parcial');
  await single.getByRole('button',{name:'Desfazer baixa parcial',exact:true}).click();
  await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  await expect(single.locator('tbody tr')).toContainText('Pendente');
  await expect(page.getByTestId('available')).toContainText('960,00');

 } finally {
  child.stdin.end();
  await new Promise<void>(resolve=>{child.on('exit',()=>resolve());setTimeout(()=>{child.kill();resolve()},5000).unref()});
  lines.close();
 }
});
