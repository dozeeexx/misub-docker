/**
 * API 通用路由处理器
 * 处理所有 /api/* 路由
 */

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 路由 /api/cron/status
    if (pathname === '/api/cron/status' || pathname.endsWith('/api/cron/status')) {
        return await handleGetStatus(env);
    }

    // 路由 /api/cron/trigger
    if ((pathname === '/api/cron/trigger' || pathname.endsWith('/api/cron/trigger')) && request.method === 'POST') {
        return await handleTriggerSync(env);
    }

    // 其他路由
    return new Response(JSON.stringify({
        error: 'API route not found',
        path: pathname,
        method: request.method
    }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * 获取同步状态
 */
async function handleGetStatus(env) {
    try {
        // 从 KV 存储获取最后的同步状态
        let syncStatus = {
            totalSubscriptions: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            lastSync: null,
            details: []
        };

        if (env.KV_STORAGE) {
            try {
                const statusData = await env.KV_STORAGE.get('cron_sync_status');
                if (statusData) {
                    syncStatus = JSON.parse(statusData);
                }
            } catch (error) {
                console.error('[API] Failed to fetch sync status from KV:', error);
            }
        }

        return new Response(JSON.stringify(syncStatus), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[API] Failed to get status:', error);
        return new Response(JSON.stringify({
            error: error.message,
            totalSubscriptions: 0,
            successfulSyncs: 0,
            failedSyncs: 0
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * 触发手动同步
 */
async function handleTriggerSync(env) {
    try {
        console.log('[API] 处理手动同步请求');

        const result = {
            success: true,
            message: '同步任务已提交',
            timestamp: new Date().toISOString(),
            totalSubscriptions: 0,
            successfulSyncs: 0,
            failedSyncs: 0
        };

        // 如果配置了 D1 或 KV，执行同步
        if (env.DB || env.KV_STORAGE) {
            try {
                const syncResult = await performQuickSync(env);
                Object.assign(result, syncResult);
            } catch (error) {
                console.error('[API] Quick sync failed:', error);
                result.warning = '后台同步失败，但任务已提交';
            }
        }

        // 保存同步结果到 KV
        if (env.KV_STORAGE) {
            try {
                await env.KV_STORAGE.put('cron_sync_status', JSON.stringify(result), {
                    expirationTtl: 3600 // 1小时过期
                });
                console.log('[API] 同步状态已保存到 KV');
            } catch (error) {
                console.error('[API] Failed to save sync status to KV:', error);
            }
        }

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[API] Trigger sync failed:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * 执行快速同步（简化版，不超过5秒）
 */
async function performQuickSync(env) {
    const results = {
        totalSubscriptions: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        details: []
    };

    const startTime = Date.now();
    const maxDuration = 4000; // 最多4秒，留出1秒的缓冲

    try {
        // 从 D1 或 KV 获取订阅列表
        let subscriptions = [];

        if (env.DB) {
            try {
                const { results: dbResults } = await env.DB.prepare(
                    'SELECT id, name, url, userAgent FROM subscriptions WHERE enabled = 1 LIMIT 10'
                ).all();
                subscriptions = dbResults || [];
                console.log(`[API] 从 D1 获取 ${subscriptions.length} 个订阅`);
            } catch (error) {
                console.error('[API] Failed to fetch from D1:', error);
            }
        }

        if (env.KV_STORAGE && subscriptions.length === 0) {
            try {
                const data = await env.KV_STORAGE.get('subscriptions');
                if (data) {
                    const parsed = JSON.parse(data);
                    subscriptions = Array.isArray(parsed) ? parsed.slice(0, 10) : [];
                    console.log(`[API] 从 KV 获取 ${subscriptions.length} 个订阅`);
                }
            } catch (error) {
                console.error('[API] Failed to fetch from KV:', error);
            }
        }

        results.totalSubscriptions = subscriptions.length;

        // 快速同步每个订阅
        for (const sub of subscriptions) {
            // 检查是否超时
            if (Date.now() - startTime > maxDuration) {
                console.log('[API] 同步超时，停止处理');
                break;
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // 每个请求2秒超时

                // 提取URL和User-Agent
                const url = typeof sub === 'string' ? sub : sub.url;
                const userAgent = (typeof sub === 'object' && sub.userAgent) || 'clash-meta/2.4.0';
                const name = (typeof sub === 'object' && sub.name) || new URL(url).hostname;

                if (!url) {
                    results.failedSyncs++;
                    continue;
                }

                const response = await fetch(url, {
                    headers: { 'User-Agent': userAgent },
                    signal: controller.signal,
                    // 仅检查HEAD请求或获取前100字节
                    method: 'GET'
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    results.successfulSyncs++;
                    results.details.push({
                        name,
                        status: 'success',
                        statusCode: response.status
                    });
                    console.log(`[API] 同步成功: ${name}`);
                } else {
                    results.failedSyncs++;
                    results.details.push({
                        name,
                        status: 'failed',
                        statusCode: response.status
                    });
                    console.log(`[API] 同步失败: ${name} (HTTP ${response.status})`);
                }
            } catch (error) {
                results.failedSyncs++;
                const name = (typeof sub === 'object' && sub.name) || 'unknown';
                results.details.push({
                    name,
                    status: 'failed',
                    error: error.name === 'AbortError' ? 'timeout' : error.message
                });
                console.error(`[API] 同步错误: ${name}`, error.message);
            }
        }

        console.log(`[API] 同步完成: ${results.successfulSyncs} 成功, ${results.failedSyncs} 失败`);

    } catch (error) {
        console.error('[API] Quick sync error:', error);
        results.error = error.message;
    }

    return results;
}
