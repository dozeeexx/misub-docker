// --- 全局常量 ---
const KV_KEY_MAIN = 'misub_data_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const defaultSettings = {
  FileName: 'MiSub',
  mytoken: 'auto',
  // [最终修正] 修正为正确的、能正常工作的 subconverter 后端地址
  subConverter: 'SUBAPI.cmliussss.net', 
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

async function generateCombinedNodeList(context, config) {
    const { env } = context;
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

            return cleanText.split('\n').map(line => line.trim()).filter(line => line).map(node => {
                const hashIndex = node.lastIndexOf('#');
                if (hashIndex === -1) {
                    if (config.prependSubName && sub.name) {
                        return `${node}#${encodeURIComponent(sub.name)}`;
                    }
                    return node;
                }
                const baseLink = node.substring(0, hashIndex);
                let name = decodeURIComponent(node.substring(hashIndex + 1));
                
                const cleanedName = name.replace(/^.*?\s-\s/, '').trim();
                name = cleanedName || name;
                
                if (config.prependSubName && sub.name && !name.startsWith(sub.name)) {
                    name = `${sub.name} - ${name}`;
                }
                
                return `${baseLink}#${encodeURIComponent(name)}`;
            }).join('\n');

        } catch (e) { 
            console.error(`Failed to fetch sub: ${sub.url}`, e);
            return ''; 
        }
    });

    const processedSubContents = await Promise.all(subPromises);
    const combinedContent = (manualNodes + processedSubContents.join('\n'));
    const uniqueNodes = [...new Set(combinedContent.split('\n').map(line => line.trim()).filter(line => line))];
    
    return uniqueNodes.join('\n');
}

// 请只替换 handleMisubRequest 这一个函数
async function handleMisubRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";

    const kv_settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
    const config = { ...defaultSettings, ...kv_settings };

    // 令牌验证逻辑 (与之前相同)
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

    // 格式判断逻辑 (与之前相同)
    let targetFormat = url.searchParams.get('target') || 'base64';
    if (!url.searchParams.has('target')) {
        const ua = userAgentHeader.toLowerCase();
        if (ua.includes('clash')) targetFormat = 'clash';
        if (ua.includes('sing-box')) targetFormat = 'singbox';
    }


    // 1. 从 KV 中获取所有订阅项
    const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
    const enabledMisubs = misubs.filter(sub => sub.enabled);

    // 2. 分离手动节点和订阅链接，并按需添加 subconverter 可识别的前缀标签
    let manualNodes = '';
    const subLinks = [];
    for (const sub of enabledMisubs) {
        if (sub.url.toLowerCase().startsWith('http')) {
            // 如果开启了前缀功能，并且该订阅有名称
            if (config.prependSubName && sub.name) {
                // 为订阅链接添加 #sub=... 标签
                subLinks.push(`${sub.url}#sub=${encodeURIComponent(sub.name)}`);
            } else {
                // 否则，使用原始链接
                subLinks.push(sub.url);
            }
        } else {
            manualNodes += sub.url + '\n';
        }
    }
    
    // 3. 将手动节点内容进行 Base64 编码，作为回调的基础
    const manualNodesBase64 = btoa(unescape(encodeURIComponent(manualNodes)));
    // 创建一个只包含手动节点的回调 URL
    const callbackUrl = `${url.protocol}//${url.host}/sub?token=${token}&target=base64_callback_for_manual_nodes`;

    // 4. 将回调 URL 和所有其他订阅链接合并成一个清单
    let finalUrlList = [callbackUrl, ...subLinks].join('|');

    // 特殊处理：当请求是 base64_callback_for_manual_nodes 时，只返回手动节点
    if (targetFormat === 'base64_callback_for_manual_nodes') {
        return new Response(manualNodesBase64);
    }

    // 5. 如果最终目标是 base64，则需要下载所有内容并合并
    if (targetFormat === 'base64') {
        const subPromises = subLinks.map(link => 
            fetch(link, { headers: { 'User-Agent': userAgentHeader }})
            .then(res => res.ok ? res.text() : '')
            .catch(() => '')
        );
        const subContents = await Promise.all(subPromises);
        let allNodes = manualNodes;
        subContents.forEach(content => {
             try {
                // 尝试解码可能的base64内容
                const decoded = atob(content.replace(/\s/g, ''));
                allNodes += decoded + '\n';
             } catch(e) {
                allNodes += content + '\n';
             }
        });
        const uniqueNodes = [...new Set(allNodes.split('\n').map(line => line.trim()).filter(line => line))].join('\n');
        const base64Content = btoa(unescape(encodeURIComponent(uniqueNodes)));
        return new Response(base64Content, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    
    // 6. 对于 Clash 等格式，将 URL 清单发送给 subconverter
    const subconverterUrl = new URL(`https://${config.subConverter}/sub`);
    subconverterUrl.searchParams.set('target', targetFormat);
    subconverterUrl.searchParams.set('url', finalUrlList);
    subconverterUrl.searchParams.set('config', config.subConfig);
    subconverterUrl.searchParams.set('new_name', 'false');
    subconverterUrl.searchParams.set('emoji', 'true');
    subconverterUrl.searchParams.set('scv', 'true');

    try {
        const subconverterResponse = await fetch(subconverterUrl.toString());

        // 采用优雅降级策略
        if (!subconverterResponse.ok) {
            console.error(`Subconverter failed, falling back to base64. Status: ${subconverterResponse.status}`);
            // 触发一次 base64 的生成并返回
            return handleMisubRequest({
                ...context,
                request: new Request(`${url.protocol}//${url.host}/sub?token=${token}&target=base64`, request)
            });
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
        console.error(`[MiSub Final Error] ${error.message}`);
        // 最终的降级策略
        return handleMisubRequest({
            ...context,
            request: new Request(`${url.protocol}//${url.host}/sub?token=${token}&target=base64`, request)
        });
    }
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
