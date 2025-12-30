


import { createJsonResponse, createErrorResponse } from '../utils.js';

const KV_KEY_CLIENTS = 'misub_clients_v1';

const DEFAULT_CLIENTS = [
    {
        id: 'clash-verge-rev',
        name: 'Clash Verge Rev',
        icon: '⚡️',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600',
        description: '现代化的 Clash 客户端，界面美观，功能强大，支持多平台。',
        platforms: ['windows', 'macos', 'linux'],
        url: 'https://github.com/clash-verge-rev/clash-verge-rev/releases',
        repo: 'clash-verge-rev/clash-verge-rev',
        version: null
    },
    {
        id: 'clash-party',
        name: 'Clash-Party',
        icon: '🎉',
        bgColor: 'bg-pink-50 dark:bg-pink-900/30 text-pink-600',
        description: '基于 Electron 的 Mihomo 图形客户端，专注于简单易用的体验。',
        platforms: ['windows', 'macos', 'linux'],
        url: 'https://github.com/mihomo-party-org/clash-party/releases',
        repo: 'mihomo-party-org/clash-party',
        version: null
    },
    {
        id: 'v2rayn',
        name: 'v2rayN',
        icon: '💻',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
        description: 'Windows 平台最流行的 V2Ray/Xray 客户端，功能强大且易于使用。',
        platforms: ['windows', 'linux'],
        url: 'https://github.com/2dust/v2rayN/releases',
        repo: '2dust/v2rayN',
        version: null
    },
    {
        id: 'v2rayng',
        name: 'v2rayNG',
        icon: '📱',
        bgColor: 'bg-green-50 dark:bg-green-900/30 text-green-600',
        description: 'Android 平台上最流行的通用代理工具，支持多种协议。',
        platforms: ['android'],
        url: 'https://github.com/2dust/v2rayNG/releases',
        repo: '2dust/v2rayNG',
        version: null
    },
    {
        id: 'shadowrocket',
        name: 'Shadowrocket',
        icon: '🚀',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
        description: 'iOS 平台功能强大的网络工具，需使用非中国区 Apple ID 下载。',
        platforms: ['ios'],
        url: 'https://apps.apple.com/us/app/shadowrocket/id932747118',
        repo: null,
        version: null
    },
    {
        id: 'hiddify',
        name: 'Hiddify',
        icon: '🛡️',
        bgColor: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600',
        description: '新一代通用客户端，支持 Sing-box 核心，全平台兼容。',
        platforms: ['windows', 'macos', 'linux', 'android', 'ios'],
        url: 'https://github.com/hiddify/hiddify-next/releases',
        repo: 'hiddify/hiddify-next',
        version: null
    },
    {
        id: 'nekobox',
        name: 'NekoBox',
        icon: '🐱',
        bgColor: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600',
        description: '功能丰富的全能代理客户端，支持 Sing-box 和 Xray 核心。',
        platforms: ['android', 'windows'],
        url: 'https://github.com/MatsuriDayo/NekoBoxForAndroid/releases',
        repo: 'MatsuriDayo/NekoBoxForAndroid',
        version: null
    },
    {
        id: 'stash',
        name: 'Stash',
        icon: '📦',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600',
        description: 'iOS 平台上强大的基于规则的代理实用工具，支持多种协议。',
        platforms: ['ios', 'macos'],
        url: 'https://apps.apple.com/us/app/stash-rule-based-proxy/id1596063349',
        repo: null,
        version: null
    },
    {
        id: 'loon',
        name: 'Loon',
        icon: '🎈',
        bgColor: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600',
        description: 'iOS 平台功能强大的网络工具，界面简洁优雅，支持插件扩展。',
        platforms: ['ios', 'macos'],
        url: 'https://apps.apple.com/us/app/loon/id1373567447',
        repo: null,
        version: null
    },
    {
        id: 'surge',
        name: 'Surge',
        icon: '⚡️',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
        description: 'iOS/macOS 平台的高级网络工具，拥有强大的性能和丰富的功能。',
        platforms: ['ios', 'macos'],
        url: 'https://nssurge.com/',
        repo: null,
        version: null
    },
    {
        id: 'flclash',
        name: 'FlClash',
        icon: '🦋',
        bgColor: 'bg-pink-50 dark:bg-pink-900/30 text-pink-600',
        description: '基于 Flutter 开发的多平台 Clash 客户端，界面美观流畅。',
        platforms: ['windows', 'linux', 'android'],
        url: 'https://github.com/chen08209/FlClash/releases',
        repo: 'chen08209/FlClash',
        version: null
    },
    {
        id: 'clashmi',
        name: 'ClashMI',
        icon: 'Ⓜ️',
        bgColor: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600',
        description: '基于 Mihomo 内核的多平台客户端，简单易用，支持全平台。',
        platforms: ['windows', 'macos', 'linux', 'android', 'ios'],
        url: 'https://github.com/KaringX/clashmi/releases',
        repo: 'KaringX/clashmi',
        version: null
    },
    {
        id: 'flyclash',
        name: 'FlyClash',
        icon: '✈️',
        bgColor: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600',
        description: '基于 ClashMeta 内核的轻量级客户端，专注于速度和稳定性。',
        platforms: ['windows', 'android'],
        url: 'https://github.com/GtxFury/FlyClash/releases',
        repo: 'GtxFury/FlyClash',
        version: null
    },
    {
        id: 'karing',
        name: 'Karing',
        icon: '🦌',
        bgColor: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600',
        description: '简单的兼容 Clash/V2ray/Sing-box 的全平台客户端。',
        platforms: ['windows', 'macos', 'linux', 'android', 'ios'],
        url: 'https://github.com/KaringX/karing/releases',
        repo: 'KaringX/karing',
        version: null
    },
    {
        id: 'quantumultx',
        name: 'Quantumult X',
        icon: '❌',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600',
        description: 'iOS 平台功能强大的网络工具，界面精美，支持脚本。',
        platforms: ['ios'],
        url: 'https://apps.apple.com/us/app/quantumult-x/id1443988620',
        repo: null,
        version: null
    }
];

