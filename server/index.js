import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { onRequest } from '../functions/[[path]].js';
import { createRuntimeEnv, closeRuntimeEnv, createWaitUntilQueue } from './runtime-env.js';
import { startScheduler } from './scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
};

function firstHeaderValue(value) {
    return String(value || '').split(',')[0].trim();
}

function getRequestUrl(req) {
    const forwardedProto = firstHeaderValue(req.headers['x-forwarded-proto']);
    const forwardedHost = firstHeaderValue(req.headers['x-forwarded-host']);
    const proto = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
    const host = forwardedHost || req.headers.host || `localhost:${process.env.PORT || 8787}`;
    return `${proto}://${host}${req.url || '/'}`;
}

function nodeRequestToWebRequest(req) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
            value.forEach(item => headers.append(key, item));
        } else if (value !== undefined) {
            headers.set(key, value);
        }
    }

    const init = {
        method: req.method,
        headers
    };

    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
        init.body = req;
        init.duplex = 'half';
    }

    const request = new Request(getRequestUrl(req), init);
    request.cf = {};
    return request;
}

function notFoundResponse() {
    return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

async function healthCheckResponse(env) {
    try {
        await env.SQLITE_DB.prepare('SELECT 1 AS ok').first();
        return new Response(JSON.stringify({
            status: 'ok',
            runtime: 'docker',
            storage: 'sqlite',
            uptime: Math.floor(process.uptime())
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            status: 'error',
            message: error?.message || String(error)
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });
    }
}

function resolveAssetPath(requestUrl) {
    const url = new URL(requestUrl);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const candidate = path.resolve(distDir, `.${pathname}`);
    if (!candidate.startsWith(distDir + path.sep) && candidate !== distDir) {
        return null;
    }
    return candidate;
}

async function serveAsset(request) {
    if (!fs.existsSync(distDir)) {
        return new Response('MiSub frontend is not built. Run npm run build before starting the Docker server.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }

    const assetPath = resolveAssetPath(request.url);
    if (!assetPath) return notFoundResponse();

    let stat;
    try {
        stat = fs.statSync(assetPath);
    } catch {
        return notFoundResponse();
    }

    if (!stat.isFile()) return notFoundResponse();

    const extension = path.extname(assetPath).toLowerCase();
    const headers = new Headers({
        'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
        'Content-Length': String(stat.size)
    });

    if (extension === '.html') {
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers });
    }

    return new Response(Readable.toWeb(fs.createReadStream(assetPath)), {
        status: 200,
        headers
    });
}

function writeHeaders(webResponse, nodeResponse) {
    const headers = webResponse.headers;
    const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];

    for (const [key, value] of headers.entries()) {
        if (key.toLowerCase() === 'set-cookie' && setCookies.length > 0) continue;
        nodeResponse.setHeader(key, value);
    }

    if (setCookies.length > 0) {
        nodeResponse.setHeader('Set-Cookie', setCookies);
    }
}

async function sendWebResponse(webResponse, nodeResponse, method = 'GET') {
    nodeResponse.statusCode = webResponse.status;
    nodeResponse.statusMessage = webResponse.statusText || nodeResponse.statusMessage;
    writeHeaders(webResponse, nodeResponse);

    if (method === 'HEAD' || !webResponse.body) {
        nodeResponse.end();
        return;
    }

    await new Promise((resolve, reject) => {
        const readable = Readable.fromWeb(webResponse.body);
        readable.on('error', reject);
        nodeResponse.on('error', reject);
        nodeResponse.on('finish', resolve);
        readable.pipe(nodeResponse);
    });
}

async function main() {
    const env = await createRuntimeEnv();
    env.ASSETS = { fetch: serveAsset };

    const waitUntilQueue = createWaitUntilQueue();
    const scheduler = startScheduler(env);
    const host = process.env.HOST || '0.0.0.0';
    const port = Number(process.env.PORT || 8787);
    let shuttingDown = false;

    const server = http.createServer(async (req, res) => {
        try {
            const requestUrl = getRequestUrl(req);
            const pathname = new URL(requestUrl).pathname;
            if (['GET', 'HEAD'].includes(req.method || 'GET') && pathname === '/_health') {
                const response = await healthCheckResponse(env);
                await sendWebResponse(response, res, req.method);
                return;
            }

            const request = nodeRequestToWebRequest(req);
            const response = await onRequest({
                request,
                env,
                waitUntil: waitUntilQueue.waitUntil
            });
            await sendWebResponse(response, res, req.method);
        } catch (error) {
            console.error('[Server] Request failed:', error);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
            }
            res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
        }
    });

    const shutdown = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.info(`[Server] Received ${signal}, shutting down`);
        const forceExit = setTimeout(() => {
            console.error('[Server] Graceful shutdown timed out');
            process.exit(1);
        }, 55000);
        forceExit.unref?.();

        server.close(async () => {
            try {
                await scheduler.stop?.();
                await waitUntilQueue.drain();
                closeRuntimeEnv(env);
                clearTimeout(forceExit);
                process.exit(0);
            } catch (error) {
                console.error('[Server] Shutdown failed:', error);
                clearTimeout(forceExit);
                process.exit(1);
            }
        });
        server.closeIdleConnections?.();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    server.listen(port, host, () => {
        console.info(`[Server] MiSub Docker runtime listening on http://${host}:${port}`);
        console.info(`[Server] SQLite database: ${env.DATABASE_PATH}`);
    });
}

main().catch(error => {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
});
