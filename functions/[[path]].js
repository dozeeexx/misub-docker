// --- 全局常量 ---
const KV_KEY_MAIN = 'misub_data_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;

// [最终版] 默认设置
const defaultSettings = {
  FileName: 'MiSub',
  mytoken: 'auto',
  subConverter: 'api.v1.mk',
  subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini',
  prependSubName: true
};

// --- 认证相关的核心工具函数 ---
async function createSignedToken(key, data) {
    if (!key || !data) throw new Error("Key and data are required for signing.");
    const encoder = new TextEncoder();
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
    if (path !== '/login') {
        if (!await authMiddleware(request, env)) { return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }); }
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
                if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) { return new Response(JSON.stringify({ error: 'Invalid or missing url' }), { status: 400 });}
                const response = await fetch(new Request(subUrl, { headers: {'User-Agent': 'MiSub-Node-Counter'}, redirect: "follow" }));
                if (!response.ok) return new Response(JSON.stringify({ count: 0 }));
                const text = await response.text();
                let decoded = '';
                try { decoded = atob(text.replace(/\s/g, '')); } catch (e) { decoded = text; }
                let count = (decoded.match(/^(ss|ssr|vmess|vless|trojan|hysteria2?):\/\//gm) || []).length;
                return new Response(JSON.stringify({ count }), { headers: { 'Content-Type': 'application/json' } });
            }
            case '/settings': {
                if (request.method === 'GET') {
                    const settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
                    return new Response(JSON.stringify({ ...defaultSettings, ...settings }), { headers: { 'Content-Type': 'application/json' } });
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
    } catch (e) { return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 }); }
    return new Response('API route not found', { status: 404 });
}

