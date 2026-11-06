using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public sealed class ReserveInvestmentTests:IDisposable{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotReserveTests",Guid.NewGuid().ToString());
 static string Month=>DateTime.Today.ToString("yyyy-MM");
 static FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
 FinanceService Service(){var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();return new(db);}
 [Fact] public void TransfersAdjustmentsAndReversalsKeepOneInvestmentInSync(){
  var s=Service();var a=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=10000});
  var reserve=s.Execute(C("addAccount") with{Name="Caixinha",Kind="reserva",AmountCents=5000});
  var initial=Assert.Single(s.Snapshot(Month).Investments);
  Assert.Equal(reserve,initial.AccountId);Assert.Equal(5000,Assert.Single(initial.Values).ValueCents);
  var transfer=s.Execute(C("transfer") with{AccountId=a,TargetId=reserve,AmountCents=2000,Date=DateTime.Today.ToString("yyyy-MM-dd")});
  Assert.Equal(7000,Assert.Single(s.Snapshot(Month).Investments).Values.Last().ValueCents);
  Assert.Equal(8000,s.Snapshot(Month).AvailableCents);Assert.Equal(0,s.Snapshot(Month).ExpenseCents);
  s.Execute(C("reversePayment") with{TargetId=transfer});
  Assert.Equal(5000,Assert.Single(s.Snapshot(Month).Investments).Values.Last().ValueCents);
  s.Execute(C("adjustBalance") with{TargetId=reserve,AmountCents=5500});
  Assert.Equal(5500,Assert.Single(Service().Snapshot(Month).Investments).Values.Last().ValueCents);
  Assert.Equal(10000,s.Snapshot(Month).AvailableCents);
 }
 [Fact] public void CurrentMonthlyRecordUpdatesLinkedBalanceButPastCorrectionDoesNot(){
  var s=Service();s.Execute(C("addAccount") with{Name="Caixinha",Kind="reserva",AmountCents=5000});
  var investment=Assert.Single(s.Snapshot(Month).Investments);
  var cmd=C("saveInvestmentValue") with{TargetId=investment.Id,Date=Month+"-01",InvestedCents=5000,AmountCents=5300};
  s.Execute(cmd);s.Execute(cmd);
  Assert.Equal(5300,s.Snapshot(Month).ReservedCents);Assert.Single(s.Snapshot(Month).Payments);
  var past=DateTime.Today.AddMonths(-1).ToString("yyyy-MM")+"-01";
  s.Execute(C("saveInvestmentValue") with{TargetId=investment.Id,Date=past,InvestedCents=4500,AmountCents=4600});
  var snap=s.Snapshot(Month);Assert.Equal(5300,snap.ReservedCents);Assert.Equal(2,Assert.Single(snap.Investments).Values.Count);
  Assert.Equal(0,snap.AvailableCents);Assert.Equal(0,snap.ExpenseCents);
 }
 [Fact] public void NewReserveCreatedInsideInvestmentsHasOneLinkedAccount(){
  var s=Service();var cmd=C("addInvestment") with{Name="Caixinha",Institution="Banco",Kind="reserva",Date=Month+"-01",InvestedCents=10000,AmountCents=10200,TrackIr=true};
  var id=s.Execute(cmd);s.Execute(cmd);
  var snap=Service().Snapshot(Month);
  Assert.Equal(id,Assert.Single(snap.Investments).Id);Assert.Equal(10200,Assert.Single(snap.Accounts).BalanceCents);
  Assert.Equal(10200,snap.ReservedCents);Assert.Equal(0,snap.AvailableCents);Assert.Single(snap.TaxRecords);
 }
 [Fact] public void UpgradePreservesBalancesAndMovementsAndDoesNotInventPastHistory(){
  var s=Service();var a=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=10000});
  var r=s.Execute(C("addAccount") with{Name="Reserva antiga",Kind="reserva",AmountCents=1000});
  s.Execute(C("transfer") with{AccountId=a,TargetId=r,AmountCents=5000,Date=DateTime.Today.ToString("yyyy-MM-dd")});
  var before=s.Snapshot(Month);
  using(var c=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=Path.Combine(folder,"test.db"),Pooling=false}.ToString())){
   c.Open();using var q=c.CreateCommand();q.CommandText="DROP TABLE investment_accounts; DELETE FROM investment_values; DELETE FROM investments; DELETE FROM finance_migrations WHERE version>=7";q.ExecuteNonQuery();
  }
  var after=Service().Snapshot(Month);Service();
  Assert.Equal(before.Accounts,after.Accounts);Assert.Equal(before.Payments,after.Payments);
  var investment=Assert.Single(after.Investments);var value=Assert.Single(investment.Values);
  Assert.Equal(r,investment.AccountId);Assert.Equal(Month,value.Month);Assert.Equal(6000,value.ValueCents);
  Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
