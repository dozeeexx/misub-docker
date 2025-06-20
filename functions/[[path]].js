import yaml from 'js-yaml';

// --- 全局常量 ---
const KV_KEY_MAIN = 'misub_data_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const defaultSettings = {
  FileName: 'MiSub',
  mytoken: 'auto',
  // 注意：subConverter 和 subConfig 在此模式下已无效，但保留以兼容旧设置
  subConverter: 'subapi.cmliussss.com',
  subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini',
  prependSubName: true,
  autoGroups: `{"PROXY":["."],"DIRECT":["direct"],"REJECT":["reject"]}`, // [新增] 默认分组关键词
  customRules: "[]" // [新增] 默认规则
};

// --- 认证相关的核心工具函数 (无需修改) ---
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

// --- API 请求处理 (无需修改) ---
async function handleApiRequest(request, env) {
    // ... 此函数与之前版本相同，无需改动 ...
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
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
    return new Response('API route not found', { status: 404 });
}

// [最终版] 完全自托管的订阅处理函数
async function handleMisubRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    const kv_settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
    const config = { ...defaultSettings, ...kv_settings };
    
    const token = url.searchParams.get('token');
    if (!token || token !== config.mytoken) {
        return new Response('Invalid token', { status: 403 });
    }

    const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
    const enabledMisubs = misubs.filter(sub => sub.enabled);
    let manualNodes = '';
    const httpSubs = enabledMisubs.filter(sub => sub.url.toLowerCase().startsWith('http') ? true : (manualNodes += sub.url + '\n', false));

    const subPromises = httpSubs.map(async (sub) => {
        try {
            const requestHeaders = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' };
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
            const cleanText = text.replace(/\r\n/g, '\n');
            if (config.prependSubName && sub.name) {
                return cleanText.split('\n').map(line => line.trim()).filter(line => line).map(node => prependNodeName(node, sub.name)).join('\n');
            }
            return cleanText;
        } catch (e) { return ''; }
    });

    const processedSubContents = await Promise.all(subPromises);
    const combinedContent = (manualNodes + processedSubContents.join('\n'));
    const uniqueNodes = [...new Set(combinedContent.split('\n').map(line => line.trim()).filter(line => line))];
    const finalNodesString = uniqueNodes.join('\n');

    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";
    let targetFormat = 'base64';
    const urlTarget = url.searchParams.get('target');
    if (urlTarget) {
        targetFormat = urlTarget;
    } else {
        const ua = userAgentHeader.toLowerCase();
        if (ua.includes('clash')) targetFormat = 'clash';
    }

    let outputBody = '';
    let outputHeaders = { "Content-Type": "text/plain; charset=utf-8" };

    if (targetFormat === 'base64') {
        outputBody = btoa(unescape(encodeURIComponent(finalNodesString)));
    } else if (targetFormat === 'clash') {
        outputBody = generateClashConfig(finalNodesString, config);
        outputHeaders['Content-Disposition'] = `attachment; filename*=utf-8''${encodeURIComponent(config.FileName)}.yaml`;
    }

    return new Response(outputBody, { headers: outputHeaders });
}

// --- 主入口 ---
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    try {
        if (url.pathname.startsWith('/api/')) return handleApiRequest(request, env);
        if (url.pathname === '/sub') return handleMisubRequest(context);
        return next();
    } catch (e) {
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
  const newName = `${prefix} - ${originalName}`;
  return `${baseLink}#${encodeURIComponent(newName)}`;
}

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
            return { protocol: 'hysteria2', name: decodeURIComponent(url.hash).substring(1) || url.hostname, server: url.hostname, port: url.port, password: url.username, sni: params.get('sni') || url.hostname, insecure: params.get('insecure') === '1' || params.get('skip-cert-verify') === 'true', alpn: params.get('alpn') };
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
 * 根据节点列表和内置设置生成最终Clash配置 - v11 (内置精选规则与分组)
 * @param {string} nodesString
 * @param {object} config - 包含了 autoGroups, customRules 等设置的对象
 * @returns {string} - 生成的Clash配置字符串
 */
