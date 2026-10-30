using FinBot.Core;
using FinBot.Infrastructure;
using Xunit;
namespace FinBot.Tests;
public sealed class MonthlyRecurringTests{
 [Fact] public void RentGeneratesMonthlyForecastAndExtendsWithoutDuplicatingPayments(){
  var folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
  try{
   var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();var s=new FinanceService(db);
   FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
   var plan=s.Execute(C("addPlan") with{Name="Aluguel",Kind="pagar",Cadence="mensal-recorrente",AmountCents=150000,Count=12,Date="2026-01-31"});
   var items=s.Snapshot("2026-01").Items.OrderBy(x=>x.Number).ToList();
   Assert.Equal(12,items.Count);Assert.Equal("2026-02-28",items[1].DueDate);Assert.Equal("2026-03-31",items[2].DueDate);
   var account=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=200000});
   s.Execute(C("payItem") with{TargetId=items[0].Id,AccountId=account,AmountCents=150000,Date="2026-01-31"});
   var extension=C("extendPlan") with{TargetId=plan,Count=12};s.Execute(extension);s.Execute(extension);
   var after=s.Snapshot("2027-01");Assert.Equal(24,after.Items.Count);Assert.Equal(150000,after.ExpenseCents);Assert.Equal(50000,after.AvailableCents);
   Assert.Equal(150000,after.Items.Single(x=>x.Id==items[0].Id).PaidCents);
   Assert.Equal("mensal-recorrente",after.Plans.Single().Cadence);
  }finally{Directory.Delete(folder,true);}
 }
}