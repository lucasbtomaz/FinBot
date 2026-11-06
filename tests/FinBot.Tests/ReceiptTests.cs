using FinBot.Core;
using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public sealed class ReceiptTests:IDisposable{
 readonly string folder=Path.Combine(Path.GetTempPath(),"FinBotReceipts",Guid.NewGuid().ToString());
 string Root=>Path.Combine(folder,"comprovantes");
 FinanceService Service(string? root=null){var db=new LocalDatabase(Path.Combine(folder,"test.db"));db.Initialize();return new(db,root??Root);}
 static FinanceCommand C(string action)=>new(){Action=action,RequestId=Guid.NewGuid().ToString()};
 static string Pdf=>Convert.ToBase64String("%PDF-1.4\nteste\n%%EOF"u8.ToArray());
 (FinanceService Service,FinanceCommand Payment) Setup(){
  var s=Service();var a=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=100000});
  var i=s.Execute(C("addItem") with{Name="Consulta",Kind="pagar",Date="2025-12-01",AmountCents=20000});
  return(s,C("settleItem") with{TargetId=i,AccountId=a,AmountCents=5000,Date="2025-11-20",ReceiptName="teste.pdf",ReceiptData=Pdf});
 }
 [Fact] public void ReceiptUsesPaymentMonthAndSurvivesReversalWithoutDuplicates(){
  var(s,cmd)=Setup();var payment=s.Execute(cmd);Assert.Equal(payment,s.Execute(cmd));
  var snap=s.Snapshot("2025-12");var path=Assert.Single(snap.Payments).ReceiptPath;
  Assert.StartsWith(Path.Combine(Root,"2025","NOVEMBRO"),path);Assert.Equal(Convert.FromBase64String(Pdf),File.ReadAllBytes(path));
  Assert.Single(Directory.GetFiles(Root,"*",SearchOption.AllDirectories));Assert.Equal(95000,snap.AvailableCents);
  Assert.Equal(path,Service().ReceiptPath(payment));
  s.Execute(C("reversePayment") with{TargetId=payment});Assert.True(File.Exists(path));Assert.Equal(100000,s.Snapshot("2025-12").AvailableCents);
  File.Delete(path);Assert.Throws<ArgumentException>(()=>s.ReceiptPath(payment));
 }
 [Theory][InlineData("invalid","teste.pdf")][InlineData("YWJj","teste.pdf")][InlineData("JVBERi0xLjQ=","teste.exe")]
 public void InvalidReceiptDoesNotRegisterPayment(string content,string name){
  var(s,cmd)=Setup();Assert.Throws<ArgumentException>(()=>s.Execute(cmd with{ReceiptData=content,ReceiptName=name}));
  var snap=s.Snapshot("2025-12");Assert.Empty(snap.Payments);Assert.Equal(100000,snap.AvailableCents);Assert.Equal(20000,snap.ToPayCents);
 }
 [Fact] public void StorageFailureRollsBackAndSameRequestCanBeRetried(){
  var(s,cmd)=Setup();File.WriteAllText(Root,"Arquivo impedindo a criação da pasta");
  Assert.Throws<ArgumentException>(()=>s.Execute(cmd));Assert.Empty(s.Snapshot("2025-12").Payments);
  Assert.Equal(100000,s.Snapshot("2025-12").AvailableCents);
  File.Delete(Root);s.Execute(cmd);Assert.Single(s.Snapshot("2025-12").Payments);
 }
 [Theory][InlineData("payItem")][InlineData("payInvoice")]
 public void CardPaymentWithoutReceiptKeepsExpenseUnchanged(string action){
  var s=Service();var account=s.Execute(C("addAccount") with{Name="Conta",Kind="conta",AmountCents=10000});
  var card=s.Execute(C("addCard") with{Name="Inter"});
  s.Execute(C("addPurchase") with{Name="Compra",CardId=card,Date="2025-11-01",AmountCents=1000});
  var before=s.Snapshot("2025-11");
  var cmd=C(action) with{TargetId=action=="payItem"?before.Items.Single().Id:before.Invoices.Single().Id,AccountId=account,AmountCents=1000,Date="2025-11-20"};
  s.Execute(cmd);
  var after=s.Snapshot("2025-11");Assert.Equal(before.ExpenseCents,after.ExpenseCents);Assert.Equal(0,after.ToPayCents);Assert.Empty(Assert.Single(after.Payments).ReceiptPath);
 }
 [Fact] public void ReceivingDoesNotRequireProof(){
  var s=Service();var account=s.Execute(C("addAccount") with{Name="Conta",Kind="conta"});
  var item=s.Execute(C("addItem") with{Name="Receita",Kind="receber",Date="2025-11-01",AmountCents=1000});
  s.Execute(C("settleItem") with{AccountId=account,TargetId=item,Date="2025-11-01",AmountCents=1000});
  Assert.Equal(1000,s.Snapshot("2025-11").AvailableCents);Assert.Empty(Assert.Single(s.Snapshot("2025-11").Payments).ReceiptPath);
 }
 [Fact] public void MigrationPreservesOldPaymentsWithoutRequiringRetroactiveFiles(){
  var(s,cmd)=Setup();s.Execute(cmd);
  using(var c=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=Path.Combine(folder,"test.db"),Pooling=false}.ToString())){
   c.Open();using var q=c.CreateCommand();q.CommandText="DROP TABLE payment_receipts;DELETE FROM finance_migrations WHERE version>=6";q.ExecuteNonQuery();
  }
  var snap=Service().Snapshot("2025-11");Assert.Empty(Assert.Single(snap.Payments).ReceiptPath);Service();
  Assert.Single(Directory.GetFiles(Path.Combine(folder,"backups"),"*.db"));
 }
 public void Dispose(){if(Directory.Exists(folder))Directory.Delete(folder,true);}
}
