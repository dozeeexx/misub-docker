#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const command = process.argv[2] || 'help';
const extraArgs = process.argv.slice(3);

function parseDotEnv(content) {
  const parsed = {};
  for (const rawLine of content.split(/\r?\n/)) {
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
}

function loadLocalEnv() {
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) return {};
  try {
    return parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  } catch {
    return {};
  }
}

function composeEnv() {
  const env = { ...process.env };
  // Docker Compose gives shell variables precedence over .env. Hermes and some
  // VPS shells export PORT for unrelated services; do not let that leak here.
  delete env.PORT;
  return env;
}

function run(cmd, args = [], { allowFailure = false, env = process.env } = {}) {
  console.info(`> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env
  });
  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function capture(cmd, args = [], { env = process.env } = {}) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env
  });
  return {
    ok: result.status === 0,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
    status: result.status ?? 1
  };
}

function dockerCompose(args) {
  return run('docker', ['compose', ...args], { env: composeEnv() });
}

function printHelp() {
  console.info(`MiSub Docker VPS helper

Usage:
  npm run misub:vps -- <command>

Commands:
  status        Show git status, compose status, and local health
  health        Curl http://127.0.0.1:${process.env.HOST_PORT || '8787'}/_health
  logs          Tail container logs (pass extra args after --, e.g. -- -f)
  up            docker compose up -d --build
  restart       docker compose restart
  down          docker compose down
  update        Safe one-click upstream update + Docker rebuild
  backup        Create a SQLite-consistent backup under ./data/backups
  verify        Run Docker fork verification and docker compose config
  caddy         Print the recommended Caddy reverse proxy snippet

Notes:
  - This helper intentionally removes shell PORT before Docker/npm commands.
  - Persistent data stays in ./data; never delete it during upgrades.
`);
}

function healthUrl() {
  const localEnv = loadLocalEnv();
  const port = process.env.HOST_PORT || localEnv.HOST_PORT || '8787';
  return `http://127.0.0.1:${port}/_health`;
}

function caddyDomain() {
  const localEnv = loadLocalEnv();
  const rawUrl = process.env.MISUB_PUBLIC_URL
    || process.env.MISUB_CALLBACK_URL
    || localEnv.MISUB_PUBLIC_URL
    || localEnv.MISUB_CALLBACK_URL
    || 'https://your-domain.example';
  try {
    return new URL(rawUrl).host || 'your-domain.example';
  } catch {
    return String(rawUrl).replace(/^https?:\/\//, '').split('/')[0] || 'your-domain.example';
  }
}

function status() {
  run('git', ['status', '--short', '--branch']);
  dockerCompose(['ps']);
  const health = capture('curl', ['-fsS', healthUrl()]);
  if (health.ok) {
    console.info(`health=${health.stdout}`);
  } else {
    console.error(health.stderr || `Health check failed with status ${health.status}`);
    process.exit(health.status);
  }
}

async function backup() {
  const dataDir = path.join(repoRoot, 'data');
  const dbPath = path.join(dataDir, 'misub.db');
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    process.exit(1);
  }

  const backupDir = path.join(dataDir, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  const backupPath = path.join(backupDir, `misub.db.${stamp}.backup`);

  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      await db.backup(backupPath);
      console.info(`SQLite-consistent backup written to ${backupPath}`);
      return;
    } finally {
      db.close();
    }
  } catch (error) {
    console.warn(`SQLite online backup failed, falling back to file copy: ${error?.message || error}`);
  }

  for (const suffix of ['', '-wal', '-shm']) {
    const source = `${dbPath}${suffix}`;
    if (fs.existsSync(source)) {
      const target = path.join(backupDir, `misub.db${suffix}.${stamp}.backup`);
      fs.copyFileSync(source, target);
      console.info(`Copied ${source} -> ${target}`);
    }
  }
}

switch (command) {
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  case 'status':
    status();
    break;
  case 'health':
    run('curl', ['-fsS', healthUrl()]);
    break;
  case 'logs':
    dockerCompose(['logs', '--tail=100', ...extraArgs, 'misub']);
    break;
  case 'up':
    dockerCompose(['up', '-d', '--build']);
    dockerCompose(['ps']);
    break;
  case 'restart':
    dockerCompose(['restart']);
    dockerCompose(['ps']);
    break;
  case 'down':
    dockerCompose(['down']);
    break;
  case 'update':
    run('npm', ['run', 'update:deploy', '--', '--docker-build'], { env: composeEnv() });
    break;
  case 'backup':
    await backup();
    break;
  case 'verify':
    run('npm', ['run', 'sync:verify']);
    dockerCompose(['config']);
    break;
  case 'caddy':
    console.info(`${caddyDomain()} {\n    encode zstd gzip\n    header {\n        Strict-Transport-Security \"max-age=31536000; includeSubDomains\"\n        X-Content-Type-Options \"nosniff\"\n        Referrer-Policy \"strict-origin-when-cross-origin\"\n        Permissions-Policy \"camera=(), microphone=(), geolocation=()\"\n        X-Robots-Tag \"noindex, nofollow, noarchive, nosnippet\"\n    }\n    reverse_proxy 127.0.0.1:8787\n}`);
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    printHelp();
    process.exit(1);
}
