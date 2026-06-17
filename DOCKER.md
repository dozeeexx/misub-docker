# MiSub Docker

MiSub Docker is the Docker-only self-hosted build of MiSub. It does not require Cloudflare Pages, Workers, KV, D1, Wrangler, or scheduled triggers.

## Quick Start

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set strong values:

   ```env
   ADMIN_PASSWORD=your-strong-password
   COOKIE_SECRET=your-long-random-secret
   ```

   `ADMIN_PASSWORD=admin` is rejected in Docker runtime. `COOKIE_SECRET` must stay stable across restarts.

3. Start MiSub Docker:

   ```bash
   docker compose up -d --build
   ```

4. Open `http://localhost:8787`.

Data is stored at `./data/misub.db` on the host.

`HOST_PORT` in `.env` controls the host port. The container always listens on `8787`.

By default Docker binds the host port to `127.0.0.1` so the app is not exposed directly. Put Caddy/Nginx in front for public HTTPS.

Docker Compose includes a healthcheck for `/_health`. Use `docker compose ps` to see whether the container is healthy.

## Password Behavior

On first startup, set `ADMIN_PASSWORD`. The server writes it into SQLite.

After you change the password in the UI, MiSub Docker stores the new password in SQLite. You may remove `ADMIN_PASSWORD` from `.env` if you want the database value to be the login source. If `ADMIN_PASSWORD` remains set, it always takes priority over the SQLite value.

`COOKIE_SECRET` is always required. Changing it logs out existing browser sessions.

## Scheduler

Docker uses an in-process scheduler instead of Cloudflare cron.

```env
CRON_ENABLED=true
CRON_INTERVAL_SECONDS=86400
CRON_RUN_ON_START=false
```

The scheduler runs the existing subscription update task and the WebDAV auto-backup due check. `/cron` is still available for external triggering if you configure a Cron Secret in settings.

## Upgrade

```bash
docker compose up -d --build
```

For source deployments:

```bash
npm run misub:update
```

The helper unsets shell `PORT` before invoking Docker Compose, which avoids accidental overrides from VPS environments.

The SQLite file in `./data` is not replaced by image upgrades.

If you track upstream MiSub updates, follow `MAINTENANCE.md`. MiSub Docker is a maintained fork: upstream changes should be merged into the Docker branch, then verified before Docker is restarted.

Quick upstream sync command:

```bash
npm run update:deploy -- --docker-build
```

## Backup And Restore

SQLite uses WAL mode for safer writes. `npm run update:selfhost` and `npm run update:deploy` create a SQLite-consistent backup under `./data/backups` before updating when `./data/misub.db` exists.

The simplest manual backup path is to stop the container before copying the database:

```bash
docker compose down
cp ./data/misub.db ./misub.db.backup
docker compose up -d
```

If you copy while the container is running, include `misub.db`, `misub.db-wal`, and `misub.db-shm`, or use the UI/WebDAV backup feature instead.

Restore:

```bash
docker compose down
cp ./misub.db.backup ./data/misub.db
docker compose up -d
```

The existing export/import and WebDAV backup features are still available in the UI.

## Reverse Proxy HTTPS

MiSub Docker honors:

- `X-Forwarded-Proto`
- `X-Forwarded-Host`
- `Host`

Set `MISUB_PUBLIC_URL=https://your-domain.example` in `.env` when callback or subscription links must always use the public domain.

A generic Caddy template is included at `deployment/caddy/misub.caddy`. Keep the real domain only in your VPS `.env` and `/etc/caddy/conf.d/*.caddy` so the public GitHub repository stays reusable:

```caddyfile
your-domain.example {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8787
}
```

On a configured VPS, `npm run misub:vps -- caddy` prints a Caddy snippet using the local `.env` public URL.

Example Nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Notes

- The storage type is fixed to SQLite in Docker.
- Cloudflare KV/D1 online migration endpoints are not used in Docker. Use MiSub backup export/import for migration.
- `request.cf` geo fields are empty in Docker. Access logs still record IP, user agent, subscription format, and token metadata where available.
- Cloudflare-specific fetch options such as `cf.insecureSkipVerify` are ignored by Node.js.
