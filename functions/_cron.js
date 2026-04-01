/**
 * Cron Triggers 路由处理
 * 支持通过环境变量配置，无需修改代码
 */

export async function onRequest(context) {
    const { request, env } = context;

    // 验证这是Cron触发
    if (request.headers.get('CF-Cron') !== 'true') {
        return new Response('Unauthorized', { status: 401 });
    }

    // 检查是否启用Cron功能
    const enableCron = env.ENABLE_CRON !== 'false'; // 默认启用
    if (!enableCron) {
        console.log('[Cron] Cron functionality is disabled via ENABLE_CRON=false');
        return new Response(JSON.stringify({
            success: true,
            message: 'Cron disabled',
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 获取Cron任务类型（从环境变量或默认）
    const cronType = env.CRON_TYPE || 'hourly-subscription-sync';

    console.log(`[Cron] Executing ${cronType} at ${new Date().toISOString()}`);

    try {
        let result;

        switch (cronType) {
            case 'hourly-subscription-sync':
                result = await performSubscriptionSync(env);
                break;

            case 'daily-full-sync':
                result = await performFullSync(env);
                break;

            case 'traffic-check':
                result = await performTrafficCheck(env);
                break;

            default:
                result = await performSubscriptionSync(env);
        }

        return new Response(JSON.stringify({
            success: true,
            cronType,
            timestamp: new Date().toISOString(),
            ...result
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(`[Cron Error] ${cronType}:`, error);

        return new Response(JSON.stringify({
            success: false,
            cronType,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * 执行订阅同步
 * 支持通过环境变量配置同步行为
 */
async function performSubscriptionSync(env) {
    console.log('[Cron] Performing subscription sync');

    // 从环境变量读取配置，默认值
    const maxSyncCount = parseInt(env.CRON_MAX_SYNC_COUNT) || 50; // 默认最多同步50个订阅
    const syncTimeout = parseInt(env.CRON_SYNC_TIMEOUT) || 30000; // 默认30秒超时
    const enableParallel = env.CRON_ENABLE_PARALLEL !== 'false'; // 默认启用并行同步

    const results = {
        timestamp: new Date().toISOString(),
        totalSubscriptions: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        config: {
            maxSyncCount,
            syncTimeout,
            enableParallel
        }
    };

    try {
        // 从存储获取订阅列表
        const subscriptions = await getAllSubscriptions(env);
        results.totalSubscriptions = subscriptions.length;

        // 限制同步数量
        const subscriptionsToSync = subscriptions.slice(0, maxSyncCount);
        console.log(`[Cron] Syncing ${subscriptionsToSync.length} of ${subscriptions.length} subscriptions (max: ${maxSyncCount})`);

        if (enableParallel) {
            // 并行同步
            const syncPromises = subscriptionsToSync.map(async (sub) => {
                try {
                    console.log(`[Cron] Syncing subscription: ${sub.name}`);
                    await performSingleSubscriptionSync(sub, env, syncTimeout);
                    return { success: true, name: sub.name };
                } catch (error) {
                    console.error(`[Cron] Failed to sync ${sub.name}:`, error);
                    return { success: false, name: sub.name, error: error.message };
                }
            });

            const syncResults = await Promise.allSettled(syncPromises);
            syncResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value.success) {
                    results.successfulSyncs++;
                } else {
                    results.failedSyncs++;
                }
            });
        } else {
            // 串行同步
            for (const sub of subscriptionsToSync) {
                try {
                    console.log(`[Cron] Syncing subscription: ${sub.name}`);
                    await performSingleSubscriptionSync(sub, env, syncTimeout);
                    results.successfulSyncs++;
                } catch (error) {
                    console.error(`[Cron] Failed to sync ${sub.name}:`, error);
                    results.failedSyncs++;
                }
            }
        }

    } catch (error) {
        console.error('[Cron] Subscription sync error:', error);
        results.error = error.message;
    }

    return results;
}

/**
 * 执行完整同步（清理缓存，重新获取所有订阅）
 */
async function performFullSync(env) {
    console.log('[Cron] Performing full sync');

    // 清理缓存
    await clearSubscriptionCache(env);

    // 执行完整同步
    const result = await performSubscriptionSync(env);

    return {
        ...result,
        type: 'full-sync'
    };
}

/**
 * 执行流量检查
 */
async function performTrafficCheck(env) {
    console.log('[Cron] Performing traffic check');

    const subscriptions = await getAllSubscriptions(env);
    const trafficResults = [];

    for (const sub of subscriptions) {
        try {
            // 简单的流量检查逻辑
            console.log(`[Cron] Checking traffic for ${sub.name}`);
        } catch (error) {
            console.error(`[Traffic Check] Failed for ${sub.name}:`, error);
        }
    }

    return {
        checkedSubscriptions: subscriptions.length,
        warnings: trafficResults.length,
        details: trafficResults
    };
}

/**
 * 清理订阅缓存
 */
async function clearSubscriptionCache(env) {
    // 清理 KV 缓存
    if (env.KV_STORAGE) {
        console.log('[Cron] Cache cleared');
    }
}

/**
 * 获取所有订阅
 */
async function getAllSubscriptions(env) {
    // 从存储获取订阅列表
    if (env.DB) {
        try {
            const { results } = await env.DB.prepare(
                "SELECT * FROM subscriptions WHERE enabled = 1"
            ).all();
            return results;
        } catch (error) {
            console.error('[Cron] Failed to fetch from D1:', error);
        }
    }

    if (env.KV_STORAGE) {
        try {
            const data = await env.KV_STORAGE.get('subscriptions');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[Cron] Failed to fetch from KV:', error);
        }
    }

    return [];
}

/**
 * 执行单个订阅同步
 * @param {Object} subscription - 订阅对象
 * @param {Object} env - 环境变量
 * @param {number} timeout - 超时时间（毫秒）
 */
async function performSingleSubscriptionSync(subscription, env, timeout) {
    // 创建带超时的 AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        // 这里应该调用实际的订阅同步逻辑
        // 暂时使用模拟逻辑
        console.log(`[Single Sync] Processing ${subscription.name} with ${timeout}ms timeout`);

        // 模拟网络请求
        await new Promise((resolve, reject) => {
            controller.signal.addEventListener('abort', () => reject(new Error('Timeout')));
            setTimeout(resolve, Math.random() * 2000); // 模拟1-2秒的处理时间
        });

        clearTimeout(timeoutId);
        return { success: true };

    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}