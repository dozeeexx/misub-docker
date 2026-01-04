import {
    getCache,
    triggerBackgroundRefresh,
    createCacheHeaders
} from '../../services/node-cache-service.js';

export async function resolveNodeListWithCache({
    storageAdapter,
    cacheKey,
    forceRefresh,
    refreshNodes,
    context,
    targetMisubsCount
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
        // 无缓存（首次访问或缓存已过期）：同步获取并缓存，但设置总体超时
        const SYNC_REFRESH_TIMEOUT = 25000; // 25 秒总预算，确保在 Clash 超时前返回

        try {
            combinedNodeList = await Promise.race([
                refreshNodes(false),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Sync refresh timeout')), SYNC_REFRESH_TIMEOUT)
                )
            ]);
        } catch (error) {
            console.warn('[Cache] Sync refresh failed or timeout:', error.message);
            // 超时或失败时返回空内容，触发回退逻辑
            combinedNodeList = '';
        }
        cacheHeaders = createCacheHeaders('MISS', combinedNodeList.split('\n').filter(l => l.trim()).length);
    }

    return { combinedNodeList, cacheHeaders, cacheStatus };
}
