using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public sealed class InvestmentMigrationTests{
 [Fact] public void UpgradeV2PreservesReservesAndBacksUpOnce(){
  var folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
  try{
   var path=Path.Combine(folder,"test.db");var db=new LocalDatabase(path);db.Initialize();
   var service=new FinanceService(db);
   service.Execute(new FinanceCommand{Action="addAccount",RequestId=Guid.NewGuid().ToString(),Name="Reserva",Kind="reserva",AmountCents=25000});
   using(var c=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=path,Pooling=false}.ToString())){
    c.Open();using var cmd=c.CreateCommand();cmd.CommandText="DROP TABLE investment_accounts; DROP TABLE investment_values; DROP TABLE investments; DELETE FROM finance_migrations WHERE version>=3";cmd.ExecuteNonQuery();
   }
   db.Initialize();db.Initialize();
   var snapshot=new FinanceService(db).Snapshot("2026-10");
   Assert.Equal(25000,snapshot.ReservedCents);Assert.Equal(25000,Assert.Single(Assert.Single(snapshot.Investments).Values).ValueCents);
   Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
  }finally{Directory.Delete(folder,true);}
 }
}