using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public sealed class TaxTests:IDisposable
{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
 FinanceService Service(){var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();return new(db);}
 static FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
 [Fact] public void MarkedItemIsPendingAndConfirmationDoesNotChangeFinance(){
  var s=Service();var command=C("addItem") with{Name="Consulta",Kind="pagar",AmountCents=25000,Date="2026-10-29",TrackIr=true};
  var item=s.Execute(command);Assert.Equal(item,s.Execute(command));
  var before=s.Snapshot("2026-10");var tax=Assert.Single(before.TaxRecords);
  Assert.False(tax.Confirmed);Assert.Equal(item,tax.SourceId);Assert.Single(before.Items);
  Assert.Throws<ArgumentException>(()=>s.Execute(C("saveTaxRecord") with{TargetId=tax.Id,Name="Prestador",Category="Saúde"}));
  Assert.False(Assert.Single(s.Snapshot("2026-10").TaxRecords).Confirmed);
  s.Execute(C("saveTaxRecord") with{TargetId=tax.Id,Name="Prestador",Document="12345678901",Category="Saúde"});
  var after=Service().Snapshot("2026-10");
  Assert.True(Assert.Single(after.TaxRecords).Confirmed);Assert.Equal(before.Items,after.Items);Assert.Equal(before.ExpenseCents,after.ExpenseCents);
  s.Execute(command with{RequestId=Guid.NewGuid().ToString(),TrackIr=false});
  Assert.Single(s.Snapshot("2026-10").TaxRecords);
 }
 [Theory][InlineData("addPlan","plan")][InlineData("addPurchase","purchase")][InlineData("addInvestment","investment")]
 public void SourcesAreLinkedWithoutDuplicatingEntries(string action,string sourceType){
  var s=Service();var card=s.Execute(C("addCard") with{Name="Inter"});
  var command=C(action) with{Name="Origem",Kind=action=="addInvestment"?"acao":"pagar",Institution="Corretora",CardId=card,Count=2,Cadence="mensal-recorrente",AmountCents=10000,Date="2026-01-01",TrackIr=true};
  var source=s.Execute(command);s.Execute(command);
  var snap=Service().Snapshot("2026-01");var tax=Assert.Single(snap.TaxRecords);
  Assert.Equal(sourceType,tax.SourceType);Assert.Equal(source,tax.SourceId);Assert.False(tax.Confirmed);
  Assert.Equal(action=="addInvestment"?0:2,snap.Items.Count);
  if(action=="addPlan"){s.Execute(C("extendPlan") with{TargetId=source,Count=2});Assert.Single(s.Snapshot("2026-01").TaxRecords);Assert.Equal(4,s.Snapshot("2026-01").Items.Count);}
 }
 [Fact] public void EveryRepeatedReceivableIsTrackedAndRetriesDoNotDuplicate(){
  var s=Service();var cmd=C("addReceivable") with{Name="Recebível",Payer="Pessoa",Count=3,Cadence="mensal",Date="2026-01-01",AmountCents=5000,TrackIr=true};
  s.Execute(cmd);s.Execute(cmd);var snap=Service().Snapshot("2026-01");
  Assert.Equal(3,snap.TaxRecords.Count);Assert.All(snap.Items,item=>Assert.Contains(snap.TaxRecords,t=>t.SourceId==item.Id));
 }
 [Fact] public void MigrationFromVersionFourBacksUpAndPreservesEntries(){
  var s=Service();s.Execute(C("addItem") with{Name="Existente",Kind="pagar",Date="2026-01-01",AmountCents=100});
  using(var c=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=Path.Combine(folder,"test.db"),Pooling=false}.ToString())){
   c.Open();using var cmd=c.CreateCommand();cmd.CommandText="DROP TABLE tax_records;DELETE FROM finance_migrations WHERE version>=5;";cmd.ExecuteNonQuery();
  }
  var migrated=Service().Snapshot("2026-01");Assert.Single(migrated.Items);Assert.Empty(migrated.TaxRecords);
  Service();Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
