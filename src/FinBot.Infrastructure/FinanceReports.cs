using FinBot.Core;
using Microsoft.Data.Sqlite;
namespace FinBot.Infrastructure;
public sealed partial class FinanceService
{
    public FinanceSnapshot Snapshot(string month)
    {
        Date(month+"-01");
        using var c=database.Open(); using var tx=c.BeginTransaction();
        var accounts=Accounts(c,tx); var items=Items(c,tx);
        var active=items.Where(x=>!x.Cancelled).ToList();
        var monthly=active.Where(x=>x.DueDate.StartsWith(month+"-",StringComparison.Ordinal)).ToList();
        var invoices=active.Where(x=>x.CardId!="").GroupBy(InvoiceId).Select(g=>
            new InvoiceView(g.Key,g.First().CardId,g.First().DueDate,g.Sum(x=>x.AmountCents),g.Sum(x=>x.PaidCents)))
            .OrderBy(x=>x.DueDate).ThenBy(x=>x.CardId).ToList();
        var result=new FinanceSnapshot(month,accounts.Where(x=>x.Kind=="conta").Sum(x=>x.BalanceCents),
            accounts.Where(x=>x.Kind=="reserva").Sum(x=>x.BalanceCents),
            monthly.Where(x=>x.Kind=="pagar").Sum(x=>x.AmountCents),
            monthly.Where(x=>x.Kind=="pagar").Sum(x=>x.RemainingCents),
            monthly.Where(x=>x.Kind=="receber").Sum(x=>x.RemainingCents),
            accounts,Cards(c,tx),items,
            Rows(c,tx,"SELECT id,name,card_id,amount_cents,count,cancelled FROM purchases ORDER BY rowid DESC",
                r=>new PurchaseView(r.GetString(0),r.GetString(1),r.GetString(2),r.GetInt64(3),r.GetInt32(4),r.GetBoolean(5),!HasActiveAllocations(c,tx,r.GetString(0)))),
            invoices,Payments(c,tx),Plans(c,tx),Investments(c,tx),TaxRecords(c,tx),receiptDirectory is not null,receiptDirectory??"");
        tx.Commit(); return result;
    }
    private static List<AccountView> Accounts(SqliteConnection c,SqliteTransaction tx)=>Rows(c,tx,"""
        SELECT a.id,a.name,COALESCE(d.kind,'conta'),
            a.opening_cents+COALESCE((SELECT SUM(m.amount_cents) FROM cash_movements m WHERE m.account_id=a.id),0)
        FROM accounts a LEFT JOIN account_details d ON d.account_id=a.id ORDER BY a.rowid
        """,r=>new AccountView(r.GetString(0),r.GetString(1),r.GetString(2),r.GetInt64(3)));
    private static List<CardView> Cards(SqliteConnection c,SqliteTransaction tx)=>
        Rows(c,tx,"SELECT id,name,due_day FROM cards ORDER BY rowid",r=>new CardView(r.GetString(0),r.GetString(1),r.GetInt32(2)));
    private static List<ItemView> Items(SqliteConnection c,SqliteTransaction tx)=>Rows(c,tx,"""
        SELECT f.id,f.name,f.kind,f.amount_cents,f.paid_cents,f.due_date,f.category,COALESCE(f.purchase_id,''),COALESCE(f.card_id,''),f.number,f.count,f.cancelled,
            COALESCE(pi.plan_id,''),COALESCE(d.method,CASE WHEN f.card_id IS NOT NULL THEN 'cartao' ELSE 'outro' END),
            COALESCE(d.base_cents,f.amount_cents),COALESCE(d.extra_cents,0),COALESCE(d.note,''),COALESCE(rd.payer,''),COALESCE(rd.confidence,'incerto'),COALESCE(rd.cadence,'unico')
        FROM finance_items f LEFT JOIN plan_items pi ON pi.item_id=f.id LEFT JOIN item_details d ON d.item_id=f.id LEFT JOIN receivable_details rd ON rd.item_id=f.id
        ORDER BY f.due_date,f.number,f.id
        """,r=>new ItemView(r.GetString(0),r.GetString(1),r.GetString(2),r.GetInt64(3),r.GetInt64(4),r.GetString(5),r.GetString(6),
            r.GetString(7),r.GetString(8),r.GetInt32(9),r.GetInt32(10),r.GetBoolean(11),r.GetString(12),r.GetString(13),r.GetInt64(14),r.GetInt64(15),r.GetString(16),r.GetString(17),r.GetString(18),r.GetString(19)));
    private static List<PaymentView> Payments(SqliteConnection c,SqliteTransaction tx)=>
        Rows(c,tx,"SELECT p.id,p.name,p.account_id,p.date,p.amount_cents,p.reversed,COALESCE(r.path,'') FROM payments p LEFT JOIN payment_receipts r ON r.payment_id=p.id ORDER BY p.date DESC,p.rowid DESC",
            r=>new PaymentView(r.GetString(0),r.GetString(1),r.GetString(2),r.GetString(3),r.GetInt64(4),r.GetBoolean(5),r.GetString(6)));
}
