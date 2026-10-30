using FinBot.Core;
using Microsoft.Data.Sqlite;
namespace FinBot.Infrastructure;
public sealed partial class FinanceService
{
    private (byte[] Bytes,string Extension)? PrepareReceipt(SqliteConnection c,SqliteTransaction tx,FinanceCommand v)
    {
        var outgoing=v.Action=="payInvoice" || (v.Action is "settleItem" or "payItem" && Items(c,tx).Any(x=>x.Id==v.TargetId&&x.Kind=="pagar"));
        if(!outgoing)return null;
        if(string.IsNullOrEmpty(v.ReceiptData)){
            return null;
        }
        if(receiptDirectory is null)throw new ArgumentException("A pasta de comprovantes não está configurada.");
        if(v.ReceiptData.Length>14*1024*1024)throw new ArgumentException("O comprovante deve ter até 10 MB.");
        byte[] bytes;
        try{bytes=Convert.FromBase64String(v.ReceiptData);}catch(FormatException){throw new ArgumentException("Comprovante inválido. Selecione o arquivo novamente.");}
        if(bytes.Length==0||bytes.Length>10*1024*1024)throw new ArgumentException("O comprovante deve ter até 10 MB e não pode estar vazio.");
        var ext=Path.GetExtension(v.ReceiptName).ToLowerInvariant();
        var valid=ext switch{
            ".pdf"=>bytes.AsSpan().StartsWith("%PDF-"u8),
            ".png"=>bytes.AsSpan().StartsWith(new byte[]{137,80,78,71,13,10,26,10}),
            ".jpg" or ".jpeg"=>bytes.AsSpan().StartsWith(new byte[]{255,216,255}),
            _=>false
        };
        if(!valid)throw new ArgumentException("Selecione um comprovante em PDF, PNG ou JPG válido.");
        return (bytes,ext);
    }
    private string? SaveReceipt(SqliteConnection c,SqliteTransaction tx,FinanceCommand v,string payment,(byte[] Bytes,string Extension) receipt)
    {
        var date=Date(v.Date);
        string[] months=["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
        var folder=Path.Combine(Path.GetFullPath(receiptDirectory!),date.Year.ToString("D4"),months[date.Month-1]);
        var path=Path.Combine(folder,date.ToString("yyyy-MM-dd")+"_"+Guid.Parse(v.RequestId).ToString("N")+receipt.Extension);
        var created=false;
        try{
            Directory.CreateDirectory(folder);
            // Identificador do pedido permite recuperar uma cópia após interrupção sem sobrescrevê-la.
            if(File.Exists(path)){
                if(!File.ReadAllBytes(path).AsSpan().SequenceEqual(receipt.Bytes))throw new IOException("Arquivo existente diferente.");
            }else{
                using(var file=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.None)){
                    created=true;file.Write(receipt.Bytes);file.Flush(true);
                }
            }
            Run(c,tx,"INSERT INTO payment_receipts VALUES($payment,$path)",("$payment",payment),("$path",path));
            return created?path:null;
        }catch(Exception ex) when(ex is IOException or UnauthorizedAccessException){
            if(created){try{File.Delete(path);}catch(IOException){}catch(UnauthorizedAccessException){}}
            throw new ArgumentException("Não foi possível salvar o comprovante em "+receiptDirectory+". Confira a pasta, o espaço e a permissão. A baixa não foi registrada.",ex);
        }catch{
            if(created){try{File.Delete(path);}catch(IOException){}catch(UnauthorizedAccessException){}}
            throw;
        }
    }
    public string ReceiptPath(string paymentId){
        using var c=database.Open();using var tx=c.BeginTransaction();
        var path=Rows(c,tx,"SELECT path FROM payment_receipts WHERE payment_id=$id",r=>r.GetString(0),("$id",paymentId)).SingleOrDefault();
        if(path is null||!File.Exists(path))throw new ArgumentException("Comprovante não encontrado. Confira se o arquivo continua na pasta original.");
        var full=Path.GetFullPath(path);
        if(receiptDirectory is null||!full.StartsWith(Path.GetFullPath(receiptDirectory).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)||
            Path.GetExtension(full).ToLowerInvariant() is not (".pdf" or ".png" or ".jpg" or ".jpeg"))
            throw new ArgumentException("Caminho do comprovante inválido.");
        return full;
    }
}
