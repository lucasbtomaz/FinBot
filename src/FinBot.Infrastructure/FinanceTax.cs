using FinBot.Core;
using Microsoft.Data.Sqlite;
namespace FinBot.Infrastructure;
public sealed partial class FinanceService
{
    private static void TrackTax(SqliteConnection c,SqliteTransaction tx,string type,string sourceId)=>
        Run(c,tx,"INSERT OR IGNORE INTO tax_records(id,source_type,source_id) VALUES($id,$type,$source)",
            ("$id",Guid.NewGuid().ToString()),("$type",type),("$source",sourceId));
    private static List<TaxRecordView> TaxRecords(SqliteConnection c,SqliteTransaction tx)=>
        Rows(c,tx,"SELECT id,source_type,source_id,name,document,category,note,confirmed FROM tax_records ORDER BY rowid DESC",
            r=>new TaxRecordView(r.GetString(0),r.GetString(1),r.GetString(2),r.GetString(3),r.GetString(4),r.GetString(5),r.GetString(6),r.GetBoolean(7)));
    private static string SaveTaxRecord(SqliteConnection c,SqliteTransaction tx,FinanceCommand v)
    {
        if(!TaxRecords(c,tx).Any(x=>x.Id==v.TargetId))throw new ArgumentException("Registro de IR não encontrado.");
        Name(v.Name);Name(v.Category);
        if(string.IsNullOrWhiteSpace(v.Document)||v.Document.Length>30)throw new ArgumentException("Informe o CPF/CNPJ, com até 30 caracteres.");
        if(v.Note is null||v.Note.Length>1000)throw new ArgumentException("Observação deve ter até 1000 caracteres.");
        Run(c,tx,"UPDATE tax_records SET name=$name,document=$document,category=$category,note=$note,confirmed=1 WHERE id=$id",
            ("$name",v.Name.Trim()),("$document",v.Document.Trim()),("$category",v.Category.Trim()),("$note",v.Note.Trim()),("$id",v.TargetId));
        return v.TargetId;
    }
}
