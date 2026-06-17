import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DEFAULT_SCHEMA = `
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_updated_at ON subscriptions(updated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);
`;

function ensureDatabaseDirectory(databasePath) {
    const directory = path.dirname(databasePath);
    fs.mkdirSync(directory, { recursive: true });
}

function normalizeInfo(info) {
    return {
        changed_db: false,
        changes: info?.changes ?? 0,
        duration: 0,
        last_row_id: info?.lastInsertRowid != null ? Number(info.lastInsertRowid) : 0,
        rows_read: 0,
        rows_written: info?.changes ?? 0,
        size_after: 0
    };
}

class SQLiteD1PreparedStatement {
    constructor(statement) {
        this.statement = statement;
        this.params = [];
    }

    bind(...params) {
        this.params = params;
        return this;
    }

    first(columnName) {
        const row = this.statement.get(...this.params);
        if (!row) return null;
        if (columnName) return row[columnName] ?? null;
        return row;
    }

    all() {
        const rows = this.statement.all(...this.params);
        return {
            results: rows,
            success: true,
            meta: {
                changed_db: false,
                changes: 0,
                duration: 0,
                rows_read: rows.length,
                rows_written: 0
            }
        };
    }

    run() {
        const info = this.statement.run(...this.params);
        return {
            success: true,
            meta: normalizeInfo(info)
        };
    }

    raw() {
        try {
            return this.statement.raw(true).all(...this.params);
        } finally {
            this.statement.raw(false);
        }
    }
}

export class SQLiteD1Database {
    constructor(databasePath) {
        this.databasePath = databasePath;
        ensureDatabaseDirectory(databasePath);
        this.db = new Database(databasePath);
        this.db.pragma('busy_timeout = 5000');
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.db.exec(DEFAULT_SCHEMA);
    }

    prepare(sql) {
        return new SQLiteD1PreparedStatement(this.db.prepare(sql));
    }

    async exec(sql) {
        this.db.exec(sql);
        return {
            count: 1,
            duration: 0
        };
    }

    async batch(statements = []) {
        const results = [];
        const runBatch = this.db.transaction(() => {
            for (const statement of statements) {
                results.push(statement.run());
            }
        });
        runBatch();
        return results;
    }

    close() {
        if (!this.db?.open) return;
        try {
            this.db.pragma('wal_checkpoint(TRUNCATE)');
        } catch (error) {
            console.warn('[SQLite] WAL checkpoint before close failed:', error?.message || error);
        } finally {
            this.db.close();
        }
    }
}

export function createSQLiteD1(databasePath = '/data/misub.db') {
    return new SQLiteD1Database(databasePath);
}
