/**
 * API路由处理模块
 * 处理所有API请求的路由分发
 */

import { StorageFactory, DataMigrator } from '../storage-adapter.js';
import { createJsonResponse } from './utils.js';
import { authMiddleware, handleLogin, handleLogout } from './auth-middleware.js';
import { handleDataRequest, handleMisubsSave, handleSettingsGet, handleSettingsSave } from './api-handler.js';
import { handleCronTrigger } from './notifications.js';

// 常量定义
const OLD_KV_KEY = 'misub_data_v1';
const KV_KEY_SUBS = 'misub_subscriptions_v1';

/**
 * 处理主要的API请求
 * @param {Object} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
export async function handleApiRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');

    // [新增] 数据存储迁移接口 (KV -> D1)
    if (path === '/migrate_to_d1') {
        if (!await authMiddleware(request, env)) {
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }
        try {
            if (!env.MISUB_DB) {
                return createJsonResponse({
                    success: false,
                    message: 'D1 数据库未配置，请检查 wrangler.toml 配置'
                }, 400);
            }

            const migrationResult = await DataMigrator.migrateKVToD1(env);

            if (migrationResult.errors.length > 0) {
                return createJsonResponse({
                    success: false,
                    message: '迁移过程中出现错误',
                    details: migrationResult.errors,
                    partialSuccess: migrationResult
                }, 500);
            }

            return createJsonResponse({
                success: true,
                message: '数据已成功迁移到 D1 数据库',
                details: migrationResult
            });

        } catch (error) {
            console.error('[API Error /migrate_to_d1]', error);
            return createJsonResponse({
                success: false,
                message: `迁移失败: ${error.message}`
            }, 500);
        }
    }

    // [新增] 安全的、可重复执行的迁移接口
    if (path === '/migrate') {
        if (!await authMiddleware(request, env)) {
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }
        try {
            const oldData = await env.MISUB_KV.get(OLD_KV_KEY, 'json');
            const newDataExists = await env.MISUB_KV.get(KV_KEY_SUBS) !== null;

            if (newDataExists) {
                return createJsonResponse({ success: true, message: '无需迁移，数据已是最新结构。' }, 200);
            }
            if (!oldData) {
                return createJsonResponse({ success: false, message: '未找到需要迁移的旧数据。' }, 404);
            }

            await env.MISUB_KV.put(KV_KEY_SUBS, JSON.stringify(oldData));
            await env.MISUB_KV.put(KV_KEY_PROFILES, JSON.stringify([]));
            await env.MISUB_KV.put(OLD_KV_KEY + '_migrated_on_' + new Date().toISOString(), JSON.stringify(oldData));
            await env.MISUB_KV.delete(OLD_KV_KEY);

            return createJsonResponse({ success: true, message: '数据迁移成功！' }, 200);
        } catch (e) {
            console.error('[API Error /migrate]', e);
            return createJsonResponse({ success: false, message: `迁移失败: ${e.message}` }, 500);
        }
    }

    if (path === '/login') {
        return await handleLogin(request, env);
    }

    if (!await authMiddleware(request, env)) {
        return createJsonResponse({ error: 'Unauthorized' }, 401);
    }

    switch (path) {
        case '/logout':
            return await handleLogout();

        case '/data':
            return await handleDataRequest(env);

        case '/misubs':
            return await handleMisubsSave(request, env);

        case '/node_count':
            return await handleNodeCountRequest(request, env);

        case '/fetch_external_url':
            return await handleExternalFetchRequest(request);

        case '/batch_update_nodes':
            return await handleBatchUpdateNodesRequest(request, env);

        case '/subscription_nodes':
            return await handleSubscriptionNodesRequest(request, env);

        case '/debug_subscription':
            return await handleDebugSubscriptionRequest(request, env);

        case '/settings':
            if (request.method === 'GET') {
                return await handleSettingsGet(env);
            }
            if (request.method === 'POST') {
                return await handleSettingsSave(request, env);
            }
            return createJsonResponse('Method Not Allowed', 405);

        default:
            return createJsonResponse('API route not found', 404);
    }
}

/**
 * 处理节点计数请求
 * @param {Object} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
async function handleNodeCountRequest(request, env) {
    if (request.method !== 'POST') {
        return createJsonResponse('Method Not Allowed', 405);
    }

    const { url: subUrl } = await request.json();
    if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
        return createJsonResponse({ error: 'Invalid or missing url' }, 400);
    }

    const result = { count: 0, userInfo: null };
    const { StorageFactory } = await import('../storage-adapter.js');

    try {
        // 使用统一的User-Agent策略
        const fetchOptions = {
            headers: { 'User-Agent': 'v2rayN/7.23' },
            redirect: "follow",
            cf: { insecureSkipVerify: true }
        };
        const trafficFetchOptions = {
            headers: { 'User-Agent': 'clash-verge/v2.4.3' },
            redirect: "follow",
            cf: { insecureSkipVerify: true }
        };

        const trafficRequest = fetch(new Request(subUrl, trafficFetchOptions));
        const nodeCountRequest = fetch(new Request(subUrl, fetchOptions));

        // --- [核心修正] 使用 Promise.allSettled 替换 Promise.all ---
        const responses = await Promise.allSettled([trafficRequest, nodeCountRequest]);

        // 1. 处理流量请求的结果
        if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
            const trafficResponse = responses[0].value;
            const userInfoHeader = trafficResponse.headers.get('subscription-userinfo');
            if (userInfoHeader) {
                const info = {};
                userInfoHeader.split(';').forEach(part => {
                    const [key, value] = part.trim().split('=');
                    if (key && value) info[key] = /^\d+$/.test(value) ? Number(value) : value;
                });
                result.userInfo = info;
            }
        }

        // 2. 处理节点数请求的结果
        if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
            const nodeCountResponse = responses[1].value;
            const text = await nodeCountResponse.text();
            let decoded = '';
            try { decoded = atob(text.replace(/\s/g, '')); } catch { decoded = text; }
            const lineMatches = decoded.match(/^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//gm);
            if (lineMatches) {
                result.count = lineMatches.length;
            }
        }

        // 只有在至少获取到一个有效信息时，才更新数据库
        if (result.userInfo || result.count > 0) {
            const storageAdapter = StorageFactory.createAdapter(env, await StorageFactory.getStorageType(env));
            const originalSubs = await storageAdapter.get(KV_KEY_SUBS) || [];
            const allSubs = JSON.parse(JSON.stringify(originalSubs)); // 深拷贝
            const subToUpdate = allSubs.find(s => s.url === subUrl);

            if (subToUpdate) {
                subToUpdate.nodeCount = result.count;
                subToUpdate.userInfo = result.userInfo;
                await storageAdapter.put(KV_KEY_SUBS, allSubs);
            }
        }

        return createJsonResponse(result);
    } catch (e) {
        console.error('节点计数处理错误:', e);
        return createJsonResponse(result); // 即使出错也返回已有结果
    }
}

/**
 * 处理外部URL获取请求
 * @param {Object} request - HTTP请求对象
 * @returns {Promise<Response>} HTTP响应
 */
