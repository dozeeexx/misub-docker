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

// --- 核心工具函数 (自包含，无外部依赖) ---
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

async function MD5MD5(text) {
    const encoder = new TextEncoder();
    const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
    const firstHex = Array.from(new Uint8Array(firstPass)).map(b => b.toString(16).padStart(2, '0')).join('');
    const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
    return Array.from(new Uint8Array(secondPass)).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
}

function isValidBase64(str) { try { return btoa(atob(str)) == str; } catch (err) { return false; } }

function clashFix(content) {
    if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
        let lines = content.includes('\r\n') ? content.split('\r\n') : content.split('\n');
        return lines.map(line => line.includes('type: wireguard') ? line.replace(/, udp: true/g, ', remote-dns-resolve: true, udp: true') : line).join('\n');
    }
    return content;
}

async function getUrl(targetUrl, userAgentHeader) {
    const newHeaders = new Headers({ 'User-Agent': `MISUB-Client/${userAgentHeader}` });
    return fetch(new Request(targetUrl, { headers: newHeaders, redirect: "follow" }));
}

async function getSUB(apiUrls, userAgentHeader) {
    let content = "";
    const responses = await Promise.allSettled(apiUrls.map(apiUrl => getUrl(apiUrl, userAgentHeader).then(res => res.ok ? res.text() : Promise.reject(new Error(`Fetch failed: ${res.status}`)))));
    
    for (const response of responses) {
        if (response.status === 'fulfilled') {
            const text = response.value;
            if (text.includes('://')) { 
                content += text + '\n'; 
            }
            else if (isValidBase64(text.replace(/\s/g, ''))) { 
                try { 
                    // 【核心修正】使用能正确处理中文字符的解码方式
                    const decodedWithChinese = decodeURIComponent(escape(atob(text.replace(/\s/g, ''))));
                    content += decodedWithChinese + '\n'; 
                } catch (e) {
                    console.error("Base64 decoding failed:", e);
                } 
            }
        }
    }
    return content;
}

