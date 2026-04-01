/**
 * Cron API 处理器
 * 处理管理面板的状态查询和手动同步请求
 */

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 处理不同的路由
    if (pathname.includes('/api/cron/status')) {
        return handleGetStatus(env);
    }

    if (pathname.includes('/api/cron/trigger')) {
        if (request.method === 'POST') {
            return handleTriggerSync(env);
        }
    }

    return new Response(JSON.stringify({ error: 'API route not found' }), {
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
                console.error('Failed to fetch sync status from KV:', error);
            }
        }

        return new Response(JSON.stringify(syncStatus), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to get status:', error);
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
        console.log('[Cron API] 处理手动同步请求');

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
                console.error('Quick sync failed:', error);
                result.warning = '后台同步失败，但任务已提交';
            }
        }

        // 保存同步结果到 KV
        if (env.KV_STORAGE) {
            try {
                await env.KV_STORAGE.put('cron_sync_status', JSON.stringify(result));
                console.log('[Cron API] 同步状态已保存到 KV');
            } catch (error) {
                console.error('Failed to save sync status to KV:', error);
            }
        }

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Trigger sync failed:', error);
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
 * 执行快速同步（简化版）
 */
async function performQuickSync(env) {
    const results = {
        totalSubscriptions: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        details: []
    };

    try {
        // 从 D1 或 KV 获取订阅列表
        let subscriptions = [];

        if (env.DB) {
            try {
                const { results: dbResults } = await env.DB.prepare(
                    'SELECT * FROM subscriptions WHERE enabled = 1 LIMIT 10'
                ).all();
                subscriptions = dbResults || [];
            } catch (error) {
                console.error('Failed to fetch from D1:', error);
            }
        }

        if (env.KV_STORAGE && subscriptions.length === 0) {
            try {
                const data = await env.KV_STORAGE.get('subscriptions');
                if (data) {
                    subscriptions = JSON.parse(data).slice(0, 10);
                }
            } catch (error) {
                console.error('Failed to fetch from KV:', error);
            }
        }

        results.totalSubscriptions = subscriptions.length;

        // 简单的同步模拟
        for (const sub of subscriptions) {
            try {
                // 尝试获取订阅数据（超时为5秒）
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const url = typeof sub === 'string' ? sub : sub.url;
                const userAgent = typeof sub === 'object' ? (sub.userAgent || 'clash-meta/2.4.0') : 'clash-meta/2.4.0';

                if (!url) {
                    results.failedSyncs++;
                    continue;
                }

                const response = await fetch(url, {
                    headers: { 'User-Agent': userAgent },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    results.successfulSyncs++;
                    const name = typeof sub === 'object' ? sub.name : new URL(url).hostname;
                    results.details.push({
                        name,
                        status: 'success',
                        statusCode: response.status
                    });
                } else {
                    results.failedSyncs++;
                    const name = typeof sub === 'object' ? sub.name : new URL(url).hostname;
                    results.details.push({
                        name,
                        status: 'failed',
                        statusCode: response.status
                    });
                }
            } catch (error) {
                results.failedSyncs++;
                const name = typeof sub === 'object' ? sub.name : (sub || 'unknown');
                results.details.push({
                    name,
                    status: 'failed',
                    error: error.message
                });
            }
        }

    } catch (error) {
        console.error('Quick sync error:', error);
        results.error = error.message;
    }

    return results;
}
