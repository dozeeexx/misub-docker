//
// src/lib/api.js
//

/**
 * 统一的 API 错误处理辅助函数
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 * @returns {Object} 标准错误响应
 */
function handleApiError(error, context = '') {
    console.error(`[API Error - ${context}]`, error);

    let errorType = 'unknown';
    let errorMessage = '未知错误';

    if (error.name === 'AbortError') {
        errorType = 'timeout';
        errorMessage = '请求超时,请稍后重试';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorType = 'network';
        errorMessage = '网络连接失败,请检查网络连接';
    } else if (error.message === 'UNAUTHORIZED') {
        errorType = 'auth';
        errorMessage = '认证失败,请重新登录';
    } else if (error.message.includes('HTTP')) {
        errorType = 'server';
        errorMessage = error.message;
    } else if (error.name === 'SyntaxError') {
        errorType = 'server';
        errorMessage = '服务器响应格式错误';
    } else {
        errorMessage = error.message || '操作失败,请稍后重试';
    }

    return {
        success: false,
        error: errorMessage,
        errorType: errorType
    };
}
export async function fetchInitialData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

        const response = await fetch('/api/data', {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: '认证失败,请重新登录', errorType: 'auth' };
            }
            return { success: false, error: `服务器错误 (${response.status})`, errorType: 'server' };
        }

        // 后端已经更新，会返回 { misubs, profiles, config }
        const data = await response.json();

        // 检查新的认证状态响应 (200 OK with authenticated: false)
        if (data && data.authenticated === false) {
            return { success: false, error: '认证失败,请重新登录', errorType: 'auth' };
        }

        return { success: true, data };
    } catch (error) {
        return handleApiError(error, 'fetchInitialData');
    }
}

export async function login(password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || errorData.error || '登录失败',
                errorType: 'auth'
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return handleApiError(error, 'login');
    }
}

// [核心修改] saveMisubs 现在接收并发送 profiles
export async function saveMisubs(misubs, profiles) {
    try {
        // 数据预验证
        if (!Array.isArray(misubs) || !Array.isArray(profiles)) {
            return { success: false, error: '数据格式错误：misubs 和 profiles 必须是数组', errorType: 'validation' };
        }

        const response = await fetch('/api/misubs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 将 misubs 和 profiles 一起发送
            body: JSON.stringify({ misubs, profiles })
        });

        // 检查HTTP状态码
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, error: errorMessage, errorType: 'server' };
        }

        return await response.json();
    } catch (error) {
        return handleApiError(error, 'saveMisubs');
    }
}

export async function fetchNodeCount(subUrl) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

        const res = await fetch('/api/node_count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: subUrl }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || errorData.error || `HTTP ${res.status}`,
                errorType: 'server'
            };
        }

        const data = await res.json();
        return { success: true, data }; // data 包含 { count, userInfo }
    } catch (error) {
        return handleApiError(error, 'fetchNodeCount');
    }
}

export async function fetchSettings() {
    try {
        const response = await fetch(`/api/settings?t=${Date.now()}`);

        if (!response.ok) {
            return { success: false, error: '获取设置失败', errorType: 'server' };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return handleApiError(error, 'fetchSettings');
    }
}

export async function fetchPublicConfig() {
    try {
        const response = await fetch(`/api/public_config`);

        if (!response.ok) {
            return { success: false, error: '获取公开配置失败', errorType: 'server' };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return handleApiError(error, 'fetchPublicConfig');
    }
}

export async function saveSettings(settings) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        // 检查HTTP状态码
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, error: errorMessage, errorType: 'server' };
        }

        return await response.json();
    } catch (error) {
        return handleApiError(error, 'saveSettings');
    }
}

/**
 * 批量更新订阅的节点信息
 * @param {string[]} subscriptionIds - 要更新的订阅ID数组
 * @returns {Promise<Object>} - 更新结果
 */
export async function batchUpdateNodes(subscriptionIds) {
    try {
        const response = await fetch('/api/batch_update_nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionIds })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, error: errorMessage, errorType: 'server' };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        return handleApiError(error, 'batchUpdateNodes');
    }
}

/**
 * 数据迁移：从 KV 迁移到 D1 数据库
 * @returns {Promise<Object>} - 迁移结果
 */
export async function migrateToD1() {
    try {
        const response = await fetch('/api/migrate_to_d1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            // Pass through details if available (e.g. for migration errors)
            return {
                success: false,
                error: errorMessage,
                errorType: 'server',
                details: errorData.details || errorData.errors
            };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        return handleApiError(error, 'migrateToD1');
    }
}

/**
 * 测试订阅链接内容
 * @param {string} url - 订阅URL
 * @param {string} userAgent - User-Agent
 * @returns {Promise<Object>} - 测试结果
 */
export async function testSubscription(url, userAgent) {
    try {
        const response = await fetch('/api/debug_subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, userAgent })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, error: errorMessage, errorType: 'server' };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        return handleApiError(error, 'testSubscription');
    }
}