function generateClashConfig(nodesString, config) {
    // 1. 解析和准备节点
    let proxies = nodesString.split('\n').map(link => parseNodeLink(link.trim())).filter(Boolean);
    const nameCounts = new Map();
    proxies = proxies.map(p => {
        if (!p.name) p.name = `${p.protocol}-${p.server}:${p.port}`;
        const originalName = p.name;
        const count = nameCounts.get(originalName) || 0;
        if (count > 0) p.name = `${originalName} ${count + 1}`;
        nameCounts.set(originalName, (count + 1));
        return p;
    });
    
    const proxyDetails = proxies.map(p => {
        let entry = { name: p.name, type: p.protocol, server: p.server, port: p.port };
        switch (p.protocol) {
            case 'vmess': case 'vless':
                entry.uuid = p.uuid; entry.udp = true; entry.tls = p.tls; entry.servername = p.sni; entry['client-fingerprint'] = p.fingerprint || 'chrome';
                if (p.security === 'reality') { entry['reality-opts'] = { 'public-key': p.publicKey, 'short-id': p.shortId || '' }; }
                if (p.network === 'ws') { entry.network = 'ws'; entry['ws-opts'] = { path: p.path || '/', headers: { Host: p.host || p.server } }; }
                if (p.protocol === 'vmess') { entry.cipher = p.cipher || 'auto'; entry.alterId = p.alterId || 0; }
                break;
            case 'trojan': entry.password = p.password; entry.sni = p.sni; entry.udp = true; break;
            case 'ss': entry.cipher = p.cipher; entry.password = p.password; break;
            case 'hysteria2': entry.type = 'hysteria2'; entry.password = p.password; entry.auth = p.password; entry.sni = p.sni; entry['skip-cert-verify'] = p.insecure; if (p.alpn) { entry.alpn = [p.alpn]; } break;
            case 'tuic': entry.type = 'tuic'; entry.uuid = p.uuid; entry.password = p.password; entry.sni = p.sni; entry['skip-cert-verify'] = p.insecure; entry['udp-relay-mode'] = p['udp-relay-mode']; if (p.alpn) entry.alpn = [p.alpn]; break;
        }
        return entry;
    });

    const proxyNames = proxies.map(p => p.name);

    // 2. 根据设置中的关键词，自动生成地区分组
    let autoGroups = [];
    let autoGroupNames = [];
    try {
        const autoGroupSettings = JSON.parse(config.autoGroups || '{}');
        for (const groupName in autoGroupSettings) {
            const keywords = autoGroupSettings[groupName].map(k => k.toLowerCase());
            const matchedProxies = proxyNames.filter(name => keywords.some(kw => name.toLowerCase().includes(kw)));
            if (matchedProxies.length > 0) {
                autoGroups.push({ name: groupName, type: 'select', proxies: matchedProxies });
                autoGroupNames.push(groupName);
            }
        }
    } catch(e) { console.error("解析自动分组关键词失败:", e); }

    // 3. 定义一套高质量的内置策略组
    const functionalGroups = [
        { name: '国外媒体', type: 'select', proxies: ['PROXY', 'DIRECT', ...autoGroupNames] },
        { name: '国内媒体', type: 'select', proxies: ['DIRECT', 'PROXY'] },
        { name: '苹果服务', type: 'select', proxies: ['DIRECT', 'PROXY'] },
        { name: '微软服务', type: 'select', proxies: ['DIRECT', 'PROXY'] },
        { name: '广告拦截', type: 'select', proxies: ['REJECT', 'DIRECT'] },
        { name: '最终选择', type: 'select', proxies: ['PROXY', 'DIRECT'] }
    ];
    
    // 4. 定义主选择器和自动测速组
    const mainGroups = [
      { name: 'PROXY', type: 'select', proxies: ['自动测速', ...autoGroupNames, ...functionalGroups.map(g => g.name)] },
      { name: '自动测速', type: 'url-test', proxies: proxyNames, url: 'http://www.gstatic.com/generate_204', interval: 300 }
    ];

    // 5. 定义一套精选的内置规则
    const defaultRules = [
        'DOMAIN-SUFFIX,ad.com,广告拦截',
        'DOMAIN-KEYWORD,ad,广告拦截',
        'DOMAIN-SUFFIX,googlesyndication.com,广告拦截',
        'DOMAIN-SUFFIX,google-analytics.com,广告拦截',
        'DOMAIN-SUFFIX,doubleclick.net,广告拦截',
        'DOMAIN-SUFFIX,bilibili.com,国内媒体',
        'DOMAIN-SUFFIX,iqiyi.com,国内媒体',
        'DOMAIN-SUFFIX,v.qq.com,国内媒体',
        'DOMAIN-SUFFIX,youku.com,国内媒体',
        'DOMAIN-SUFFIX,netflix.com,国外媒体',
        'DOMAIN-SUFFIX,youtube.com,国外媒体',
        'DOMAIN-SUFFIX,hulu.com,国外媒体',
        'DOMAIN-SUFFIX,disneyplus.com,国外媒体',
        'DOMAIN-SUFFIX,apple.com,苹果服务',
        'DOMAIN-SUFFIX,itunes.apple.com,苹果服务',
        'DOMAIN-SUFFIX,microsoft.com,微软服务',
        'DOMAIN-SUFFIX,office.com,微软服务',
        'GEOIP,CN,DIRECT',
        'MATCH,最终选择'
    ];

    let finalRules = defaultRules;
    try {
        const customRulesParsed = yaml.load(config.customRules || '[]');
        if (Array.isArray(customRulesParsed) && customRulesParsed.length > 0) {
            finalRules = customRulesParsed; // 如果用户提供了自定义规则，则覆盖默认规则
        }
    } catch(e) { console.error("解析自定义规则失败:", e); }

    // 6. 组装最终配置对象
    const finalConfig = {
        'port': 7890,
        'socks-port': 7891,
        'allow-lan': false,
        'mode': 'Rule',
        'log-level': 'info',
        'external-controller': '127.0.0.1:9090',
        'dns': {
            'enable': true,
            'listen': '0.0.0.0:53',
            'default-nameserver': ['223.5.5.5', '119.29.29.29', '8.8.8.8'],
            'fallback': ['tls://1.0.0.1:853', 'https://dns.google/dns-query']
        },
        'proxies': proxyDetails,
        'proxy-groups': [...mainGroups, ...autoGroups, ...functionalGroups],
        'rules': finalRules,
    };

    return yaml.dump(finalConfig);
}