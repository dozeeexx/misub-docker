import { spawnSync } from 'node:child_process';

const DEFAULT_UPSTREAM_URL = 'https://github.com/imzyb/MiSub.git';

function parseArgs(argv) {
  const options = {
    remote: 'upstream',
    upstreamUrl: DEFAULT_UPSTREAM_URL,
    upstreamBranch: 'main',
    updateBranch: '',
    allowDirty: false,
    install: true,
    build: true,
    test: true,
    docker: true,
    dockerBuild: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--remote') options.remote = argv[++i];
    else if (arg === '--upstream-url') options.upstreamUrl = argv[++i];
    else if (arg === '--upstream-branch') options.upstreamBranch = argv[++i];
    else if (arg === '--update-branch') options.updateBranch = argv[++i];
    else if (arg === '--allow-dirty') options.allowDirty = true;
    else if (arg === '--no-install') options.install = false;
    else if (arg === '--no-build') options.build = false;
    else if (arg === '--no-test') options.test = false;
    else if (arg === '--no-docker') options.docker = false;
    else if (arg === '--docker-build') options.dockerBuild = true;
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
    if (result.error) {
      console.error(`${command} failed: ${result.error.message}`);
    }
    if (quiet && result.stderr) {
      console.error(result.stderr.trim());
    }
    process.exit(result.status ?? 1);
  }

  return result;
}

function capture(command, args, options = {}) {
  const result = run(command, args, { ...options, quiet: true });
  if (result.status !== 0) return null;
  return String(result.stdout || '').trim();
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function branchTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
}

function remoteBranchExists(remote, branch) {
  return run('git', ['rev-parse', '--verify', `refs/remotes/${remote}/${branch}`], {
    allowFailure: true,
    quiet: true
  }).status === 0;
}

function ensureRemote(remote, upstreamUrl) {
  const currentUrl = capture('git', ['remote', 'get-url', remote], { allowFailure: true });
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

function printHelp() {
  console.info(`
Usage:
  npm run sync:upstream -- [options]

This fork applies upstream changes with a sanitized squash merge so historical upstream
commits that contained leaked editor settings are not reintroduced into the public fork.

Options:
  --remote <name>              Upstream remote name. Default: upstream
  --upstream-url <url>         Upstream Git URL. Default: ${DEFAULT_UPSTREAM_URL}
  --upstream-branch <branch>   Upstream branch. Default: main, falls back to master
  --update-branch <branch>     Temporary branch name to create
  --allow-dirty                Allow a dirty working tree
  --no-install                 Skip npm ci
  --no-build                   Skip npm run build
  --no-test                    Skip npm test -- --run
  --no-docker                  Skip docker compose config/build checks
  --docker-build               Run docker compose build after docker compose config
`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const isWorkTree = capture('git', ['rev-parse', '--is-inside-work-tree'], { allowFailure: true });
if (isWorkTree !== 'true') {
  console.error('This command must be run inside a Git work tree.');
  process.exit(1);
}

const hasHead = run('git', ['rev-parse', '--verify', 'HEAD'], { allowFailure: true, quiet: true }).status === 0;
if (!hasHead) {
  console.error('This repository has no commits yet. Commit the Docker fork or start from a real upstream clone first.');
  process.exit(1);
}

if (!options.allowDirty) {
  const status = capture('git', ['status', '--porcelain'], { allowFailure: true });
  if (status) {
    console.error('Working tree is dirty. Commit or stash changes before syncing, or pass --allow-dirty.');
    process.exit(1);
  }
}

ensureRemote(options.remote, options.upstreamUrl);
configureGitForDockerFork();

run('git', ['fetch', options.remote, '--prune']);

let upstreamBranch = options.upstreamBranch;
if (!remoteBranchExists(options.remote, upstreamBranch)) {
  if (upstreamBranch === 'main' && remoteBranchExists(options.remote, 'master')) {
    upstreamBranch = 'master';
  } else {
    console.error(`Remote branch ${options.remote}/${upstreamBranch} was not found.`);
    process.exit(1);
  }
}

const currentBranch = capture('git', ['branch', '--show-current'], { allowFailure: true }) || 'HEAD';
const updateBranch = options.updateBranch || `docker-selfhost-update/${branchTimestamp()}`;

console.info(`\nCurrent branch: ${currentBranch}`);
console.info(`Upstream ref: ${options.remote}/${upstreamBranch}`);
console.info(`Update branch: ${updateBranch}\n`);

run('git', ['switch', '-c', updateBranch]);

const mergeResult = run('git', ['merge', '--squash', '--no-commit', `${options.remote}/${upstreamBranch}`], {
  allowFailure: true
});

if (mergeResult.status !== 0) {
  console.error('\nSanitized upstream squash merge stopped with conflicts.');
  console.error('Resolve conflicts, then run:');
  console.error('  npm run sync:test');
  console.error('  git add <resolved files>');
  console.error('  git commit');
  console.error(`Then merge ${updateBranch} back into ${currentBranch}.`);
  process.exit(mergeResult.status ?? 1);
}

const stagedStatus = capture('git', ['status', '--porcelain']);
if (stagedStatus) {
  run('git', ['commit', '-m', `Apply sanitized upstream ${options.remote}/${upstreamBranch}`]);
} else {
  console.info('No sanitized upstream changes were staged.');
}

if (options.install) {
  run(npmCommand(), ['ci']);
}

run(npmCommand(), ['run', 'sync:verify']);

if (options.build) {
  run(npmCommand(), ['run', 'build']);
}

if (options.test) {
  run(npmCommand(), ['test', '--', '--run']);
}

if (options.docker) {
  const dockerAvailable = run('docker', ['--version'], { allowFailure: true, quiet: true }).status === 0;
  if (!dockerAvailable) {
    console.warn('Docker CLI is not available. Skipping docker compose checks.');
  } else {
    run('docker', ['compose', 'config']);
    if (options.dockerBuild) {
      run('docker', ['compose', 'build']);
    }
  }
}

console.info('\nUpstream sync completed.');
console.info(`Review ${updateBranch}, then merge it back into ${currentBranch}:`);
console.info(`  git switch ${currentBranch}`);
console.info(`  git merge --ff-only ${updateBranch}`);
