using FinBot.Core;
using FinBot.Infrastructure;
using Xunit;
namespace FinBot.Tests;
public sealed class ScheduleTests:IDisposable
{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
 FinanceService Service(){var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();return new(db);}
 static FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
 [Fact] public void TwentyMonthlyBoletoInstallmentsFollowOriginalDayAcrossFebruary(){
  var s=Service();s.Execute(C("addPlan") with{Name="Empréstimo Luz",Kind="pagar",PaymentMethod="boleto",Cadence="mensal",AmountCents=41217,Count=20,Date="2026-10-30"});
  var items=s.Snapshot("2026-10").Items.OrderBy(x=>x.Number).ToList();
  Assert.Equal(20,items.Count);Assert.All(items,x=>Assert.Equal(41217,x.AmountCents));
  Assert.Equal("2027-02-28",items[4].DueDate);Assert.Equal("2027-03-30",items[5].DueDate);
  Assert.Equal(41217,s.Snapshot("2026-10").ExpenseCents);Assert.Empty(s.Snapshot("2026-10").Invoices);
 }
 [Fact] public void WeeklyMotoHasIndependentExtraAndCanExtendWithoutDuplicates(){
  var s=Service();var plan=s.Execute(C("addPlan") with{Name="Moto",Kind="pagar",PaymentMethod="pix",Cadence="semanal",AmountCents=18900,Count=4,Date="2026-10-24"});
  var items=s.Snapshot("2026-10").Items.OrderBy(x=>x.Number).ToList();
  Assert.Equal(new[]{"2026-10-24","2026-10-31","2026-11-07","2026-11-14"},items.Select(x=>x.DueDate));
  s.Execute(C("editItem") with{TargetId=items[0].Id,ExtraCents=1500,Note="Quilometragem"});
  var october=s.Snapshot("2026-10");
  Assert.Equal(39300,october.ExpenseCents);Assert.Equal(18900,october.Items.Single(x=>x.Id==items[1].Id).AmountCents);
  var extend=C("extendPlan") with{TargetId=plan,Count=2};s.Execute(extend);s.Execute(extend);
  Assert.Equal(6,Service().Snapshot("2026-11").Items.Count);
  Assert.Equal("Quilometragem",Service().Snapshot("2026-10").Items.Single(x=>x.Id==items[0].Id).Note);
 }
 [Fact] public void UncheckingCardInstallmentDoesNotReverseOtherInvoiceItems(){
  var s=Service();var a=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=10000});
  var card=s.Execute(C("addCard") with{Name="Inter"});
  foreach(var name in new[]{"A","B"})s.Execute(C("addPurchase") with{Name=name,CardId=card,AmountCents=1000,Count=1,Date="2026-01-10"});
  var before=s.Snapshot("2026-01");var invoice=before.Invoices.Single();
  var payment=s.Execute(C("payInvoice") with{TargetId=invoice.Id,AccountId=a,AmountCents=2000,Date="2026-01-10"});
  s.Execute(C("unpayItem") with{TargetId=before.Items[0].Id});
  var after=s.Snapshot("2026-01");Assert.Equal(9000,after.AvailableCents);Assert.Equal(1000,after.Invoices.Single().RemainingCents);
  Assert.Equal(1,after.Items.Count(x=>x.PaidCents==1000));Assert.Equal(2000,after.ExpenseCents);
  s.Execute(C("reversePayment") with{TargetId=payment});Assert.Equal(10000,s.Snapshot("2026-01").AvailableCents);
  Assert.All(s.Snapshot("2026-01").Items,x=>Assert.Equal(0,x.PaidCents));
 }
 [Fact] public void CheckingCardInstallmentUpdatesInvoiceAndCanBeUnchecked(){
  var s=Service();var a=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=10000});
  var card=s.Execute(C("addCard") with{Name="Inter"});
  s.Execute(C("addPurchase") with{Name="XPTO",CardId=card,AmountCents=12000,Count=12,Date="2026-01-10"});
  var item=s.Snapshot("2026-01").Items.First();
  s.Execute(C("payItem") with{TargetId=item.Id,AccountId=a,AmountCents=1000,Date="2026-01-10"});
  Assert.Equal(0,s.Snapshot("2026-01").Invoices.First().RemainingCents);
  Assert.Throws<ArgumentException>(()=>s.Execute(C("editItem") with{TargetId=item.Id,ExtraCents=100}));
  s.Execute(C("unpayItem") with{TargetId=item.Id});Assert.Equal(10000,s.Snapshot("2026-01").AvailableCents);
  Assert.Equal(1000,s.Snapshot("2026-01").Invoices.First().RemainingCents);
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
