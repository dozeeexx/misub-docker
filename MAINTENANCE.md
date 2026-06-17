# Maintaining The Docker Fork

This repository is a Docker self-hosting fork of upstream MiSub. Keep the Docker runtime changes isolated and rebase or merge upstream regularly.

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

For normal updates, run:

```bash
npm run sync:upstream
```

The command will:

1. Ensure upstream Git config exists.
2. Fetch `imzyb/MiSub`.
3. Create a temporary `docker-selfhost-update/<timestamp>` branch.
4. Merge upstream.
5. Run Docker fork invariant checks.
6. Run `npm ci`, `npm run build`, and `npm test -- --run`.
7. Run `docker compose config` when Docker is available.

Use Docker image build verification when Docker is installed and running:

```bash
npm run sync:upstream -- --docker-build
```

If the merge has conflicts, resolve them and then run:

```bash
npm run sync:test
git add <resolved files>
git commit
```

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
- `scripts/verify-docker-fork.mjs`

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

The scripted flow above is preferred. The manual equivalent is:

```bash
git switch docker-selfhost
git fetch upstream
git switch -c docker-selfhost-update/$(date +%F)
git merge upstream/main
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

## Release Upgrade On A VPS

Always back up before upgrading:

```bash
docker compose down
cp ./data/misub.db ./data/misub.db.$(date +%F-%H%M%S).backup
npm run sync:upstream -- --docker-build
docker compose up -d --build
docker compose ps
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
