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

function runBuiltinRulesVerify() {
  const script = rel('scripts/verify-builtin-rules.mjs');
  if (!fs.existsSync(script)) {
    errors.push('Missing required file: scripts/verify-builtin-rules.mjs');
    return;
  }

  const result = spawnSync(process.execPath, [script, '--quiet'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    errors.push('Built-in subscription rules verification failed; country/region auto node groups may have been reintroduced or generated configs are inconsistent.');
    if (result.stdout) errors.push(result.stdout.trim());
    if (result.stderr) errors.push(result.stderr.trim());
  }
}

function readLocalEnvValues() {
  const envPath = rel('.env');
  if (!fs.existsSync(envPath)) return {};
  try {
    const parsed = {};
    for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const index = line.indexOf('=');
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      parsed[key] = value;
    }
    return parsed;
  } catch {
    return {};
  }
}

function localPublicDomain() {
  const env = readLocalEnvValues();
  const rawUrl = env.MISUB_PUBLIC_URL || env.MISUB_CALLBACK_URL || '';
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl).host;
  } catch {
    return String(rawUrl).replace(/^https?:\/\//, '').split('/')[0];
  }
}

function runPersonalDomainLeakCheck() {
  if (!exists('.git')) return;
  const deploymentDomain = localPublicDomain();
  if (!deploymentDomain || deploymentDomain === 'your-domain.example') return;
  const result = spawnSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  if (result.status !== 0) return;
  const leakedFiles = [];
  for (const file of result.stdout.split(/\r?\n/).filter(Boolean)) {
    let content;
    try {
      content = fs.readFileSync(rel(file), 'utf8');
    } catch {
      continue;
    }
    if (content.includes(deploymentDomain)) {
      leakedFiles.push(file);
    }
  }
  if (leakedFiles.length > 0) {
    errors.push(`Tracked files must not hard-code the local deployment domain; found in: ${leakedFiles.join(', ')}`);
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
  '.github/workflows/fork-sync.yml',
  'scripts/update-selfhost.mjs',
  'scripts/verify-builtin-rules.mjs',
  'functions/modules/subscription/official-acl4ssr-refresh.js',
  'src/shared/acl4ssr-official-flat-presets.js',
  'scripts/misub-vps.mjs',
  'deployment/caddy/misub.caddy',
  'tests/unit/docker-sqlite-runtime.test.js'
].forEach(requireFile);

requireJson('package.json', pkg => {
  if (pkg.name !== 'misub-docker') {
    errors.push('package.json name must be "misub-docker".');
  }
  if (pkg.scripts?.['start:docker'] !== 'node server/index.js') {
    errors.push('package.json scripts.start:docker must be "node server/index.js".');
  }
  for (const script of ['sync:setup', 'sync:migrate', 'sync:upstream', 'sync:verify', 'rules:verify', 'sync:test', 'misub:vps', 'misub:status', 'misub:health', 'misub:logs', 'misub:backup', 'misub:update', 'update:selfhost', 'update:deploy']) {
    if (!pkg.scripts?.[script]) {
      errors.push(`package.json must define scripts.${script}.`);
    }
  }
  if (!pkg.scripts?.['update:deploy']?.includes('--deploy')) {
    errors.push('package.json scripts.update:deploy must pass --deploy.');
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
requireIncludes('server/scheduler.js', 'maybeRefreshOfficialAcl4ssrFlatPresets', 'scheduled official ACL4SSR flat preset refresh');

requireIncludes('index.html', '<title>MiSub Docker</title>', 'MiSub Docker document title');
requireIncludes('index.html', 'content="MiSub Docker"', 'MiSub Docker Open Graph title/site name');
requireIncludes('index.html', 'name="robots" content="noindex, nofollow, noarchive, nosnippet"', 'HTML robots noindex meta');
requireIncludes('public/robots.txt', 'Disallow: /', 'robots.txt disallow rule');
requireIncludes('src/i18n/messages.js', "name: 'MiSub Docker'", 'MiSub Docker app display name');
requireIncludes('src/App.vue', 'MiSub Docker', 'MiSub Docker runtime title');
requireIncludes('src/router/index.js', 'MiSub Docker', 'MiSub Docker route title');

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
requireIncludes('docker-compose.yml', 'user: "${PUID:-1000}:${PGID:-1000}"', 'non-root container user');
requireIncludes('docker-compose.yml', '${BIND_ADDRESS:-127.0.0.1}:${HOST_PORT:-8787}:8787', 'localhost-first host port binding');
requireIncludes('docker-compose.yml', 'container_name: misub-docker', 'MiSub Docker container name');
requireIncludes('docker-compose.yml', './data:/data', 'persistent data volume');
requireIncludes('docker-compose.yml', '/_health', 'Compose healthcheck');
requireIncludes('docker-compose.yml', 'stop_grace_period: 60s', 'graceful shutdown window');

requireIncludes('docker-compose.yml', 'CRON_RUN_ON_START', 'container scheduler startup option');
requireIncludes('docker-compose.yml', 'ACL4SSR_TEMPLATE_REFRESH_ENABLED', 'official ACL4SSR flat preset refresh toggle');
requireIncludes('docker-compose.yml', 'ACL4SSR_TEMPLATE_REFRESH_INTERVAL_SECONDS', 'official ACL4SSR flat preset refresh interval');
requireIncludes('docker-compose.yml', 'ACL4SSR_TEMPLATE_REFRESH_RUN_ON_START', 'official ACL4SSR flat preset startup refresh');

requireIncludes('.env.example', 'ADMIN_PASSWORD=', 'admin password template');
requireIncludes('.env.example', 'COOKIE_SECRET=', 'cookie secret template');
requireIncludes('.env.example', 'PUID=1000', 'container user id template');
requireIncludes('.env.example', 'PGID=1000', 'container group id template');
requireIncludes('.env.example', 'BIND_ADDRESS=127.0.0.1', 'localhost bind address template');
requireIncludes('.env.example', 'HOST_PORT=8787', 'host port template');
requireIncludes('.env.example', 'DATABASE_PATH=/data/misub.db', 'database path template');
requireIncludes('.env.example', 'ACL4SSR_TEMPLATE_REFRESH_ENABLED=true', 'official ACL4SSR flat preset refresh template');
requireIncludes('.env.example', 'ACL4SSR_TEMPLATE_REFRESH_INTERVAL_SECONDS=86400', 'official ACL4SSR flat preset refresh interval template');
requireIncludes('.env.example', 'ACL4SSR_TEMPLATE_REFRESH_RUN_ON_START=true', 'official ACL4SSR flat preset startup refresh template');

requireIncludes('src/constants/default-settings.js', "storageType: 'sqlite'", 'Docker default storage type');
requireIncludes('src/composables/useSettingsLogic.js', "'sqlite'", 'frontend SQLite storage type validation');
requireIncludes('src/components/settings/sections/SystemSettings.vue', 'SQLite (Docker)', 'frontend SQLite option');

requireIncludes('.gitattributes', 'merge=keepDocker', 'Docker fork merge driver attributes');
requireIncludes('.gitattributes', '/scripts/update-selfhost.mjs merge=keepDocker', 'one-click update merge protection');
requireIncludes('.gitattributes', '/scripts/misub-vps.mjs merge=keepDocker', 'VPS helper merge protection');
requireIncludes('.gitattributes', '/scripts/verify-builtin-rules.mjs merge=keepDocker', 'built-in rules verifier merge protection');
requireIncludes('.gitattributes', '/src/constants/transform-assets.js merge=keepDocker', 'transform preset list merge protection');
requireIncludes('.gitattributes', '/src/shared/acl4ssr-official-flat-presets.js merge=keepDocker', 'official ACL4SSR flat preset allowlist merge protection');
requireIncludes('.gitattributes', '/functions/modules/subscription/transform-template-cache.js merge=keepDocker', 'official ACL4SSR template cache normalization merge protection');
requireIncludes('.gitattributes', '/functions/modules/subscription/official-acl4ssr-refresh.js merge=keepDocker', 'official ACL4SSR refresh worker merge protection');
requireIncludes('.gitattributes', '/deployment/caddy/** merge=keepDocker', 'Caddy deployment template merge protection');
requireIncludes('.gitattributes', '/.gitattributes merge=keepDocker', 'self-protecting merge attributes');
requireIncludes('scripts/misub-vps.mjs', 'delete env.PORT', 'VPS helper must ignore shell PORT');
requireIncludes('scripts/misub-vps.mjs', 'loadLocalEnv', 'VPS helper reads local .env without committing it');
requireIncludes('scripts/misub-vps.mjs', 'update:deploy', 'VPS helper update command');
requireIncludes('scripts/misub-vps.mjs', 'data/backups', 'VPS helper backup target');
requireIncludes('scripts/misub-vps.mjs', 'your-domain.example', 'generic Caddy domain fallback');
requireIncludes('deployment/caddy/misub.caddy', 'your-domain.example', 'generic Caddy domain template');
requireIncludes('deployment/caddy/misub.caddy', 'reverse_proxy 127.0.0.1:8787', 'Caddy proxy target');
requireIncludes('deployment/caddy/misub.caddy', 'Strict-Transport-Security', 'Caddy HSTS header');
requireIncludes('deployment/caddy/misub.caddy', 'X-Robots-Tag', 'Caddy robots noindex header');
requireIncludes('scripts/misub-vps.mjs', 'Strict-Transport-Security', 'VPS helper Caddy security headers');
requireIncludes('scripts/misub-vps.mjs', 'X-Robots-Tag', 'VPS helper robots noindex header');
requireIncludes('scripts/migrate-snapshot-to-fork.mjs', 'DOCKER_FORK_PATHS', 'snapshot migration file list');
requireIncludes('scripts/migrate-snapshot-to-fork.mjs', 'cloneWithRetries', 'snapshot migration clone flow');
requireIncludes('scripts/migrate-snapshot-to-fork.mjs', 'sync:test', 'snapshot migration verification');
requireIncludes('scripts/update-selfhost.mjs', 'backupDatabase', 'one-click database backup');
requireIncludes('scripts/update-selfhost.mjs', 'db.backup(targetPath)', 'SQLite-consistent update backup');
requireIncludes('scripts/update-selfhost.mjs', 'copyDatabaseFilesForFallback', 'SQLite backup fallback copy');
requireIncludes('scripts/update-selfhost.mjs', 'sync:upstream', 'one-click upstream sync');
requireIncludes('scripts/update-selfhost.mjs', '--ff-only', 'one-click fast-forward merge');
requireIncludes('scripts/update-selfhost.mjs', '--deploy', 'one-click deploy option');
requireIncludes('scripts/update-selfhost.mjs', '--skip-docker', 'one-click local dry-run option');
requireIncludes('MAINTENANCE.md', 'Upstream Upgrade Notes', 'upstream upgrade guidance mapping');
requireIncludes('MAINTENANCE.md', 'unsafe for this Docker fork because it discards the Docker runtime', 'reset warning');
requireIncludes('MAINTENANCE.md', 'Official ACL4SSR no-country preset allowlist', 'official ACL4SSR flat preset maintenance invariant');
requireIncludes('scripts/sync-upstream.mjs', "'diff', '--binary'", 'sanitized upstream tree diff');
requireIncludes('scripts/sync-upstream.mjs', "'apply', '--index', '--3way'", 'sanitized upstream patch apply');
requireIncludes('scripts/sync-upstream.mjs', 'leaked editor settings are not reintroduced', 'history leak prevention help text');
requireIncludes('scripts/sync-upstream.mjs', 'Do not update refs/remotes/upstream', 'avoid persistent upstream leaked history refs');
requireIncludes('scripts/sync-upstream.mjs', "'--refmap='", 'disable default upstream remote-tracking ref updates');
requireIncludes('scripts/sync-upstream.mjs', "'update-ref', '-d', upstreamRef", 'remove temporary upstream snapshot ref');
requireIncludes('scripts/sync-upstream.mjs', "'scripts/verify-builtin-rules.mjs'", 'built-in rules verifier protected from upstream snapshots');
requireIncludes('scripts/sync-upstream.mjs', "'src/constants/transform-assets.js'", 'transform preset list protected from upstream snapshots');
requireIncludes('scripts/sync-upstream.mjs', "'src/shared/acl4ssr-official-flat-presets.js'", 'official ACL4SSR flat preset allowlist protected from upstream snapshots');
requireIncludes('scripts/sync-upstream.mjs', "'functions/modules/subscription/transform-template-cache.js'", 'official ACL4SSR template cache normalization protected from upstream snapshots');
requireIncludes('scripts/sync-upstream.mjs', "'functions/modules/subscription/official-acl4ssr-refresh.js'", 'official ACL4SSR refresh worker protected from upstream snapshots');
requireIncludes('scripts/update-selfhost.mjs', 'sanitized upstream snapshot', 'one-click update sanitization wording');
requireIncludes('scripts/verify-builtin-rules.mjs', 'COUNTRY_GROUP_LABELS', 'built-in country group regression guard');
requireIncludes('scripts/verify-builtin-rules.mjs', 'REMOTE_SOURCES.ADS?.clash', 'built-in remote rule source guard');
requireIncludes('scripts/verify-builtin-rules.mjs', 'Sublink Worker presets must stay removed', 'Sublink Worker removal guard');
requireIncludes('scripts/verify-builtin-rules.mjs', 'checkClashConfig', 'Clash built-in rules structural check');
requireIncludes('scripts/verify-builtin-rules.mjs', 'checkSingboxConfig', 'sing-box built-in rules structural check');
requireIncludes('scripts/verify-builtin-rules.mjs', 'OFFICIAL_ACL4SSR_FLAT_PRESETS', 'official ACL4SSR flat preset regression guard');
requireIncludes('scripts/verify-builtin-rules.mjs', 'isOfficialAcl4ssrFlatPresetUrl', 'official ACL4SSR flat preset allowlist guard');
requireIncludes('src/constants/transform-assets.js', 'OFFICIAL_ACL4SSR_FLAT_PRESET_ASSETS', 'official ACL4SSR flat preset assets');
requireIncludes('src/shared/acl4ssr-official-flat-presets.js', 'ACL4SSR_Online_NoAuto.ini', 'official ACL4SSR no-country preset allowlist');
requireIncludes('functions/modules/subscription/transform-template-cache.js', 'normalizeOfficialAcl4ssrTemplateText', 'official ACL4SSR relative rules normalization');
requireIncludes('functions/modules/subscription/official-acl4ssr-refresh.js', 'refreshOfficialAcl4ssrFlatPresets', 'scheduled official ACL4SSR flat preset refresh');

requireIncludes('.github/workflows/fork-sync.yml', "vars.ENABLE_UPSTREAM_MAIN_MIRROR == 'true'", 'fork mirror opt-in guard');
requireIncludes('.github/workflows/fork-sync.yml', 'npm run sync:upstream', 'Docker sync warning');

runPersonalDomainLeakCheck();
runGitDiffCheck();
runBuiltinRulesVerify();

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
