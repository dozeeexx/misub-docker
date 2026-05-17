import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleApiRequest, handleExternalFetchRequest } from '../../functions/modules/api-router.js';
import {
  handleDebugSubscriptionRequest,
  handleExportDataRequest,
  handlePreviewContentRequest
} from '../../functions/modules/handlers/debug-handler.js';
import { handleLogin } from '../../functions/modules/auth-middleware.js';
import { handleMisubRequest } from '../../functions/modules/subscription/main-handler.js';
import { onRequest } from '../../functions/[[path]].js';

function createKv(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    }
  };
}

function createD1(settings = null) {
  return {
    prepare(sql) {
      return {
        queryValue: undefined,
        bind(...args) {
          this.queryValue = args[0];
          return this;
        },
        async first() {
          if (/FROM settings/i.test(sql) && this.queryValue === 'worker_settings_v1') {
            return null;
          }
          if (/FROM settings/i.test(sql) && settings) {
            return { data: JSON.stringify(settings) };
          }
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };
}

function createAssets() {
  return {
    async fetch() {
      return new Response('<html>ok</html>', { headers: { 'Content-Type': 'text/html' } });
    }
  };
}

function stringifyResponseBody(body) {
  return JSON.stringify(body);
}

describe('security hardening', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('warns after logging in with the default admin password but still allows login', async () => {
    const env = { MISUB_KV: createKv(), COOKIE_SECRET: 'stable-cookie-secret' };
    const response = await handleLogin(new Request('https://example.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin' })
    }), env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.securityWarning).toMatchObject({
      type: 'default_admin_password',
      shouldChangePassword: true
    });
  });

  it('does not expose public auth debug endpoints in production', async () => {
    const env = { MISUB_KV: createKv(), COOKIE_SECRET: 'stable-cookie-secret', ADMIN_PASSWORD: 'secret-password' };

    const debugResponse = await handleApiRequest(new Request('https://example.com/api/auth_debug'), env);
    const checkResponse = await handleApiRequest(new Request('https://example.com/api/auth_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret-password' })
    }), env);

    expect(debugResponse.status).toBe(404);
    expect(checkResponse.status).toBe(404);
  });

  it('allows auth debug endpoints only when explicitly enabled for diagnostics', async () => {
    const env = {
      MISUB_KV: createKv(),
      COOKIE_SECRET: 'stable-cookie-secret',
      ADMIN_PASSWORD: 'secret-password',
      ENABLE_AUTH_DIAGNOSTICS: 'true'
    };

    const response = await handleApiRequest(new Request('https://example.com/api/auth_debug'), env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('rejects cron secret in query string and accepts Authorization bearer only', async () => {
    const env = {
      ASSETS: createAssets(),
      MISUB_DB: createD1({ cronSecret: 'cron-secret' })
    };
    const next = vi.fn(async () => new Response('next'));

    const queryResponse = await onRequest({
      request: new Request('https://example.com/cron?secret=cron-secret'),
      env,
      next
    });
    const bearerResponse = await onRequest({
      request: new Request('https://example.com/cron', {
        headers: { Authorization: 'Bearer cron-secret' }
      }),
      env,
      next
    });

    expect(queryResponse.status).toBe(401);
    expect(bearerResponse.status).not.toBe(401);
  });

  it('does not pass insecureSkipVerify when previewing external content', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('dm1lc3M6Ly9leGFtcGxl', { status: 200 }));

    const response = await handlePreviewContentRequest(new Request('https://example.com/api/preview/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://raw.githubusercontent.com/example/repo/main/sub.txt' })
    }), {});

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
    const requestArg = fetchSpy.mock.calls[0][0];
    expect(requestArg.cf?.insecureSkipVerify).not.toBe(true);
  });

  it('masks subscription token in parse logs', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const env = {
      MISUB_KV: createKv({
        misub_settings_v1: JSON.stringify({
          mytoken: 'super-secret-token',
          subConverter: 'backend',
          selectedRules: [],
          customRules: []
        }),
        misub_subscriptions_v1: JSON.stringify([]),
        misub_profiles_v1: JSON.stringify([])
      })
    };

    await handleMisubRequest({
      request: new Request('https://example.com/sub/super-secret-token'),
      env
    });

    const logs = infoSpy.mock.calls.map(call => call.join(' ')).join('\n');
    expect(logs).not.toContain('super-secret-token');
    expect(logs).toMatch(/Token:/);
  });

  it('blocks private and loopback addresses in external fetch and preview APIs', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('should-not-fetch'));

    const externalResponse = await handleExternalFetchRequest(new Request('https://example.com/api/fetch_external_url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:8787/internal' })
    }), {});
    const previewResponse = await handlePreviewContentRequest(new Request('https://example.com/api/preview/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data' })
    }), {});

    expect(externalResponse.status).toBe(400);
    expect(previewResponse.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows only explicit trusted external hostnames for public fetch APIs', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('dm1lc3M6Ly9leGFtcGxl', { status: 200 }));

    const rejected = await handlePreviewContentRequest(new Request('https://example.com/api/preview/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://sub.example/test' })
    }), {});
    const accepted = await handlePreviewContentRequest(new Request('https://example.com/api/preview/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://raw.githubusercontent.com/example/repo/main/sub.txt' })
    }), {});

    expect(rejected.status).toBe(400);
    expect(accepted.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('blocks non-global IPv6 and embedded IPv4 bypass ranges', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('should-not-fetch'));
    const blockedUrls = [
      'http://[::ffff:c0a8:101]/sub',
      'http://[::ffff:a9fe:a9fe]/sub',
      'http://[fe81::1]/sub',
      'http://[febf::1]/sub',
      'http://[fed0::1]/sub',
      'http://[::7f00:1]/sub',
      'http://[64:ff9b::7f00:1]/sub',
      'http://[2002:7f00:1::]/sub',
      'http://[2001::1]/sub'
    ];

    for (const url of blockedUrls) {
      const response = await handlePreviewContentRequest(new Request('https://example.com/api/preview/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }), {});
      expect(response.status, url).toBe(400);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks redirects from allowed hosts to private addresses', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', {
      status: 302,
      headers: { Location: 'http://localhost/admin' }
    }));

    const response = await handlePreviewContentRequest(new Request('https://example.com/api/preview/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://raw.githubusercontent.com/example/repo/main/sub.txt' })
    }), {});

    expect(response.status).toBe(400);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('redacts sensitive fields from exported settings and subscriptions', async () => {
    const env = {
      MISUB_KV: createKv({
        misub_settings_v1: JSON.stringify({
          mytoken: 'export-token-secret',
          cronSecret: 'cron-secret-value',
          BotToken: 'telegram-bot-token',
          safeName: 'MiSub'
        }),
        misub_subscriptions_v1: JSON.stringify([
          { id: 'sub-1', name: 'Airport', url: 'https://airport.example/link/export-token-secret?token=secret-query' }
        ]),
        misub_profiles_v1: JSON.stringify([])
      })
    };

    const response = await handleExportDataRequest(new Request('https://example.com/api/system/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includeSubscriptions: true, includeProfiles: true, includeSettings: true })
    }), env);
    const body = await response.json();
    const text = stringifyResponseBody(body);

    expect(response.status).toBe(200);
    expect(text).not.toContain('export-token-secret');
    expect(text).not.toContain('cron-secret-value');
    expect(text).not.toContain('telegram-bot-token');
    expect(body.exportData.data.settings.safeName).toBe('MiSub');
    expect(body.exportData.data.settings.mytoken).toBe('[REDACTED]');
  });

  it('redacts debug subscription result URLs and full raw result', async () => {
    const env = {
      MISUB_KV: createKv({
        misub_subscriptions_v1: JSON.stringify([]),
        misub_profiles_v1: JSON.stringify([])
      })
    };
    const rawNode = 'trojan://debug-node-password@server.example:443?allowInsecure=1#Debug';
    const encoded = btoa(rawNode);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(encoded, { status: 200 }));

    const response = await handleDebugSubscriptionRequest(new Request('https://example.com/api/debug_subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://airport.example/sub/debug-token-secret' })
    }), env);
    const body = await response.json();
    const text = stringifyResponseBody(body);

    expect(fetchSpy).toHaveBeenCalled();
    expect(response.status).toBeLessThan(500);
    expect(body.fullResult).toBeUndefined();
    expect(text).not.toContain('debug-token-secret');
    expect(text).not.toContain('debug-node-password@server.example');
  });
});
