using FinBot.Core;
using FinBot.Infrastructure;
using Xunit;
namespace FinBot.Tests;

public sealed class FinanceTests : IDisposable
{
    readonly string folder = Path.Combine(Path.GetTempPath(), "FinBotTests", Guid.NewGuid().ToString());
    FinanceService Service() { var db = new LocalDatabase(Path.Combine(folder, "finbot.db")); db.Initialize(); return new FinanceService(db); }
    static FinanceCommand C(string action) => new() { Action = action, RequestId = Guid.NewGuid().ToString() };
    [Fact]
    public void TwelveInstallmentsAreCountedOnceEvenAfterInvoicePayment()
    {
        var s = Service();
        var account = s.Execute(C("addAccount") with { Name = "Itaú", AmountCents = 100000, Kind = "conta" });
        var card = s.Execute(C("addCard") with { Name = "Inter", DueDay = 10 });
        s.Execute(C("addPurchase") with { Name = "XPTO", AmountCents = 12000, Count = 12, CardId = card, Date = "2026-01-10" });
        var before = s.Snapshot("2026-01");
        Assert.Equal(12, before.Items.Count);
        Assert.Equal(1000, before.ExpenseCents);
        Assert.Equal(12000, before.Items.Sum(x => x.AmountCents));
        var invoice = before.Invoices.First(x => x.DueDate == "2026-01-10");
        s.Execute(C("payInvoice") with { TargetId = invoice.Id, AccountId = account, AmountCents = 1000, Date = "2026-01-10" });
        var after = s.Snapshot("2026-01");
        Assert.Equal(1000, after.ExpenseCents);
        Assert.Equal(99000, after.AvailableCents);
        Assert.Equal(1, after.Items.Count(x => x.PaidCents == x.AmountCents));
        Assert.Equal(11, after.Items.Count(x => x.PaidCents == 0));
        Assert.Equal(1000, Service().Snapshot("2026-02").ExpenseCents);
    }
    [Fact]
    public void PartialPaymentsAllocateAcrossPurchasesAndCanBeReversed()
    {
        var s = Service();
        var a = s.Execute(C("addAccount") with { Name = "Conta", Kind = "conta", AmountCents = 50000 });
        var c = s.Execute(C("addCard") with { Name = "Inter", DueDay = 1 });
        foreach (var name in new[] {"A", "B"}) s.Execute(C("addPurchase") with { Name = name, AmountCents = 1000, Count = 1, CardId = c, Date = "2026-01-01" });
        var inv = s.Snapshot("2026-01").Invoices.Single();
        var payment = s.Execute(C("payInvoice") with { TargetId = inv.Id, AccountId = a, AmountCents = 1500, Date = "2026-01-01" });
        var snapshot = s.Snapshot("2026-01");
        Assert.Equal(1500, snapshot.Items.Sum(x => x.PaidCents));
        Assert.Equal(500, snapshot.Invoices.Single().RemainingCents);
        Assert.Equal(2000, snapshot.ExpenseCents);
        s.Execute(C("reversePayment") with { TargetId = payment });
        Assert.Equal(50000, s.Snapshot("2026-01").AvailableCents);
        Assert.Equal(0, s.Snapshot("2026-01").Items.Sum(x => x.PaidCents));
        Assert.Throws<ArgumentException>(() => s.Execute(C("reversePayment") with { TargetId = payment }));
    }
    [Fact]
    public void HistoricalPaidInstallmentsDoNotMoveOpeningBalanceAndRoundingIsExact()
    {
        var s = Service();
        s.Execute(C("addAccount") with { Name = "Conta", Kind = "conta", AmountCents = 5000 });
        var card = s.Execute(C("addCard") with { Name = "Inter", DueDay = 31 });
        s.Execute(C("addPurchase") with { Name = "Compra antiga", CardId = card, AmountCents = 10000, Count = 3, PaidCount = 1, Date = "2026-01-31" });
        var snapshot = s.Snapshot("2026-02");
        Assert.Equal(5000, snapshot.AvailableCents);
        Assert.Equal(new long[] {3334,3333,3333}, snapshot.Items.OrderBy(x => x.Number).Select(x => x.AmountCents));
        Assert.Contains(snapshot.Items, x => x.DueDate == "2026-02-28");
        Assert.Contains(snapshot.Items, x => x.DueDate == "2026-03-31");
        Assert.Equal(1, snapshot.Items.Count(x => x.PaidCents > 0));
    }
    [Fact]
    public void PayablesReceivablesAndReservesDoNotInventIncome()
    {
        var s = Service();
        var a = s.Execute(C("addAccount") with { Name = "Conta", Kind = "conta", AmountCents = 10000 });
        var reserve = s.Execute(C("addAccount") with { Name = "Caixinha", Kind = "reserva", AmountCents = 50000 });
        var receivable = s.Execute(C("addItem") with { Name = "Freela", Kind = "receber", AmountCents = 14000, Date = "2026-01-10" });
        var payable = s.Execute(C("addItem") with { Name = "Aluguel", Kind = "pagar", AmountCents = 2000, Date = "2026-01-10" });
        Assert.Equal(10000, s.Snapshot("2026-01").AvailableCents);
        s.Execute(C("settleItem") with { TargetId = receivable, AccountId = a, AmountCents = 7000, Date = "2026-01-10" });
        s.Execute(C("settleItem") with { TargetId = payable, AccountId = a, AmountCents = 2000, Date = "2026-01-10" });
        s.Execute(C("transfer") with { AccountId = a, TargetId = reserve, AmountCents = 5000, Date = "2026-01-10" });
        var snapshot = s.Snapshot("2026-01");
        Assert.Equal(10000, snapshot.AvailableCents);
        Assert.Equal(55000, snapshot.ReservedCents);
        Assert.Equal(2000, snapshot.ExpenseCents);
        Assert.Equal(7000, snapshot.ToReceiveCents);
    }
    [Fact]
    public void RetriedCommandsAreIdempotentAndInvalidPaymentsRollback()
    {
        var s = Service();
        var command = C("addAccount") with { Name = "Conta", Kind = "conta", AmountCents = 10000 };
        var account = s.Execute(command);
        Assert.Equal(account, s.Execute(command));
        Assert.Throws<ArgumentException>(() => s.Execute(command with { AmountCents = 20000 }));
        var item = s.Execute(C("addItem") with { Name = "Conta de luz", Kind = "pagar", AmountCents = 1000, Date = "2026-01-10" });
        Assert.Throws<ArgumentException>(() => s.Execute(C("settleItem") with { TargetId = item, AccountId = account, AmountCents = 1001, Date = "2026-01-10" }));
        Assert.Throws<ArgumentException>(() => s.Execute(C("settleItem") with { TargetId = item, AccountId = "inexistente", AmountCents = 500, Date = "2026-01-10" }));
        Assert.Equal(10000, s.Snapshot("2026-01").AvailableCents);
        Assert.Equal(0, s.Snapshot("2026-01").Items.Single().PaidCents);
        s.Execute(C("cancelItem") with { TargetId = item });
        Assert.Equal(0, s.Snapshot("2026-01").ExpenseCents);
    }
    [Fact]
    public void CardInstallmentsMustBePaidThroughInvoice()
    {
        var s = Service();
        var card = s.Execute(C("addCard") with { Name = "Inter", DueDay = 10 });
        s.Execute(C("addPurchase") with { Name = "XPTO", CardId = card, Count = 2, AmountCents = 1000, Date = "2026-01-10" });
        var item = s.Snapshot("2026-01").Items.First();
        Assert.Throws<ArgumentException>(() => s.Execute(C("settleItem") with { TargetId = item.Id, AmountCents = 500, Date = "2026-01-10" }));
        Assert.Throws<ArgumentException>(() => s.Execute(C("cancelItem") with { TargetId = item.Id }));
    }
    [Theory]
    [InlineData(0,1)] [InlineData(-1,1)] [InlineData(1,2)] [InlineData(100,0)] [InlineData(100,121)]
    public void InvalidPurchaseDoesNotLeavePartialRows(long value, int count)
    {
        var s = Service();
        var card = s.Execute(C("addCard") with { Name = "Inter", DueDay = 10 });
        Assert.Throws<ArgumentException>(() => s.Execute(C("addPurchase") with { Name = "XPTO", CardId = card, Count = count, AmountCents = value, Date = "2026-01-10" }));
        Assert.Empty(s.Snapshot("2026-01").Items);
    }
    public void Dispose() { if (Directory.Exists(folder)) Directory.Delete(folder, true); }
}
