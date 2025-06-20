import yaml from 'js-yaml';
import { prependNodeName } from '../src/lib/utils.js';

// --- 全局常量 ---
const KV_KEY_MAIN = 'misub_data_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const defaultSettings = {
  FileName: 'MiSub',
  mytoken: 'auto',
  BotToken: '',
  ChatID: '',
  subConverter: 'subapi.cmliussss.com',
  subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini',
  prependSubName: true // [新增] 默认开启前缀功能
};

// --- 核心工具函数 (身份验证) ---
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
        if (!await authMiddleware(request, env)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
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
    } catch (e) {
        console.error(`API Error in path ${path}:`, e);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
    return new Response('API route not found', { status: 404 });
}

// --- 订阅生成处理 ---
async function handleMisubRequest(request, env) {
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";
    const kv_settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
    const config = { ...defaultSettings, ...kv_settings };
    
    // 认证
    const token = url.searchParams.get('token');
    if (!token || token !== config.mytoken) {
        return new Response('Invalid token', { status: 403 });
    }

    // ...函数开始部分...
    // [修改] 获取和合并订阅 (V2 - 支持节点重命名)
    const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
    const enabledMisubs = misubs.filter(sub => sub.enabled);
    let manualNodes = '';

    const httpSubs = enabledMisubs.filter(sub => sub.url.toLowerCase().startsWith('http'));
    enabledMisubs.forEach(sub => {
        if (!sub.url.toLowerCase().startsWith('http')) {
            manualNodes += sub.url + '\n';
        }
    });

    // [修改] 并行处理所有HTTP订阅 (V7 - 兼容Windows换行符)
    const subPromises = httpSubs.map(async (sub) => {
        try {
            const requestHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
            };

            const fetchPromise = fetch(new Request(sub.url, {
                headers: requestHeaders,
                redirect: "follow",
                cf: { insecureSkipVerify: true }
            }));

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timed out')), 10000)
            );

            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                console.log(`Failed to fetch ${sub.url}: Status ${response.status}`);
                return '';
            }

            let text = await response.text();
            
            try {
                const cleanedText = text.replace(/\s/g, '');
                if (cleanedText.length > 20 && /^[A-Za-z0-9+/=]+$/.test(cleanedText)) {
                    const binaryString = atob(cleanedText);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    text = new TextDecoder('utf-8').decode(bytes);
                }
            } catch (e) { /* 不是Base64, 忽略错误 */ }
            
            // [核心修正] 先将所有 \r\n 替换为 \n，再进行处理
            const cleanText = text.replace(/\r\n/g, '\n');

            if (config.prependSubName && sub.name) {
                const nodes = cleanText.split('\n').map(line => line.trim()).filter(line => line);
                const prefixedNodes = nodes.map(node => prependNodeName(node, sub.name)); 
                return prefixedNodes.join('\n');
            }
            // 对于不加前缀的情况，也要确保返回的是清理过换行符的内容
            return cleanText;
        } catch (e) {
            console.log(`Failed to process ${sub.url}: ${e.message}`);
            return ''; 
        }
    });

    const processedSubContents = await Promise.all(subPromises);
    const subContent = processedSubContents.join('\n');

    // [核心修正] 在合并所有节点后，进行去重处理
    const allNodesAsText = (manualNodes + subContent);
    const uniqueNodes = [...new Set(allNodesAsText.split(/\r?\n/).map(line => line.trim()).filter(line => line))];
    const combinedContent = uniqueNodes.join('\n');
    const base64Data = btoa(unescape(encodeURIComponent(combinedContent)));
    // ...后续代码...
    
    // 根据UA或参数决定输出格式
    let targetFormat = 'base64';
    const ua = userAgentHeader.toLowerCase();
    const urlTarget = url.searchParams.get('target');

    if (urlTarget) {
        targetFormat = urlTarget;
    } else {
        if (ua.includes('clash')) targetFormat = 'clash';
        else if (ua.includes('sing-box') || ua.includes('singbox')) targetFormat = 'singbox';
        else if (ua.includes('surge')) targetFormat = 'surge';
    }
    
    // 直接返回 Base64
    if (targetFormat === 'base64') {
        return new Response(base64Data, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    // --- 内置转换逻辑 ---
    let convertedContent = '';
    let fileExtension = 'txt';

    if (targetFormat === 'clash') {
        convertedContent = generateClashConfig(combinedContent);
        fileExtension = 'yaml';
    } else { // 为所有其他格式提供一个基础的、未转换的占位符
        convertedContent = `# ${targetFormat} conversion is not fully implemented yet.\n# Raw nodes:\n${combinedContent}`;
        fileExtension = 'txt';
    }

    // 返回转换后的配置文件
    return new Response(convertedContent, {
        headers: {
            "Content-Disposition": `attachment; filename*=utf-8''${encodeURIComponent(config.FileName)}.${fileExtension}`,
            "content-type": "text/plain; charset=utf-8",
        }
    });
}

// --- Cloudflare Pages Functions 入口 ---
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    try {
        if (url.pathname.startsWith('/api/')) return handleApiRequest(request, env);
        if (url.pathname === '/sub') return handleMisubRequest(request, env);
        return next();
    } catch (e) {
        console.error("Critical error in onRequest:", e);
        if (e instanceof Error) {
            return new Response(e.message, { status: 500 });
        }
        return new Response("Internal Server Error", { status: 500 });
    }
}

