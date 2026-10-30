using FinBot.Core;
using FinBot.Infrastructure;
using Xunit;
namespace FinBot.Tests;
public sealed class InvestmentTests:IDisposable{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
 FinanceService Service(){var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();return new(db);}
 static FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
 [Fact] public void ValuesPersistAndReplaceMonthWithoutAffectingCash(){
  var s=Service();s.Execute(C("addAccount") with{Name="Reserva",Kind="reserva",AmountCents=50000});
  var create=C("addInvestment") with{Name="Tesouro",Kind="selic",Institution="Inter",Date="2026-01-01",InvestedCents=100000,AmountCents=101000};
  var id=s.Execute(create);Assert.Equal(id,s.Execute(create));
  s.Execute(C("saveInvestmentValue") with{TargetId=id,Date="2026-02-01",InvestedCents=100000,AmountCents=99000});
  s.Execute(C("saveInvestmentValue") with{TargetId=id,Date="2026-02-01",InvestedCents=120000,AmountCents=121000});
  var snapshot=Service().Snapshot("2026-02");Assert.Equal(2,snapshot.Investments.Count);var investment=Assert.Single(snapshot.Investments,x=>x.Id==id);
  Assert.Equal(2,investment.Values.Count);Assert.Equal(121000,investment.Values[1].ValueCents);
  Assert.Equal(120000,investment.Values[1].InvestedCents);
  Assert.Equal(50000,snapshot.ReservedCents);Assert.Equal(0,snapshot.AvailableCents);Assert.Equal(0,snapshot.ExpenseCents);Assert.Empty(snapshot.Payments);
 }
 [Fact] public void InvalidRecordRollsBackAndZeroValueIsAllowed(){
  var s=Service();var create=C("addInvestment") with{Name="Ação",Kind="acao",Institution="Corretora",Date="2026-01-01",InvestedCents=10000,AmountCents=-1};
  Assert.Throws<ArgumentException>(()=>s.Execute(create));Assert.Empty(s.Snapshot("2026-01").Investments);
  var id=s.Execute(create with{RequestId=Guid.NewGuid().ToString(),AmountCents=0});
  Assert.Throws<ArgumentException>(()=>s.Execute(C("saveInvestmentValue") with{TargetId=id,Date="9999-01-01"}));
  Assert.Throws<ArgumentException>(()=>s.Execute(C("saveInvestmentValue") with{TargetId="missing",Date="2026-01-01"}));
  Assert.Single(s.Snapshot("2026-01").Investments.Single().Values);
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
