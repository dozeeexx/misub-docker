import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSQLiteD1 } from '../../server/sqlite-d1.js';
import { StorageFactory, STORAGE_TYPES, SettingsCache } from '../../functions/storage-adapter.js';

let cleanup = [];

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'misub-sqlite-test-'));
  cleanup.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'misub.db');
}

afterEach(() => {
  SettingsCache.clear();
  cleanup.splice(0).forEach(fn => fn());
});

describe('Docker SQLite runtime', () => {
  it('implements the D1 first/all/run shape over SQLite', async () => {
    const db = createSQLiteD1(tempDbPath());

    await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .bind('worker_settings_v1', JSON.stringify({ storageType: 'sqlite' }))
      .run();

    const first = await db.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('worker_settings_v1')
      .first();
    const all = await db.prepare('SELECT key, value FROM settings').all();
    const deleted = await db.prepare('DELETE FROM settings WHERE key = ?')
      .bind('missing')
      .run();
    const batch = await db.batch([
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').bind('batch_a', 'A'),
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').bind('batch_b', 'B')
    ]);
    const rawRows = await db.prepare('SELECT key FROM settings WHERE key LIKE ? ORDER BY key')
      .bind('batch_%')
      .raw();

    expect(JSON.parse(first.value)).toEqual({ storageType: 'sqlite' });
    expect(all.results).toHaveLength(1);
    expect(deleted.success).toBe(true);
    expect(batch).toHaveLength(2);
    expect(batch.every(result => result.success)).toBe(true);
    expect(rawRows).toEqual([['batch_a'], ['batch_b']]);

    db.close();
  });

  it('defaults StorageFactory to SQLite in Docker mode', async () => {
    const db = createSQLiteD1(tempDbPath());
    const env = { MISUB_RUNTIME: 'docker', SQLITE_DB: db, MISUB_DB: db };

    const storageType = await StorageFactory.getStorageType(env);
    const storage = StorageFactory.createAdapter(env);

    await storage.put('worker_settings_v1', { storageType: 'sqlite', FileName: 'MiSub' });
    const settings = await SettingsCache.get(env);

    expect(storageType).toBe(STORAGE_TYPES.SQLITE);
    expect(storage.type).toBe(STORAGE_TYPES.SQLITE);
    expect(settings.storageType).toBe('sqlite');

    db.close();
  });
});
