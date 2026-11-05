using FinBot.Core;
using FinBot.Infrastructure;
using Xunit;
namespace FinBot.Tests;
public sealed class HistoricalPurchaseTests
{
 [Fact]
 public void CancelImportedHistoryWithoutChangingCurrentBalance()
 {
  var folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
  try {
   var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();var s=new FinanceService(db);
   FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
   s.Execute(C("addAccount") with {Name="Conta",Kind="conta",AmountCents=10000});
   var card=s.Execute(C("addCard") with {Name="Inter"});
   var purchase=s.Execute(C("addPurchase") with {Name="Histórico incorreto",CardId=card,AmountCents=30000,Count=3,PaidCount=1,Date="2026-01-01"});
   s.Execute(C("cancelPurchase") with {TargetId=purchase});
   Assert.Equal(10000,s.Snapshot("2026-01").AvailableCents);
   Assert.Empty(s.Snapshot("2026-01").Invoices);
   Assert.Equal(0,s.Snapshot("2026-01").ExpenseCents);
  } finally {if(Directory.Exists(folder))Directory.Delete(folder,true);}
 }
}
