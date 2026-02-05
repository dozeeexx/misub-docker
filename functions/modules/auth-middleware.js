/**
 * 认证中间件模�? * 处理用户认证和会话管�? */

import { COOKIE_NAME, SESSION_DURATION } from './config.js';
import { getCookieSecret, getAdminPassword } from './utils.js';

function buildRequestMeta(request, env) {
    return {
        url: request?.url,
        method: request?.method,
        contentType: request?.headers?.get('Content-Type'),
        contentLength: request?.headers?.get('Content-Length'),
        userAgent: request?.headers?.get('User-Agent'),
        origin: request?.headers?.get('Origin'),
        referer: request?.headers?.get('Referer'),
        cfRay: request?.headers?.get('CF-Ray'),
        hasKv: !!env?.MISUB_KV,
        hasD1: !!env?.MISUB_DB
    };
}

/**
 * 创建HMAC签名的令�? * @param {string} key - 签名密钥
 * @param {string} data - 要签名的数据
 * @returns {Promise<string>} 签名后的令牌
 */
export async function createSignedToken(key, data) {
    if (!key || !data) throw new Error("Key and data are required for signing.");
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const dataToSign = encoder.encode(data);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
    return `${data}.${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 验证HMAC签名令牌
 * @param {string} key - 验证密钥
 * @param {string} token - 要验证的令牌
 * @returns {Promise<string|null>} 验证成功返回数据，失败返回null
 */
export async function verifySignedToken(key, token) {
    if (!key || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data] = parts;
    const expectedToken = await createSignedToken(key, data);
    return timingSafeEqual(token, expectedToken) ? data : null;
}

function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const length = Math.max(a.length, b.length);
    let result = a.length === b.length ? 0 : 1;
    for (let i = 0; i < length; i += 1) {
        const charA = a.charCodeAt(i) || 0;
        const charB = b.charCodeAt(i) || 0;
        result |= charA ^ charB;
    }
    return result === 0;
}

/**
 * 认证中间�?- 检查用户是否已登录
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<boolean>} 是否认证通过
 */
export async function authMiddleware(request, env) {
    const logMeta = buildRequestMeta(request, env);
    try {
        if (!env?.MISUB_KV) {
            console.error('[Auth] KV �� MISUB_KV ȱʧ', logMeta);
            return false;
        }
        const secret = await getCookieSecret(env);
        if (!secret) return false;
        const cookie = request.headers.get('Cookie');
        const sessionCookie = cookie?.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
        if (!sessionCookie) return false;
        const token = sessionCookie.split('=')[1];
        const verifiedData = await verifySignedToken(secret, token);
        return verifiedData && (Date.now() - parseInt(verifiedData, 10) < SESSION_DURATION);
    } catch (e) {
        console.error('[Auth] ��Ȩʧ��', { ...logMeta, error: e?.message });
        return false;
    }
}

/**
 * 处理用户登录
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} 登录响应
 */
export async function handleLogin(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const logMeta = buildRequestMeta(request, env);
    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        console.error('[API Error /login] Request body parse failed', { ...logMeta, error: e?.message });
        return new Response(JSON.stringify({ error: '���������ʧ��' }), { status: 400 });
    }

    if (!env?.MISUB_KV) {
        console.error('[API Error /login] KV �� MISUB_KV ȱʧ', logMeta);
        return new Response(JSON.stringify({ error: 'KV �� MISUB_KV ȱʧ' }), { status: 500 });
    }

    try {
        const { password } = payload || {};
        const currentPassword = await getAdminPassword(env);
        if (password === currentPassword) {
            const secret = await getCookieSecret(env);
            const token = await createSignedToken(secret, String(Date.now()));
            const headers = new Headers({ 'Content-Type': 'application/json' });
            const isSecure = request.url.startsWith('https');
            const cookieString = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=${SESSION_DURATION / 1000}`;
            headers.append('Set-Cookie', cookieString);
            return new Response(JSON.stringify({ success: true }), { headers });
        }
        return new Response(JSON.stringify({ error: '�������' }), { status: 401 });
    } catch (e) {
        console.error('[API Error /login] Login handler failed', { ...logMeta, error: e?.message });
        return new Response(JSON.stringify({ error: '��¼����ʧ��' }), { status: 500 });
    }
}

/**
 * 处理用户登出
 * @returns {Promise<Response>} 登出响应
 */
export async function handleLogout(request) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const isSecure = typeof request?.url === 'string' && request.url.startsWith('https');
    const secureFlag = isSecure ? 'Secure;' : '';
    headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; ${secureFlag} SameSite=Strict; Max-Age=0`);
    return new Response(JSON.stringify({ success: true }), { headers });
}

/**
 * 获取认证失败的响�? * @param {string} message - 错误消息
 * @returns {Response} 401响应
 */
export function createUnauthorizedResponse(message = 'Unauthorized') {
    return new Response(JSON.stringify({ error: message }), { status: 401 });
}