async function handleExternalFetchRequest(request) {
    if (request.method !== 'POST') {
        return createJsonResponse('Method Not Allowed', 405);
    }
    const { url: externalUrl } = await request.json();
    if (!externalUrl || typeof externalUrl !== 'string' || !/^https?:\/\//.test(externalUrl)) {
        return createJsonResponse({ error: 'Invalid or missing url' }, 400);
    }

    try {
        const response = await fetch(new Request(externalUrl, {
            headers: { 'User-Agent': 'v2rayN/7.23' }, // 统一User-Agent
            redirect: "follow",
            cf: { insecureSkipVerify: true } // Allow insecure SSL for flexibility
        }));

        if (!response.ok) {
            return createJsonResponse({ error: `Failed to fetch external URL: ${response.status} ${response.statusText}` }, response.status);
        }

        const content = await response.text();
        return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    } catch (e) {
        return createJsonResponse({ error: `Failed to fetch external URL: ${e.message}` }, 500);
    }
}

/**
 * 处理批量节点更新请求
 * @param {Object} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
async function handleBatchUpdateNodesRequest(request, env) {
    if (request.method !== 'POST') {
        return createJsonResponse('Method Not Allowed', 405);
    }

    const { subscriptionIds } = await request.json();
    if (!Array.isArray(subscriptionIds)) {
        return createJsonResponse({ error: 'subscriptionIds must be an array' }, 400);
    }

    const storageAdapter = StorageFactory.createAdapter(env, await StorageFactory.getStorageType(env));
    const allSubs = await storageAdapter.get(KV_KEY_SUBS) || [];
    const subsToUpdate = allSubs.filter(sub => subscriptionIds.includes(sub.id) && sub.url.startsWith('http'));

    // 并行更新所有订阅的节点信息
    const updatePromises = subsToUpdate.map(async (sub) => {
        try {
            const fetchOptions = {
                headers: { 'User-Agent': 'v2rayN/7.23' },
                redirect: "follow",
                cf: { insecureSkipVerify: true }
            };

            const response = await Promise.race([
                fetch(sub.url, fetchOptions),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]);

            if (response.ok) {
                // 更新流量信息
                const userInfoHeader = response.headers.get('subscription-userinfo');
                if (userInfoHeader) {
                    const info = {};
                    userInfoHeader.split(';').forEach(part => {
                        const [key, value] = part.trim().split('=');
                        if (key && value) info[key] = /^\d+$/.test(value) ? Number(value) : value;
                    });
                    sub.userInfo = info;
                }

                // 更新节点数量
                const text = await response.text();
                let decoded = '';
                try {
                    decoded = atob(text.replace(/\s/g, ''));
                } catch {
                    decoded = text;
                }
                const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//gm;
                const matches = decoded.match(nodeRegex);
                sub.nodeCount = matches ? matches.length : 0;

                return { id: sub.id, success: true, nodeCount: sub.nodeCount };
            } else {
                return { id: sub.id, success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            return { id: sub.id, success: false, error: error.message };
        }
    });

    const results = await Promise.allSettled(updatePromises);
    const updateResults = results.map(result =>
        result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
    );

    // 使用存储适配器保存更新后的数据
    await storageAdapter.put(KV_KEY_SUBS, allSubs);

    return createJsonResponse({
        success: true,
        message: '批量更新完成',
        results: updateResults
    });
}

/**
 * 处理订阅节点获取请求
 * @param {Object} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
async function handleSubscriptionNodesRequest(request, env) {
    if (request.method !== 'POST') {
        return createJsonResponse('Method Not Allowed', 405);
    }

    try {
        const {
            url: subscriptionUrl,
            subscriptionId,
            profileId,
            userAgent = 'MiSub-Node-Preview/1.0'
        } = await request.json();

        // 支持两种模式：单订阅预览和订阅组预览
        if (!subscriptionUrl && !subscriptionId && !profileId) {
            return createJsonResponse({ error: '请提供订阅URL、订阅ID或订阅组ID' }, 400);
        }

        const storageAdapter = StorageFactory.createAdapter(env, await StorageFactory.getStorageType(env));
        let targetUrls = [];
        let subscriptionNames = [];
        let manualNodeResults = []; // 声明手工节点结果数组

        if (profileId) {
            // 订阅组模式：使用现有的组合订阅逻辑获取所有相关项目
            const allProfiles = await storageAdapter.get(KV_KEY_PROFILES) || [];
            const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];
            const profile = allProfiles.find(p => (p.customId && p.customId === profileId) || p.id === profileId);

            if (!profile || !profile.enabled) {
                return createJsonResponse({ error: '订阅组���存在或已禁用' }, 404);
            }

            const profileSubIds = new Set(profile.subscriptions || []);
            const profileNodeIds = new Set(profile.manualNodes || []);

            // 复用现有的组合订阅过滤逻辑
            const targetMisubs = allSubscriptions.filter(item => {
                const isSubscription = item.url && item.url.startsWith('http');
                const isManualNode = !isSubscription;

                // 检查项目是否属于当前订阅组且已启用
                const belongsToProfile = (isSubscription && profileSubIds.has(item.id)) || (isManualNode && profileNodeIds.has(item.id));
                if (!item.enabled || !belongsToProfile) {
                    return false;
                }
                return true;
            });

            // 分离HTTP订阅和手工节点
            const targetSubscriptions = targetMisubs.filter(item => item.url.startsWith('http'));
            const targetManualNodes = targetMisubs.filter(item => !item.url.startsWith('http'));

            // 为HTTP订阅创建URL列表
            targetUrls = targetSubscriptions.map(sub => sub.url);
            subscriptionNames = targetSubscriptions.map(sub => sub.name);

            // 为手工节点创建模拟的结果（直接解析节点URL）
            manualNodeResults = targetManualNodes.map(node => {
                const nodeUrl = node.url;
                const protocolMatch = nodeUrl.match(/^(.*?):\/\//);
                const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : 'unknown';

                let nodeName = '';
                let region = '';

                // 提取节点名称
                const hashIndex = nodeUrl.lastIndexOf('#');
                if (hashIndex !== -1) {
                    try {
                        nodeName = decodeURIComponent(nodeUrl.substring(hashIndex + 1));
                    } catch (e) {
                        nodeName = nodeUrl.substring(hashIndex + 1);
                    }
                }

                // 提取地区信息
                const regionKeywords = {
                    '香港': ['HK', '香港', 'Hong Kong', 'HongKong'],
                    '台湾': ['TW', '台湾', 'Taiwan', 'Taipei'],
                    '新加坡': ['SG', '新加坡', 'Singapore'],
                    '日本': ['JP', '日本', 'Japan', 'Tokyo', 'Osaka'],
                    '美国': ['US', '美国', 'USA', 'United States', 'America'],
                    '韩国': ['KR', '韩国', 'Korea', 'Seoul'],
                    '英国': ['UK', '英国', 'Britain', 'London'],
                    '德国': ['DE', '德国', 'Germany', 'Frankfurt'],
                    '法国': ['FR', '法国', 'France', 'Paris'],
                    '加拿大': ['CA', '加拿大', 'Canada'],
                    '澳大利亚': ['AU', '澳大利亚', 'Australia'],
                    '荷兰': ['NL', '荷兰', 'Netherlands', 'Amsterdam'],
                    '俄罗斯': ['RU', '俄罗斯', 'Russia', 'Moscow'],
                    '印度': ['IN', '印度', 'India'],
                    '土耳其': ['TR', '土耳其', 'Turkey', 'Istanbul'],
                    '马来西亚': ['MY', '马来西亚', 'Malaysia'],
                    '泰国': ['TH', '泰国', 'Thailand', 'Bangkok'],
                    '越南': ['VN', '越南', 'Vietnam'],
                    '菲律宾': ['PH', '菲律宾', 'Philippines'],
                    '印尼': ['ID', '印尼', 'Indonesia']
                };

                for (const [regionName, keywords] of Object.entries(regionKeywords)) {
                    if (keywords.some(keyword => nodeName.toLowerCase().includes(keyword.toLowerCase()))) {
                        region = regionName;
                        break;
                    }
                }

                return {
                    subscriptionName: node.name || '手工节点',
                    url: nodeUrl,
                    success: true,
                    nodes: [{
                        name: nodeName || '未命名节点',
                        url: nodeUrl,
                        protocol: protocol,
                        region: region || '其他',
                        subscriptionName: node.name || '手工节点'
                    }],
                    error: null,
                    isManualNode: true
                };
            });
        } else if (subscriptionId) {
            // 单订阅模式：通过ID获取订阅
            const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];
            const subscription = allSubscriptions.find(sub => sub.id === subscriptionId);

            if (!subscription || !subscription.enabled) {
                return createJsonResponse({ error: '订阅不存在或已禁用' }, 404);
            }

            // 检查是否为手工节点
            if (subscription.url && !subscription.url.startsWith('http')) {
                // 手工节点：直接解析节点URL
                const nodeUrl = subscription.url;
                const protocolMatch = nodeUrl.match(/^(.*?):\/\//);
                const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : 'unknown';

                let nodeName = '';
                let region = '';

                // 提取节点名称
                const hashIndex = nodeUrl.lastIndexOf('#');
                if (hashIndex !== -1) {
                    try {
                        nodeName = decodeURIComponent(nodeUrl.substring(hashIndex + 1));
                    } catch (e) {
                        nodeName = nodeUrl.substring(hashIndex + 1);
                    }
                }

                // 提取地区信息
                const regionKeywords = {
                    '香港': ['HK', '香港', 'Hong Kong', 'HongKong'],
                    '台湾': ['TW', '台湾', 'Taiwan', 'Taipei'],
                    '新加坡': ['SG', '新加坡', 'Singapore'],
                    '日本': ['JP', '日本', 'Japan', 'Tokyo', 'Osaka'],
                    '美国': ['US', '美国', 'USA', 'United States', 'America'],
                    '韩国': ['KR', '韩国', 'Korea', 'Seoul'],
                    '英国': ['UK', '英国', 'Britain', 'London'],
                    '德国': ['DE', '德国', 'Germany', 'Frankfurt'],
                    '法国': ['FR', '法国', 'France', 'Paris'],
                    '加拿大': ['CA', '加拿大', 'Canada'],
                    '澳大利亚': ['AU', '澳大利亚', 'Australia'],
                    '荷兰': ['NL', '荷兰', 'Netherlands', 'Amsterdam'],
                    '俄罗斯': ['RU', '俄罗斯', 'Russia', 'Moscow'],
                    '印度': ['IN', '印度', 'India'],
                    '土耳其': ['TR', '土耳其', 'Turkey', 'Istanbul'],
                    '马来西亚': ['MY', '马来西亚', 'Malaysia'],
                    '泰国': ['TH', '泰国', 'Thailand', 'Bangkok'],
                    '越南': ['VN', '越南', 'Vietnam'],
                    '菲律宾': ['PH', '菲律宾', 'Philippines'],
                    '印尼': ['ID', '印尼', 'Indonesia']
                };

                for (const [regionName, keywords] of Object.entries(regionKeywords)) {
                    if (keywords.some(keyword => nodeName.toLowerCase().includes(keyword.toLowerCase()))) {
                        region = regionName;
                        break;
                    }
                }

                const manualNodeResult = {
                    subscriptionName: subscription.name || '手工节点',
                    url: nodeUrl,
                    success: true,
                    nodes: [{
                        name: nodeName || '未命名节点',
                        url: nodeUrl,
                        protocol: protocol,
                        region: region || '其他',
                        subscriptionName: subscription.name || '手工节点'
                    }],
                    error: null,
                    isManualNode: true
                };

                return createJsonResponse({
                    success: true,
                    subscriptions: [manualNodeResult],
                    nodes: manualNodeResult.nodes,
                    totalCount: manualNodeResult.nodes.length,
                    stats: {
                        protocols: { [protocol]: 1 },
                        regions: { [region || '其他']: 1 }
                    }
                });
            } else {
                // HTTP订阅：添加到处理列表
                targetUrls = [subscription.url];
                subscriptionNames = [subscription.name];
            }
        } else {
            // 直接URL模式
            targetUrls = [subscriptionUrl];
            subscriptionNames = ['预览订阅'];
        }

        // 并行获取所有订阅的节点
        const nodePromises = targetUrls.map(async (url, index) => {
            const result = {
                subscriptionName: subscriptionNames[index],
                url: url,
                success: false,
                nodes: [],
                error: null
            };

            try {
                const response = await fetch(new Request(url, {
                    headers: { 'User-Agent': userAgent },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                }));

                if (!response.ok) {
                    result.error = `HTTP ${response.status}: ${response.statusText}`;
                    return result;
                }

                let text = await response.text();

                // Base64解码
                try {
                    const cleanedText = text.replace(/\s/g, '');
                    if (isValidBase64(cleanedText)) {
                        const binaryString = atob(cleanedText);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        text = new TextDecoder('utf-8').decode(bytes);
                    }
                } catch (e) {
                    // Base64解码失败，使用原始内容
                }

                // 提取所有有效节点
                const allNodes = text.replace(/\r\n/g, '\n').split('\n')
                    .map(line => line.trim())
                    .filter(line => /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//.test(line));

                // 解析节点信息
                const parsedNodes = allNodes.map(nodeUrl => {
                    const protocolMatch = nodeUrl.match(/^(.*?):\/\//);
                    const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : 'unknown';

                    let nodeName = '';
                    let region = '';

                    // 提取节点名称
                    const hashIndex = nodeUrl.lastIndexOf('#');
                    if (hashIndex !== -1) {
                        try {
                            nodeName = decodeURIComponent(nodeUrl.substring(hashIndex + 1));
                        } catch (e) {
                            nodeName = nodeUrl.substring(hashIndex + 1);
                        }
                    }

                    // 提取地区信息（从节点名称中识别）
                    const regionKeywords = {
                        '香港': ['HK', '香港', 'Hong Kong', 'HongKong'],
                        '台湾': ['TW', '台湾', 'Taiwan', 'Taipei'],
                        '新加坡': ['SG', '新加坡', 'Singapore'],
                        '日本': ['JP', '日本', 'Japan', 'Tokyo', 'Osaka'],
                        '美国': ['US', '美国', 'USA', 'United States', 'America'],
                        '韩国': ['KR', '韩国', 'Korea', 'Seoul'],
                        '英国': ['UK', '英国', 'Britain', 'London'],
                        '德国': ['DE', '德国', 'Germany', 'Frankfurt'],
                        '法国': ['FR', '法国', 'France', 'Paris'],
                        '加拿大': ['CA', '加拿大', 'Canada'],
                        '澳大利亚': ['AU', '澳大利亚', 'Australia'],
                        '荷兰': ['NL', '荷兰', 'Netherlands', 'Amsterdam'],
                        '俄罗斯': ['RU', '俄罗斯', 'Russia', 'Moscow'],
                        '印度': ['IN', '印度', 'India'],
                        '土耳其': ['TR', '土耳其', 'Turkey', 'Istanbul'],
                        '马来西亚': ['MY', '马来西亚', 'Malaysia'],
                        '泰国': ['TH', '泰国', 'Thailand', 'Bangkok'],
                        '越南': ['VN', '越南', 'Vietnam'],
                        '菲律宾': ['PH', '菲律宾', 'Philippines'],
                        '印尼': ['ID', '印尼', 'Indonesia']
                    };

                    for (const [regionName, keywords] of Object.entries(regionKeywords)) {
                        if (keywords.some(keyword => nodeName.toLowerCase().includes(keyword.toLowerCase()))) {
                            region = regionName;
                            break;
                        }
                    }

                    return {
                        name: nodeName || '未命名节点',
                        url: nodeUrl,
                        protocol: protocol,
                        region: region || '其他',
                        subscriptionName: result.subscriptionName
                    };
                });

                result.success = true;
                result.nodes = parsedNodes;

            } catch (e) {
                result.error = e.message;
            }

            return result;
        });

        const results = await Promise.all(nodePromises);

        // 合并HTTP订阅结果和手工节点结果
        const allResults = profileId ? [...results, ...manualNodeResults] : results;

        // 合并所有节点
        const allNodes = [];
        allResults.forEach(result => {
            if (result.success) {
                allNodes.push(...result.nodes);
            }
        });

        // 统计协议类型和地区
        const protocolStats = {};
        const regionStats = {};
        allNodes.forEach(node => {
            protocolStats[node.protocol] = (protocolStats[node.protocol] || 0) + 1;
            regionStats[node.region] = (regionStats[node.region] || 0) + 1;
        });

        return createJsonResponse({
            success: true,
            subscriptions: allResults,
            nodes: allNodes,
            totalCount: allNodes.length,
            stats: {
                protocols: protocolStats,
                regions: regionStats
            }
        });

    } catch (e) {
        return createJsonResponse({ error: `获取节点列表失败: ${e.message}` }, 500);
    }
}

/**
 * 处理订阅调试请求
 * @param {Object} request - HTTP请求对象
 * @returns {Promise<Response>} HTTP响应
 */
