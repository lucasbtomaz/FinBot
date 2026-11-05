import {test,expect} from '@playwright/test';
import {purchaseTotal,purchasePreview} from '../src/purchaseAmounts';
test('valor da parcela e total equivalem, com centavos preservados',()=>{
 expect(purchaseTotal('100','parcela',12)).toBe(purchaseTotal('1200','total',12));
 expect(purchaseTotal('33,33','parcela',3)).toBe(9999);
 const preview=purchasePreview(purchaseTotal('100','total',3),3);
 expect(preview).toContain('33,34');expect(preview).toContain('33,33');expect(preview).toContain('100,00');
});
test('rejeita quantidade e totais inválidos',()=>{
 for(const count of [0,-1,1.5,121])expect(()=>purchaseTotal('10','parcela',count)).toThrow();
 expect(()=>purchaseTotal('1000000000','parcela',2)).toThrow();
 expect(()=>purchaseTotal('0,01','total',2)).toThrow();
});
