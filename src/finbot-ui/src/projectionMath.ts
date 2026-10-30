import type {Item} from './api';

export type ProjectionDay={date:string;names:string[];confirmedIn:number;uncertainIn:number;out:number;projected:number;confirmed:number;overdue:boolean};
export type ProjectionMonth={month:string;opening:number;confirmedOpening:number;confirmedIn:number;uncertainIn:number;out:number;closing:number;confirmedClosing:number;minimum:number;confirmedMinimum:number;firstShortfall:string;confirmedFirstShortfall:string;days:ProjectionDay[]};
export function monthOffset(month:string,offset:number){
 const index=Number(month.slice(0,4))*12+Number(month.slice(5))-1+offset;
 return String(Math.floor(index/12)).padStart(4,'0')+'-'+String(index%12+1).padStart(2,'0');
}
export function projectCash(items:Item[],available:number,asOf:string,count=12):ProjectionMonth[]{
 const groups=new Map<string,{names:string[];confirmedIn:number;uncertainIn:number;out:number;overdue:boolean}>();
 for(const item of items){
  if(item.cancelled||item.remainingCents<=0||!item.dueDate)continue;
  // Valores já baixados estão no saldo atual. Faturas não são somadas novamente.
  const date=item.dueDate<asOf?asOf:item.dueDate;
  const group=groups.get(date)??{names:[],confirmedIn:0,uncertainIn:0,out:0,overdue:false};
  group.names.push(item.name+(item.dueDate<asOf?' (vencido em '+item.dueDate.split('-').reverse().join('/')+')':''));
  group.overdue ||= item.dueDate<asOf;
  if(item.kind==='pagar')group.out+=item.remainingCents;
  else if(item.kind==='receber'&&item.confidence==='confirmado')group.confirmedIn+=item.remainingCents;
  else if(item.kind==='receber')group.uncertainIn+=item.remainingCents;
  groups.set(date,group);
 }
 const events=[...groups].sort(([a],[b])=>a.localeCompare(b));
 let projected=available,confirmed=available;
 const months:ProjectionMonth[]=[];
 for(let index=0;index<count;index++){
  const month=monthOffset(asOf.slice(0,7),index);
  const startDate=index===0?asOf:month+'-01';
  const row:ProjectionMonth={month,opening:projected,confirmedOpening:confirmed,confirmedIn:0,uncertainIn:0,out:0,closing:projected,confirmedClosing:confirmed,minimum:projected,confirmedMinimum:confirmed,firstShortfall:projected<0?startDate:'',confirmedFirstShortfall:confirmed<0?startDate:'',days:[]};
  for(const [date,event] of events.filter(([date])=>date.startsWith(month+'-'))){
   projected+=event.confirmedIn+event.uncertainIn-event.out;
   confirmed+=event.confirmedIn-event.out;
   row.confirmedIn+=event.confirmedIn;row.uncertainIn+=event.uncertainIn;row.out+=event.out;
   row.minimum=Math.min(row.minimum,projected);row.confirmedMinimum=Math.min(row.confirmedMinimum,confirmed);
   if(projected<0&&!row.firstShortfall)row.firstShortfall=date;
   if(confirmed<0&&!row.confirmedFirstShortfall)row.confirmedFirstShortfall=date;
   row.days.push({date,...event,projected,confirmed});
  }
  row.closing=projected;row.confirmedClosing=confirmed;months.push(row);
 }
 return months;
}