// --- [新增] 内置订阅转换逻辑 ---

/**
 * 解析单个节点链接 - v3 (Hysteria2, TUIC, REALITY 支持)
 * @param {string} link 
 * @returns {object|null}
 */
/**
 * 解析单个节点链接 - v4 (SS协议解析修正版)
 * @param {string} link 
 * @returns {object|null}
 */
/**
 * 解析单个节点链接 - v4 (Hysteria2 alpn 支持)
 * @param {string} link 
 * @returns {object|null}
 */
function parseNodeLink(link) {
    if (link.startsWith('vmess://')) {
        try {
            const decoded = JSON.parse(atob(link.substring(8)));
            return { protocol: 'vmess', name: decoded.ps || decoded.add, server: decoded.add, port: decoded.port, uuid: decoded.id, alterId: decoded.aid, cipher: decoded.scy || 'auto', network: decoded.net, type: decoded.type, host: decoded.host, path: decoded.path, tls: decoded.tls === 'tls', sni: decoded.sni || decoded.host };
        } catch (e) { return null; }
    }
    if (link.startsWith('vless://') || link.startsWith('trojan://')) {
        try {
            const url = new URL(link);
            const params = new URLSearchParams(url.search);
            return { protocol: url.protocol.replace(':', ''), name: decodeURIComponent(url.hash).substring(1) || url.hostname, server: url.hostname, port: url.port, uuid: url.username, password: url.username, sni: params.get('sni') || url.hostname, udp: true, tls: params.get('security') === 'tls' || params.get('security') === 'reality', security: params.get('security'), publicKey: params.get('pbk'), shortId: params.get('sid'), fingerprint: params.get('fp'), network: params.get('type'), serviceName: params.get('serviceName'), mode: params.get('mode'), path: params.get('path'), host: params.get('host') };
        } catch (e) { return null; }
    }
    if (link.startsWith('ss://')) {
        try {
            const url = new URL(link);
            const hashName = decodeURIComponent(url.hash).substring(1);
            let cipher, password;
            if (url.username) {
                const decodedUserInfo = atob(url.username);
                const colonIndex = decodedUserInfo.indexOf(':');
                if (colonIndex !== -1) {
                    cipher = decodedUserInfo.substring(0, colonIndex);
                    password = decodedUserInfo.substring(colonIndex + 1);
                }
            }
            if (!cipher || !password) return null;
            return { protocol: 'ss', name: hashName || url.hostname, server: url.hostname, port: url.port, cipher: cipher, password: password };
        } catch (e) { return null; }
    }
    if (link.startsWith('hy2://') || link.startsWith('hysteria2://')) {
        try {
            const url = new URL(link);
            const params = new URLSearchParams(url.search);
            return {
                protocol: 'hysteria2',
                name: decodeURIComponent(url.hash).substring(1) || url.hostname,
                server: url.hostname,
                port: url.port,
                password: url.username,
                sni: params.get('sni') || url.hostname,
                insecure: params.get('insecure') === '1' || params.get('skip-cert-verify') === 'true',
                alpn: params.get('alpn') // [新增] 提取 alpn 参数
            };
        } catch (e) { return null; }
    }
    if (link.startsWith('tuic://')) {
         try {
            const url = new URL(link);
            const params = new URLSearchParams(url.search);
            const [uuid, password] = url.username.split(':');
            return { protocol: 'tuic', name: decodeURIComponent(url.hash).substring(1) || url.hostname, server: url.hostname, port: url.port, uuid: uuid, password: password, sni: params.get('sni') || url.hostname, insecure: params.get('allow_insecure') === '1' || params.get('skip-cert-verify') === 'true', 'udp-relay-mode': params.get('udp_relay_mode') || 'native', alpn: params.get('alpn') };
        } catch (e) { return null; }
    }
    return null;
}

