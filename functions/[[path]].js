// --- 全局常量 ---
const KV_KEY_MAIN = 'misub_data_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;

// [最终版] 默认设置
const defaultSettings = {
  FileName: 'MiSub',
  mytoken: 'auto',
  subConverter: 'subapi.cmliussss.net', 
  subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini',
  prependSubName: true
};

// --- 认证与API处理的核心函数 (无修改) ---
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
            // --- 请将下面这个完整的“终极诊断”代码块添加到您的 switch 语句中 ---
            case '/debug_final': {
                // 辅助函数1: 标准化VMess链接
                function normalizeVmessLink(link) {
                    if (!link.startsWith('vmess://')) {
                        return link;
                    }
                    try {
                        const hashIndex = link.lastIndexOf('#');
                        const hasFragment = hashIndex !== -1;
                        const linkBody = hasFragment ? link.substring(0, hashIndex) : link;
                        let fragment = hasFragment ? link.substring(hashIndex) : '';
                        const base64Part = linkBody.substring(8);
                        const decodedJson = atob(base64Part);
                        const parsedJson = JSON.parse(decodedJson);
                        if (!hasFragment && parsedJson.ps) {
                            fragment = '#' + encodeURIComponent(parsedJson.ps);
                        }
                        const minifiedJson = JSON.stringify(parsedJson);
                        const newBase64Part = btoa(unescape(encodeURIComponent(minifiedJson)));
                        return `vmess://${newBase64Part}${fragment}`;
                    } catch (e) {
                        return `ERROR_NORMALIZING_LINK: ${e.message}`; // 在出错时返回明确的错误信息
                    }
                }

                // 辅助函数2: 添加前缀
                function prependNodeName(link, prefix) {
                    if (!prefix || link.startsWith('ERROR')) return link;
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

                // --- 诊断主逻辑 ---
                const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
                let manualNodesContent = '';
                const manualEntries = misubs.filter(sub => sub.enabled && !sub.url.toLowerCase().startsWith('http'));
                
                if (manualEntries.length > 0) {
                    manualNodesContent = manualEntries.map(sub => sub.url).join('\n');
                }

                const lines = manualNodesContent.split('\n').map(line => line.trim()).filter(Boolean);
                
                const debugOutput = lines.map(line => {
                    if (!line.startsWith('vmess://')) {
                        return {
                            "输入链接 (Input)": line,
                            "备注 (Note)": "非VMess节点，跳过详细诊断"
                        };
                    }
                    const normalizedLink = normalizeVmessLink(line);
                    const finalLink = prependNodeName(normalizedLink, '手动节点');
                    return {
                        "输入链接 (Input)": line,
                        "标准化后 (Normalized)": normalizedLink,
                        "添加前缀后 (Final)": finalLink,
                        "是否被成功修改 (Was_Modified)": (line !== normalizedLink && !normalizedLink.startsWith('ERROR'))
                    };
                });

                return new Response(JSON.stringify(debugOutput, null, 2), {
                    headers: { 'Content-Type': 'application/json; charset=utf-8' }
                });
            }
            // --- 诊断代码块结束 ---
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

// [最终版函数 1/3] 名称前缀辅助函数
function prependNodeName(link, prefix) {
    if (!prefix || link.startsWith('ERROR')) return link;
    try {
        const url = new URL(link);
        const originalName = url.hash.startsWith('#') ? decodeURIComponent(url.hash.substring(1)) : '';
        if (originalName && originalName.startsWith(prefix)) {
            return link;
        }
        const newName = prefix + (originalName ? ` - ${originalName}` : '');
        url.hash = encodeURIComponent(newName);
        return url.toString();
    } catch (e) {
        console.error("为链接添加前缀时出错:", link, e);
        return link; // 出错时返回原始链接
    }
}

// [最终版函数 2/3] VMess链接标准化辅助函数 (借鉴CF-Workers-SUB思想重写)
function normalizeVmessLink(link) {
    if (!link.startsWith('vmess://')) {
        return link;
    }
    try {
        const url = new URL(link);
        const base64Part = url.pathname.slice(2); // 移除开头的 "//"
        
        let decodedJsonString;
        try {
            // 标准的atob足以解码含有换行符的Base64，问题出在后续的btoa
            decodedJsonString = atob(base64Part);
        } catch (e) {
            console.error("Base64解码失败:", base64Part, e);
            return link; // 解码失败则返回原始链接
        }

        const parsedJson = JSON.parse(decodedJsonString);

        // 如果原始链接没有#节点名，则从JSON的ps字段中提取并创建
        if (!url.hash && parsedJson.ps) {
            url.hash = encodeURIComponent(parsedJson.ps);
        }

        // 核心：将解析后的JSON对象压缩为单行字符串
        const minifiedJsonString = JSON.stringify(parsedJson);

        // 核心修正：使用 TextEncoder 将UTF-8字符串安全地转为字节数组
        const utf8Bytes = new TextEncoder().encode(minifiedJsonString);
        
        // 将字节数组转换为二进制字符串，这是btoa所需要的输入格式
        let binaryString = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            binaryString += String.fromCharCode(utf8Bytes[i]);
        }
        
        // 用净化后的数据重新编码为Base64
        const newBase64Part = btoa(binaryString);
        
        url.pathname = `//${newBase64Part}`;
        return url.toString();

    } catch (e) {
        console.error("无法标准化VMess链接，将返回原始链接:", link, e);
        return link;
    }
}

