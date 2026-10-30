namespace FinBot.Infrastructure;
internal static class FinanceSchema
{
    internal const string Sql = """
        CREATE TABLE IF NOT EXISTS finance_migrations(version INTEGER PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS account_details(
            account_id TEXT PRIMARY KEY REFERENCES accounts(id), kind TEXT NOT NULL CHECK(kind IN ('conta','reserva')));
        CREATE TABLE IF NOT EXISTS cards(id TEXT PRIMARY KEY, name TEXT NOT NULL, due_day INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS purchases(id TEXT PRIMARY KEY, name TEXT NOT NULL,
            card_id TEXT NOT NULL REFERENCES cards(id), amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
            count INTEGER NOT NULL, cancelled INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS finance_items(
            id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('pagar','receber')),
            amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
            paid_cents INTEGER NOT NULL DEFAULT 0 CHECK(paid_cents>=0 AND paid_cents<=amount_cents),
            due_date TEXT NOT NULL, category TEXT NOT NULL,
            purchase_id TEXT REFERENCES purchases(id), card_id TEXT REFERENCES cards(id),
            number INTEGER NOT NULL DEFAULT 1, count INTEGER NOT NULL DEFAULT 1,
            cancelled INTEGER NOT NULL DEFAULT 0);
        CREATE INDEX IF NOT EXISTS ix_items_invoice ON finance_items(card_id,due_date);
        CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY, name TEXT NOT NULL,
            account_id TEXT NOT NULL REFERENCES accounts(id), date TEXT NOT NULL,
            amount_cents INTEGER NOT NULL, reversed INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS allocations(payment_id TEXT REFERENCES payments(id),
            item_id TEXT REFERENCES finance_items(id), amount_cents INTEGER NOT NULL,
            PRIMARY KEY(payment_id,item_id));
        CREATE TABLE IF NOT EXISTS cash_movements(id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
            amount_cents INTEGER NOT NULL, date TEXT NOT NULL, payment_id TEXT NOT NULL REFERENCES payments(id));
        CREATE TABLE IF NOT EXISTS finance_requests(id TEXT PRIMARY KEY, payload TEXT NOT NULL, result TEXT NOT NULL);
        INSERT OR IGNORE INTO finance_migrations VALUES(1);

        CREATE TABLE IF NOT EXISTS payment_plans(id TEXT PRIMARY KEY,name TEXT NOT NULL,method TEXT NOT NULL,
            cadence TEXT NOT NULL,base_cents INTEGER NOT NULL CHECK(base_cents>0),start_date TEXT NOT NULL,
            count INTEGER NOT NULL,kind TEXT NOT NULL,category TEXT NOT NULL,cancelled INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS plan_items(plan_id TEXT NOT NULL REFERENCES payment_plans(id),
            item_id TEXT PRIMARY KEY REFERENCES finance_items(id),number INTEGER NOT NULL,UNIQUE(plan_id,number));
        CREATE TABLE IF NOT EXISTS item_details(item_id TEXT PRIMARY KEY REFERENCES finance_items(id),
            method TEXT NOT NULL,base_cents INTEGER NOT NULL,extra_cents INTEGER NOT NULL DEFAULT 0,note TEXT NOT NULL DEFAULT '');
        CREATE TABLE IF NOT EXISTS allocation_reversals(id TEXT PRIMARY KEY,payment_id TEXT NOT NULL REFERENCES payments(id),
            item_id TEXT NOT NULL REFERENCES finance_items(id),amount_cents INTEGER NOT NULL,date TEXT NOT NULL);
        INSERT OR IGNORE INTO finance_migrations VALUES(2);
        CREATE TABLE IF NOT EXISTS investments(id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL,institution TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS investment_values(investment_id TEXT NOT NULL REFERENCES investments(id),month TEXT NOT NULL,
            invested_cents INTEGER NOT NULL CHECK(invested_cents>=0),value_cents INTEGER NOT NULL CHECK(value_cents>=0),PRIMARY KEY(investment_id,month));
        INSERT OR IGNORE INTO finance_migrations VALUES(3);
        CREATE TABLE IF NOT EXISTS receivable_details(item_id TEXT PRIMARY KEY REFERENCES finance_items(id),payer TEXT NOT NULL,confidence TEXT NOT NULL CHECK(confidence IN ('confirmado','incerto')),cadence TEXT NOT NULL);
        INSERT OR IGNORE INTO finance_migrations VALUES(4);
        CREATE TABLE IF NOT EXISTS tax_records(id TEXT PRIMARY KEY,source_type TEXT NOT NULL,source_id TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT '',document TEXT NOT NULL DEFAULT '',category TEXT NOT NULL DEFAULT '',
            note TEXT NOT NULL DEFAULT '',confirmed INTEGER NOT NULL DEFAULT 0,UNIQUE(source_type,source_id));
        INSERT OR IGNORE INTO finance_migrations VALUES(5);
        CREATE TABLE IF NOT EXISTS payment_receipts(payment_id TEXT PRIMARY KEY REFERENCES payments(id),path TEXT NOT NULL);
        INSERT OR IGNORE INTO finance_migrations VALUES(6);
        CREATE TABLE IF NOT EXISTS investment_accounts(investment_id TEXT PRIMARY KEY REFERENCES investments(id),
            account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id));
        INSERT OR IGNORE INTO finance_migrations VALUES(7);

        """;
}
