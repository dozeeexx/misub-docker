/**
 * 日志服务模块
 * 处理订阅访问日志的存储和检索
 */

const LOG_KV_KEY = 'misub_system_logs';
const MAX_LOG_ENTRIES = 500;
const MAX_LOG_AGE_DAYS = 30;
const MAX_LOG_AGE_MS = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

export const LogService = {
    /**
     * 添加一条新日志
     * @param {Object} env - Cloudflare Environment
     * @param {Object} logEntry - 日志内容
     */
    async addLog(env, logEntry) {
        if (!env.MISUB_KV) return;

        try {
            // 获取现有日志
            let logs = await env.MISUB_KV.get(LOG_KV_KEY, 'json') || [];
            if (!Array.isArray(logs)) logs = [];

            // 补充基础信息
            const enrichedLog = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                ...logEntry
            };

            // 插入新日志
            logs.unshift(enrichedLog);

            // 1. 过滤过期日志 (30天)
            const now = Date.now();
            logs = logs.filter(log => (now - log.timestamp) <= MAX_LOG_AGE_MS);

            // 2. 限制数量 (500条)
            if (logs.length > MAX_LOG_ENTRIES) {
                logs = logs.slice(0, MAX_LOG_ENTRIES);
            }

            // 保存回 KV
            await env.MISUB_KV.put(LOG_KV_KEY, JSON.stringify(logs));
            return enrichedLog;
        } catch (error) {
            console.error('[LogService] Failed to add log:', error);
        }
    },

    /**
     * 获取日志列表
     * @param {Object} env - Cloudflare Environment
     */
    async getLogs(env) {
        if (!env.MISUB_KV) return [];
        try {
            const logs = await env.MISUB_KV.get(LOG_KV_KEY, 'json');
            return Array.isArray(logs) ? logs : [];
        } catch (error) {
            console.error('[LogService] Failed to get logs:', error);
            return [];
        }
    },

    /**
     * 清空日志
     * @param {Object} env - Cloudflare Environment
     */
    async clearLogs(env) {
        if (!env.MISUB_KV) return;
        try {
            await env.MISUB_KV.delete(LOG_KV_KEY);
            return true;
        } catch (error) {
            console.error('[LogService] Failed to clear logs:', error);
            return false;
        }
    }
};
