using FinBot.Core;
using Microsoft.Data.Sqlite;
namespace FinBot.Infrastructure;
public sealed partial class FinanceService
{
 private string ScheduleAction(SqliteConnection c,SqliteTransaction tx,FinanceCommand v,string id)
 {
  switch(v.Action){
   case "addPlan":
    Name(v.Name);Name(v.Category);Amount(v.AmountCents);var start=Date(v.Date);
    CardView? planCard=null;
    if(v.PaymentMethod=="cartao"){
     if(v.Kind!="pagar"||v.Cadence!="mensal-recorrente")throw new ArgumentException("Cartão nesta opção exige despesa recorrente mensal.");
     planCard=Cards(c,tx).SingleOrDefault(x=>x.Id==v.CardId)??throw new ArgumentException("Selecione um cartão.");
    }else Method(v.PaymentMethod);
    if(v.Kind is not ("pagar" or "receber") || v.Cadence is not ("mensal" or "semanal" or "mensal-recorrente") ||
       v.Count<1 || v.Count>520 || v.PaidCount<0 || v.PaidCount>v.Count)
      throw new ArgumentException("Confira a natureza, frequência e quantidade de cobranças (1 a 520).");
    if(start.Year>9900)throw new ArgumentException("Data fora do intervalo permitido.");
    Run(c,tx,"INSERT INTO payment_plans VALUES($id,$name,$method,$cadence,$base,$date,$count,$kind,$category,0)",
      ("$id",id),("$name",v.Name.Trim()),("$method",v.PaymentMethod),("$cadence",v.Cadence),("$base",v.AmountCents),
      ("$date",v.Date),("$count",v.Count),("$kind",v.Kind),("$category",v.Category.Trim()));
    GeneratePlanItems(c,tx,id,v.Name.Trim(),v.Kind,v.Category.Trim(),v.PaymentMethod,v.Cadence,start,v.AmountCents,0,v.Count,v.PaidCount,planCard);
    return id;
   case "extendPlan":
    var plan=Plans(c,tx).SingleOrDefault(x=>x.Id==v.TargetId&&!x.Cancelled)??throw new ArgumentException("Cobrança recorrente não encontrada.");
    if(plan.Cadence is not ("semanal" or "mensal-recorrente")||v.Count<1||v.Count>104||plan.Count+v.Count>520)
      throw new ArgumentException("Acrescente de 1 a 104 períodos, até o limite de 520 cobranças.");
    CardView? extendedCard=null;
    if(plan.PaymentMethod=="cartao"){
     var cardId=Rows(c,tx,"SELECT f.card_id FROM finance_items f JOIN plan_items pi ON pi.item_id=f.id WHERE pi.plan_id=$id AND f.card_id IS NOT NULL LIMIT 1",r=>r.GetString(0),("$id",plan.Id)).SingleOrDefault();
     extendedCard=Cards(c,tx).SingleOrDefault(x=>x.Id==cardId)??throw new ArgumentException("Cartão da recorrência não encontrado.");
    }
    GeneratePlanItems(c,tx,plan.Id,plan.Name,plan.Kind,plan.Category,plan.PaymentMethod,plan.Cadence,Date(plan.StartDate),
      plan.BaseCents,plan.Count,plan.Count+v.Count,0,extendedCard);
    Run(c,tx,"UPDATE payment_plans SET count=count+$count WHERE id=$id",("$count",v.Count),("$id",plan.Id));
    Run(c,tx,"UPDATE finance_items SET count=$count WHERE id IN (SELECT item_id FROM plan_items WHERE plan_id=$id)",("$count",plan.Count+v.Count),("$id",plan.Id));
    return plan.Id;
   case "editItem":
    var item=Items(c,tx).SingleOrDefault(x=>x.Id==v.TargetId&&!x.Cancelled)??throw new ArgumentException("Cobrança não encontrada.");
    Amount(v.ExtraCents,true);
    if(v.Note is null || v.Note.Length>1000)throw new ArgumentException("A observação deve ter até 1000 caracteres.");
    if(item.PaidCents>0&&v.ExtraCents!=item.ExtraCents)throw new ArgumentException("Desmarque ou desfaça as baixas antes de alterar o valor.");
    var total=checked(item.BaseCents+v.ExtraCents);Amount(total);
    Run(c,tx,"UPDATE finance_items SET amount_cents=$amount WHERE id=$id",("$amount",total),("$id",item.Id));
    Detail(c,tx,item.Id,item.PaymentMethod,item.BaseCents,v.ExtraCents,v.Note);
    return item.Id;
   case "unpayItem":
    return UnpayItem(c,tx,v.TargetId);
   case "cancelPlan":
    var parts=Items(c,tx).Where(x=>x.PlanId==v.TargetId&&!x.Cancelled).ToList();
    if(parts.Count==0)throw new ArgumentException("Contrato não encontrado.");
    if(Rows(c,tx,"SELECT COUNT(*) FROM allocations a JOIN payments p ON p.id=a.payment_id JOIN plan_items i ON i.item_id=a.item_id WHERE i.plan_id=$id AND p.reversed=0 AND a.amount_cents>0",r=>r.GetInt64(0),("$id",v.TargetId)).Single()>0)
      throw new ArgumentException("Desfaça as baixas antes de cancelar o contrato.");
    Run(c,tx,"UPDATE finance_items SET cancelled=1 WHERE id IN (SELECT item_id FROM plan_items WHERE plan_id=$id)",("$id",v.TargetId));
    Run(c,tx,"UPDATE payment_plans SET cancelled=1 WHERE id=$id",("$id",v.TargetId));
    return v.TargetId;
   default:throw new ArgumentException("Operação desconhecida.");
  }
 }
 private static void GeneratePlanItems(SqliteConnection c,SqliteTransaction tx,string plan,string name,string kind,string category,
   string method,string cadence,DateOnly start,long amount,int from,int until,int paid,CardView? card=null)
 {
  for(var n=from;n<until;n++){
   var date=cadence=="semanal"?start.AddDays(7*n):start.AddMonths(n);
   if(card is not null)date=new DateOnly(date.Year,date.Month,Math.Min(card.DueDay,DateTime.DaysInMonth(date.Year,date.Month)));
   var id=Guid.NewGuid().ToString();
   InsertItem(c,tx,id,name,kind,amount,n<paid?amount:0,date.ToString("yyyy-MM-dd"),category,null,card?.Id,n+1,until);
   Run(c,tx,"INSERT INTO plan_items VALUES($plan,$item,$number)",("$plan",plan),("$item",id),("$number",n+1));
   Detail(c,tx,id,method,amount,0,"");
  }
 }
 private static void Detail(SqliteConnection c,SqliteTransaction tx,string item,string method,long amount,long extra,string note)=>
   Run(c,tx,"INSERT INTO item_details VALUES($item,$method,$base,$extra,$note) ON CONFLICT(item_id) DO UPDATE SET method=excluded.method,base_cents=excluded.base_cents,extra_cents=excluded.extra_cents,note=excluded.note",
    ("$item",item),("$method",method),("$base",amount),("$extra",extra),("$note",note));
 private static void Method(string method){if(method is not ("pix" or "boleto" or "dinheiro" or "debito" or "outro"))throw new ArgumentException("Forma de pagamento inválida.");}
 private static string UnpayItem(SqliteConnection c,SqliteTransaction tx,string target)
 {
  var item=Items(c,tx).SingleOrDefault(x=>x.Id==target&&!x.Cancelled)??throw new ArgumentException("Parcela não encontrada.");
  if(item.PaidCents==0)throw new ArgumentException("Esta parcela já está pendente.");
  var allocations=Rows(c,tx,"SELECT a.payment_id,a.amount_cents,p.account_id FROM allocations a JOIN payments p ON p.id=a.payment_id WHERE a.item_id=$id AND p.reversed=0 AND a.amount_cents>0",
   r=>(Payment:r.GetString(0),Amount:r.GetInt64(1),Account:r.GetString(2)),("$id",item.Id));
  foreach(var allocation in allocations){
   var date=DateTime.Today.ToString("yyyy-MM-dd");
   Move(c,tx,allocation.Account,(item.Kind=="pagar"?1:-1)*allocation.Amount,date,allocation.Payment);
   Run(c,tx,"INSERT INTO allocation_reversals VALUES($id,$payment,$item,$amount,$date)",
    ("$id",Guid.NewGuid().ToString()),("$payment",allocation.Payment),("$item",item.Id),("$amount",allocation.Amount),("$date",date));
   Run(c,tx,"UPDATE allocations SET amount_cents=0 WHERE payment_id=$payment AND item_id=$item",("$payment",allocation.Payment),("$item",item.Id));
   Run(c,tx,"UPDATE payments SET amount_cents=amount_cents-$amount WHERE id=$id",("$amount",allocation.Amount),("$id",allocation.Payment));
   Run(c,tx,"UPDATE payments SET reversed=1 WHERE id=$id AND amount_cents=0",("$id",allocation.Payment));
  }
  // A parte paga antes do cadastro é apenas histórico e não gera movimento em conta.
  Run(c,tx,"UPDATE finance_items SET paid_cents=0 WHERE id=$id",("$id",item.Id));
  if(Accounts(c,tx).Any(x=>x.Kind=="reserva"&&x.BalanceCents<0))
    throw new ArgumentException("Desfaça primeiro as saídas dependentes dessa reserva.");
  return item.Id;
 }
 private static List<PlanView> Plans(SqliteConnection c,SqliteTransaction tx)=>
  Rows(c,tx,"SELECT id,name,method,cadence,base_cents,start_date,count,kind,category,cancelled FROM payment_plans ORDER BY rowid DESC",
   r=>new PlanView(r.GetString(0),r.GetString(1),r.GetString(2),r.GetString(3),r.GetInt64(4),r.GetString(5),r.GetInt32(6),r.GetString(7),r.GetString(8),r.GetBoolean(9)));
}
