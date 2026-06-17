import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_UPSTREAM_URL = 'https://github.com/imzyb/MiSub.git';

const DOCKER_FORK_PATHS = [
  '.dockerignore',
  '.env.example',
  '.gitattributes',
  'DOCKER.md',
  'Dockerfile',
  'MAINTENANCE.md',
  'docker-compose.yml',
  'functions/modules/api-handler.js',
  'functions/modules/api-router.js',
  'functions/modules/utils.js',
  'functions/storage-adapter.js',
  'package-lock.json',
  'package.json',
  'scripts/migrate-snapshot-to-fork.mjs',
  'scripts/setup-docker-fork-git.mjs',
  'scripts/sync-upstream.mjs',
  'scripts/verify-docker-fork.mjs',
  'server',
  'src/components/settings/sections/SystemSettings.vue',
  'src/composables/useSettingsLogic.js',
  'src/constants/default-settings.js',
  'tests/unit/docker-sqlite-runtime.test.js'
];

function parseArgs(argv) {
  const options = {
    target: '',
    upstreamUrl: DEFAULT_UPSTREAM_URL,
    branch: 'docker-selfhost',
    baseRef: '',
    install: true,
    test: true,
    commit: true,
    fetch: true,
    cloneRetries: 3
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') options.target = argv[++i];
    else if (arg === '--upstream-url') options.upstreamUrl = argv[++i];
    else if (arg === '--branch') options.branch = argv[++i];
    else if (arg === '--base-ref') options.baseRef = argv[++i];
    else if (arg === '--no-install') options.install = false;
    else if (arg === '--no-test') options.test = false;
    else if (arg === '--no-commit') options.commit = false;
    else if (arg === '--no-fetch') options.fetch = false;
    else if (arg === '--clone-retries') options.cloneRetries = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function run(command, args, { cwd = process.cwd(), allowFailure = false, quiet = false } = {}) {
  if (!quiet) console.info(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8'
  });

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function capture(command, args, options = {}) {
  const result = run(command, args, { ...options, quiet: true, allowFailure: true });
  if (result.status !== 0) return '';
  return String(result.stdout || '').trim();
}

function removeCloneTarget(targetRoot, expectedParent) {
  const resolvedTarget = path.resolve(targetRoot);
  const resolvedParent = path.resolve(expectedParent);

  if (resolvedTarget === resolvedParent || !resolvedTarget.startsWith(`${resolvedParent}${path.sep}`)) {
    throw new Error(`Refusing to remove unexpected path: ${resolvedTarget}`);
  }

  fs.rmSync(resolvedTarget, { recursive: true, force: true });
}

function cloneWithRetries(upstreamUrl, targetRoot, retries) {
  const parentDir = path.dirname(targetRoot);
  let lastStatus = 1;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (attempt > 1) {
      console.warn(`Clone failed. Retrying ${attempt}/${retries}...`);
      removeCloneTarget(targetRoot, parentDir);
    }

    const result = run('git', ['clone', upstreamUrl, targetRoot], {
      allowFailure: true
    });

    lastStatus = result.status ?? 1;
    if (result.status === 0) return;
  }

  removeCloneTarget(targetRoot, parentDir);
  console.error(`git clone failed after ${retries} attempt(s).`);
  process.exit(lastStatus);
}

function fetchWithRetries(repoRoot, remote, retries) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (attempt > 1) {
      console.warn(`Fetch failed. Retrying ${attempt}/${retries}...`);
    }

    const result = run('git', ['fetch', remote, '--prune'], {
      cwd: repoRoot,
      allowFailure: true
    });

    if (result.status === 0) return true;
  }

  return false;
}

function ensureLocalGitIdentity(repoRoot) {
  const name = capture('git', ['config', '--get', 'user.name'], { cwd: repoRoot });
  const email = capture('git', ['config', '--get', 'user.email'], { cwd: repoRoot });

  if (!name) {
    run('git', ['config', 'user.name', 'MiSub Docker Maintainer'], { cwd: repoRoot });
  }

  if (!email) {
    run('git', ['config', 'user.email', 'misub-docker@local'], { cwd: repoRoot });
  }
}

function detectBaseRef(sourceDir) {
  const dirName = path.basename(sourceDir);
  const match = dirName.match(/[A-Fa-f0-9]{40}/);
  if (match) return match[0];

  const head = capture('git', ['rev-parse', '--verify', 'HEAD'], { cwd: sourceDir });
  if (head) return head;

  return '';
}

function isEmptyDir(dir) {
  if (!fs.existsSync(dir)) return true;
  return fs.readdirSync(dir).length === 0;
}

