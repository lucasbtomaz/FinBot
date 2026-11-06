using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;

namespace FinBot.Tests;

public sealed class CardInvoiceOverrideMigrationTests : IDisposable
{
    private readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotTests",Guid.NewGuid().ToString());

    [Fact]
    public void UpgradeV8PreservesExistingDataAndAddsCardInvoiceOverrides()
    {
        var path=Path.Combine(folder,"test.db");
        var db=new LocalDatabase(path);db.Initialize();
        var service=new FinanceService(db);
        FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
        var account=service.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=100_000});
        var card=service.Execute(C("addCard") with{Name="Inter",DueDay=25,LimitCents=635_000});
        service.Execute(C("addPurchase") with{Name="Compra",CardId=card,AmountCents=20_000,Count=2,Date="2026-10-01"});
        var invoice=service.Snapshot("2026-10").Invoices.Single(x=>x.DueDate.StartsWith("2026-10"));
        service.Execute(C("payInvoice") with{TargetId=invoice.Id,AccountId=account,AmountCents=2_500,Date="2026-10-10"});

        using(var connection=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=path,Pooling=false}.ToString()))
        {
            connection.Open();using var command=connection.CreateCommand();
            command.CommandText="DROP TABLE IF EXISTS card_invoice_allocations; DROP TABLE IF EXISTS card_invoice_overrides; DELETE FROM finance_migrations WHERE version>=9;";
            command.ExecuteNonQuery();
        }

        db.Initialize();db.Initialize();

        using(var connection=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=path,Pooling=false}.ToString()))
        {
            connection.Open();using var command=connection.CreateCommand();
            command.CommandText="SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('card_invoice_overrides','card_invoice_allocations')";
            Assert.Equal(2,Convert.ToInt32(command.ExecuteScalar()));
            command.CommandText="SELECT MAX(version) FROM finance_migrations";
            Assert.Equal(9,Convert.ToInt32(command.ExecuteScalar()));
        }

        var after=new FinanceService(db).Snapshot("2026-10");
        Assert.Single(after.Accounts);
        Assert.Single(after.Cards);
        Assert.Single(after.Purchases);
        Assert.Equal(2,after.Items.Count);
        Assert.Single(after.Payments);
        Assert.Equal(7_500,after.Invoices.Single(x=>x.DueDate.StartsWith("2026-10")).RemainingCents);
        Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
    }

    public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
