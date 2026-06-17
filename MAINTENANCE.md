# Maintaining MiSub Docker

This repository is MiSub Docker, a Docker self-hosting fork of upstream MiSub. Keep the Docker runtime changes isolated and apply upstream updates through sanitized squash commits so leaked upstream history is not imported into the public fork.

## Important: Start From Real Git History

Fast upstream sync only works well when the repository has upstream Git history. If the current directory was unpacked from a ZIP, all files may appear as newly added and `npm run sync:upstream` will stop with:

```text
This repository has no commits yet.
```

That guard is intentional. Do the one-time migration below first, then future updates are fast.

PowerShell-friendly migration command:

```powershell
cd D:\test\MiSub-audit-unzipped\MiSub-a1683b7d9768ba3bf4a7c919c5ba8b2326a11a57
npm.cmd run sync:migrate -- --target D:\test\MiSub-docker-selfhost
```

The script clones upstream MiSub, creates `docker-selfhost`, copies only the Docker fork changes, runs verification, and commits the Docker runtime as one isolated commit. After that, use `npm run sync:upstream` from `D:\test\MiSub-docker-selfhost` for future upstream updates.

## One-Time Setup

Run this once in the Docker fork:

```bash
npm run sync:setup -- --fetch
```

This configures:

- `upstream` remote pointing at `https://github.com/imzyb/MiSub.git`.
- A `keepDocker` merge driver for Docker-only fork files.
- Git rerere, so repeated conflict resolutions can be reused.

If this repository was created from a ZIP snapshot instead of `git clone`, use the migration above instead of committing the ZIP snapshot as-is.

## Recommended Branch Model

- `upstream-main`: clean mirror of `imzyb/MiSub`.
- `docker-selfhost`: your maintained Docker version.
- `docker-selfhost-update/YYYY-MM-DD`: temporary branch used when merging upstream.

For a new clone:

```bash
git remote add upstream https://github.com/imzyb/MiSub.git
git fetch upstream
git switch -c upstream-main upstream/main
git switch -c docker-selfhost
```

Keep Docker-specific files and changes on `docker-selfhost`.

## Fast Update Command

For normal VPS updates, run one command. The helper removes any shell-exported `PORT` before invoking Docker Compose, so `.env` remains authoritative:

```bash
npm run misub:update
```

Equivalent explicit command:

```bash
env -u PORT npm run update:deploy -- --docker-build
```

This creates a SQLite-consistent backup of `./data/misub.db` when it exists, fetches upstream MiSub, merges it into a temporary update branch, runs Docker fork verification, installs dependencies, builds, runs tests, fast-forwards `docker-selfhost`, and finally runs `docker compose up -d --build`.

For source-only updates without restarting Docker:

```bash
npm run update:selfhost
```

For local testing when Docker is not available:

```bash
npm run update:selfhost -- --skip-docker
```

For a fast no-deploy check, useful on a development machine:

```bash
npm run update:selfhost -- --skip-tests --skip-docker
```

The one-click command wraps `sync:upstream`, which will:

1. Ensure upstream Git config exists.
2. Fetch `imzyb/MiSub`.
3. Create a temporary `docker-selfhost-update/<timestamp>` branch.
4. Apply upstream file changes as a sanitized squash commit, without importing upstream commit history.
5. Run Docker fork invariant checks.
6. Run `npm ci`, `npm run build`, and `npm test -- --run`.
7. Fast-forward the `docker-selfhost` branch when verification passes.
8. Optionally deploy Docker Compose when `--deploy` is used.

Use Docker image build verification when Docker is installed and running:

```bash
npm run update:selfhost -- --docker-build
```

If the merge has conflicts, resolve them and then run:

```bash
npm run sync:test
git add <resolved files>
git commit
git switch docker-selfhost
git merge --ff-only <update-branch>
```

## Upstream Upgrade Notes

Upstream MiSub includes upgrade guidance such as `docs/UPGRADE_V2.5.md`. Keep reading those notes before major updates because they describe product-level changes, deleted features, config migrations, and frontend dependency changes.

For this Docker fork, interpret the upstream guidance this way:

- Data backup still applies. Use MiSub UI export/WebDAV backup; the one-click update script also creates a SQLite-consistent `./data/misub.db` backup before upgrading.
- Git sync still applies, but use `npm run sync:upstream` instead of raw `git merge upstream/main`; the script applies a sanitized squash commit, preserves Docker runtime invariants, and runs verification.
- Config migrations still apply. For example, operator-chain migrations should still be completed in the UI when upstream asks for them.
- Dependency/build notes still apply. The sync flow runs `npm ci`, `npm run build`, and tests so Vite/Tailwind/Node changes are caught early.
- Cloudflare Pages, Wrangler, KV, and D1 setup notes do not apply to Docker runtime. SQLite is the Docker storage source of truth.
- `schema.sql` D1 console instructions usually translate to checking whether `server/sqlite-d1.js` still initializes equivalent SQLite tables. Update the SQLite compatibility layer if upstream adds required tables or columns.
- Upstream advice to `git reset --hard upstream/main` is unsafe for this Docker fork because it discards the Docker runtime. Only use it on a clean upstream mirror branch, never on `docker-selfhost`.

The upstream `.github/workflows/fork-sync.yml` mirrors a fork's `main` branch to upstream `main` with `git reset --hard`. In this Docker fork it is intentionally gated behind the repository variable `ENABLE_UPSTREAM_MAIN_MIRROR=true`. Leave it disabled for the Docker maintenance branch; upgrades should go through `sync:upstream`.

## Files That Belong To The Docker Fork