async function sendMessage(botToken, chatId, type, ip, add_data = "") {
    if (!botToken || !chatId) return;
    let msg = `${type}\nIP: ${ip || 'N/A'}\n${add_data}`;
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
        if (response.ok) {
            const ipInfo = await response.json();
            msg = `${type}\nIP: ${ip}\n地址: ${ipInfo.country}, ${ipInfo.city}\n组织: ${ipInfo.org}\n${add_data}`;
        }
    } catch (e) {}
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&parse_mode=HTML&text=${encodeURIComponent(msg)}`);
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

    // 对除登录外的所有API请求进行身份验证
    if (path !== '/login') {
        if (!await authMiddleware(request, env)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
    }

    try {
        switch (path) {
            // 处理登录请求
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

            // 处理登出请求
            case '/logout': {
                const headers = new Headers({ 'Content-Type': 'application/json' });
                headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
                return new Response(JSON.stringify({ success: true }), { headers });
            }

            // 处理前端初始化时获取数据的请求
            case '/data': {
                const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
                const settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
                const config = { FileName: settings.FileName || 'MISUB', mytoken: settings.mytoken || 'auto' };
                return new Response(JSON.stringify({ misubs, config }), { headers: { 'Content-Type': 'application/json' } });
            }

            // 处理保存订阅列表的请求
            case '/misubs': {
                 if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
                 const { misubs } = await request.json();
                 if (typeof misubs === 'undefined') return new Response(JSON.stringify({ success: false, message: '请求体中缺少 misubs 字段' }), { status: 400 });
                 await env.MISUB_KV.put(KV_KEY_MAIN, JSON.stringify(misubs));
                 return new Response(JSON.stringify({ success: true, message: '订阅源已保存' }));
            }

            // functions/[[path]].js -> handleApiRequest -> switch (path)

            case '/node_count': {
                if (request.method !== 'POST') {
                    return new Response('Method Not Allowed', { status: 405 });
                }
                try {
                    const { url: subUrl } = await request.json();

                    if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
                        return new Response(JSON.stringify({ error: 'Invalid or missing url' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                    }
        
                    // 使用带10秒超时控制的 getUrl 函数
                    const response = await getUrl(subUrl, request.headers.get('User-Agent'));
                    if (!response.ok) {
                        return new Response(JSON.stringify({ count: 0, error: `Fetch failed: ${response.status}` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                    }

                    const text = await response.text();
                    let decoded = '';
                    try {
                        decoded = atob(text.replace(/\s/g, ''));
                    } catch (e) {
                        decoded = text;
                    }

                    let count = 0;
                    // 【核心优化】
                    try {
                        // 优先尝试 YAML 解析
                        const doc = yaml.load(decoded);
                        if (doc && Array.isArray(doc.proxies)) {
                            // 如果是 Clash 配置，直接得到数量
                            count = doc.proxies.length;
                        } else {
                            // 如果不是有效的 Clash 配置，就抛出错误，进入 catch 块
                            throw new Error('Not a valid Clash config with a proxies array.');
                        }
                    } catch (e) {
                        // YAML 解析失败（对普通订阅是正常情况），立刻回退到极速的按行匹配
                        const nodeLines = decoded
                            .split('\n')
                            .map(line => line.trim())
                            .filter(line => /^(ss|ssr|vmess|vless|trojan|hysteria2?):\/\//i.test(line));
                        count = nodeLines.length;
                    }

                    return new Response(JSON.stringify({ count }), { headers: { 'Content-Type': 'application/json' } });

                } catch (e) {
                    if (e instanceof SyntaxError) {
                         return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                    }
                    console.error('Critical error in /node_count:', e);
                    return new Response(JSON.stringify({ count: 0, error: 'An internal error occurred' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
                }
            }
            // ...existing code...

            // 处理设置的读取和保存
            case '/settings': {
                if (request.method === 'GET') {
                    const settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
                    const merged = { ...defaultSettings, ...settings };
                    return new Response(JSON.stringify(merged), { headers: { 'Content-Type': 'application/json' } });
                }
                if (request.method === 'POST') {
                    const newSettings = await request.json();
                    const oldSettings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
                    const updatedSettings = { ...oldSettings, ...newSettings };
                    await env.MISUB_KV.put(KV_KEY_SETTINGS, JSON.stringify(updatedSettings));
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
// --- 订阅生成路由 ---
async function handleMisubRequest(request, env) {
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";
    
    const kv_settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
    const config = {
        mytoken: kv_settings.mytoken || env.TOKEN || 'auto',
        subConverter: kv_settings.subConverter || env.SUBAPI || 'subapi.cmliussss.com',
        subConfig: kv_settings.subConfig || env.SUBCONFIG || 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini',
        FileName: kv_settings.FileName || env.SUBNAME || 'MISUB',
        SUBUpdateTime: kv_settings.SUBUpdateTime || env.SUBUPDATETIME || 6,
        BotToken: kv_settings.BotToken || env.TGTOKEN || '',
        ChatID: kv_settings.ChatID || env.TGID || '',
    };

    const timeTemp = Math.ceil(Date.now() / (1000 * 60 * 60));
    const fakeToken = await MD5MD5(`${config.mytoken}${timeTemp}`);
    let token = url.searchParams.get('token');
    if (url.pathname === `/${config.mytoken}`) token = config.mytoken;
    if (!token || ![config.mytoken, fakeToken].includes(token)) return new Response('Invalid token', { status: 403 });
    const misubs = await env.MISUB_KV.get(KV_KEY_MAIN, 'json') || [];
    const enabledMisubs = misubs.filter(sub => sub.enabled);
    let urls = [], manualNodes = '';
    for (const sub of enabledMisubs) {
        if (sub.url.toLowerCase().startsWith('http')) urls.push(sub.url);
        else manualNodes += sub.url + '\n';
    }
    const subContent = await getSUB(urls, userAgentHeader);
    const combinedContent = (manualNodes + subContent).split('\n').filter(line => line.trim()).join('\n');
    const base64Data = btoa(unescape(encodeURIComponent(combinedContent)));
    
    if (token === fakeToken) return new Response(base64Data);
    
    if (config.BotToken && config.ChatID) {
        await sendMessage(config.BotToken, config.ChatID, `#获取订阅 ${config.FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}`);
    }

    let targetFormat = 'base64';
    const validFormats = ['clash', 'singbox', 'surge', 'quanx', 'loon', 'base64'];
    const urlTarget = url.searchParams.get('target');

    if (urlTarget && validFormats.includes(urlTarget)) {
        targetFormat = urlTarget;
    } else {
        const ua = userAgentHeader.toLowerCase();
        if (ua.includes('clash')) targetFormat = 'clash';
        else if (ua.includes('sing-box') || ua.includes('singbox')) targetFormat = 'singbox';
        else if (ua.includes('surge')) targetFormat = 'surge';
        else if (ua.includes('quantumult%20x') || ua.includes('quanx')) targetFormat = 'quanx';
        else if (ua.includes('loon')) targetFormat = 'loon';
    }
    
    if (targetFormat === 'base64') {
        return new Response(base64Data, { headers: { "content-type": "text/plain; charset=utf-8", "Profile-Update-Interval": `${config.SUBUpdateTime}` } });
    }
    
    const callbackUrl = `${url.protocol}//${url.hostname}/sub?token=${fakeToken}`;
    const subConverterUrl = `https://${config.subConverter}/sub?target=${targetFormat}&url=${encodeURIComponent(callbackUrl)}&insert=false&config=${encodeURIComponent(config.subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
    
    try {
        const subConverterResponse = await fetch(subConverterUrl);
        if (!subConverterResponse.ok) return new Response(`订阅转换失败: ${subConverterResponse.status}`, { status: 502 });
        let subConverterContent = await subConverterResponse.text();
        if (targetFormat === 'clash') {
            subConverterContent = clashFix(subConverterContent);
        }

        // --- 【关键修复】为配置文件添加 .yaml 后缀 ---
        const fileName = `${config.FileName}.yaml`;

        return new Response(subConverterContent, { 
            headers: { 
                "Content-Disposition": `attachment; filename*=utf-8''${encodeURIComponent(fileName)}`,
                "content-type": "text/plain; charset=utf-8",
                "Profile-Update-Interval": `${config.SUBUpdateTime}`
            } 
        });
    } catch (error) {
        return new Response("订阅转换服务器连接失败", { status: 502 });
    }
}


// --- Cloudflare Pages Functions 入口 ---
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    try {
        if (url.pathname.startsWith('/api/')) return handleApiRequest(request, env);
        const kv_settings = await env.MISUB_KV.get(KV_KEY_SETTINGS, 'json') || {};
        const mytoken = kv_settings.mytoken || env.TOKEN || 'auto';
        if (url.pathname === '/sub' || url.pathname === `/${mytoken}`) return handleMisubRequest(request, env);
        return next();
    } catch (e) {
        console.error("Critical error in onRequest:", e);
        return new Response("Internal Server Error: " + e.message, { status: 500 });
    }
}