using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public sealed class MigrationTests : IDisposable
{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
 [Fact]
 public void ExistingDatabaseIsBackedUpAndOpeningBalanceSurvivesUpgrade()
 {
  Directory.CreateDirectory(folder);
  var path=Path.Combine(folder,"finbot.db");
  using(var c=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=path,Pooling=false}.ToString()))
  {
   c.Open();using var command=c.CreateCommand();
   command.CommandText="CREATE TABLE accounts(id TEXT PRIMARY KEY,name TEXT NOT NULL,opening_cents INTEGER NOT NULL); INSERT INTO accounts VALUES('old','Conta antiga',45678)";
   command.ExecuteNonQuery();
  }
  var db=new LocalDatabase(path);db.Initialize();db.Initialize();
  Assert.Equal(45678,new FinanceService(db).Snapshot("2026-01").AvailableCents);
  var backup=Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
  using var check=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=backup,Pooling=false}.ToString());
  check.Open();using var query=check.CreateCommand();query.CommandText="SELECT opening_cents FROM accounts WHERE id='old'";
  Assert.Equal(45678L,(long)query.ExecuteScalar()!);
 }
 [Fact]
 public void ActivePaymentBlocksPurchaseCancellationUntilReversed()
 {
  var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();var s=new FinanceService(db);
  FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
  var a=s.Execute(C("addAccount") with {Name="Conta",Kind="conta",AmountCents=10000});
  var card=s.Execute(C("addCard") with {Name="Inter"});
  var p=s.Execute(C("addPurchase") with {Name="Compra",CardId=card,AmountCents=2000,Count=2,Date="2026-01-10"});
  var invoice=s.Snapshot("2026-01").Invoices.First();
  var payment=s.Execute(C("payInvoice") with {TargetId=invoice.Id,AccountId=a,AmountCents=500,Date="2026-01-10"});
  Assert.False(s.Snapshot("2026-01").Purchases.Single().CanCancel);
  Assert.Throws<ArgumentException>(()=>s.Execute(C("cancelPurchase") with {TargetId=p}));
  s.Execute(C("reversePayment") with {TargetId=payment});
  Assert.True(s.Snapshot("2026-01").Purchases.Single().CanCancel);
  s.Execute(C("cancelPurchase") with {TargetId=p});
  Assert.Empty(s.Snapshot("2026-01").Invoices);
  Assert.Equal(10000,s.Snapshot("2026-01").AvailableCents);
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