// [最终版函数 3/3] 节点列表生成函数 (调用最终版函数)
async function generateCombinedNodeList(context, config, userAgent) {
    const { env } = context;
    const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
    const enabledMisubs = misubs.filter(sub => sub.enabled);

    const manualEntries = [];
    const httpSubs = [];

    for (const sub of enabledMisubs) {
        if (sub.url.toLowerCase().startsWith('http')) {
            httpSubs.push(sub);
        } else {
            manualEntries.push(sub);
        }
    }

    let processedManualNodes = [];
    for (const entry of manualEntries) {
        let content = entry.url;
        try {
            const cleaned = content.replace(/\s/g, '');
            if (cleaned.length > 20 && /^[A-Za-z0-9+/=]{20,}$/.test(cleaned)) {
                content = atob(cleaned);
            }
        } catch (e) {}

        const nodes = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && new RegExp('(ss|ssr|vmess|vless|trojan|hysteria2?):\\/\\/').test(line))
            .map(node => normalizeVmessLink(node))
            .map(node => prependNodeName(node, entry.name || '手动节点'));
        
        processedManualNodes.push(...nodes);
    }

    const subPromises = httpSubs.map(async (sub) => {
        try {
            const response = await fetch(new Request(sub.url, { headers: { 'User-Agent': userAgent }, redirect: "follow", cf: { insecureSkipVerify: true } }));
            if (!response.ok) return '';
            let text = await response.text();
            
            try {
                const cleanedText = text.replace(/\s/g, '');
                if (cleanedText.length > 20 && /^[A-Za-z0-9+/=]+$/.test(cleanedText)) {
                    text = atob(cleanedText);
                }
            } catch (e) {}
            
            let validNodes = text.replace(/\r\n/g, '\n').split('\n')
                .map(line => line.trim())
                .filter(line => line && new RegExp('(ss|ssr|vmess|vless|trojan|hysteria2?):\\/\\/').test(line))
                .map(node => normalizeVmessLink(node));

            validNodes = validNodes.filter(nodeLink => !nodeLink.includes('ERROR_NORMALIZING_LINK'));

            return (config.prependSubName && sub.name) 
                ? validNodes.map(node => prependNodeName(node, sub.name)).join('\n')
                : validNodes.join('\n');
        } catch (e) { 
            console.error(`Failed to fetch sub: ${sub.url}`, e);
            return ''; 
        }
    });

    const processedSubContents = await Promise.all(subPromises);
    const combinedContent = (processedManualNodes.join('\n') + '\n' + processedSubContents.join('\n'));

    return [...new Set(combinedContent.split('\n').map(line => line.trim()).filter(line => line))].join('\n');
}

