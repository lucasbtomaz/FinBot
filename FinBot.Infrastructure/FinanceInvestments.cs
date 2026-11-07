using FinBot.Core;
using Microsoft.Data.Sqlite;
namespace FinBot.Infrastructure;
public sealed partial class FinanceService
{
 private string InvestmentAction(SqliteConnection c,SqliteTransaction tx,FinanceCommand v,string id){
  if(v.Action=="addInvestment"){
   Name(v.Name);Name(v.Institution);
   if(v.Kind is not ("acao" or "fii" or "selic" or "renda-fixa" or "fundo" or "outro" or "reserva"))throw new ArgumentException("Tipo de investimento inválido.");
   Run(c,tx,"INSERT INTO investments VALUES($id,$name,$kind,$institution)",("$id",id),("$name",v.Name.Trim()),("$kind",v.Kind),("$institution",v.Institution.Trim()));
  }else{
   id=v.TargetId;
   if(!Rows(c,tx,"SELECT id FROM investments WHERE id=$id",r=>r.GetString(0),("$id",id)).Any())throw new ArgumentException("Investimento não encontrado.");
  }
  var date=Date(v.Date);
  if(date.Day!=1||date>DateOnly.FromDateTime(DateTime.Today))throw new ArgumentException("Selecione um mês até o mês atual.");
  Amount(v.AmountCents,true);Amount(v.InvestedCents,true);
  Run(c,tx,"""
   INSERT INTO investment_values(investment_id,month,invested_cents,value_cents) VALUES($id,$month,$invested,$value)
   ON CONFLICT(investment_id,month) DO UPDATE SET invested_cents=excluded.invested_cents,value_cents=excluded.value_cents
   """,("$id",id),("$month",v.Date[..7]),("$invested",v.InvestedCents),("$value",v.AmountCents));
  if(v.Action=="addInvestment"&&v.Kind=="reserva"){
   if(v.Date[..7]!=DateTime.Today.ToString("yyyy-MM"))throw new ArgumentException("Cadastre a caixinha no mês atual, com o saldo que você tem hoje.");
   if(Accounts(c,tx).Any(x=>x.Name.Equals(v.Name.Trim(),StringComparison.OrdinalIgnoreCase)))throw new ArgumentException("Já existe uma conta ou caixinha com esse nome.");
   Run(c,tx,"INSERT INTO accounts VALUES($id,$name,$value)",("$id",id),("$name",v.Name.Trim()),("$value",v.AmountCents));
   Run(c,tx,"INSERT INTO account_details VALUES($id,'reserva')",("$id",id));
   Run(c,tx,"INSERT INTO investment_accounts VALUES($id,$id)",("$id",id));
  }else if(v.Action=="saveInvestmentValue"&&v.Date[..7]==DateTime.Today.ToString("yyyy-MM")){
   var account=Rows(c,tx,"SELECT account_id FROM investment_accounts WHERE investment_id=$id",r=>r.GetString(0),("$id",id)).SingleOrDefault();
   if(account is not null)Apply(c,tx,v with{Action="adjustBalance",TargetId=account});
  }
  return id;
 }
 private static List<InvestmentView> Investments(SqliteConnection c,SqliteTransaction tx){
  var values=Rows(c,tx,"SELECT investment_id,month,invested_cents,value_cents FROM investment_values ORDER BY month",
   r=>(Id:r.GetString(0),Value:new InvestmentValueView(r.GetString(1),r.GetInt64(2),r.GetInt64(3))));
  return Rows(c,tx,"SELECT i.id,i.name,i.kind,i.institution,COALESCE(a.account_id,'') FROM investments i LEFT JOIN investment_accounts a ON a.investment_id=i.id ORDER BY i.rowid",
   r=>new InvestmentView(r.GetString(0),r.GetString(1),r.GetString(2),r.GetString(3),values.Where(x=>x.Id==r.GetString(0)).Select(x=>x.Value).ToList(),r.GetString(4)));
 }
}
