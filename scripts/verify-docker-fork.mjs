import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

function rel(file) {
  return path.join(repoRoot, file);
}

function exists(file) {
  return fs.existsSync(rel(file));
}

function read(file) {
  try {
    return fs.readFileSync(rel(file), 'utf8');
  } catch {
    errors.push(`Missing required file: ${file}`);
    return '';
  }
}

function requireFile(file) {
  if (!exists(file)) {
    errors.push(`Missing required file: ${file}`);
  }
}

function requireIncludes(file, needle, label = needle) {
  const content = read(file);
  if (!content.includes(needle)) {
    errors.push(`${file} must contain ${label}`);
  }
}

function requireJson(file, validate) {
  try {
    const parsed = JSON.parse(read(file));
    validate(parsed);
  } catch (error) {
    errors.push(`${file} is not valid JSON: ${error.message}`);
  }
}

function runGitDiffCheck() {
  if (!exists('.git')) return;
  const result = spawnSync('git', ['diff', '--check'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    warnings.push('git diff --check reported whitespace issues.');
    if (result.stdout) warnings.push(result.stdout.trim());
    if (result.stderr) warnings.push(result.stderr.trim());
  }
}

[
  'server/index.js',
  'server/runtime-env.js',
  'server/sqlite-d1.js',
  'server/scheduler.js',
  'Dockerfile',
  'docker-compose.yml',
  '.dockerignore',
  '.env.example',
  'DOCKER.md',
  'MAINTENANCE.md',
  'tests/unit/docker-sqlite-runtime.test.js'
].forEach(requireFile);

requireJson('package.json', pkg => {
  if (pkg.scripts?.['start:docker'] !== 'node server/index.js') {
    errors.push('package.json scripts.start:docker must be "node server/index.js".');
  }
  for (const script of ['sync:setup', 'sync:migrate', 'sync:upstream', 'sync:verify', 'sync:test']) {
    if (!pkg.scripts?.[script]) {
      errors.push(`package.json must define scripts.${script}.`);
    }
  }
  if (!pkg.dependencies?.['better-sqlite3']) {
    errors.push('package.json must depend on better-sqlite3.');
  }
});

requireIncludes('server/index.js', "import http from 'node:http'", 'Node HTTP server entry');
requireIncludes('server/index.js', "from '../functions/[[path]].js'", 'Pages Functions adapter import');
requireIncludes('server/index.js', "pathname === '/_health'", '/_health endpoint');
requireIncludes('server/index.js', 'env.ASSETS = { fetch: serveAsset }', 'static asset adapter');
requireIncludes('server/index.js', 'startScheduler(env)', 'container scheduler startup');

requireIncludes('server/runtime-env.js', "MISUB_RUNTIME: 'docker'", 'Docker runtime marker');
requireIncludes('server/runtime-env.js', "STORAGE_TYPE: 'sqlite'", 'SQLite storage marker');
requireIncludes('server/runtime-env.js', 'Missing required Docker environment variable: COOKIE_SECRET', 'COOKIE_SECRET startup guard');
requireIncludes('server/runtime-env.js', 'SYSTEM_ADMIN_PASSWORD', 'admin password persistence');
requireIncludes('server/runtime-env.js', 'SYSTEM_COOKIE_SECRET', 'cookie secret persistence');

requireIncludes('server/sqlite-d1.js', "from 'better-sqlite3'", 'better-sqlite3 import');
requireIncludes('server/sqlite-d1.js', 'journal_mode = WAL', 'SQLite WAL mode');
requireIncludes('server/sqlite-d1.js', 'busy_timeout = 5000', 'SQLite busy timeout');
requireIncludes('server/sqlite-d1.js', 'wal_checkpoint(TRUNCATE)', 'WAL checkpoint on close');
requireIncludes('server/sqlite-d1.js', 'class SQLiteD1PreparedStatement', 'D1-compatible prepared statements');

requireIncludes('server/scheduler.js', 'handleCronTrigger', 'cron trigger reuse');
requireIncludes('server/scheduler.js', 'maybeRunScheduledTasks', 'scheduled task reuse');
requireIncludes('server/scheduler.js', 'CRON_INTERVAL_SECONDS', 'configurable scheduler interval');

requireIncludes('functions/storage-adapter.js', "SQLITE: 'sqlite'", 'SQLite storage type');
requireIncludes('functions/storage-adapter.js', 'isDockerRuntime', 'Docker runtime detection');
requireIncludes('functions/storage-adapter.js', 'SQLiteStorageAdapter', 'SQLite adapter');
requireIncludes('functions/modules/utils.js', 'SYSTEM_ADMIN_PASSWORD', 'SQLite-backed auth password');
requireIncludes('functions/modules/utils.js', 'SYSTEM_COOKIE_SECRET', 'SQLite-backed cookie secret');
requireIncludes('functions/modules/api-router.js', 'Docker SQLite runtime does not use Cloudflare KV/D1 migration', 'Docker migration guard');
requireIncludes('functions/modules/api-handler.js', 'runtime: isDockerRuntime(env)', 'Docker runtime API metadata');

requireIncludes('Dockerfile', 'FROM node:22-bookworm-slim', 'Node 22 runtime');
requireIncludes('Dockerfile', 'COPY --from=builder /app/server ./server', 'server copied to runtime image');
requireIncludes('Dockerfile', 'COPY --from=builder /app/functions ./functions', 'functions copied to runtime image');
requireIncludes('Dockerfile', 'DATABASE_PATH=/data/misub.db', 'default SQLite path');
requireIncludes('Dockerfile', 'CMD ["node", "server/index.js"]', 'direct Docker startup command');

requireIncludes('docker-compose.yml', 'PORT: 8787', 'fixed container port');
requireIncludes('docker-compose.yml', './data:/data', 'persistent data volume');
requireIncludes('docker-compose.yml', '/_health', 'Compose healthcheck');
requireIncludes('docker-compose.yml', 'stop_grace_period: 60s', 'graceful shutdown window');

requireIncludes('.env.example', 'ADMIN_PASSWORD=', 'admin password template');
requireIncludes('.env.example', 'COOKIE_SECRET=', 'cookie secret template');
requireIncludes('.env.example', 'DATABASE_PATH=/data/misub.db', 'database path template');

requireIncludes('src/constants/default-settings.js', "storageType: 'sqlite'", 'Docker default storage type');
requireIncludes('src/composables/useSettingsLogic.js', "'sqlite'", 'frontend SQLite storage type validation');
requireIncludes('src/components/settings/sections/SystemSettings.vue', 'SQLite (Docker)', 'frontend SQLite option');

requireIncludes('.gitattributes', 'merge=keepDocker', 'Docker fork merge driver attributes');
requireIncludes('scripts/migrate-snapshot-to-fork.mjs', 'DOCKER_FORK_PATHS', 'snapshot migration file list');
requireIncludes('scripts/migrate-snapshot-to-fork.mjs', 'cloneWithRetries', 'snapshot migration clone flow');
requireIncludes('scripts/migrate-snapshot-to-fork.mjs', 'sync:test', 'snapshot migration verification');

runGitDiffCheck();

if (warnings.length > 0) {
  console.warn('\nDocker fork verification warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error('\nDocker fork verification failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.info('Docker fork verification passed.');
