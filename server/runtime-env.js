import { createSQLiteD1 } from './sqlite-d1.js';

const DEFAULT_DATABASE_PATH = '/data/misub.db';

function cleanEnvValue(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function hasValue(value) {
    return cleanEnvValue(value) !== '';
}

async function readStoredAdminPassword(sqliteDb) {
    try {
        const row = await sqliteDb.prepare('SELECT value FROM settings WHERE key = ?')
            .bind('SYSTEM_ADMIN_PASSWORD')
            .first();
        return cleanEnvValue(row?.value);
    } catch {
        return '';
    }
}

async function validateRequiredEnv(processEnv, sqliteDb) {
    if (!hasValue(processEnv.COOKIE_SECRET)) {
        throw new Error('Missing required Docker environment variable: COOKIE_SECRET.');
    }

    const runtimePassword = cleanEnvValue(processEnv.ADMIN_PASSWORD);
    const storedPassword = await readStoredAdminPassword(sqliteDb);

    if (!runtimePassword && !storedPassword) {
        throw new Error(
            'Missing ADMIN_PASSWORD and no password is stored in SQLite yet. ' +
            'Set ADMIN_PASSWORD for the first Docker startup.'
        );
    }

    if ((runtimePassword || storedPassword) === 'admin') {
        throw new Error('The default admin password is not allowed in Docker runtime. Please set a stronger password.');
    }
}

async function persistRuntimeSecret(sqliteDb, key, value) {
    if (!hasValue(value)) return;
    await sqliteDb.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    `).bind(key, cleanEnvValue(value)).run();
}

export function createWaitUntilQueue() {
    const pending = new Set();

    const waitUntil = (promise) => {
        const tracked = Promise.resolve(promise)
            .catch(error => {
                console.error('[waitUntil] Background task failed:', error);
            })
            .finally(() => {
                pending.delete(tracked);
            });
        pending.add(tracked);
    };

    const drain = async () => {
        await Promise.allSettled(Array.from(pending));
    };

    return { waitUntil, drain, pending };
}

export async function createRuntimeEnv(processEnv = process.env) {
    const databasePath = processEnv.DATABASE_PATH || DEFAULT_DATABASE_PATH;
    const sqliteDb = createSQLiteD1(databasePath);
    await validateRequiredEnv(processEnv, sqliteDb);
    await persistRuntimeSecret(sqliteDb, 'SYSTEM_ADMIN_PASSWORD', processEnv.ADMIN_PASSWORD);
    await persistRuntimeSecret(sqliteDb, 'SYSTEM_COOKIE_SECRET', processEnv.COOKIE_SECRET);

    return {
        ...processEnv,
        MISUB_RUNTIME: 'docker',
        STORAGE_TYPE: 'sqlite',
        ADMIN_PASSWORD: cleanEnvValue(processEnv.ADMIN_PASSWORD),
        COOKIE_SECRET: cleanEnvValue(processEnv.COOKIE_SECRET),
        CORS_ORIGINS: processEnv.CORS_ORIGINS || '',
        DATABASE_PATH: databasePath,
        MISUB_DB: sqliteDb,
        SQLITE_DB: sqliteDb
    };
}

export function closeRuntimeEnv(env) {
    env?.SQLITE_DB?.close?.();
}