// --- [优化版] 订阅处理函数 ---
async function handleMisubRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";

    // --- 核心优化：并行读取两个KV，减少串行延迟 ---
    const [kv_settings_data, misubs_data] = await Promise.all([
        env.MISUB_KV.get(KV_KEY_SETTINGS, 'json'),
        env.MISUB_KV.get(KV_KEY_MAIN, 'json')
    ]);
    const settings = kv_settings_data || {};
    const misubs = misubs_data || [];
    // --- 优化结束 ---

    const config = { ...defaultSettings, ...settings };

    let token = '';
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0 && pathSegments[0] !== 'sub') {
        token = pathSegments[0];
    } else {
        token = url.searchParams.get('token');
    }
    if (!token || token !== config.mytoken) {
        const callbackToken = url.searchParams.get('callback_token');
        if (!callbackToken || callbackToken !== (await getCallbackToken(env))) {
            return new Response('Invalid token', { status: 403 });
        }
    }

    let targetFormat = url.searchParams.get('target') || 'base64';
    if (!url.searchParams.has('target')) {
        const ua = userAgentHeader.toLowerCase();
        if (ua.includes('clash')) targetFormat = 'clash';
        if (ua.includes('sing-box')) targetFormat = 'singbox';
    }

    // 将已读取的 misubs 列表传递给处理函数
    const combinedNodeList = await generateCombinedNodeList(context, config, userAgentHeader, misubs);
    const base64Content = btoa(unescape(encodeURIComponent(combinedNodeList)));

    if (targetFormat === 'base64') {
        const headers = { "Content-Type": "text/plain; charset=utf-8", 'Cache-Control': 'no-store, no-cache' };
        return new Response(base64Content, { headers });
    }

    const callbackToken = await getCallbackToken(env);
    const callbackUrl = `${url.protocol}//${url.host}${url.pathname}?token=${token}&target=base64&callback_token=${callbackToken}`;
    
    if (url.searchParams.get('callback_token') === callbackToken) {
         const headers = { "Content-Type": "text/plain; charset=utf-8", 'Cache-Control': 'no-store, no-cache' };
        return new Response(base64Content, { headers });
    }
    
    const subconverterUrl = new URL(`https://${config.subConverter}/sub`);
    subconverterUrl.searchParams.set('target', targetFormat);
    subconverterUrl.searchParams.set('url', callbackUrl);
    subconverterUrl.searchParams.set('config', config.subConfig);
    subconverterUrl.searchParams.set('new_name', 'true');

    try {
        const subconverterResponse = await fetch(subconverterUrl.toString(), {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' }, // 固定UA
        });

        if (!subconverterResponse.ok) {
            const errorBody = await subconverterResponse.text();
            throw new Error(`Subconverter service returned status: ${subconverterResponse.status}. Body: ${errorBody}`);
        }

        let originalText = await subconverterResponse.text();
        const correctedText = originalText
            .replace(/^Proxy:/m, 'proxies:')
            .replace(/^Proxy Group:/m, 'proxy-groups:')
            .replace(/^Rule:/m, 'rules:');

        const responseHeaders = new Headers(subconverterResponse.headers);
        responseHeaders.set("Content-Disposition", `attachment; filename*=utf-8''${encodeURIComponent(config.FileName)}`);
        responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
        responseHeaders.set('Cache-Control', 'no-store, no-cache');

        return new Response(correctedText, {
            status: subconverterResponse.status,
            statusText: subconverterResponse.statusText,
            headers: responseHeaders
        });
    } catch (error) {
        console.error(`[MiSub Final Error] ${error.message}`);
        return new Response(`Error connecting to subconverter: ${error.message}`, { status: 502 });
    }
}


// --- 新增的辅助函数，用于生成和获取一个稳定的回调Token ---
async function getCallbackToken(env) {
    const secret = env.COOKIE_SECRET || 'default-callback-secret';
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode('callback-static-data'));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}


// --- Cloudflare Pages Functions 主入口 (无修改) ---
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