/**
 * 根据节点列表生成一个功能完备的Clash配置文件 - v5 (Hysteria2 最终修正版)
 * @param {string} nodesString
 * @returns {string}
 */
function generateClashConfig(nodesString) {
    const proxies = nodesString.split('\n')
        .map(link => parseNodeLink(link.trim()))
        .filter(Boolean); 

    if (proxies.length === 0) return yaml.dump({ 'proxies': [] });

    const proxyDetails = proxies.map(p => {
        let entry = {
            name: p.name,
            type: p.protocol,
            server: p.server,
            port: p.port,
        };

        switch (p.protocol) {
            case 'vmess':
            case 'vless':
                entry.uuid = p.uuid;
                entry.udp = true;
                entry.tls = p.tls;
                entry.servername = p.sni;
                entry['client-fingerprint'] = p.fingerprint || 'chrome';
                if (p.security === 'reality') {
                    entry['reality-opts'] = {
                        'public-key': p.publicKey,
                        'short-id': p.shortId || ''
                    };
                }
                if (p.network === 'ws') {
                    entry.network = 'ws';
                    entry['ws-opts'] = {
                        path: p.path || '/',
                        headers: { Host: p.host || p.server }
                    };
                }
                if (p.protocol === 'vmess') {
                    entry.cipher = p.cipher || 'auto';
                    entry.alterId = p.alterId || 0;
                }
                break;
            case 'trojan':
                entry.password = p.password;
                entry.sni = p.sni;
                entry.udp = true;
                break;
            case 'ss':
                entry.cipher = p.cipher;
                entry.password = p.password;
                break;
            // [最终修正] Hysteria2 支持
            case 'hysteria2':
                entry.type = 'hysteria2'; // 关键修正：使用 hysteria2 作为类型
                entry.password = p.password;
                entry.auth = p.password; // 关键补充：增加 auth 字段
                entry.sni = p.sni;
                entry['skip-cert-verify'] = p.insecure;
                if (p.alpn) {
                    entry.alpn = [p.alpn]; // 关键补充：增加 alpn 字段
                }
                break;
            case 'tuic':
                entry.type = 'tuic';
                entry.uuid = p.uuid;
                entry.password = p.password;
                entry.sni = p.sni;
                entry['skip-cert-verify'] = p.insecure;
                entry['udp-relay-mode'] = p['udp-relay-mode'];
                if (p.alpn) entry.alpn = [p.alpn];
                break;
        }
        return entry;
    });

    const configObject = {
        'port': 7890,
        'socks-port': 7891,
        'allow-lan': false,
        'mode': 'Rule',
        'log-level': 'info',
        'external-controller': '127.0.0.1:9090',
        'proxies': proxyDetails,
        'proxy-groups': [{
            name: "PROXY",
            type: 'select',
            proxies: proxies.map(p => p.name)
        }],
        'rules': [
            'MATCH,PROXY'
        ]
    };

    return yaml.dump(configObject);
}