/**
 * Robust UUID generator
 * Falls back to Math.random if crypto.randomUUID is not available
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Handle client management requests
 * @param {Request} request 
 * @param {Object} env 
 */
export async function handleClientRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Guard against missing KV binding
    if (!env.MISUB_KV) {
        return createErrorResponse('KV binding MISUB_KV is missing', 500);
    }

    try {
        if (request.method === 'GET') {
            const data = await env.MISUB_KV.get(KV_KEY_CLIENTS, 'json');
            return createJsonResponse({
                success: true,
                data: data || []
            });
        }

        if (request.method === 'POST') {
            if (path.endsWith('/init')) {
                // Initialize default clients
                await env.MISUB_KV.put(KV_KEY_CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
                return createJsonResponse({
                    success: true,
                    message: 'Clients initialized',
                    data: DEFAULT_CLIENTS
                });
            }

            let body;
            try {
                body = await request.json();
            } catch (e) {
                return createErrorResponse('Invalid JSON body', 400);
            }

            // Allow batch update or single add/update
            let clients = await env.MISUB_KV.get(KV_KEY_CLIENTS, 'json') || [];

            if (Array.isArray(body)) {
                // Full replacement
                clients = body;
            } else {
                // Single add/update
                if (!body.name) {
                    return createErrorResponse('Client name is required', 400);
                }

                const index = clients.findIndex(c => c.id === body.id);
                if (index !== -1) {
                    clients[index] = { ...clients[index], ...body };
                } else {
                    if (!body.id) body.id = generateUUID();
                    clients.push(body);
                }
            }

            await env.MISUB_KV.put(KV_KEY_CLIENTS, JSON.stringify(clients));
            return createJsonResponse({
                success: true,
                data: clients
            });
        }

        if (request.method === 'DELETE') {
            const url = new URL(request.url);
            const id = url.searchParams.get('id');
            if (!id) {
                return createErrorResponse('Client ID is required', 400);
            }

            let clients = await env.MISUB_KV.get(KV_KEY_CLIENTS, 'json') || [];
            const originalLength = clients.length;
            clients = clients.filter(c => c.id !== id);

            if (clients.length === originalLength) {
                return createErrorResponse('Client not found', 404);
            }

            await env.MISUB_KV.put(KV_KEY_CLIENTS, JSON.stringify(clients));
            return createJsonResponse({
                success: true,
                data: clients
            });
        }

        return createErrorResponse('Method Not Allowed', 405);
    } catch (e) {
        console.error('[Client Handler Error]', e);
        return createErrorResponse(`Operation failed: ${e.message}`, 500);
    }
}
