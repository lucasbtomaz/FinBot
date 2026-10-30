using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public sealed class ScheduleMigrationTests
{
 [Fact] public void UpgradeV1PreservesInstallmentsPaymentsAndCreatesOneBackup()
 {
  var folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
  try{
   var path=Path.Combine(folder,"test.db");var db=new LocalDatabase(path);db.Initialize();var s=new FinanceService(db);
   FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
   var account=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=10000});
   var card=s.Execute(C("addCard") with{Name="Inter"});
   s.Execute(C("addPurchase") with{Name="Compra",AmountCents=2000,Count=2,CardId=card,Date="2026-01-10"});
   var invoice=s.Snapshot("2026-01").Invoices.First();
   s.Execute(C("payInvoice") with{TargetId=invoice.Id,AccountId=account,AmountCents=250,Date="2026-01-10"});
   using(var c=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=path,Pooling=false}.ToString())){
    c.Open();using var command=c.CreateCommand();
    command.CommandText="DROP TABLE allocation_reversals; DROP TABLE item_details; DROP TABLE plan_items; DROP TABLE payment_plans; DELETE FROM finance_migrations WHERE version>=2";command.ExecuteNonQuery();
   }
   db.Initialize();db.Initialize();
   var after=new FinanceService(db).Snapshot("2026-01");
   Assert.Equal(9750,after.AvailableCents);Assert.Equal(1000,after.ExpenseCents);
   Assert.Equal(750,after.Invoices.First().RemainingCents);Assert.Equal(2,after.Items.Count);
   Assert.Equal(250,after.Payments.Single().AmountCents);
   Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
  }finally{Directory.Delete(folder,true);}
 }
}
