using FinBot.Infrastructure;
using Microsoft.Data.Sqlite;
using Xunit;
namespace FinBot.Tests;
public sealed class LocalDatabaseTests : IDisposable
{
    private readonly string folder = Path.Combine(Path.GetTempPath(), "FinBotTests", Guid.NewGuid().ToString());
    private string DatabasePath => Path.Combine(folder, "data", "finbot.db");
    [Fact]
    public void NewDatabaseStartsEmpty()
    {
        var database = new LocalDatabase(DatabasePath);
        database.Initialize();
        Assert.Equal(0, database.ReadSummary().BalanceCents);
        Assert.Equal(0, database.ReadSummary().AccountCount);
        Assert.True(File.Exists(DatabasePath));
    }
    [Fact]
    public void ReinitializePreservesExactCents()
    {
        var database = new LocalDatabase(DatabasePath);
        database.Initialize();
        using (var connection = new SqliteConnection(new SqliteConnectionStringBuilder {
            DataSource = DatabasePath, Pooling = false }.ToString()))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "INSERT INTO accounts VALUES ('1', 'Conta de teste', 12345)";
            command.ExecuteNonQuery();
        }
        var reopened = new LocalDatabase(DatabasePath);
        reopened.Initialize();
        Assert.Equal(12345, reopened.ReadSummary().BalanceCents);
        Assert.Equal(1, reopened.ReadSummary().AccountCount);
    }
    public void Dispose() { if (Directory.Exists(folder)) Directory.Delete(folder, true); }
}
