import {
    getCache,
    triggerBackgroundRefresh,
    createCacheHeaders
} from '../../services/node-cache-service.js';

/**
 * 解析节点列表（带缓存支持）
 * @param {Object} options - 配置选项
 * @param {Object} options.storageAdapter - 存储适配器
 * @param {string} options.cacheKey - 缓存键
 * @param {boolean} options.forceRefresh - 是否强制刷新
 * @param {Function} options.refreshNodes - 刷新节点函数
 * @param {Object} options.context - 请求上下文
 * @param {number} options.targetMisubsCount - 目标订阅数量
 * @param {number} options.syncRefreshTimeoutMs - 同步刷新超时（毫秒），默认 6500ms
 * @param {string} options.missFallbackNodeList - 缓存 miss 且刷新失败时的占位节点
 */
export async function resolveNodeListWithCache({
    storageAdapter,
    cacheKey,
    forceRefresh,
    refreshNodes,
    context,
    targetMisubsCount,
    syncRefreshTimeoutMs = 6500,
    missFallbackNodeList = ''
}) {
    const { data: cachedData, status: cacheStatus } = forceRefresh
        ? { data: null, status: 'miss' }
        : await getCache(storageAdapter, cacheKey);

    let combinedNodeList;
    let cacheHeaders = {};

    if (cacheStatus === 'fresh' && cachedData) {
        // 缓存新鲜：直接返回（当前策略下不会触发，因为 FRESH_TTL=0）
        combinedNodeList = cachedData.nodes;
        cacheHeaders = createCacheHeaders('HIT', cachedData.nodeCount);

        // [Stats Export] Populate generation stats from cache for deferred logging
        if (context) {
            context.generationStats = {
                totalNodes: cachedData.nodeCount || 0,
                sourceCount: targetMisubsCount,
                successCount: cachedData.nodeCount || 0,
                failCount: 0,
                duration: 0
            };
        }
    } else if ((cacheStatus === 'stale' || cacheStatus === 'expired') && cachedData) {
        // 有缓存：立即返回缓存数据，同时后台刷新确保下次获取最新
        combinedNodeList = cachedData.nodes;
        cacheHeaders = createCacheHeaders(`REFRESHING`, cachedData.nodeCount);
        // 触发后台刷新，确保缓存始终是最新的
        triggerBackgroundRefresh(context, () => refreshNodes(true));

        // [Stats Export] Populate generation stats from cache for deferred logging
        if (context) {
            context.generationStats = {
                totalNodes: cachedData.nodeCount || 0,
                sourceCount: targetMisubsCount,
                successCount: cachedData.nodeCount || 0,
                failCount: 0,
                duration: 0
            };
        }
    } else {
        // 无缓存（首次访问或缓存已过期）：同步获取完整节点列表
        // 优化超时配置，确保在客户端 15s 超时前完成
        const SYNC_REFRESH_TIMEOUT = Math.max(1000, syncRefreshTimeoutMs);

        try {
            combinedNodeList = await Promise.race([
                refreshNodes(false),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Sync refresh timeout')), SYNC_REFRESH_TIMEOUT)
                )
            ]);
        } catch (error) {
            console.warn('[Cache] Sync refresh failed or timeout:', error.message);
            // 超时或失败时返回占位节点，同时触发后台刷新确保下次成功
            combinedNodeList = missFallbackNodeList || '';
            triggerBackgroundRefresh(context, () => refreshNodes(true));
        }
        const nodeCount = combinedNodeList.split('\n').filter(l => l.trim()).length;
        cacheHeaders = createCacheHeaders(nodeCount > 0 ? 'MISS' : 'MISS_EMPTY', nodeCount);
    }

    return { combinedNodeList, cacheHeaders, cacheStatus };
}
