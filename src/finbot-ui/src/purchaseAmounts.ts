import {money,parseMoney} from './api';
export function purchaseTotal(value:string,basis:string,count:number):number{
 if(!Number.isInteger(count)||count<1||count>120)throw new Error('Informe de 1 a 120 parcelas.');
 if(basis!=='total'&&basis!=='parcela')throw new Error('Escolha como informar o valor da compra.');
 const amount=parseMoney(value),total=basis==='parcela'?amount*count:amount;
 if(!Number.isSafeInteger(total)||total>100000000000||total<count)throw new Error('Confira o valor: cada parcela deve ter pelo menos R$ 0,01 e o total deve ser até R$ 1 bilhão.');
 return total;
}
export function purchasePreview(total:number,count:number):string{
 const base=Math.floor(total/count),remainder=total%count;
 return (remainder?remainder+' parcela(s) de '+money(base+1)+' e '+(count-remainder)+' de '+money(base):count+' × '+money(base))+' · Total '+money(total);
}
