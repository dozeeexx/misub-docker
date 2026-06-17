import { spawnSync } from 'node:child_process';

const DEFAULT_UPSTREAM_URL = 'https://github.com/imzyb/MiSub.git';

function parseArgs(argv) {
  const options = {
    remote: 'upstream',
    upstreamUrl: DEFAULT_UPSTREAM_URL,
    fetch: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--remote') options.remote = argv[++i];
    else if (arg === '--upstream-url') options.upstreamUrl = argv[++i];
    else if (arg === '--fetch') options.fetch = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function run(command, args, { allowFailure = false, quiet = false } = {}) {
  if (!quiet) console.info(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8'
  });

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function capture(command, args, options = {}) {
  const result = run(command, args, { ...options, quiet: true });
  if (result.status !== 0) return null;
  return String(result.stdout || '').trim();
}

function printHelp() {
  console.info(`
Usage:
  npm run sync:setup -- [options]

Options:
  --remote <name>          Upstream remote name. Default: upstream
  --upstream-url <url>     Upstream Git URL. Default: ${DEFAULT_UPSTREAM_URL}
  --fetch                  Fetch upstream after configuring the remote
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

const currentUrl = capture('git', ['remote', 'get-url', options.remote], { allowFailure: true });
if (!currentUrl) {
  run('git', ['remote', 'add', options.remote, options.upstreamUrl]);
} else if (currentUrl !== options.upstreamUrl) {
  console.warn(`Remote ${options.remote} already exists with URL: ${currentUrl}`);
  console.warn(`Expected upstream URL: ${options.upstreamUrl}`);
}

run('git', ['config', 'merge.keepDocker.name', 'Keep Docker self-hosting fork files']);
run('git', ['config', 'merge.keepDocker.driver', 'true']);
run('git', ['config', 'rerere.enabled', 'true']);
run('git', ['config', 'rerere.autoupdate', 'true']);
run('git', ['config', 'pull.rebase', 'false']);

const hasHead = run('git', ['rev-parse', '--verify', 'HEAD'], { allowFailure: true, quiet: true }).status === 0;
if (!hasHead) {
  console.warn('\nThis repository has no commits yet. Commit the current Docker fork before running sync:upstream.');
}

if (options.fetch) {
  run('git', ['fetch', options.remote, '--prune']);
}

console.info('\nDocker fork Git setup complete.');
console.info(`- Upstream remote: ${options.remote}`);
console.info('- Merge driver: keepDocker');
console.info('- rerere: enabled');
