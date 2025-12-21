/**
 * API处理模块
 * 处理各种API请求
 */

import { StorageFactory } from '../storage-adapter.js';
import { createJsonResponse, createErrorResponse } from './utils.js';
import { authMiddleware, handleLogin, handleLogout, createUnauthorizedResponse } from './auth-middleware.js';
import { sendTgNotification, checkAndNotify } from './notifications.js';
import { clearAllNodeCaches } from '../services/node-cache-service.js';

import { KV_KEY_SUBS, KV_KEY_PROFILES, KV_KEY_SETTINGS, DEFAULT_SETTINGS as defaultSettings } from './config.js';

/**
 * 获取存储适配器实例
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Object>} 存储适配器实例
 */
async function getStorageAdapter(env) {
    const storageType = await StorageFactory.getStorageType(env);
    return StorageFactory.createAdapter(env, storageType);
}

/**
 * 处理数据获取API
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
export async function handleDataRequest(env) {
    try {
        const storageAdapter = await getStorageAdapter(env);
        const [misubs, profiles, settings] = await Promise.all([
            storageAdapter.get(KV_KEY_SUBS).then(res => res || []),
            storageAdapter.get(KV_KEY_PROFILES).then(res => res || []),
            storageAdapter.get(KV_KEY_SETTINGS).then(res => res || {})
        ]);
        const config = {
            FileName: settings.FileName || 'MISUB',
            mytoken: settings.mytoken || 'auto',
            profileToken: settings.profileToken || 'profiles'
        };
        return createJsonResponse({ misubs, profiles, config });
    } catch (e) {
        console.error('[API Error /data]', 'Failed to read from storage:', e);
        return createErrorResponse('读取初始数据失败', 'APIHandler', 500);
    }
}

/**
 * 处理订阅和配置保存API
 * @param {Object} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
import { applyPatch } from './patch-utils.js';

// ... (existing imports)

/**
 * 处理订阅和配置保存API
 * @param {Object} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
export async function handleMisubsSave(request, env) {
    try {
        // 步骤1: 解析请求体
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            console.error('[API Error /misubs] JSON解析失败:', parseError);
            return createJsonResponse({
                success: false,
                message: '请求数据格式错误，请检查数据格式'
            }, 400);
        }

        const { misubs, profiles, diff } = requestData;
        const storageAdapter = await getStorageAdapter(env);

        let finalMisubs = misubs;
        let finalProfiles = profiles;

        // 步骤1.5: 检查是否为 Diff 模式
        if (diff) {
            console.log('[API] Processing Diff Patch...');
            // 获取当前数据
            const [currentMisubs, currentProfiles] = await Promise.all([
                storageAdapter.get(KV_KEY_SUBS).then(res => res || []),
                storageAdapter.get(KV_KEY_PROFILES).then(res => res || [])
            ]);

            // 应用补丁
            if (diff.subscriptions) {
                finalMisubs = applyPatch(currentMisubs, diff.subscriptions);
            } else {
                finalMisubs = currentMisubs; // 无变动
            }

            if (diff.profiles) {
                finalProfiles = applyPatch(currentProfiles, diff.profiles);
            } else {
                finalProfiles = currentProfiles; // 无变动
            }
        } else {
            // 步骤2: 验证必需字段 (仅在非Diff模式下)
            if (typeof misubs === 'undefined' || typeof profiles === 'undefined') {
                return createJsonResponse({
                    success: false,
                    message: '请求体中缺少 misubs 或 profiles 字段'
                }, 400);
            }

            // 步骤3: 验证数据类型
            if (!Array.isArray(misubs) || !Array.isArray(profiles)) {
                return createJsonResponse({
                    success: false,
                    message: 'misubs 和 profiles 必须是数组格式'
                }, 400);
            }
        }

        // 步骤4: 获取设置（带错误处理）
        let settings;
        try {
            settings = await storageAdapter.get(KV_KEY_SETTINGS) || defaultSettings;
        } catch (settingsError) {
            settings = defaultSettings; // 使用默认设置继续
        }

        // 步骤5: 处理通知（非阻塞，错误不影响保存）
        // 仅在有订阅数据时处理
        if (finalMisubs && finalMisubs.length > 0) {
            try {
                const notificationPromises = finalMisubs
                    .filter(sub => sub && sub.url && sub.url.startsWith('http'))
                    .map(sub => checkAndNotify(sub, settings, env).catch(notifyError => {
                        // 通知失败不影响保存流程
                    }));

                // 并行处理通知，但不等待完成
                Promise.all(notificationPromises).catch(e => {
                    // 部分通知处理失败
                });
            } catch (notificationError) {
                // 通知系统错误，继续保存流程
            }
        }

        // 步骤6: 保存数据到存储（使用存储适配器）
        try {
            await Promise.all([
                storageAdapter.put(KV_KEY_SUBS, finalMisubs),
                storageAdapter.put(KV_KEY_PROFILES, finalProfiles)
            ]);
        } catch (storageError) {
            return createJsonResponse({
                success: false,
                message: `数据保存失败: ${storageError.message || '存储服务暂时不可用，请稍后重试'}`
            }, 500);
        }

        // 步骤6.5: 清除节点缓存（订阅变动后确保拉取最新数据）
        try {
            const cacheResult = await clearAllNodeCaches(storageAdapter);
            console.log(`[API] Cleared ${cacheResult.cleared} node caches after subscription update`);
        } catch (cacheError) {
            // 缓存清除失败不影响保存结果
            console.warn('[API] Failed to clear node caches:', cacheError.message);
        }

        // 步骤7: 返回保存后的数据，确保前端能更新状态
        return createJsonResponse({
            success: true,
            message: diff ? '增量更新已保存' : '订阅源及订阅组已保存',
            data: {
                misubs: finalMisubs,
                profiles: finalProfiles
            }
        });

    } catch (e) {
        return createJsonResponse({
            success: false,
            message: `保存失败: ${e.message || '服务器内部错误，请稍后重试'}`
        }, 500);
    }
}

/**
 * 处理设置获取API
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
export async function handleSettingsGet(env) {
    try {
        const storageAdapter = await getStorageAdapter(env);
        const settings = await storageAdapter.get(KV_KEY_SETTINGS) || {};
        return createJsonResponse({ ...defaultSettings, ...settings });
    } catch (e) {
        return createErrorResponse('读取设置失败', 'APIHandler', 500);
    }
}

/**
 * 处理设置保存API
 * @param {Object} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
export async function handleSettingsSave(request, env) {
    try {
        const newSettings = await request.json();
        const storageAdapter = await getStorageAdapter(env);
        const oldSettings = await storageAdapter.get(KV_KEY_SETTINGS) || {};
        const finalSettings = { ...oldSettings, ...newSettings };

        // 使用存储适配器保存设置
        await storageAdapter.put(KV_KEY_SETTINGS, finalSettings);

        // 清除节点缓存（设置变更可能影响节点处理逻辑）
        try {
            await clearAllNodeCaches(storageAdapter);
            console.log('[API] Cleared node caches after settings update');
        } catch (cacheError) {
            console.warn('[API] Failed to clear node caches:', cacheError.message);
        }

        const message = `⚙️ *MiSub 设置更新* ⚙️\n\n您的 MiSub 应用设置已成功更新。`;
        await sendTgNotification(finalSettings, message);

        return createJsonResponse({ success: true, message: '设置已保存' });
    } catch (e) {
        return createErrorResponse('保存设置失败', 'APIHandler', 500);
    }
}