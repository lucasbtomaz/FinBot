using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public sealed class ReceivableTests:IDisposable{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
 FinanceService Service(){var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();return new(db);}
 static FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
 static FinanceCommand New()=>C("addReceivable") with{Name="Dívida",Payer="José",AmountCents=20000,Cadence="unico",Confidence="incerto"};
 [Fact] public void UndatedReceivablePersistsAndPartialReceiptUpdatesCashOnlyOnce(){
  var s=Service();var request=New();var id=s.Execute(request);Assert.Equal(id,s.Execute(request));
  var account=s.Execute(C("addAccount") with{Name="Conta",Kind="conta"});
  var payment=s.Execute(C("settleItem") with{TargetId=id,AccountId=account,AmountCents=5000,Date="2026-01-10"});
  var snapshot=Service().Snapshot("2026-10");var item=Assert.Single(snapshot.Items);
  Assert.Equal("",item.DueDate);Assert.Equal("José",item.Payer);Assert.Equal("incerto",item.Confidence);
  Assert.Equal(15000,item.RemainingCents);Assert.Equal(5000,snapshot.AvailableCents);Assert.Equal(0,snapshot.ExpenseCents);Assert.Equal(0,snapshot.ToReceiveCents);
  Assert.Throws<ArgumentException>(()=>s.Execute(New() with{Action="editReceivable",TargetId=id,AmountCents=4000}));
  s.Execute(New() with{Action="editReceivable",TargetId=id,Confidence="confirmado",Date="2026-10-30"});
  Assert.Equal(15000,s.Snapshot("2026-10").ToReceiveCents);
  s.Execute(C("reversePayment") with{TargetId=payment});
  Assert.Equal(20000,s.Snapshot("2026-10").Items.Single().RemainingCents);Assert.Equal(0,s.Snapshot("2026-10").AvailableCents);
 }
 [Theory][InlineData("semanal","2026-02-06")][InlineData("mensal","2026-02-28")]
 public void RepeatedValuesCanBeChangedIndependently(string cadence,string secondDate){
  var s=Service();s.Execute(New() with{Cadence=cadence,Count=3,Date="2026-01-30",Confidence="confirmado"});
  var items=s.Snapshot("2026-01").Items.OrderBy(x=>x.Number).ToList();Assert.Equal(3,items.Count);Assert.Equal(secondDate,items[1].DueDate);
  s.Execute(New() with{Action="editReceivable",TargetId=items[1].Id,Cadence=cadence,AmountCents=12345,Date=secondDate});
  var after=s.Snapshot("2026-01").Items;Assert.Equal(12345,after.Single(x=>x.Id==items[1].Id).AmountCents);Assert.Equal(20000,after.Single(x=>x.Id==items[0].Id).AmountCents);
  Assert.Throws<ArgumentException>(()=>s.Execute(New() with{Count=2,Cadence=cadence}));Assert.Equal(3,s.Snapshot("2026-01").Items.Count);
 }
 [Fact] public void UpgradeV3PreservesExistingReceivablesAsUncertain(){
  var s=Service();s.Execute(C("addItem") with{Name="Anterior",Kind="receber",AmountCents=10000,Date="2026-10-30"});
  var path=Path.Combine(folder,"test.db");
  using(var c=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=path,Pooling=false}.ToString())){
   c.Open();using var cmd=c.CreateCommand();cmd.CommandText="DROP TABLE receivable_details; DELETE FROM finance_migrations WHERE version>=4";cmd.ExecuteNonQuery();
  }
  var after=Service().Snapshot("2026-10");Assert.Equal("incerto",Assert.Single(after.Items).Confidence);Assert.Equal(10000,after.ToReceiveCents);
  Service();Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
 }
 [Fact] public void ExistingPlanOccurrenceCanBeClassifiedWithoutChangingSiblings(){
  var s=Service();
  s.Execute(C("addPlan") with{Name="Freela",Kind="receber",Cadence="mensal",Count=2,Date="2026-01-01",AmountCents=10000});
  var item=s.Snapshot("2026-01").Items.First();
  s.Execute(New() with{Action="editReceivable",TargetId=item.Id,Confidence="confirmado",Date="2026-01-05"});
  var items=s.Snapshot("2026-01").Items;
  Assert.Equal("confirmado",items.Single(x=>x.Id==item.Id).Confidence);
  Assert.Equal("incerto",items.Single(x=>x.Id!=item.Id).Confidence);
  Assert.Equal(10000,items.Single(x=>x.Id!=item.Id).AmountCents);
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