These files are expected to be owned by the Docker fork:

- `server/`
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.env.example`
- `DOCKER.md`
- `MAINTENANCE.md`
- `tests/unit/docker-sqlite-runtime.test.js`
- `scripts/migrate-snapshot-to-fork.mjs`
- `scripts/setup-docker-fork-git.mjs`
- `scripts/sync-upstream.mjs`
- `scripts/update-selfhost.mjs`
- `scripts/verify-docker-fork.mjs`
- `scripts/misub-vps.mjs`
- `deployment/caddy/`
- `.gitattributes`

These upstream files contain Docker compatibility changes and are more likely to conflict during upstream updates:

- `functions/storage-adapter.js`
- `functions/modules/utils.js`
- `functions/modules/api-handler.js`
- `functions/modules/api-router.js`
- `package.json`
- `package-lock.json`
- `src/constants/default-settings.js`
- `src/composables/useSettingsLogic.js`
- `src/components/settings/sections/SystemSettings.vue`

## Updating From Upstream

The one-click flow above is preferred. If you must update manually, use a squash merge so the fork gets upstream file changes without importing upstream commit history:

```bash
git switch docker-selfhost
git fetch upstream
git switch -c docker-selfhost-update/$(date +%F)
git merge --squash --no-commit upstream/main
```

Resolve conflicts by keeping upstream business logic unless it would reintroduce Cloudflare-only runtime requirements. Preserve these Docker invariants:

- Docker runtime starts with `node server/index.js`.
- `MISUB_RUNTIME=docker` and `STORAGE_TYPE=sqlite`.
- Persistent data stays in `/data/misub.db` by default.
- `ADMIN_PASSWORD` is required for the first startup unless SQLite already stores one.
- `COOKIE_SECRET` is always required.
- Cloudflare KV/D1 migration endpoints are not part of the Docker main path.
- Container scheduler remains the primary automatic task runner.

After resolving conflicts:

```bash
npm run sync:test
docker compose config
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:${PORT:-8787}/_health
```

If everything passes, merge the temporary branch back:

```bash
git switch docker-selfhost
git merge --ff-only docker-selfhost-update/$(date +%F)
```

## VPS Daily Operations

On the production VPS, prefer the helper commands below. They intentionally unset shell `PORT` before running Docker Compose so unrelated VPS services cannot override the MiSub port.

```bash
cd /path/to/misub-docker
npm run misub:status
npm run misub:health
npm run misub:logs -- -f
npm run misub:backup
npm run misub:update
```

`npm run misub:backup` writes SQLite-consistent backups under `./data/backups` when possible. Keep `./data` out of Git and include it in VPS backups.

### Repository template vs local VPS config

The public repository should stay generic. Keep real deployment-only values only in local ignored files or system config:

- Real domain: `.env` `MISUB_PUBLIC_URL` / `MISUB_CALLBACK_URL`, and `/etc/caddy/conf.d/*.caddy`.
- Real secrets: `.env` `ADMIN_PASSWORD`, `COOKIE_SECRET`, Cron/WebDAV/Telegram secrets.
- Real app data: `./data/misub.db` and `./data/backups/`.

Tracked files should use placeholders such as `your-domain.example`. `npm run sync:verify` checks tracked files against the local `.env` public domain and fails if that real domain leaks back into Git-tracked files.

### Admin UI settings persistence

Settings changed in the web admin UI, including public-page access, disguise page options, custom management login path, tokens, subscriptions, profiles, and integration settings, are runtime data stored in SQLite under `./data/misub.db` in Docker mode. They are not stored in Git-tracked source files.

Normal source upgrades and Docker rebuilds preserve these settings because `npm run misub:update` backs up `./data/misub.db` before merging upstream and Docker Compose mounts `./data:/data`. Avoid actions that replace or delete `./data`, restore an older database over the live database, or click the UI reset-settings action unless you intend to revert settings.

When using a custom management login path, save the path somewhere private. The server rejects known reserved paths such as `/api`, `/login`, `/dashboard`, `/sub`, and `/assets`, but a typo or forgotten custom path can still lock you out until you inspect or edit the SQLite settings backup.

## Release Upgrade On A VPS

For routine VPS upgrades:

```bash
npm run misub:update
docker compose ps
```

`update:deploy` backs up `./data/misub.db` automatically before merging upstream. For an extra manual cold backup before high-risk upgrades:

```bash
docker compose down
cp ./data/misub.db ./data/misub.db.$(date +%F-%H%M%S).backup
docker compose up -d
```

If the container fails after an upstream merge, restore the previous Git commit and database backup:

```bash
git reset --hard HEAD~1
docker compose down
cp ./data/misub.db.YYYY-MM-DD-HHMMSS.backup ./data/misub.db
docker compose up -d --build
```

Do not run `git reset --hard` on a dirty working tree unless your local changes are committed or backed up.

## Snapshot-To-Fork Migration Details

If you started from a ZIP snapshot, the cleanest long-term setup is:

```powershell
npm.cmd run sync:migrate -- --target D:\test\MiSub-docker-selfhost
```

By default the script tries to detect the original upstream commit from this snapshot directory name. If that fails, pass it explicitly:

```powershell
npm.cmd run sync:migrate -- --target D:\test\MiSub-docker-selfhost --base-ref <upstream-commit-sha>
```

The migration copies only the Docker-owned files and the small upstream-file compatibility patches needed by the Docker runtime. It refuses to write into a non-empty target directory.

After migration, future updates can use:

```powershell
cd D:\test\MiSub-docker-selfhost
npm.cmd run sync:upstream
```