async function handleDebugSubscriptionRequest(request) {
    if (request.method !== 'POST') {
        return createJsonResponse('Method Not Allowed', 405);
    }

    try {
        const { url: debugUrl, userAgent } = await request.json();
        if (!debugUrl || typeof debugUrl !== 'string' || !/^https?:\/\//.test(debugUrl)) {
            return createJsonResponse({ error: 'Invalid or missing url' }, 400);
        }

        const result = {
            url: debugUrl,
            userAgent: userAgent || 'v2rayN/7.23',
            success: false,
            rawContent: '',
            processedContent: '',
            validNodes: [],
            ssNodes: [],
            error: null
        };

        try {
            const response = await fetch(new Request(debugUrl, {
                headers: { 'User-Agent': result.userAgent },
                redirect: "follow",
                cf: { insecureSkipVerify: true }
            }));

            if (!response.ok) {
                result.error = `HTTP ${response.status}: ${response.statusText}`;
                return createJsonResponse(result);
            }

            const text = await response.text();
            result.rawContent = text.substring(0, 2000); // 限制原始内容长度

            // 处理Base64解码
            let processedText = text;
            try {
                const cleanedText = text.replace(/\s/g, '');
                if (isValidBase64(cleanedText)) {
                    const binaryString = atob(cleanedText);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
                    processedText = new TextDecoder('utf-8').decode(bytes);
                }
            } catch (e) {
                // Base64解码失败，使用原始内容
            }

            result.processedContent = processedText.substring(0, 2000); // 限制处理后内容长度

            // 提取所有有效节点
            const allNodes = processedText.replace(/\r\n/g, '\n').split('\n')
                .map(line => line.trim())
                .filter(line => /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//.test(line));

            result.validNodes = allNodes.slice(0, 20); // 限制显示节点数量

            // 特别提取SS节点进行分析
            result.ssNodes = allNodes.filter(line => line.startsWith('ss://')).map(line => {
                try {
                    const hashIndex = line.indexOf('#');
                    let baseLink = hashIndex !== -1 ? line.substring(0, hashIndex) : line;
                    let fragment = hashIndex !== -1 ? line.substring(hashIndex) : '';

                    const protocolEnd = baseLink.indexOf('://');
                    const atIndex = baseLink.indexOf('@');
                    let analysis = {
                        original: line,
                        hasUrlEncoding: false,
                        fixed: line,
                        base64Part: '',
                        credentials: ''
                    };

                    if (protocolEnd !== -1 && atIndex !== -1) {
                        const base64Part = baseLink.substring(protocolEnd + 3, atIndex);
                        analysis.base64Part = base64Part;

                        if (base64Part.includes('%')) {
                            analysis.hasUrlEncoding = true;
                            const decodedBase64 = decodeURIComponent(base64Part);
                            analysis.fixed = 'ss://' + decodedBase64 + baseLink.substring(atIndex) + fragment;

                            try {
                                analysis.credentials = atob(decodedBase64);
                            } catch (e) {
                                analysis.credentials = 'Base64解码失败: ' + e.message;
                            }
                        } else {
                            try {
                                analysis.credentials = atob(base64Part);
                            } catch (e) {
                                analysis.credentials = 'Base64解码失败: ' + e.message;
                            }
                        }
                    }

                    return analysis;
                } catch (e) {
                    return {
                        original: line,
                        error: e.message
                    };
                }
            }).slice(0, 10); // 限制SS节点分析数量

            result.success = true;
            result.totalNodes = allNodes.length;
            result.ssNodesCount = allNodes.filter(line => line.startsWith('ss://')).length;

        } catch (e) {
            result.error = e.message;
        }

        return createJsonResponse(result);

    } catch (e) {
        return createJsonResponse({ error: `调试失败: ${e.message}` }, 500);
    }
}