using FinBot.Core;
using FinBot.Infrastructure;
using Xunit;
namespace FinBot.Tests;
public sealed class BalanceAdjustmentTests:IDisposable{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
 FinanceService Service(){var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();return new(db);}
 static FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
 [Fact] public void AdjustsCurrentBalanceAfterMovementsAndKeepsObligationsUnchanged(){
  var s=Service();var account=s.Execute(C("addAccount") with{Name="Itaú",Kind="conta",AmountCents=100000});
  var item=s.Execute(C("addItem") with{Name="Conta",Kind="pagar",Date="2026-01-10",AmountCents=20000});
  s.Execute(C("settleItem") with{TargetId=item,AccountId=account,Date="2026-01-10",AmountCents=5000});
  var adjustment=C("adjustBalance") with{TargetId=account,AmountCents=120000};
  var payment=s.Execute(adjustment);Assert.Equal(payment,s.Execute(adjustment));
  var after=Service().Snapshot("2026-01");
  Assert.Equal(120000,after.AvailableCents);Assert.Equal(20000,after.ExpenseCents);Assert.Equal(15000,after.ToPayCents);
  Assert.Equal(25000,after.Payments.Single(p=>p.Id==payment).AmountCents);
  s.Execute(C("reversePayment") with{TargetId=payment});Assert.Equal(95000,s.Snapshot("2026-01").AvailableCents);
 }
 [Fact] public void DecreaseZeroNegativeAndNoChangeAreSupported(){
  var s=Service();var account=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=100000});
  s.Execute(C("adjustBalance") with{TargetId=account,AmountCents=20000});
  s.Execute(C("adjustBalance") with{TargetId=account,AmountCents=0});
  s.Execute(C("adjustBalance") with{TargetId=account,AmountCents=-5000});
  s.Execute(C("adjustBalance") with{TargetId=account,AmountCents=-5000});
  var after=s.Snapshot("2026-01");Assert.Equal(-5000,after.AvailableCents);Assert.Equal(3,after.Payments.Count);Assert.Empty(after.Items);
  Assert.Throws<ArgumentException>(()=>s.Execute(C("adjustBalance") with{TargetId=account,AmountCents=long.MinValue}));
  Assert.Equal(-5000,Service().Snapshot("2026-01").AvailableCents);
 }
 [Fact] public void ReservesStaySeparateAndRejectNegativeBalances(){
  var s=Service();var reserve=s.Execute(C("addAccount") with{Name="Caixinha",Kind="reserva",AmountCents=10000});
  var payment=s.Execute(C("adjustBalance") with{TargetId=reserve,AmountCents=15000});
  var after=s.Snapshot("2026-01");Assert.Equal(15000,after.ReservedCents);Assert.Equal(0,after.AvailableCents);
  Assert.Throws<ArgumentException>(()=>s.Execute(C("adjustBalance") with{TargetId=reserve,AmountCents=-1}));
  Assert.Throws<ArgumentException>(()=>s.Execute(C("adjustBalance") with{TargetId="missing",AmountCents=1}));
  s.Execute(C("reversePayment") with{TargetId=payment});Assert.Equal(10000,s.Snapshot("2026-01").ReservedCents);
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
