import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_BASE_BRANCH = 'docker-selfhost';
const DEFAULT_REMOTE = 'upstream';
const DEFAULT_UPSTREAM_URL = 'https://github.com/imzyb/MiSub.git';

function parseArgs(argv) {
  const options = {
    baseBranch: DEFAULT_BASE_BRANCH,
    remote: DEFAULT_REMOTE,
    upstreamUrl: DEFAULT_UPSTREAM_URL,
    upstreamBranch: 'main',
    deploy: false,
    dockerBuild: false,
    skipTests: false,
    skipInstall: false,
    skipDocker: false,
    skipBackup: false,
    keepUpdateBranch: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base-branch') options.baseBranch = argv[++i];
    else if (arg === '--remote') options.remote = argv[++i];
    else if (arg === '--upstream-url') options.upstreamUrl = argv[++i];
    else if (arg === '--upstream-branch') options.upstreamBranch = argv[++i];
    else if (arg === '--deploy') options.deploy = true;
    else if (arg === '--docker-build') options.dockerBuild = true;
    else if (arg === '--skip-tests') options.skipTests = true;
    else if (arg === '--skip-install') options.skipInstall = true;
    else if (arg === '--skip-docker') options.skipDocker = true;
    else if (arg === '--skip-backup') options.skipBackup = true;
    else if (arg === '--keep-update-branch') options.keepUpdateBranch = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function run(command, args, { allowFailure = false, quiet = false } = {}) {
  if (!quiet) console.info(`> ${command} ${args.join(' ')}`);
  const isWindowsScript = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
  const spawnCommand = isWindowsScript ? 'cmd.exe' : command;
  const spawnArgs = isWindowsScript ? ['/d', '/s', '/c', command, ...args] : args;
  const result = spawnSync(spawnCommand, spawnArgs, {
    cwd: process.cwd(),
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8'
  });

  if (result.status !== 0 && !allowFailure) {
    if (result.error) console.error(`${command} failed: ${result.error.message}`);
    if (quiet && result.stderr) console.error(result.stderr.trim());
    process.exit(result.status ?? 1);
  }

  return result;
}

function capture(command, args, options = {}) {
  const result = run(command, args, { ...options, quiet: true, allowFailure: true });
  if (result.status !== 0) return '';
  return String(result.stdout || '').trim();
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function dockerCommand() {
  const configured = process.env.DOCKER_BIN;
  if (configured) return configured;

  if (process.platform === 'win32') {
    const desktopDocker = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
    if (fs.existsSync(desktopDocker)) return desktopDocker;
  }

  return 'docker';
}

function branchTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
}

function ensureCleanWorkTree() {
  const status = capture('git', ['status', '--porcelain']);
  if (status) {
    console.error('Working tree is dirty. Commit or stash local changes before one-click update.');
    process.exit(1);
  }
}

function ensureBranch(branch) {
  const exists = run('git', ['rev-parse', '--verify', branch], {
    allowFailure: true,
    quiet: true
  }).status === 0;

  if (!exists) {
    console.error(`Base branch not found: ${branch}`);
    process.exit(1);
  }
}

function copyIfExists(source, target) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return true;
}

function backupDatabase(skipBackup) {
  if (skipBackup) {
    console.info('Skipping database backup.');
    return;
  }

  const dataDir = path.resolve('data');
  const dbPath = path.join(dataDir, 'misub.db');
  if (!fs.existsSync(dbPath)) {
    console.info('No ./data/misub.db found. Skipping database backup.');
    return;
  }

  const backupDir = path.join(dataDir, 'backups');
  const stamp = branchTimestamp();
  const copiedMain = copyIfExists(dbPath, path.join(backupDir, `misub.db.${stamp}.backup`));
  copyIfExists(`${dbPath}-wal`, path.join(backupDir, `misub.db-wal.${stamp}.backup`));
  copyIfExists(`${dbPath}-shm`, path.join(backupDir, `misub.db-shm.${stamp}.backup`));

  if (copiedMain) {
    console.info(`Database backup written to ${backupDir}`);
  }
}

function hasCommit(ref) {
  return run('git', ['rev-parse', '--verify', ref], {
    allowFailure: true,
    quiet: true
  }).status === 0;
}

function ensureRemote(remote, upstreamUrl) {
  const currentUrl = capture('git', ['remote', 'get-url', remote]);
  if (!currentUrl) {
    run('git', ['remote', 'add', remote, upstreamUrl]);
    return;
  }

  if (currentUrl !== upstreamUrl) {
    console.warn(`Remote ${remote} points to ${currentUrl}`);
    console.warn(`Continuing without changing it. Expected default is ${upstreamUrl}`);
  }
}

function configureGitForDockerFork() {
  run('git', ['config', 'merge.keepDocker.name', 'Keep Docker self-hosting fork files']);
  run('git', ['config', 'merge.keepDocker.driver', 'true']);
  run('git', ['config', 'rerere.enabled', 'true']);
  run('git', ['config', 'rerere.autoupdate', 'true']);
  run('git', ['config', 'pull.rebase', 'false']);
}

function remoteBranchExists(remote, branch) {
  return run('git', ['rev-parse', '--verify', `refs/remotes/${remote}/${branch}`], {
    allowFailure: true,
    quiet: true
  }).status === 0;
}

function resolveUpstreamBranch(remote, branch) {
  if (remoteBranchExists(remote, branch)) return branch;
  if (branch === 'main' && remoteBranchExists(remote, 'master')) return 'master';
  console.error(`Remote branch ${remote}/${branch} was not found.`);
  process.exit(1);
}

function isAncestor(ancestor, descendant) {
  return run('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
    allowFailure: true,
    quiet: true
  }).status === 0;
}

