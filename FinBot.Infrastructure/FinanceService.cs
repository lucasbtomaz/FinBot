using System.Globalization;
using System.Text.Json;
using FinBot.Core;
using Microsoft.Data.Sqlite;
namespace FinBot.Infrastructure;

public sealed partial class FinanceService(LocalDatabase database, string? receiptDirectory = null)
{
    public string Execute(FinanceCommand input)
    {
        if (!Guid.TryParse(input.RequestId, out _)) throw new ArgumentException("Identificador do pedido inválido.");
        using var c = database.Open();
        using var tx = c.BeginTransaction();
        var payload = JsonSerializer.Serialize(input with { ReceiptData = string.IsNullOrEmpty(input.ReceiptData) ? "" : Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(input.ReceiptData))) });
        var prior = Rows(c, tx, "SELECT payload,result FROM finance_requests WHERE id=$id",
            r => (Payload:r.GetString(0), Result:r.GetString(1)), ("$id",input.RequestId)).SingleOrDefault();
        if (prior != default)
        {
            if (prior.Payload != payload) throw new ArgumentException("Este pedido já foi usado com outros dados.");
            return prior.Result;
        }
        var balancesBefore = Accounts(c,tx).Where(x=>x.Kind=="reserva").ToDictionary(x=>x.Id,x=>x.BalanceCents);
        var receipt = PrepareReceipt(c,tx,input);
        string? createdReceipt = null;
        try {
        var result = Apply(c, tx, input);
        SyncReserveInvestments(c,tx,balancesBefore);
        if(receipt is not null)createdReceipt=SaveReceipt(c,tx,input,result,receipt.Value);
        if(input.TrackIr && input.Action is "addItem" or "addPurchase" or "addPlan" or "addInvestment")
            TrackTax(c,tx,input.Action switch { "addPurchase"=>"purchase","addPlan"=>"plan","addInvestment"=>"investment",_=>"item" },result);
        Run(c,tx,"INSERT INTO finance_requests VALUES($id,$payload,$result)",
            ("$id",input.RequestId),("$payload",payload),("$result",result));
        tx.Commit();
        return result;
        } catch { if(createdReceipt is not null) { try { File.Delete(createdReceipt); } catch(IOException) { } catch(UnauthorizedAccessException) { } } throw; }
    }

    private string Apply(SqliteConnection c, SqliteTransaction tx, FinanceCommand v)
    {
        var id = Guid.NewGuid().ToString();
        switch(v.Action)
        {
            case "saveTaxRecord":
                return SaveTaxRecord(c,tx,v);
            case "addReceivable":
            case "editReceivable":
                return ReceivableAction(c,tx,v,id);
            case "addInvestment":
            case "saveInvestmentValue":
                return InvestmentAction(c,tx,v,id);
            case "addPlan":
            case "extendPlan":
            case "editItem":
            case "unpayItem":
            case "cancelPlan":
                return ScheduleAction(c,tx,v,id);
            case "addAccount":
                Name(v.Name); Amount(v.AmountCents, true);
                if (v.Kind is not ("conta" or "reserva")) throw new ArgumentException("Tipo de conta inválido.");
                if (Accounts(c,tx).Any(x => x.Name.Equals(v.Name.Trim(),StringComparison.OrdinalIgnoreCase)))
                    throw new ArgumentException("Já existe uma conta com esse nome.");
                Run(c,tx,"INSERT INTO accounts VALUES($id,$name,$amount)",("$id",id),("$name",v.Name.Trim()),("$amount",v.AmountCents));
                Run(c,tx,"INSERT INTO account_details VALUES($id,$kind)",("$id",id),("$kind",v.Kind));
                break;
            case "adjustBalance":
                if(v.AmountCents < -100_000_000_000 || v.AmountCents > 100_000_000_000)
                    throw new ArgumentException("Saldo fora do limite de R$ 1 bilhão.");
                var balanceAccount=Accounts(c,tx).SingleOrDefault(x=>x.Id==v.TargetId)
                    ?? throw new ArgumentException("Conta não encontrada.");
                if(balanceAccount.Kind=="reserva" && v.AmountCents<0)
                    throw new ArgumentException("O saldo da reserva não pode ser negativo.");
                var difference=checked(v.AmountCents-balanceAccount.BalanceCents);
                if(difference==0)return balanceAccount.Id;
                var adjustmentDate=DateTime.Today.ToString("yyyy-MM-dd");
                var balanceCulture=CultureInfo.GetCultureInfo("pt-BR");
                var beforeBalance=(balanceAccount.BalanceCents/100m).ToString("C",balanceCulture);
                var afterBalance=(v.AmountCents/100m).ToString("C",balanceCulture);
                AddPayment(c,tx,id,$"Ajuste de saldo: {balanceAccount.Name} ({beforeBalance} → {afterBalance})",balanceAccount.Id,adjustmentDate,Math.Abs(difference));
                Move(c,tx,balanceAccount.Id,difference,adjustmentDate,id);
                break;
            case "addCard":
                Name(v.Name);
                if(v.DueDay < 1 || v.DueDay > 31) throw new ArgumentException("Vencimento deve estar entre 1 e 31.");
                if (Cards(c,tx).Any(x => x.Name.Equals(v.Name.Trim(),StringComparison.OrdinalIgnoreCase)))
                    throw new ArgumentException("Já existe um cartão com esse nome.");
                Run(c,tx,"INSERT INTO cards VALUES($id,$name,$day)",("$id",id),("$name",v.Name.Trim()),("$day",v.DueDay));
                break;
            case "addItem":
                Name(v.Name); Name(v.Category); Amount(v.AmountCents); Date(v.Date);
                if(v.Kind is not ("pagar" or "receber")) throw new ArgumentException("Tipo de lançamento inválido.");
                Method(v.PaymentMethod);
                InsertItem(c,tx,id,v.Name.Trim(),v.Kind,v.AmountCents,0,v.Date,v.Category.Trim(),null,null,1,1);
                Detail(c,tx,id,v.PaymentMethod,v.AmountCents,0,v.Note);
                break;
            case "addPurchase":
                Name(v.Name); Name(v.Category); Amount(v.AmountCents);
                if(v.Count < 1 || v.Count > 120 || v.AmountCents < v.Count || v.PaidCount < 0 || v.PaidCount > v.Count)
                    throw new ArgumentException("Informe de 1 a 120 parcelas, com pelo menos um centavo cada, e histórico pago válido.");
                var card = Cards(c,tx).SingleOrDefault(x=>x.Id==v.CardId) ?? throw new ArgumentException("Selecione um cartão.");
                var first = Date(v.Date);
                if(first.Year + v.Count / 12 >= 9999) throw new ArgumentException("Data fora do intervalo permitido.");
                Run(c,tx,"INSERT INTO purchases VALUES($id,$name,$card,$amount,$count,0)",
                    ("$id",id),("$name",v.Name.Trim()),("$card",card.Id),("$amount",v.AmountCents),("$count",v.Count));
                for(var n=0;n<v.Count;n++)
                {
                    var month = new DateOnly(first.Year,first.Month,1).AddMonths(n);
                    var due = new DateOnly(month.Year,month.Month,Math.Min(card.DueDay,DateTime.DaysInMonth(month.Year,month.Month)));
                    var amount = v.AmountCents / v.Count + (n < v.AmountCents % v.Count ? 1 : 0);
                    InsertItem(c,tx,Guid.NewGuid().ToString(),v.Name.Trim(),"pagar",amount,n<v.PaidCount?amount:0,
                        due.ToString("yyyy-MM-dd"),v.Category.Trim(),id,card.Id,n+1,v.Count);
                }
                break;
            case "payItem":
            case "settleItem":
            case "payInvoice":
                return Pay(c,tx,v,id);
            case "transfer":
                Amount(v.AmountCents); PaymentDate(v.Date);
                var accounts = Accounts(c,tx);
                var from = accounts.SingleOrDefault(x=>x.Id==v.AccountId) ?? throw new ArgumentException("Selecione a conta de origem.");
                var to = accounts.SingleOrDefault(x=>x.Id==v.TargetId) ?? throw new ArgumentException("Selecione a conta de destino.");
                if(from.Id==to.Id) throw new ArgumentException("Origem e destino devem ser diferentes.");
                if(from.BalanceCents < v.AmountCents) throw new ArgumentException("Saldo insuficiente para transferir.");
                AddPayment(c,tx,id,$"Transferência: {from.Name} → {to.Name}",from.Id,v.Date,v.AmountCents);
                Move(c,tx,from.Id,-v.AmountCents,v.Date,id);
                Move(c,tx,to.Id,v.AmountCents,v.Date,id);
                break;
            case "reversePayment":
                var payment = Payments(c,tx).SingleOrDefault(x=>x.Id==v.TargetId && !x.Reversed)
                    ?? throw new ArgumentException("Baixa não encontrada ou já desfeita.");
                // Remover ambos os lados de uma transferência é atômico. Histórico da baixa permanece.
                foreach(var allocation in Rows(c,tx,"SELECT item_id,amount_cents FROM allocations WHERE payment_id=$id",
                    r=>(Id:r.GetString(0),Amount:r.GetInt64(1)),("$id",payment.Id)))
                    Run(c,tx,"UPDATE finance_items SET paid_cents=paid_cents-$amount WHERE id=$id",
                        ("$id",allocation.Id),("$amount",allocation.Amount));
                Run(c,tx,"DELETE FROM cash_movements WHERE payment_id=$id",("$id",payment.Id));
                Run(c,tx,"UPDATE payments SET reversed=1 WHERE id=$id",("$id",payment.Id));
                if(Accounts(c,tx).Any(x=>x.Kind=="reserva" && x.BalanceCents<0))
                    throw new ArgumentException("Desfaça primeiro as saídas dependentes dessa reserva.");
                id=payment.Id;
                break;
            case "cancelItem":
                var item=Items(c,tx).SingleOrDefault(x=>x.Id==v.TargetId && !x.Cancelled)
                    ?? throw new ArgumentException("Lançamento não encontrado.");
                if(item.CardId!="" || item.PaidCents>0) throw new ArgumentException("Desfaça as baixas antes de cancelar. Parcelas são canceladas pela compra.");
                Run(c,tx,"UPDATE finance_items SET cancelled=1 WHERE id=$id",("$id",item.Id));
                id=item.Id;
                break;
            case "cancelPurchase":
                var parts=Items(c,tx).Where(x=>x.PurchaseId==v.TargetId && !x.Cancelled).ToList();
                if(parts.Count==0 || HasActiveAllocations(c,tx,v.TargetId))
                    throw new ArgumentException("Compra não encontrada ou com baixas realizadas no aplicativo. Desfaça essas baixas antes de cancelar.");
                Run(c,tx,"UPDATE finance_items SET cancelled=1 WHERE purchase_id=$id",("$id",v.TargetId));
                Run(c,tx,"UPDATE purchases SET cancelled=1 WHERE id=$id",("$id",v.TargetId));
                id=v.TargetId;
                break;
            default: throw new ArgumentException("Operação desconhecida.");
        }
        return id;
    }

    private static string Pay(SqliteConnection c, SqliteTransaction tx, FinanceCommand v, string id)
    {
        Amount(v.AmountCents); PaymentDate(v.Date);
        var account = Accounts(c,tx).SingleOrDefault(x=>x.Id==v.AccountId) ?? throw new ArgumentException("Selecione a conta da baixa.");
        var all=Items(c,tx).Where(x=>!x.Cancelled).ToList();
        List<ItemView> targets;
        string name;
        if(v.Action is "settleItem" or "payItem")
        {
            var item=all.SingleOrDefault(x=>x.Id==v.TargetId) ?? throw new ArgumentException("Lançamento não encontrado.");
            if(item.CardId!="" && v.Action=="settleItem") throw new ArgumentException("Pague a parcela pela fatura para evitar duplicidade.");
            targets=[item]; name=$"{(item.Kind=="pagar"?"Pagamento":"Recebimento")}: {item.Name}";
        }
        else
        {
            targets=all.Where(x=>x.CardId!="" && InvoiceId(x)==v.TargetId).OrderBy(x=>x.Id).ToList();
            name="Pagamento de fatura";
        }
        var remaining=targets.Sum(x=>x.RemainingCents);
        if(targets.Count==0 || v.AmountCents>remaining) throw new ArgumentException("Valor maior que o saldo pendente.");
        var direction=targets[0].Kind=="receber"?1:-1;
        if(account.Kind=="reserva" && direction<0 && account.BalanceCents<v.AmountCents)
            throw new ArgumentException("Saldo insuficiente na reserva.");
        AddPayment(c,tx,id,name,account.Id,v.Date,v.AmountCents);
        var amountLeft=v.AmountCents;
        foreach(var item in targets)
        {
            var amount=Math.Min(amountLeft,item.RemainingCents);
            if(amount==0) continue;
            Run(c,tx,"UPDATE finance_items SET paid_cents=paid_cents+$amount WHERE id=$id",("$id",item.Id),("$amount",amount));
            Run(c,tx,"INSERT INTO allocations VALUES($payment,$item,$amount)",("$payment",id),("$item",item.Id),("$amount",amount));
            amountLeft-=amount;
        }
        Move(c,tx,account.Id,direction*v.AmountCents,v.Date,id);
        return id;
    }

    private static bool HasActiveAllocations(SqliteConnection c,SqliteTransaction tx,string purchaseId) =>
        Rows(c,tx,"SELECT COUNT(*) FROM allocations a JOIN payments p ON p.id=a.payment_id JOIN finance_items i ON i.id=a.item_id WHERE i.purchase_id=$id AND p.reversed=0 AND a.amount_cents>0",
            r=>r.GetInt64(0),("$id",purchaseId)).Single()>0;
    private static void InsertItem(SqliteConnection c,SqliteTransaction tx,string id,string name,string kind,long amount,long paid,
        string due,string category,string? purchase,string? card,int number,int count) =>
        Run(c,tx,"INSERT INTO finance_items VALUES($id,$name,$kind,$amount,$paid,$due,$category,$purchase,$card,$number,$count,0)",
            ("$id",id),("$name",name),("$kind",kind),("$amount",amount),("$paid",paid),("$due",due),("$category",category),
            ("$purchase",purchase),("$card",card),("$number",number),("$count",count));
    private static void AddPayment(SqliteConnection c,SqliteTransaction tx,string id,string name,string account,string date,long amount) =>
        Run(c,tx,"INSERT INTO payments VALUES($id,$name,$account,$date,$amount,0)",
            ("$id",id),("$name",name),("$account",account),("$date",date),("$amount",amount));
    private static void Move(SqliteConnection c,SqliteTransaction tx,string account,long amount,string date,string payment) =>
        Run(c,tx,"INSERT INTO cash_movements VALUES($id,$account,$amount,$date,$payment)",
            ("$id",Guid.NewGuid().ToString()),("$account",account),("$amount",amount),("$date",date),("$payment",payment));

    private static void Name(string? value) { if(string.IsNullOrWhiteSpace(value) || value.Trim().Length>150) throw new ArgumentException("Informe um nome de até 150 caracteres."); }
    private static void Amount(long value,bool zero=false) { if(value<(zero?0:1) || value>100_000_000_000) throw new ArgumentException("Informe um valor positivo de até R$ 1 bilhão."); }
    private static DateOnly Date(string value) =>
        DateOnly.TryParseExact(value,"yyyy-MM-dd",CultureInfo.InvariantCulture,DateTimeStyles.None,out var date) && date.Year>=1900
        ? date : throw new ArgumentException("Data inválida.");
    private static void PaymentDate(string value) { if(Date(value)>DateOnly.FromDateTime(DateTime.Today)) throw new ArgumentException("Uma baixa não pode ter data futura."); }
    private static string InvoiceId(ItemView item)=>item.CardId+"|"+item.DueDate;
    private static SqliteCommand Command(SqliteConnection c,SqliteTransaction tx,string sql,params (string,object?)[] values)
    {
        var command=c.CreateCommand(); command.Transaction=tx; command.CommandText=sql;
        foreach(var (name,value) in values) command.Parameters.AddWithValue(name,value??DBNull.Value);
        return command;
    }
    private static void Run(SqliteConnection c,SqliteTransaction tx,string sql,params (string,object?)[] values)
    { using var command=Command(c,tx,sql,values); command.ExecuteNonQuery(); }
    private static List<T> Rows<T>(SqliteConnection c,SqliteTransaction tx,string sql,Func<SqliteDataReader,T> map,params (string,object?)[] values)
    {
        using var command=Command(c,tx,sql,values); using var reader=command.ExecuteReader(); var rows=new List<T>();
        while(reader.Read()) rows.Add(map(reader)); return rows;
    }
}
