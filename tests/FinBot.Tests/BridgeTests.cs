using FinBot.Infrastructure;
using System.Text.Json;
using Xunit;
namespace FinBot.Tests;
public sealed class BridgeTests : IDisposable
{
 readonly string directory=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());
 [Fact]
 public void InvalidMonthCannotCommitACommand()
 {
  var db=new LocalDatabase(Path.Combine(directory,"test.db"));db.Initialize();
  var service=new FinanceService(db);var bridge=new FinanceBridge(service);
  var response=bridge.Handle(JsonSerializer.Serialize(new {type="command",requestId=Guid.NewGuid().ToString(),month="invalid",
    command=new {action="addAccount",name="Conta",kind="conta",amountCents=100}}));
  Assert.False(JsonDocument.Parse(response).RootElement.GetProperty("ok").GetBoolean());
  Assert.Empty(service.Snapshot("2026-01").Accounts);
 }
 [Fact]
 public void FractionalCentIsRejectedWithoutSaving()
 {
  var db=new LocalDatabase(Path.Combine(directory,"test.db"));db.Initialize();
  var service=new FinanceService(db);var bridge=new FinanceBridge(service);
  var response=bridge.Handle(JsonSerializer.Serialize(new {type="command",requestId=Guid.NewGuid().ToString(),month="2026-01",
    command=new {action="addAccount",name="Conta",kind="conta",amountCents=1.5}}));
  Assert.False(JsonDocument.Parse(response).RootElement.GetProperty("ok").GetBoolean());
  Assert.Empty(service.Snapshot("2026-01").Accounts);
 }
 public void Dispose(){if(Directory.Exists(directory))Directory.Delete(directory,true);}
}
