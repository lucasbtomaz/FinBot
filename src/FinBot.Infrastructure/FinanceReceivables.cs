using FinBot.Core;
using Microsoft.Data.Sqlite;
namespace FinBot.Infrastructure;
public sealed partial class FinanceService{
 private static string ReceivableAction(SqliteConnection c,SqliteTransaction tx,FinanceCommand v,string id){
  Name(v.Name);Name(v.Category);Name(v.Payer);Amount(v.AmountCents);
  if(v.Confidence is not ("confirmado" or "incerto")||v.Cadence is not ("unico" or "semanal" or "mensal"))throw new ArgumentException("Confira a confirmação e a frequência.");
  if(v.Note is null||v.Note.Length>1000)throw new ArgumentException("Observação deve ter até 1000 caracteres.");
  DateOnly? date=string.IsNullOrEmpty(v.Date)?null:Date(v.Date);
  if(v.Action=="editReceivable"){
   var item=Items(c,tx).SingleOrDefault(x=>x.Id==v.TargetId&&x.Kind=="receber"&&!x.Cancelled)??throw new ArgumentException("Recebível não encontrado.");
   if(v.AmountCents<item.PaidCents)throw new ArgumentException("O valor não pode ser menor que o já recebido.");

   id=item.Id;
   Run(c,tx,"UPDATE finance_items SET name=$name,category=$category,amount_cents=$amount,due_date=$date WHERE id=$id",
    ("$name",v.Name.Trim()),("$category",v.Category.Trim()),("$amount",v.AmountCents),("$date",v.Date),("$id",id));
   Detail(c,tx,id,item.PaymentMethod,v.AmountCents,0,v.Note);
   ReceivableDetail(c,tx,id,v);
  }else{
   if(v.Count<1||v.Count>120||v.Cadence=="unico"&&v.Count!=1||v.Count>1&&date is null)throw new ArgumentException("Para repetir, informe a primeira data e de 1 a 120 ocorrências.");
   if(date?.Year>9900)throw new ArgumentException("Data fora do intervalo permitido.");
   for(var n=0;n<v.Count;n++){
    var itemId=n==0?id:Guid.NewGuid().ToString();
    var due=date is null?"":(v.Cadence=="semanal"?date.Value.AddDays(7*n):date.Value.AddMonths(n)).ToString("yyyy-MM-dd");
    InsertItem(c,tx,itemId,v.Name.Trim(),"receber",v.AmountCents,0,due,v.Category.Trim(),null,null,n+1,v.Count);
    Detail(c,tx,itemId,"outro",v.AmountCents,0,v.Note);
    ReceivableDetail(c,tx,itemId,v);
    if(v.TrackIr)TrackTax(c,tx,"item",itemId);
   }
  }
  return id;
 }
 private static void ReceivableDetail(SqliteConnection c,SqliteTransaction tx,string id,FinanceCommand v)=>
  Run(c,tx,"INSERT INTO receivable_details VALUES($id,$payer,$confidence,$cadence) ON CONFLICT(item_id) DO UPDATE SET payer=excluded.payer,confidence=excluded.confidence,cadence=excluded.cadence",
   ("$id",id),("$payer",v.Payer.Trim()),("$confidence",v.Confidence),("$cadence",v.Cadence));
}
