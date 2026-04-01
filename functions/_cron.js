/**
 * Cron Triggers 路由处理
 * 根据不同的定时任务执行相应的逻辑
 */

import { performSubscriptionSync } from './services/subscription-sync-manager.js';
import { trafficMonitor } from './services/traffic-monitor.js';

export async function onRequest(context) {
    const { request, env } = context;

    // 验证这是Cron触发
    if (request.headers.get('CF-Cron') !== 'true') {
        return new Response('Unauthorized', { status: 401 });
    }

    // 获取Cron任务类型
    const cronType = request.headers.get('CF-Cron-Type') || 'default';

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
 * 执行完整同步（清理缓存，重新获取所有订阅）
 */
async function performFullSync(env) {
    console.log('[Cron] Performing full sync');

    // 清理缓存
    await clearSubscriptionCache(env);

    // 执行完整同步
    const result = await performSubscriptionSync(env);

    // 发送通知（如果配置了）
    await sendSyncNotification(result, env);

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
            const traffic = await trafficMonitor.getTrafficInfo(sub.url, sub.userAgent);
            if (traffic && trafficMonitor.shouldWarnTraffic(traffic)) {
                trafficResults.push({
                    name: sub.name,
                    url: sub.url,
                    traffic,
                    warning: true
                });
            }
        } catch (error) {
            console.error(`[Traffic Check] Failed for ${sub.name}:`, error);
        }
    }

    // 如果有流量警告，发送通知
    if (trafficResults.length > 0) {
        await sendTrafficWarning(trafficResults, env);
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
        // 这里可以实现缓存清理逻辑
        console.log('[Cron] Cache cleared');
    }
}

/**
 * 获取所有订阅
 */
async function getAllSubscriptions(env) {
    // 从存储获取订阅列表
    if (env.DB) {
        const { results } = await env.DB.prepare(
            "SELECT * FROM subscriptions WHERE enabled = 1"
        ).all();
        return results;
    }

    if (env.KV_STORAGE) {
        const data = await env.KV_STORAGE.get('subscriptions');
        return data ? JSON.parse(data) : [];
    }

    return [];
}

/**
 * 发送同步通知
 */
async function sendSyncNotification(result, env) {
    // 这里可以集成通知服务，如 Telegram、邮件等
    console.log('[Cron] Sync notification sent:', result);
}

/**
 * 发送流量警告
 */
async function sendTrafficWarning(warnings, env) {
    // 发送流量使用警告通知
    console.log('[Cron] Traffic warnings:', warnings);
}