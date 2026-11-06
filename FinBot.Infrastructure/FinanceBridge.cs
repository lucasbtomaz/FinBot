using System.Text.Json;
using FinBot.Core;
namespace FinBot.Infrastructure;

// Mesmo protocolo usado pela janela desktop e pelos testes de integração.
public sealed class FinanceBridge(FinanceService service, Action<string>? openReceipt = null)
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
    private sealed record Request(string Type, string RequestId, string Month, FinanceCommand? Command);
    public string Handle(string json)
    {
        string? requestId=null;
        try
        {
            var request=JsonSerializer.Deserialize<Request>(json,Options) ?? throw new ArgumentException("Pedido inválido.");
            requestId=request.RequestId;
            if(!Guid.TryParse(requestId,out _)) throw new ArgumentException("Identificador inválido.");
            if(request.Type is not ("snapshot" or "command")) throw new ArgumentException("Pedido desconhecido.");
            // Valida o período antes de qualquer escrita.
            var snapshot=service.Snapshot(request.Month);
            if(request.Type=="command")
            {
                if(request.Command is null) throw new ArgumentException("Comando ausente.");
                if(request.Command.Action=="openReceipt"){
                    if(openReceipt is null)throw new ArgumentException("Abra o comprovante pelo aplicativo FinBot.");
                    openReceipt(service.ReceiptPath(request.Command.TargetId));
                }else service.Execute(request.Command with { RequestId=requestId });
                snapshot=service.Snapshot(request.Month);
            }
            return JsonSerializer.Serialize(new {requestId,ok=true,data=snapshot},Options);
        }
        catch(ArgumentException ex) { return Error(requestId,ex.Message); }
        catch(JsonException) { return Error(requestId,"Dados inválidos. Confira os campos e os valores."); }
        catch(Exception) { return Error(requestId,"Não foi possível concluir a operação no banco local. Tente novamente."); }
    }
    private static string Error(string? requestId,string message) =>
        JsonSerializer.Serialize(new {requestId,ok=false,error=message},Options);
}
