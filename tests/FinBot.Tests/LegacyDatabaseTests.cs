using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public class LegacyDatabaseTests
{
 [Fact]
 public void PythonDatabaseIsPreservedAndNewAccountUsesSeparateDatabase()
 {
  var folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());Directory.CreateDirectory(folder);
  try {
   var legacy=Path.Combine(folder,"finbot.db");
   using(var c=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=legacy,Pooling=false}.ToString())){
    c.Open();using var cmd=c.CreateCommand();cmd.CommandText="CREATE TABLE accounts(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,name TEXT NOT NULL,kind TEXT NOT NULL,opening_cents INTEGER NOT NULL); INSERT INTO accounts VALUES('old','pessoal','Antiga','conta',123)";cmd.ExecuteNonQuery();
   }
   var before=File.ReadAllBytes(legacy);
   var selected=LocalDatabase.ResolveDesktopPath(folder);
   Assert.NotEqual(legacy,selected);
   var db=new LocalDatabase(selected);db.Initialize();
   var s=new FinanceService(db);
   s.Execute(new FinanceCommand{Action="addAccount",RequestId=Guid.NewGuid().ToString(),Name="Nova",Kind="conta",AmountCents=456});
   Assert.Equal(456,s.Snapshot("2026-10").AvailableCents);
   Assert.Equal(before,File.ReadAllBytes(legacy));
   Assert.Throws<InvalidOperationException>(()=>new LocalDatabase(legacy).Initialize());
  }finally{Directory.Delete(folder,true);}
 }
 [Fact]
 public void ExistingDesktopDatabaseKeepsItsAccounts()
 {
  var folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
  try{
   var oldPath=Path.Combine(folder,"finbot.db");var db=new LocalDatabase(oldPath);db.Initialize();
   var s=new FinanceService(db);s.Execute(new FinanceCommand{Action="addAccount",RequestId=Guid.NewGuid().ToString(),Name="Conta",Kind="conta",AmountCents=500});
   Assert.Equal(oldPath,LocalDatabase.ResolveDesktopPath(folder));
  }finally{Directory.Delete(folder,true);}
 }
}
