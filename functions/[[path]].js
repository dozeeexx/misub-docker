import yaml from 'js-yaml';

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
  subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini'
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

    // 获取和合并订阅
    const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
    const enabledMisubs = misubs.filter(sub => sub.enabled);
    let urls = [], manualNodes = '';
    for (const sub of enabledMisubs) {
        if (sub.url.toLowerCase().startsWith('http')) urls.push(sub.url);
        else manualNodes += sub.url + '\n';
    }
    
    let subContent = '';
    if (urls.length > 0) {
        const responses = await Promise.allSettled(urls.map(apiUrl => fetch(new Request(apiUrl, { headers: {'User-Agent': `MiSub-Fetcher`}, redirect: "follow"})).then(res => res.ok ? res.text() : Promise.reject())));
        for (const response of responses) {
            if (response.status === 'fulfilled') {
                const text = response.value;
                if (text.includes('://')) { subContent += text + '\n'; }
                else { try { subContent += atob(text.replace(/\s/g, '')) + '\n'; } catch (e) {} }
            }
        }
    }
    
    const combinedContent = (manualNodes + subContent).split('\n').filter(line => line.trim()).join('\n');
    const base64Data = btoa(unescape(encodeURIComponent(combinedContent)));
    
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
 * 解析单个节点链接 (简化版)
 * @param {string} link 
 * @returns {object|null}
 */
function parseNodeLink(link) {
    if (!link || !link.includes('://')) return null;
    try {
        // 尝试从 # 后面获取名称
        const hashIndex = link.lastIndexOf('#');
        const name = hashIndex !== -1 ? decodeURIComponent(link.substring(hashIndex + 1)) : null;

        const mainPart = hashIndex !== -1 ? link.substring(0, hashIndex) : link;
        const protocol = mainPart.substring(0, mainPart.indexOf('://'));
        
        let server = '', port = '';
        
        // 极简解析, 仅为演示, 非常不完善
        const atIndex = mainPart.lastIndexOf('@');
        if (atIndex !== -1) {
            const hostPort = mainPart.substring(atIndex + 1);
            const colonIndex = hostPort.lastIndexOf(':');
            if (colonIndex !== -1) {
                server = hostPort.substring(0, colonIndex);
                port = hostPort.substring(colonIndex + 1);
            }
        }
        
        return {
            name: name || server || 'Unnamed Node',
            protocol,
            server,
            port,
            // 注意: 缺失uuid, password等关键信息，需要在下面生成时提供默认值
        };
    } catch (e) {
        return null;
    }
}

/**
 * 根据节点列表生成一个基础的Clash配置文件 (YAML格式) - v3 (健壮版)
 * @param {string} nodesString - 包含多个节点链接的字符串，每行一个
 * @returns {string} - 生成的Clash配置字符串
 */
function generateClashConfig(nodesString) {
    const proxies = nodesString.split('\n')
        .map(link => parseNodeLink(link.trim()))
        .filter(p => p && p.name && p.server && p.port);

    if (proxies.length === 0) return "proxies: []";

    const proxyNames = proxies.map(p => p.name.replace(/"/g, ''));

    const proxyDetails = proxies.map(p => {
        const safeName = p.name.replace(/"/g, ''); // 移除名字里的引号
        let entry = {
            name: `"${safeName}"`,
            type: p.protocol,
            server: p.server,
            port: p.port
        };

        // 为不同协议添加最基础的、能让Clash不报错的字段
        switch (p.protocol) {
            case 'vmess':
                entry.uuid = "00000000-0000-0000-0000-000000000000";
                entry.alterId = 0;
                entry.cipher = "auto";
                break;
            case 'vless':
                 entry.uuid = "00000000-0000-0000-0000-000000000000";
                 entry.udp = true;
                break;
            case 'trojan':
                entry.password = "password";
                break;
            case 'ss':
                entry.cipher = "aes-256-gcm";
                entry.password = "password";
                break;
        }

        const configString = Object.entries(entry)
                                   .map(([key, value]) => `${key}: ${value}`)
                                   .join(', ');

        return `  - { ${configString} }`;
    }).join('\n');

    // 使用 js-yaml 库来确保输出是合法的 YAML
    const configObject = {
        'port': 7890,
        'socks-port': 7891,
        'allow-lan': false,
        'mode': 'Rule',
        'log-level': 'info',
        'external-controller': '127.0.0.1:9090',
        'proxies': yaml.load(proxyDetails), // 将节点字符串解析为JS对象
        'proxy-groups': [{
            name: "PROXY",
            type: 'select',
            proxies: proxyNames
        }],
        'rules': [
            'MATCH,PROXY'
        ]
    };

    return yaml.dump(configObject);
}