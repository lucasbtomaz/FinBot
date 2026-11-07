using Microsoft.Data.Sqlite;
using FinBot.Core;
namespace FinBot.Infrastructure;

public sealed class LocalDatabase
{
    private readonly string connectionString;
    private readonly string databasePath;
    public static string DefaultPath => ResolveDesktopPath(Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FinBot", "data"));
    public static string ResolveDesktopPath(string directory)
    {
        var current = Path.Combine(directory, "finbot-desktop.db");
        if (File.Exists(current)) return current;
        var previous = Path.Combine(directory, "finbot.db");
        // Mantém instalações .NET anteriores; nunca reutiliza o esquema Python.
        return File.Exists(previous) && !IsLegacyPython(previous) ? previous : current;
    }
    private static bool IsLegacyPython(string path)
    {
        using var c = new SqliteConnection(new SqliteConnectionStringBuilder {
            DataSource = path, Mode = SqliteOpenMode.ReadOnly, Pooling = false
        }.ToString());
        c.Open();
        using var command = c.CreateCommand();
        command.CommandText = "PRAGMA table_info(accounts)";
        using var reader = command.ExecuteReader();
        while (reader.Read()) if (reader.GetString(1) == "profile_id") return true;
        return false;
    }

    public LocalDatabase(string path)
    {
        databasePath = Path.GetFullPath(path);
        Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);
        connectionString = new SqliteConnectionStringBuilder {
            DataSource = databasePath, ForeignKeys = true, Pooling = false
        }.ToString();
    }
    public void Initialize()
    {
        if (File.Exists(databasePath) && IsLegacyPython(databasePath)) throw new InvalidOperationException("Banco da versão Python detectado. Use o banco separado do aplicativo desktop.");
        using var connection = Open();
        using (var check = connection.CreateCommand())
        {
            check.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('accounts','finance_migrations')";
            var tableCount = Convert.ToInt32(check.ExecuteScalar());
            var needsBackup = tableCount == 1;
            if (tableCount == 2) {
                check.CommandText = "SELECT COALESCE(MAX(version),0) FROM finance_migrations";
                needsBackup = Convert.ToInt32(check.ExecuteScalar()) < 7;
            }
            if (needsBackup)
            {
                var backupFolder = Path.Combine(Path.GetDirectoryName(databasePath)!, "backups");
                Directory.CreateDirectory(backupFolder);
                using var backup = new SqliteConnection(new SqliteConnectionStringBuilder {
                    DataSource = Path.Combine(backupFolder, $"antes-lancamentos-{Guid.NewGuid():N}.db"), Pooling = false
                }.ToString());
                backup.Open();
                connection.BackupDatabase(backup);
            }
        }
        using var transaction = connection.BeginTransaction();
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY CHECK(version = 1));
            INSERT OR IGNORE INTO schema_version(version) VALUES(1);
            CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, opening_cents INTEGER NOT NULL DEFAULT 0);
            """ + FinanceSchema.Sql;
        command.ExecuteNonQuery();
        FinanceService.SyncReserveInvestments(connection,transaction);
        transaction.Commit();
    }
    public DashboardSummary ReadSummary()
    {
        if (File.Exists(databasePath) && IsLegacyPython(databasePath)) throw new InvalidOperationException("Banco da versão Python detectado. Use o banco separado do aplicativo desktop.");
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COALESCE(SUM(opening_cents),0)+(SELECT COALESCE(SUM(amount_cents),0) FROM cash_movements), COUNT(*) FROM accounts";
        using var reader = command.ExecuteReader();
        reader.Read();
        return new(reader.GetInt64(0), reader.GetInt64(1));
    }
    internal SqliteConnection Open()
    {
        var connection = new SqliteConnection(connectionString);
        connection.Open();
        return connection;
    }
}