function runVerification(options) {
  if (!options.skipInstall) {
    run(npmCommand(), ['ci']);
  }

  run(npmCommand(), ['run', 'sync:verify']);

  if (!options.skipTests) {
    run(npmCommand(), ['run', 'build']);
    run(npmCommand(), ['test', '--', '--run']);
  }

  if (!options.skipDocker) {
    const docker = dockerCommand();
    const dockerAvailable = run(docker, ['--version'], { allowFailure: true, quiet: true }).status === 0;
    if (!dockerAvailable) {
      console.warn('Docker CLI is not available. Skipping docker compose checks.');
      return;
    }
    run(docker, ['compose', 'config']);
    if (options.dockerBuild) {
      run(docker, ['compose', 'build']);
    }
  }
}

function printHelp() {
  console.info(`
Usage:
  npm run update:selfhost -- [options]

One-click update for the Docker self-hosting branch:
  1. Require a clean work tree
  2. Back up ./data/misub.db when present
  3. Merge upstream via sync:upstream
  4. Fast-forward the base branch
  5. Optionally rebuild/restart Docker Compose with --deploy

Options:
  --deploy                    Run docker compose up -d --build after a successful update
  --docker-build              Build the Docker image during sync validation
  --skip-tests                Skip npm build/test during sync
  --skip-install              Skip npm ci during sync
  --skip-docker               Skip docker compose config/build checks during sync
  --skip-backup               Do not copy ./data/misub.db before updating
  --keep-update-branch        Keep the temporary update branch after merging
  --base-branch <branch>      Maintained branch. Default: ${DEFAULT_BASE_BRANCH}
  --remote <name>             Upstream remote. Default: ${DEFAULT_REMOTE}
  --upstream-url <url>        Upstream URL. Default: ${DEFAULT_UPSTREAM_URL}
  --upstream-branch <branch>  Upstream branch. Default: main
`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const isWorkTree = capture('git', ['rev-parse', '--is-inside-work-tree']);
if (isWorkTree !== 'true') {
  console.error('This command must be run inside a Git work tree.');
  process.exit(1);
}

ensureBranch(options.baseBranch);
ensureCleanWorkTree();
backupDatabase(options.skipBackup);

const currentBranch = capture('git', ['branch', '--show-current']) || 'HEAD';
if (currentBranch !== options.baseBranch) {
  run('git', ['switch', options.baseBranch]);
}

ensureRemote(options.remote, options.upstreamUrl);
configureGitForDockerFork();
run('git', ['fetch', options.remote, '--prune']);
const upstreamBranch = resolveUpstreamBranch(options.remote, options.upstreamBranch);
const upstreamRef = `${options.remote}/${upstreamBranch}`;

if (isAncestor(upstreamRef, options.baseBranch)) {
  console.info(`No upstream changes to merge from ${upstreamRef}.`);
  runVerification(options);
  if (options.deploy) {
    const docker = dockerCommand();
    run(docker, ['compose', 'up', '-d', '--build']);
    run(docker, ['compose', 'ps']);
  }
  console.info('\nSelf-hosted MiSub is already up to date.');
  process.exit(0);
}

const updateBranch = `docker-selfhost-update/${branchTimestamp()}`;
const syncArgs = [
  'run',
  'sync:upstream',
  '--',
  '--remote',
  options.remote,
  '--upstream-url',
  options.upstreamUrl,
  '--upstream-branch',
  options.upstreamBranch,
  '--update-branch',
  updateBranch,
  ...(options.skipInstall ? ['--no-install'] : []),
  ...(options.skipTests ? ['--no-build', '--no-test'] : []),
  ...(options.skipDocker ? ['--no-docker'] : []),
  ...(options.dockerBuild ? ['--docker-build'] : [])
];

const syncResult = run(npmCommand(), syncArgs, { allowFailure: true });
if (syncResult.status !== 0) {
  console.error('\nOne-click update stopped. Resolve the sync problem above.');
  if (hasCommit(updateBranch)) {
    console.error(`Update branch is available for inspection: ${updateBranch}`);
  }
  process.exit(syncResult.status ?? 1);
}

run('git', ['switch', options.baseBranch]);
run('git', ['merge', '--ff-only', updateBranch]);

if (!options.keepUpdateBranch) {
  run('git', ['branch', '-d', updateBranch], { allowFailure: true });
}

if (options.deploy) {
  const docker = dockerCommand();
  run(docker, ['compose', 'up', '-d', '--build']);
  run(docker, ['compose', 'ps']);
}

console.info('\nSelf-hosted MiSub update complete.');
console.info(`Current branch: ${options.baseBranch}`);
