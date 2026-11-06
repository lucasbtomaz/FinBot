using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;

namespace FinBot.Tests;

public sealed class CardVisualMigrationTests : IDisposable
{
    private readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());

    [Fact]
    public void UpgradePreservesCardPurchaseAndPaymentAndAddsVisualFields()
    {
        var path=Path.Combine(folder,"test.db");
        var db=new LocalDatabase(path);db.Initialize();
        var service=new FinanceService(db);
        FinanceCommand Command(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
        var account=service.Execute(Command("addAccount") with{Name="Conta",Kind="conta",AmountCents=100_000});
        var card=service.Execute(Command("addCard") with{Name="Inter",DueDay=25});
        service.Execute(Command("addPurchase") with{Name="Compra antiga",CardId=card,AmountCents=20_000,Count=2,Date="2026-10-01"});
        var invoice=service.Snapshot("2026-10").Invoices.Single(x=>x.DueDate.StartsWith("2026-10"));
        service.Execute(Command("payInvoice") with{TargetId=invoice.Id,AccountId=account,AmountCents=2_500,Date="2026-10-10"});

        using(var connection=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=path,Pooling=false}.ToString()))
        {
            connection.Open();using var command=connection.CreateCommand();
            command.CommandText="PRAGMA foreign_keys=OFF; CREATE TABLE cards_v7(id TEXT PRIMARY KEY,name TEXT NOT NULL,due_day INTEGER NOT NULL); INSERT INTO cards_v7 SELECT id,name,due_day FROM cards; DROP TABLE cards; ALTER TABLE cards_v7 RENAME TO cards; DELETE FROM finance_migrations WHERE version>=8; PRAGMA foreign_keys=ON;";
            command.ExecuteNonQuery();
        }

        db.Initialize();db.Initialize();
        var snapshot=service.Snapshot("2026-10");
        var migrated=Assert.Single(snapshot.Cards);
        Assert.NotNull(typeof(CardView).GetProperty("LimitCents"));
        Assert.NotNull(typeof(CardView).GetProperty("ClosingDay"));
        Assert.Equal("Inter",migrated.Name);
        Assert.Equal(10_000,snapshot.ExpenseCents);
        Assert.Equal(7_500,snapshot.Invoices.Single(x=>x.DueDate.StartsWith("2026-10")).RemainingCents);
        Assert.Equal(97_500,snapshot.AvailableCents);
        Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
    }

    public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
