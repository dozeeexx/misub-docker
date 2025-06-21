import { FALLBACK_CLASH, FALLBACK_SINGBOX, FALLBACK_BASE64 } from './fallback.js';

// --- 全局常量 ---
const KV_KEY_MAIN = 'misub_data_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const defaultSettings = {
  FileName: 'MiSub',
  mytoken: 'auto',
  subConverter: 'subapi.cmliussss.com',
  subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini',
  prependSubName: true
};

// --- 工具函数 ---
function createTextEncoder() {
  return new TextEncoder();
}

async function createSignedToken(key, data) {
  if (!key || !data) throw new Error("Key and data are required for signing.");
  const encoder = createTextEncoder();
  const keyData = encoder.encode(key);
  const dataToSign = encoder.encode(data);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
  return `${data}.${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

async function verifySignedToken(key, token) {
  if (!key || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data] = parts;
  const expectedToken = await createSignedToken(key, data);
  return token === expectedToken ? data : null;
}

async function authMiddleware(request, env) {
  if (!env.COOKIE_SECRET) return false;
  const cookie = request.headers.get('Cookie');
  const sessionCookie = cookie?.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
  if (!sessionCookie) return false;
  const token = sessionCookie.split('=')[1];
  const verifiedData = await verifySignedToken(env.COOKIE_SECRET, token);
  return verifiedData && (Date.now() - parseInt(verifiedData, 10) < SESSION_DURATION);
}

// --- API 请求处理 ---
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  if (path !== '/login' && !(await authMiddleware(request, env))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    switch (path) {
      case '/login': {
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        const { password } = await request.json();
        if (password === env.ADMIN_PASSWORD) {
          const token = await createSignedToken(env.COOKIE_SECRET, String(Date.now()));
          const headers = new Headers({ 'Content-Type': 'application/json' });
          headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`);
          return new Response(JSON.stringify({ success: true }), { headers });
        }
        return new Response(JSON.stringify({ error: '密码错误' }), { status: 401 });
      }

      case '/logout': {
        const headers = new Headers({ 'Content-Type': 'application/json' });
        headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      case '/data': {
        const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
        const settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
        const config = { FileName: settings.FileName || 'MISUB', mytoken: settings.mytoken || 'auto' };
        return new Response(JSON.stringify({ misubs, config }), { headers: { 'Content-Type': 'application/json' } });
      }

      case '/misubs': {
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        const { misubs } = await request.json();
        if (typeof misubs === 'undefined') return new Response(JSON.stringify({ success: false, message: '请求体中缺少 misubs 字段' }), { status: 400 });
        await env.MISUB_KV.put(KV_KEY_MAIN, JSON.stringify(misubs));
        return new Response(JSON.stringify({ success: true, message: '订阅源已保存' }));
      }

      case '/node_count': {
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        const { url: subUrl } = await request.json();
        if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
          return new Response(JSON.stringify({ error: 'Invalid or missing url' }), { status: 400 });
        }
        const response = await fetch(new Request(subUrl, { headers: { 'User-Agent': 'MiSub-Node-Counter' }, redirect: "follow" }));
        if (!response.ok) return new Response(JSON.stringify({ count: 0 }));
        const text = await response.text();
        let decoded = '';
        try {
          decoded = atob(text.replace(/\s/g, ''));
        } catch (e) {
          decoded = text;
        }
        const count = (decoded.match(/^(ss|ssr|vmess|vless|trojan|hysteria2?):\/\//gm) || []).length;
        return new Response(JSON.stringify({ count }), { headers: { 'Content-Type': 'application/json' } });
      }

      case '/settings': {
        if (request.method === 'GET') {
          const settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
          return new Response(JSON.stringify({ ...defaultSettings, ...settings }));
        }
        if (request.method === 'POST') {
          const newSettings = await request.json();
          const oldSettings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
          await env.MISUB_KV.put(KV_KEY_SETTINGS, JSON.stringify({ ...oldSettings, ...newSettings }));
          return new Response(JSON.stringify({ success: true, message: '设置已保存' }));
        }
        return new Response('Method Not Allowed', { status: 405 });
      }
    }
  } catch (e) {
    console.error('[API Error]', e.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
  return new Response('API route not found', { status: 404 });
}

// --- 主要逻辑入口 ---
async function handleMisubRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const userAgentHeader = request.headers.get('User-Agent') || "Unknown";

  const kv_settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
  const config = { ...defaultSettings, ...kv_settings };

  // Token 解析
  let token = url.searchParams.get('token');
  const pathSegments = url.pathname.split('/').filter(Boolean);
  if (!token && pathSegments.length > 0 && pathSegments[0] !== 'sub') {
    token = pathSegments[0];
  }

  if (!token || token !== config.mytoken) {
    return new Response('Invalid token', { status: 403 });
  }

  // 目标格式解析
  let targetFormat = url.searchParams.get('target') || 'clash';
  if (!url.searchParams.has('target')) {
    const ua = userAgentHeader.toLowerCase();
    if (ua.includes('clash') || ua.includes('stash')) {
      targetFormat = 'clash';
    } else if (ua.includes('sing-box') || ua.includes('neko') || ua.includes('qx')) {
      targetFormat = 'singbox';
    } else if (ua.includes('v2ray') || ua.includes('qv2ray') || ua.includes('nekobox')) {
      targetFormat = 'base64';
    } else if (ua.includes('surge')) {
      targetFormat = 'surge';
    }
  }

  // Base64 输出：聚合原始节点
  if (targetFormat === 'base64') {
    const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
    const enabledMisubs = misubs.filter(sub => sub.enabled);

    const manualNodes = enabledMisubs
      .filter(sub => !sub.url.startsWith('http'))
      .map(sub => sub.url)
      .join('\n');

    const httpSubs = enabledMisubs.filter(sub => sub.url.startsWith('http'));

    const subPromises = httpSubs.map(async (sub) => {
      try {
        const res = await fetch(new Request(sub.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cf: { insecureSkipVerify: true }
        }));
        if (!res.ok) return '';
        let text = await res.text();
        try {
          const cleaned = text.replace(/\s/g, '');
          if (cleaned.length > 20 && /^[A-Za-z0-9+/=]+$/.test(cleaned)) {
            const bytes = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0));
            text = new TextDecoder('utf-8').decode(bytes);
          }
        } catch (e) {}
        if (config.prependSubName && sub.name) {
          return text.split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(node => prependNodeName(node, sub.name))
            .join('\n');
        }
        return text;
      } catch (e) {
        console.warn(`[SUB FETCH ERROR] ${sub.url}:`, e.message);
        return '';
      }
    });

    const results = await Promise.all(subPromises);
    const combined = [manualNodes, ...results].join('\n');
    const uniqueNodes = [...new Set(combined.split('\n').map(line => line.trim()).filter(Boolean))];

    if (uniqueNodes.length === 0) {
      return new Response(FALLBACK_BASE64, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    }

    const base64 = btoa(unescape(encodeURIComponent(uniqueNodes.join('\n'))));
    return new Response(base64, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }

  // 其他格式：通过 subconverter 转换
  const callbackUrl = `${url.protocol}//${url.host}/${config.mytoken}?target=base64`;
  const subconverterUrl = new URL(`https://${config.subConverter}/sub`);
  subconverterUrl.searchParams.set('target', targetFormat);
  subconverterUrl.searchParams.set('url', callbackUrl);
  subconverterUrl.searchParams.set('config', config.subConfig);
  subconverterUrl.searchParams.set('new_name', 'false');

  try {
    console.log(`[subconverter] 请求地址: ${subconverterUrl}`);

    const res = await fetch(subconverterUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      },
      cf: { insecureSkipVerify: true }
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[subconverter] 错误响应: ${body}`);
      return new Response(`Subconverter failed: ${body}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });

  } catch (e) {
    console.error('[subconverter] 请求失败:', e.message);
    return new Response(`Subconverter 请求失败: ${e.message}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// --- Cloudflare Pages Functions 主入口 ---
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  try {
    if (url.pathname.startsWith('/api/')) return handleApiRequest(request, env);
    if (url.pathname.startsWith('/sub') || (url.pathname !== '/' && !url.pathname.includes('.') && !url.pathname.startsWith('/assets'))) {
      return handleMisubRequest(context);
    }
    return next();
  } catch (e) {
    console.error("[onRequest] 出现异常:", e.message);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// --- 辅助函数 ---
function prependNodeName(link, prefix) {
  if (!prefix) return link;
  const hashIndex = link.lastIndexOf('#');
  if (hashIndex === -1) return `${link}#${encodeURIComponent(prefix)}`;

  const baseLink = link.substring(0, hashIndex);
  const originalName = decodeURIComponent(link.substring(hashIndex + 1));
  if (originalName.startsWith(prefix)) return link;

  return `${baseLink}#${encodeURIComponent(`${prefix} - ${originalName}`)}`;
}