function copyPath(sourceRoot, targetRoot, relativePath) {
  const sourcePath = path.join(sourceRoot, relativePath);
  const targetPath = path.join(targetRoot, relativePath);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source path is missing: ${relativePath}`);
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
    errorOnExist: false
  });
}

function printHelp() {
  console.info(`
Usage:
  npm run sync:migrate -- --target <path> [options]

This creates a real upstream clone, creates a Docker maintenance branch, and
copies only the Docker self-hosting fork changes from the current snapshot.

Options:
  --target <path>            New clone path. Required unless default ../MiSub-docker-selfhost is acceptable
  --upstream-url <url>       Upstream Git URL. Default: ${DEFAULT_UPSTREAM_URL}
  --branch <name>            Docker branch name. Default: docker-selfhost
  --base-ref <ref>           Base upstream commit/tag/branch. Auto-detected from the snapshot directory name when possible
  --no-install               Skip npm ci in the new clone
  --no-test                  Skip npm run sync:test in the new clone
  --no-commit                Leave copied changes uncommitted
  --no-fetch                 Do not fetch upstream during sync setup
  --clone-retries <number>   Retry git clone on transient network failures. Default: 3

PowerShell example:
  npm.cmd run sync:migrate -- --target D:\\test\\MiSub-docker-selfhost
`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const sourceRoot = process.cwd();
const defaultTarget = path.resolve(sourceRoot, '..', '..', 'MiSub-docker-selfhost');
const targetRoot = path.resolve(options.target || defaultTarget);
const baseRef = options.baseRef || detectBaseRef(sourceRoot);

if (!fs.existsSync(path.join(sourceRoot, 'package.json'))) {
  console.error('Run this command from the MiSub snapshot root.');
  process.exit(1);
}

if (!isEmptyDir(targetRoot)) {
  console.error(`Target directory already exists and is not empty: ${targetRoot}`);
  console.error('Choose a new --target path so this script cannot overwrite an existing checkout.');
  process.exit(1);
}

if (!baseRef) {
  console.warn('Could not detect the snapshot base commit.');
  console.warn('The branch will be created from the upstream default branch, then Docker files will be copied on top.');
  console.warn('For the cleanest history, pass --base-ref <original-upstream-commit>.');
}

console.info('Creating Docker-maintained upstream clone');
console.info(`- Source snapshot: ${sourceRoot}`);
console.info(`- Target clone:     ${targetRoot}`);
console.info(`- Upstream URL:     ${options.upstreamUrl}`);
console.info(`- Docker branch:    ${options.branch}`);
console.info(`- Base ref:         ${baseRef || '(upstream default branch)'}`);

cloneWithRetries(options.upstreamUrl, targetRoot, Math.max(1, options.cloneRetries || 1));
ensureLocalGitIdentity(targetRoot);

if (baseRef) {
  const checkout = run('git', ['switch', '-c', options.branch, baseRef], {
    cwd: targetRoot,
    allowFailure: true
  });
  if (checkout.status !== 0) {
    console.warn(`Could not create ${options.branch} from ${baseRef}. Fetching all refs and trying again.`);
    run('git', ['fetch', '--all', '--tags'], { cwd: targetRoot });
    run('git', ['switch', '-c', options.branch, baseRef], { cwd: targetRoot });
  }
} else {
  run('git', ['switch', '-c', options.branch], { cwd: targetRoot });
}

for (const relativePath of DOCKER_FORK_PATHS) {
  copyPath(sourceRoot, targetRoot, relativePath);
}

run(npmCommand(), ['run', 'sync:setup'], {
  cwd: targetRoot
});

if (options.fetch) {
  const fetched = fetchWithRetries(targetRoot, 'upstream', Math.max(1, options.cloneRetries || 1));
  if (!fetched) {
    console.warn('Could not fetch upstream after migration. The fork is still usable.');
    console.warn('Run `npm run sync:setup -- --fetch` later when GitHub connectivity is stable.');
  }
}

if (options.install) {
  run(npmCommand(), ['ci'], { cwd: targetRoot });
}

if (options.test) {
  run(npmCommand(), ['run', 'sync:test'], { cwd: targetRoot });
} else {
  run(npmCommand(), ['run', 'sync:verify'], { cwd: targetRoot });
}

if (options.commit) {
  run('git', ['add', ...DOCKER_FORK_PATHS], { cwd: targetRoot });

  const status = capture('git', ['status', '--porcelain'], { cwd: targetRoot });
  if (status) {
    run('git', ['commit', '-m', 'Add Docker Compose self-hosting runtime'], { cwd: targetRoot });
  } else {
    console.info('No file changes detected after copying Docker fork files.');
  }
}

console.info('\nDocker fork migration complete.');
console.info(`Next working directory: ${targetRoot}`);
console.info('Future upstream updates:');
console.info('  npm run sync:upstream');
