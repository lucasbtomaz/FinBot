import {test,expect} from '@playwright/test';
import {projectCash} from '../src/projectionMath';
import type {Item} from '../src/api';
const item=(kind:string,dueDate:string,remainingCents:number,extra:Partial<Item>={}):Item=>({id:Math.random().toString(),name:'Registro',kind,dueDate,amountCents:remainingCents,remainingCents,paidCents:0,confidence:'incerto',cancelled:false,...extra} as Item);
test('carrega sobra e déficit sem tratar incertos como confirmados',()=>{
 const rows=projectCash([item('receber','2026-10-30',100000),item('pagar','2026-10-29',40000),item('pagar','2026-11-05',120000),item('receber','2026-12-01',50000,{confidence:'confirmado'})],50000,'2026-10-28');
 expect(rows[0].closing).toBe(110000);expect(rows[0].confirmedClosing).toBe(10000);
 expect(rows[1].opening).toBe(110000);expect(rows[1].closing).toBe(-10000);
 expect(rows[1].confirmedOpening).toBe(10000);expect(rows[1].confirmedClosing).toBe(-110000);
 expect(rows[2].opening).toBe(-10000);expect(rows[2].closing).toBe(40000);
});
test('detecta falta antes da entrada mesmo fechando positivo',()=>{
 const month=projectCash([item('pagar','2026-11-05',50000),item('receber','2026-11-10',80000)],10000,'2026-11-01')[0];
 expect(month.firstShortfall).toBe('2026-11-05');expect(month.minimum).toBe(-40000);expect(month.closing).toBe(40000);
});
test('usa só o restante, exclui cancelados e sem data e inclui vencidos uma vez',()=>{
 const rows=projectCash([item('pagar','2026-09-01',5000,{amountCents:10000,paidCents:5000,cardId:'inter'}),item('receber','2026-10-01',3000,{confidence:'confirmado'}),item('receber','',90000),item('pagar','2026-10-30',0,{paidCents:8000}),item('pagar','2026-11-01',40000,{cancelled:true})],10000,'2026-10-28');
 expect(rows[0].days).toHaveLength(1);expect(rows[0].days[0].date).toBe('2026-10-28');expect(rows[0].days[0].overdue).toBe(true);
 expect(rows[0].closing).toBe(8000);expect(rows[1].opening).toBe(8000);expect(rows[1].out).toBe(0);
});
test('fim de ano, mês vazio, saldo inicial negativo e compensação no mesmo dia',()=>{
 const rows=projectCash([item('receber','2026-12-30',1000),item('pagar','2026-12-30',1000)],-100,'2026-12-28');
 expect(rows[0].firstShortfall).toBe('2026-12-28');expect(rows[0].closing).toBe(-100);
 expect(rows[1].month).toBe('2027-01');expect(rows[1].opening).toBe(-100);expect(rows[1].firstShortfall).toBe('2027-01-01');
 const same=projectCash([item('pagar','2026-10-29',1000),item('receber','2026-10-29',1000)],0,'2026-10-28')[0];
 expect(same.firstShortfall).toBe('');expect(same.closing).toBe(0);
});