// [最终修正版] 订阅处理函数
async function handleMisubRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";
    
    const kv_settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
    const config = { ...defaultSettings, ...kv_settings };

    let token = '';
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0 && pathSegments[0] !== 'sub') {
        token = pathSegments[0];
    } else {
        token = url.searchParams.get('token');
    }

    if (!token || token !== config.mytoken) {
        return new Response('Invalid token', { status: 403 });
    }

    let targetFormat = url.searchParams.get('target') || 'base64';
    if (!url.searchParams.has('target')) {
        const ua = userAgentHeader.toLowerCase();
        if (ua.includes('clash')) targetFormat = 'clash';
    }

    // --- Base64 预处理逻辑 ---
    // 这部分现在是为两种模式服务的，所以放在前面
    const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
    const enabledMisubs = misubs.filter(sub => sub.enabled);
    const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?):\/\//;
    let rawManualNodesContent = '';
    const httpSubs = enabledMisubs.filter(sub => {
        if (sub.url.toLowerCase().startsWith('http')) {
            return true;
        } else {    
            rawManualNodesContent += sub.url + '\n';
            return false;
        }
    });

    // 如果客户端请求的是Base64，则直接聚合所有节点并返回
    if (targetFormat === 'base64') {
        const filteredManualNodes = rawManualNodesContent.split('\n')
            .map(line => line.trim()).filter(line => nodeRegex.test(line));
        const processedManualNodes = config.prependSubName && filteredManualNodes.length > 0
            ? filteredManualNodes.map(node => prependNodeName(node, '手动节点')).join('\n')
            : filteredManualNodes.join('\n');

        const subPromises = httpSubs.map(async (sub) => {
            try {
                // [核心修正] 忠实传递客户端的 User-Agent
                const requestHeaders = { 'User-Agent': userAgentHeader };
                const response = await Promise.race([
                    fetch(new Request(sub.url, { headers: requestHeaders, redirect: "follow", cf: { insecureSkipVerify: true } })),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 10000))
                ]);
                if (!response.ok) return '';
                let text = await response.text();
                try {
                    const cleanedText = text.replace(/\s/g, '');
                    if (cleanedText.length > 20 && /^[A-Za-z0-9+/=]+$/.test(cleanedText)) {
                        const binaryString = atob(cleanedText);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
                        text = new TextDecoder('utf-8').decode(bytes);
                    }
                } catch (e) {}
                
                let validNodes = text.replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).filter(line => nodeRegex.test(line));
                validNodes = validNodes.map(node => {
                    if (node.startsWith('vless://')) {
                        try {
                            let vlessUrl = new URL(node);
                            if (vlessUrl.searchParams.get('security') === '') {
                                vlessUrl.searchParams.delete('security');
                                return vlessUrl.toString();
                            }
                        } catch (e) {}
                    }
                    return node;
                });
                if (config.prependSubName && sub.name) {
                    return validNodes.map(node => prependNodeName(node, sub.name)).join('\n');
                }
                return validNodes.join('\n');
            } catch (e) { return ''; }
        });
        
        const processedSubContents = await Promise.all(subPromises);
        const combinedContent = (processedManualNodes + '\n' + processedSubContents.join('\n'));
        const uniqueNodes = [...new Set(combinedContent.split('\n').map(line => line.trim()).filter(line => line))];
        const base64Content = btoa(unescape(encodeURIComponent(uniqueNodes.join('\n'))));
        
        const headers = { "Content-Type": "text/plain; charset=utf-8", 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' };
        return new Response(base64Content, { headers });
    }

    // 如果是其他格式（如Clash），则由后端代理请求subconverter
    // [核心修正] 放弃不稳定的回调模式，改用 data URI 模式处理手动节点
    const subLinks = httpSubs.map(sub => sub.url); // 只获取 http 链接
    if (rawManualNodesContent.trim()) {
        const manualNodesBase64 = btoa(unescape(encodeURIComponent(rawManualNodesContent)));
        const manualSubUrl = `data:text/plain;base64,${manualNodesBase64}`;
        subLinks.unshift(manualSubUrl); // 将手动节点作为第一个“订阅链接”
    }

    const finalUrlList = subLinks.join('|');
    
    const subconverterUrl = new URL(`https://${config.subConverter}/sub`);
    subconverterUrl.searchParams.set('target', targetFormat);
    subconverterUrl.searchParams.set('url', finalUrlList);
    subconverterUrl.searchParams.set('config', config.subConfig);
    subconverterUrl.searchParams.set('new_name', 'true');

    try {
        const subconverterResponse = await fetch(subconverterUrl.toString(), {
            method: 'GET',
            headers: { 'User-Agent': userAgentHeader }, // 同样忠实传递客户端 User-Agent
            cf: { insecureSkipVerify: true }
        });
        
        if (!subconverterResponse.ok) {
            const errorBody = await subconverterResponse.text();
            throw new Error(`Subconverter service returned status: ${subconverterResponse.status}. Body: ${errorBody}`);
        }
        
        const subconverterContent = await subconverterResponse.text();
        const responseHeaders = new Headers(subconverterResponse.headers);
        responseHeaders.set("Content-Disposition", `attachment; filename*=utf-8''${encodeURIComponent(config.FileName)}`);
        responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
        responseHeaders.set('Cache-Control', 'no-store, no-cache');

        return new Response(subconverterContent, {
            status: subconverterResponse.status,
            statusText: subconverterResponse.statusText,
            headers: responseHeaders
        });
    } catch (error) {
        const errorHeaders = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, no-cache", "Pragma": "no-cache", "Expires": "0" };
        return new Response(`Error fetching from subconverter: ${error.message}`, { status: 502, headers: errorHeaders });
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
        console.error("Critical error in onRequest:", e);
        return new Response("Internal Server Error", { status: 500 });
    }
}

// --- [必需] 名称前缀辅助函数 ---
function prependNodeName(link, prefix) {
  if (!prefix) return link;
  const hashIndex = link.lastIndexOf('#');
  if (hashIndex === -1) {
    return `${link}#${encodeURIComponent(prefix)}`;
  }
  const baseLink = link.substring(0, hashIndex);
  const originalName = decodeURIComponent(link.substring(hashIndex + 1));
  if (originalName.startsWith(prefix)) {
      return link;
  }
  const newName = `${prefix} - ${originalName}`;
  return `${baseLink}#${encodeURIComponent(newName)}`;
}