using FinBot.Core;
using FinBot.Infrastructure;
using Xunit;
namespace FinBot.Tests;
public sealed class RecurringCardTests:IDisposable{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
 FinanceService Service(){var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();return new(db);}
 static FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
 static FinanceCommand Recurring(string card)=>C("addPlan") with{Name="Anuidade",Kind="pagar",PaymentMethod="cartao",CardId=card,Cadence="mensal-recorrente",AmountCents=2500,Count=3,Date="2026-01-01"};
 [Fact] public void MonthlyCardChargesShareInvoicesAndPaymentWithoutDuplicatingExpense(){
  var s=Service();var account=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=100000});
  var card=s.Execute(C("addCard") with{Name="Inter",DueDay=25});
  s.Execute(C("addCard") with{Name="Outro",DueDay=10});
  var request=Recurring(card);var plan=s.Execute(request);Assert.Equal(plan,s.Execute(request));
  s.Execute(C("addPurchase") with{Name="Compra",CardId=card,Date="2026-01-01",Count=3,AmountCents=3000});
  var before=s.Snapshot("2026-01");Assert.Equal(3500,before.ExpenseCents);Assert.Equal(3,before.Invoices.Count);
  var invoice=before.Invoices.First();Assert.Equal(card,invoice.CardId);Assert.Equal("2026-01-25",invoice.DueDate);
  s.Execute(C("payInvoice") with{TargetId=invoice.Id,AccountId=account,Date="2026-01-25",AmountCents=3500});
  var after=Service().Snapshot("2026-01");Assert.Equal(96500,after.AvailableCents);Assert.Equal(3500,after.ExpenseCents);Assert.Equal(0,after.Invoices.First().RemainingCents);
  Assert.Throws<ArgumentException>(()=>s.Execute(C("cancelPlan") with{TargetId=plan}));
  var recurring=after.Items.Single(x=>x.PlanId==plan&&x.Number==1);
  s.Execute(C("unpayItem") with{TargetId=recurring.Id});
  Assert.Equal(2500,s.Snapshot("2026-01").Invoices.First().RemainingCents);
  s.Execute(C("cancelPlan") with{TargetId=plan});
  Assert.Equal(1000,s.Snapshot("2026-01").ExpenseCents);
 }
 [Fact] public void ExtensionPreservesCardAndInvoiceDayAcrossShortMonths(){
  var s=Service();var card=s.Execute(C("addCard") with{Name="Inter",DueDay=31});
  var plan=s.Execute(Recurring(card) with{PaidCount=1});
  var extend=C("extendPlan") with{TargetId=plan,Count=12};s.Execute(extend);s.Execute(extend);
  var snapshot=Service().Snapshot("2026-02");var rows=snapshot.Items.OrderBy(x=>x.Number).ToList();
  Assert.Equal(15,rows.Count);Assert.Equal("2026-02-28",rows[1].DueDate);Assert.Equal("2026-03-31",rows[2].DueDate);
  Assert.Equal("2027-02-28",rows[13].DueDate);Assert.All(rows,x=>Assert.Equal(card,x.CardId));
  Assert.Equal(2500,rows[0].PaidCents);Assert.Equal(0,snapshot.AvailableCents);Assert.Empty(snapshot.Purchases);
 }
 [Fact] public void RejectsMissingCardAndUnsupportedKindsWithoutCreatingData(){
  var s=Service();var card=s.Execute(C("addCard") with{Name="Inter"});
  Assert.Throws<ArgumentException>(()=>s.Execute(Recurring("missing")));
  Assert.Throws<ArgumentException>(()=>s.Execute(Recurring(card) with{Kind="receber"}));
  Assert.Throws<ArgumentException>(()=>s.Execute(Recurring(card) with{Cadence="semanal"}));
  Assert.Empty(s.Snapshot("2026-01").Items);Assert.Empty(s.Snapshot("2026-01").Plans);
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
