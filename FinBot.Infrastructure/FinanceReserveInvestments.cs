using Microsoft.Data.Sqlite;
namespace FinBot.Infrastructure;
public sealed partial class FinanceService
{
    internal static void SyncReserveInvestments(SqliteConnection c,SqliteTransaction tx,Dictionary<string,long>? before=null)
    {
        var month=DateTime.Today.ToString("yyyy-MM");
        foreach(var account in Accounts(c,tx).Where(x=>x.Kind=="reserva")){
            var investment=Rows(c,tx,"SELECT investment_id FROM investment_accounts WHERE account_id=$id",r=>r.GetString(0),("$id",account.Id)).SingleOrDefault();
            if(investment is null){
                investment="reserva-"+account.Id;
                Run(c,tx,"INSERT INTO investments VALUES($id,$name,'reserva',$name)",("$id",investment),("$name",account.Name));
                Run(c,tx,"INSERT INTO investment_accounts VALUES($investment,$account)",("$investment",investment),("$account",account.Id));
                Run(c,tx,"INSERT INTO investment_values VALUES($id,$month,$balance,$balance)",("$id",investment),("$month",month),("$balance",account.BalanceCents));
            }else if(before is not null&&(!before.TryGetValue(account.Id,out var previous)||previous!=account.BalanceCents)){
                // Saldo acompanha movimentos; capital investido permanece o valor informado pelo usuário.
                var invested=Rows(c,tx,"SELECT invested_cents FROM investment_values WHERE investment_id=$id AND month<=$month ORDER BY month DESC LIMIT 1",
                    r=>r.GetInt64(0),("$id",investment),("$month",month)).FirstOrDefault();
                Run(c,tx,"INSERT INTO investment_values VALUES($id,$month,$invested,$balance) ON CONFLICT(investment_id,month) DO UPDATE SET value_cents=excluded.value_cents",
                    ("$id",investment),("$month",month),("$invested",invested),("$balance",account.BalanceCents));
            }
        }
    }
}
