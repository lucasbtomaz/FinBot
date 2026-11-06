using FinBot.Infrastructure;
Console.InputEncoding = new System.Text.UTF8Encoding(false);
Console.OutputEncoding = new System.Text.UTF8Encoding(false);
// Adaptador de teste: sempre cria banco temporário; não acessa dados pessoais.
var directory=Path.Combine(Path.GetTempPath(),"FinBotE2E",Guid.NewGuid().ToString());
try
{
    var database=new LocalDatabase(Path.Combine(directory,"finbot.db"));
    database.Initialize();
    var bridge=new FinanceBridge(new FinanceService(database,args.Contains("--receipts")?Path.Combine(directory,"comprovantes"):null));
    string? line;
    while((line=Console.ReadLine())!=null) Console.WriteLine(bridge.Handle(line));
}
finally { if(Directory.Exists(directory))Directory.Delete(directory,true); }
