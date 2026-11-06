namespace FinBot.Core;
public sealed record FinanceCommand
{
    public string ReceiptName { get; init; } = "";
    public string ReceiptData { get; init; } = "";
    public bool TrackIr { get; init; }
    public string Document { get; init; } = "";
    public string Payer { get; init; } = "";
    public string Confidence { get; init; } = "incerto";
    public string Institution { get; init; } = "";
    public long InvestedCents { get; init; }
    public string Action { get; init; } = "";
    public string RequestId { get; init; } = "";
    public string TargetId { get; init; } = "";
    public string AccountId { get; init; } = "";
    public string CardId { get; init; } = "";
    public string Name { get; init; } = "";
    public string Kind { get; init; } = "";
    public string Date { get; init; } = "";
    public string Category { get; init; } = "Outros";
    public long AmountCents { get; init; }
    public int Count { get; init; } = 1;
    public int PaidCount { get; init; }
    public string PaymentMethod { get; init; } = "outro";
    public string Cadence { get; init; } = "mensal";
    public long ExtraCents { get; init; }
    public string Note { get; init; } = "";
    public int DueDay { get; init; } = 10;
}
public sealed record AccountView(string Id, string Name, string Kind, long BalanceCents);
public sealed record CardView(string Id, string Name, int DueDay);
public sealed record ItemView(string Id, string Name, string Kind, long AmountCents, long PaidCents,
    string DueDate, string Category, string PurchaseId, string CardId, int Number, int Count, bool Cancelled, string PlanId = "", string PaymentMethod = "outro", long BaseCents = 0, long ExtraCents = 0, string Note = "", string Payer = "", string Confidence = "incerto", string ReceivableCadence = "unico")
{
    public long RemainingCents => Cancelled ? 0 : AmountCents - PaidCents;
}
public sealed record PurchaseView(string Id, string Name, string CardId, long AmountCents, int Count, bool Cancelled, bool CanCancel);
public sealed record InvoiceView(string Id, string CardId, string DueDate, long AmountCents, long PaidCents)
{
    public long RemainingCents => AmountCents - PaidCents;
}
public sealed record PaymentView(string Id, string Name, string AccountId, string Date, long AmountCents, bool Reversed, string ReceiptPath = "");
public sealed record FinanceSnapshot(string Month, long AvailableCents, long ReservedCents, long ExpenseCents,
    long ToPayCents, long ToReceiveCents, List<AccountView> Accounts, List<CardView> Cards,
    List<ItemView> Items, List<PurchaseView> Purchases, List<InvoiceView> Invoices, List<PaymentView> Payments, List<PlanView> Plans, List<InvestmentView> Investments, List<TaxRecordView> TaxRecords, bool ReceiptEnabled = false, string ReceiptDirectory = "");
public sealed record TaxRecordView(string Id,string SourceType,string SourceId,string Name,string Document,string Category,string Note,bool Confirmed);

public sealed record PlanView(string Id,string Name,string PaymentMethod,string Cadence,long BaseCents,string StartDate,int Count,string Kind,string Category,bool Cancelled);

public sealed record InvestmentValueView(string Month,long InvestedCents,long ValueCents);
public sealed record InvestmentView(string Id,string Name,string Kind,string Institution,List<InvestmentValueView> Values, string AccountId = "");