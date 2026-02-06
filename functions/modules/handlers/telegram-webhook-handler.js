/**
 * Telegram Bot Webhook 处理模块 v2
 * 用于接收和处理用户通过 Telegram 推送的节点
 * 
 * 支持的命令：
 * /start - 欢迎信息
 * /help - 帮助信息
 * /menu - 快捷菜单
 * /list - 节点列表（带分页）
 * /stats - 统计信息
 * /search - 搜索节点
 * /delete - 删除节点
 * /enable - 启用节点
 * /disable - 禁用节点
 * /rename - 重命名节点
 * /sub - 获取订阅链接
 * /info - 节点详情
 * /copy - 复制节点链接
 * /export - 导出节点
 * /import - 导入节点
 * /sort - 节点排序
 * /dup - 去重检测
 */

import { StorageFactory } from '../../storage-adapter.js';
import { createJsonResponse } from '../utils.js';
import { KV_KEY_SUBS, KV_KEY_PROFILES, KV_KEY_SETTINGS } from '../config.js';

// ==================== 存储与配置 ====================

/**
 * 获取存储适配器实例
 */
async function getStorageAdapter(env) {
    const storageType = await StorageFactory.getStorageType(env);
    return StorageFactory.createAdapter(env, storageType);
}

/**
 * 获取 Telegram Bot 推送配置
 */
async function getTelegramPushConfig(env) {
    const storageAdapter = await getStorageAdapter(env);
    const settings = await storageAdapter.get(KV_KEY_SETTINGS) || {};
    const config = settings.telegram_push_config || {};

    return {
        enabled: config.enabled ?? true,
        bot_token: config.bot_token || env.TELEGRAM_PUSH_BOT_TOKEN,
        webhook_secret: config.webhook_secret || env.TELEGRAM_PUSH_WEBHOOK_SECRET,
        allowed_user_ids: config.allowed_user_ids ||
            (env.TELEGRAM_PUSH_ALLOWED_USERS?.split(',') || []),
        rate_limit: config.rate_limit || {
            max_per_minute: 1000,
            max_per_day: 10000
        }
    };
}

// ==================== 工具函数 ====================

/**
 * 生成随机ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * 从节点URL提取名称
 */
function extractNodeName(url) {
    try {
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
            const encoded = url.substring(hashIndex + 1);
            try {
                return decodeURIComponent(encoded);
            } catch {
                return encoded;
            }
        }
        const protocol = url.split('://')[0].toUpperCase();
        return `${protocol} 节点`;
    } catch {
        return '未命名节点';
    }
}

/**
 * 提取节点链接（支持多种协议）
 */
function extractNodeUrls(text) {
    const protocols = [
        'ss://', 'ssr://', 'vmess://', 'vless://', 'trojan://',
        'hysteria://', 'hysteria2://', 'hy2://', 'tuic://', 'snell://'
    ];
    const urls = [];
    const lines = text.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        for (const protocol of protocols) {
            if (trimmed.startsWith(protocol)) {
                urls.push(trimmed);
                break;
            }
        }
    }

    return urls;
}

/**
 * 解析目标参数（支持序号、ID、all）
 * @returns {Object} { type: 'index'|'id'|'all'|'range', values: [] }
 */
function parseTargetArgs(args) {
    if (!args || args.length === 0) {
        return { type: 'none', values: [] };
    }

    const arg = args.join(' ').trim().toLowerCase();

    if (arg === 'all' || arg === '全部') {
        return { type: 'all', values: [] };
    }

    // 支持逗号分隔的多个值
    const parts = arg.split(/[,，\s]+/).filter(p => p);
    const indices = [];
    const ids = [];

    for (const part of parts) {
        const num = parseInt(part);
        if (!isNaN(num) && num > 0) {
            indices.push(num - 1); // 转为0-indexed
        } else {
            ids.push(part);
        }
    }

    if (indices.length > 0 && ids.length === 0) {
        return { type: 'index', values: indices };
    } else if (ids.length > 0 && indices.length === 0) {
        return { type: 'id', values: ids };
    } else if (indices.length > 0 && ids.length > 0) {
        return { type: 'mixed', indices, ids };
    }

    return { type: 'none', values: [] };
}

// ==================== Telegram API ====================

/**
 * 发送 Telegram 消息
 */
async function sendTelegramMessage(chatId, text, env, options = {}) {
    try {
        const config = await getTelegramPushConfig(env);
        if (!config.bot_token) {
            console.error('[Telegram Push] Bot token not configured');
            return;
        }

        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            ...options
        };

        const response = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error('[Telegram Push] Failed to send message:', await response.text());
        }

        return response;
    } catch (error) {
        console.error('[Telegram Push] Error sending message:', error);
    }
}

/**
 * 编辑 Telegram 消息
 */
async function editTelegramMessage(chatId, messageId, text, env, options = {}) {
    try {
        const config = await getTelegramPushConfig(env);
        if (!config.bot_token) return;

        const body = {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'HTML',
            ...options
        };

        await fetch(`https://api.telegram.org/bot${config.bot_token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (error) {
        console.error('[Telegram Push] Error editing message:', error);
    }
}

/**
 * 回答 Callback Query
 */
async function answerCallbackQuery(callbackQueryId, text, env, showAlert = false) {
    try {
        const config = await getTelegramPushConfig(env);
        if (!config.bot_token) return;

        await fetch(`https://api.telegram.org/bot${config.bot_token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text,
                show_alert: showAlert
            })
        });
    } catch (error) {
        console.error('[Telegram Push] Error answering callback:', error);
    }
}

// ==================== 验证函数 ====================

/**
 * 验证 Telegram Webhook 请求
 */
function verifyTelegramRequest(request, config) {
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    return secretToken === config.webhook_secret;
}

/**
 * 检查用户权限
 */
function checkUserPermission(userId, config) {
    if (!config.enabled) {
        return { allowed: false, reason: 'Bot 已被管理员禁用' };
    }

    if (!config.allowed_user_ids.includes(userId.toString())) {
        return { allowed: false, reason: '无权限使用此 Bot，请联系管理员添加白名单' };
    }

    return { allowed: true };
}

/**
 * 检查频率限制
 */
async function checkRateLimit(userId, env, config) {
    const minuteKey = `tg_push_rate:${userId}:min`;
    const dayKey = `tg_push_rate:${userId}:day`;

    const minuteCount = parseInt(await env.MISUB_KV.get(minuteKey) || '0');
    const dayCount = parseInt(await env.MISUB_KV.get(dayKey) || '0');

    if (minuteCount >= config.rate_limit.max_per_minute) {
        return { allowed: false, reason: `操作过快，请1分钟后再试（${config.rate_limit.max_per_minute}/分钟）` };
    }

    if (dayCount >= config.rate_limit.max_per_day) {
        return { allowed: false, reason: `今日配额已用完（${config.rate_limit.max_per_day}/天）` };
    }

    await env.MISUB_KV.put(minuteKey, (minuteCount + 1).toString(), { expirationTtl: 60 });
    await env.MISUB_KV.put(dayKey, (dayCount + 1).toString(), { expirationTtl: 86400 });

    return { allowed: true };
}

// ==================== 获取用户节点 ====================

/**
 * 获取用户通过 Telegram 添加的节点
 */
async function getUserNodes(userId, env) {
    const storageAdapter = await getStorageAdapter(env);
    const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];

    return allSubscriptions.filter(sub =>
        sub.source === 'telegram' && sub.telegram_user_id === userId
    );
}

/**
 * 获取所有节点和用户节点的索引映射
 */
async function getNodesWithMapping(userId, env) {
    const storageAdapter = await getStorageAdapter(env);
    const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];

    const userNodes = [];
    const indexMapping = []; // userIndex -> allIndex

    allSubscriptions.forEach((sub, allIndex) => {
        if (sub.source === 'telegram' && sub.telegram_user_id === userId) {
            indexMapping.push(allIndex);
            userNodes.push(sub);
        }
    });

    return { allSubscriptions, userNodes, indexMapping, storageAdapter };
}

// ==================== 命令处理器 ====================

/**
 * 处理 /start 命令
 */
async function handleStartCommand(chatId, env) {
    const message =
        '👋 <b>欢迎使用 MiSub Telegram Bot！</b>\n\n' +
        '通过这个 Bot，你可以：\n' +
        '• 📤 快速添加代理节点\n' +
        '• 📋 管理你的节点列表\n' +
        '• 🔗 获取订阅链接\n\n' +
        '直接发送节点链接即可添加，支持批量添加。\n\n' +
        '发送 /help 查看完整命令列表\n' +
        '发送 /menu 打开快捷菜单';

    await sendTelegramMessage(chatId, message, env);
}

/**
 * 处理 /help 命令
 */
async function handleHelpCommand(chatId, env) {
    const message =
        '📖 <b>MiSub Bot v2 命令帮助</b>\n\n' +
        '<b>📤 添加节点</b>\n' +
        '直接发送节点链接（支持批量）\n\n' +
        '<b>📋 查看</b>\n' +
        '/list - 节点列表\n' +
        '/stats - 统计信息\n' +
        '/info <序号> - 节点详情\n' +
        '/search <词> - 搜索节点\n\n' +
        '<b>✏️ 编辑</b>\n' +
        '/enable <序号> - 启用\n' +
        '/disable <序号> - 禁用\n' +
        '/rename <序号> <名> - 重命名\n' +
        '/delete <序号> - 删除\n\n' +
        '<b>📦 导入导出</b>\n' +
        '/copy <序号> - 复制链接\n' +
        '/export - 导出节点\n' +
        '/import <链接> - 导入节点\n\n' +
        '<b>🔧 工具</b>\n' +
        '/sort <类型> - 排序\n' +
        '/dup - 去重检测\n' +
        '/sub - 订阅链接\n' +
        '/menu - 快捷菜单\n\n' +
        '序号：单个(1)、多个(1,3)、全部(all)';

    await sendTelegramMessage(chatId, message, env);
}

/**
 * 处理 /menu 命令 - 快捷菜单
 */
async function handleMenuCommand(chatId, env) {
    const keyboard = {
        inline_keyboard: [
            [
                { text: '📋 节点列表', callback_data: 'cmd_list' },
                { text: '📊 统计信息', callback_data: 'cmd_stats' }
            ],
            [
                { text: '🔗 获取订阅', callback_data: 'cmd_sub' },
                { text: '🔍 搜索节点', callback_data: 'prompt_search' }
            ],
            [
                { text: '✅ 全部启用', callback_data: 'cmd_enable_all' },
                { text: '⛔ 全部禁用', callback_data: 'cmd_disable_all' }
            ],
            [
                { text: '🗑️ 删除全部', callback_data: 'confirm_delete_all' }
            ]
        ]
    };

    await sendTelegramMessage(chatId, '📱 <b>快捷操作菜单</b>\n\n选择一个操作：', env, {
        reply_markup: keyboard
    });
}

/**
 * 处理 /list 命令 - 节点列表（带分页）
 */
async function handleListCommand(chatId, userId, env, page = 0) {
    try {
        const userNodes = await getUserNodes(userId, env);

        if (userNodes.length === 0) {
            await sendTelegramMessage(chatId, '📋 <b>暂无节点</b>\n\n直接发送节点链接即可添加', env);
            return;
        }

        const pageSize = 8;
        const totalPages = Math.ceil(userNodes.length / pageSize);
        const currentPage = Math.min(Math.max(0, page), totalPages - 1);
        const startIdx = currentPage * pageSize;
        const endIdx = Math.min(startIdx + pageSize, userNodes.length);

        let message = `📋 <b>节点列表</b> (${userNodes.length} 个)\n`;
        message += `第 ${currentPage + 1}/${totalPages} 页\n\n`;

        for (let i = startIdx; i < endIdx; i++) {
            const node = userNodes[i];
            const protocol = node.url.split('://')[0].toUpperCase();
            const status = node.enabled ? '✅' : '⛔';
            message += `<b>${i + 1}.</b> ${status} ${node.name}\n`;
            message += `    <code>${protocol}</code>\n`;
        }

        // 分页按钮
        const buttons = [];
        if (currentPage > 0) {
            buttons.push({ text: '⬅️ 上一页', callback_data: `list_page_${currentPage - 1}` });
        }
        if (currentPage < totalPages - 1) {
            buttons.push({ text: '下一页 ➡️', callback_data: `list_page_${currentPage + 1}` });
        }

        const keyboard = buttons.length > 0 ? { inline_keyboard: [buttons] } : undefined;

        await sendTelegramMessage(chatId, message, env, keyboard ? { reply_markup: keyboard } : {});
    } catch (error) {
        console.error('[Telegram Push] List command failed:', error);
        await sendTelegramMessage(chatId, `❌ 获取列表失败: ${error.message}`, env);
    }
}

/**
 * 处理 /stats 命令
 */
async function handleStatsCommand(chatId, userId, env) {
    try {
        const userNodes = await getUserNodes(userId, env);
        const enabledNodes = userNodes.filter(n => n.enabled);

        const protocolCounts = {};
        userNodes.forEach(node => {
            const protocol = node.url.split('://')[0].toUpperCase();
            protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
        });

        let message = `📊 <b>节点统计</b>\n\n`;
        message += `总节点数: <b>${userNodes.length}</b>\n`;
        message += `已启用: <b>${enabledNodes.length}</b>\n`;
        message += `已禁用: <b>${userNodes.length - enabledNodes.length}</b>\n\n`;

        if (Object.keys(protocolCounts).length > 0) {
            message += `<b>协议分布：</b>\n`;
            Object.entries(protocolCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([protocol, count]) => {
                    message += `• ${protocol}: ${count}\n`;
                });
        }

        await sendTelegramMessage(chatId, message, env);
    } catch (error) {
        console.error('[Telegram Push] Stats command failed:', error);
        await sendTelegramMessage(chatId, `❌ 获取统计失败: ${error.message}`, env);
    }
}

/**
 * 处理 /delete 命令
 */
async function handleDeleteCommand(chatId, userId, args, env) {
    try {
        const target = parseTargetArgs(args);

        if (target.type === 'none') {
            await sendTelegramMessage(chatId,
                '❌ <b>请指定要删除的节点</b>\n\n' +
                '用法：\n' +
                '/delete 1 - 删除第1个\n' +
                '/delete 1,3,5 - 删除多个\n' +
                '/delete all - 删除全部',
                env
            );
            return;
        }

        const { allSubscriptions, userNodes, indexMapping, storageAdapter } = await getNodesWithMapping(userId, env);

        if (userNodes.length === 0) {
            await sendTelegramMessage(chatId, '📋 暂无可删除的节点', env);
            return;
        }

        let indicesToDelete = [];

        if (target.type === 'all') {
            indicesToDelete = indexMapping;
        } else if (target.type === 'index') {
            for (const idx of target.values) {
                if (idx >= 0 && idx < userNodes.length) {
                    indicesToDelete.push(indexMapping[idx]);
                }
            }
        } else if (target.type === 'id') {
            for (const id of target.values) {
                const foundIdx = allSubscriptions.findIndex(s => s.id === id);
                if (foundIdx !== -1 && indexMapping.includes(foundIdx)) {
                    indicesToDelete.push(foundIdx);
                }
            }
        }

        if (indicesToDelete.length === 0) {
            await sendTelegramMessage(chatId, '❌ 未找到指定的节点', env);
            return;
        }

        // 删除节点（从后往前删除以保持索引正确）
        indicesToDelete.sort((a, b) => b - a);
        const deletedNames = [];
        for (const idx of indicesToDelete) {
            deletedNames.push(allSubscriptions[idx].name);
            allSubscriptions.splice(idx, 1);
        }

        await storageAdapter.put(KV_KEY_SUBS, allSubscriptions);

        let message = `✅ <b>已删除 ${deletedNames.length} 个节点</b>\n\n`;
        if (deletedNames.length <= 5) {
            deletedNames.reverse().forEach(name => {
                message += `• ${name}\n`;
            });
        }

        await sendTelegramMessage(chatId, message, env);
        console.info(`[Telegram Push] User ${userId} deleted ${deletedNames.length} nodes`);

    } catch (error) {
        console.error('[Telegram Push] Delete command failed:', error);
        await sendTelegramMessage(chatId, `❌ 删除失败: ${error.message}`, env);
    }
}

/**
 * 处理 /enable 命令
 */
async function handleEnableCommand(chatId, userId, args, env) {
    await handleToggleCommand(chatId, userId, args, env, true);
}

/**
 * 处理 /disable 命令
 */
async function handleDisableCommand(chatId, userId, args, env) {
    await handleToggleCommand(chatId, userId, args, env, false);
}

/**
 * 切换节点启用状态
 */
async function handleToggleCommand(chatId, userId, args, env, enable) {
    try {
        const target = parseTargetArgs(args);
        const action = enable ? '启用' : '禁用';
        const icon = enable ? '✅' : '⛔';

        if (target.type === 'none') {
            await sendTelegramMessage(chatId,
                `❌ <b>请指定要${action}的节点</b>\n\n` +
                `用法：\n` +
                `/${enable ? 'enable' : 'disable'} 1 - ${action}第1个\n` +
                `/${enable ? 'enable' : 'disable'} 1,3,5 - ${action}多个\n` +
                `/${enable ? 'enable' : 'disable'} all - ${action}全部`,
                env
            );
            return;
        }

        const { allSubscriptions, userNodes, indexMapping, storageAdapter } = await getNodesWithMapping(userId, env);

        if (userNodes.length === 0) {
            await sendTelegramMessage(chatId, `📋 暂无可${action}的节点`, env);
            return;
        }

        let indicesToToggle = [];

        if (target.type === 'all') {
            indicesToToggle = [...indexMapping];
        } else if (target.type === 'index') {
            for (const idx of target.values) {
                if (idx >= 0 && idx < userNodes.length) {
                    indicesToToggle.push(indexMapping[idx]);
                }
            }
        }

        if (indicesToToggle.length === 0) {
            await sendTelegramMessage(chatId, '❌ 未找到指定的节点', env);
            return;
        }

        const toggledNames = [];
        for (const idx of indicesToToggle) {
            allSubscriptions[idx].enabled = enable;
            toggledNames.push(allSubscriptions[idx].name);
        }

        await storageAdapter.put(KV_KEY_SUBS, allSubscriptions);

        let message = `${icon} <b>已${action} ${toggledNames.length} 个节点</b>\n\n`;
        if (toggledNames.length <= 5) {
            toggledNames.forEach(name => {
                message += `• ${name}\n`;
            });
        }

        await sendTelegramMessage(chatId, message, env);

    } catch (error) {
        console.error(`[Telegram Push] Toggle command failed:`, error);
        await sendTelegramMessage(chatId, `❌ ${enable ? '启用' : '禁用'}失败: ${error.message}`, env);
    }
}

/**
 * 处理 /search 命令
 */
async function handleSearchCommand(chatId, userId, args, env) {
    try {
        const keyword = args.join(' ').trim();

        if (!keyword) {
            await sendTelegramMessage(chatId,
                '🔍 <b>搜索节点</b>\n\n' +
                '用法：/search <关键词>\n\n' +
                '示例：\n' +
                '/search 香港\n' +
                '/search vmess\n' +
                '/search HK',
                env
            );
            return;
        }

        const userNodes = await getUserNodes(userId, env);
        const lowerKeyword = keyword.toLowerCase();

        const results = userNodes.filter((node, idx) => {
            const protocol = node.url.split('://')[0].toLowerCase();
            return node.name.toLowerCase().includes(lowerKeyword) ||
                protocol.includes(lowerKeyword);
        });

        if (results.length === 0) {
            await sendTelegramMessage(chatId, `🔍 未找到包含 "<b>${keyword}</b>" 的节点`, env);
            return;
        }

        let message = `🔍 <b>搜索结果</b>：${results.length} 个\n\n`;

        results.slice(0, 10).forEach((node, i) => {
            const protocol = node.url.split('://')[0].toUpperCase();
            const status = node.enabled ? '✅' : '⛔';
            const originalIdx = userNodes.indexOf(node) + 1;
            message += `<b>${originalIdx}.</b> ${status} ${node.name} (${protocol})\n`;
        });

        if (results.length > 10) {
            message += `\n... 还有 ${results.length - 10} 个结果`;
        }

        await sendTelegramMessage(chatId, message, env);

    } catch (error) {
        console.error('[Telegram Push] Search command failed:', error);
        await sendTelegramMessage(chatId, `❌ 搜索失败: ${error.message}`, env);
    }
}

/**
 * 处理 /sub 命令 - 获取订阅链接
 */
async function handleSubCommand(chatId, args, env, request) {
    try {
        const storageAdapter = await getStorageAdapter(env);
        const profiles = await storageAdapter.get(KV_KEY_PROFILES) || [];

        // 获取公开的订阅组
        const publicProfiles = profiles.filter(p => p.isPublic);

        if (publicProfiles.length === 0) {
            await sendTelegramMessage(chatId,
                '🔗 <b>暂无公开订阅组</b>\n\n' +
                '请在 Web 界面创建订阅组并设为公开',
                env
            );
            return;
        }

        // 获取基础 URL
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        if (args.length > 0) {
            // 查找指定订阅组
            const targetName = args.join(' ').trim().toLowerCase();
            const profile = publicProfiles.find(p =>
                p.name.toLowerCase().includes(targetName) ||
                p.id.toLowerCase() === targetName
            );

            if (!profile) {
                await sendTelegramMessage(chatId, `❌ 未找到名为 "<b>${args.join(' ')}</b>" 的订阅组`, env);
                return;
            }

            const subUrl = `${baseUrl}/sub/${profile.id}`;
            const message =
                `🔗 <b>${profile.name}</b>\n\n` +
                `订阅链接：\n<code>${subUrl}</code>\n\n` +
                `点击链接可复制`;

            await sendTelegramMessage(chatId, message, env);

        } else {
            // 列出所有公开订阅组
            let message = `🔗 <b>订阅组列表</b>\n\n`;

            publicProfiles.forEach((profile, i) => {
                const subUrl = `${baseUrl}/sub/${profile.id}`;
                message += `<b>${i + 1}. ${profile.name}</b>\n`;
                message += `<code>${subUrl}</code>\n\n`;
            });

            message += `💡 使用 /sub <名称> 获取指定订阅`;

            await sendTelegramMessage(chatId, message, env);
        }

    } catch (error) {
        console.error('[Telegram Push] Sub command failed:', error);
        await sendTelegramMessage(chatId, `❌ 获取订阅失败: ${error.message}`, env);
    }
}

/**
 * 处理 /rename 命令
 */
async function handleRenameCommand(chatId, userId, args, env) {
    try {
        if (args.length < 2) {
            await sendTelegramMessage(chatId,
                '✏️ <b>重命名节点</b>\n\n' +
                '用法：/rename <序号> <新名称>\n\n' +
                '示例：/rename 1 香港节点01',
                env
            );
            return;
        }

        const idx = parseInt(args[0]) - 1;
        const newName = args.slice(1).join(' ').trim();

        if (isNaN(idx) || idx < 0) {
            await sendTelegramMessage(chatId, '❌ 请输入有效的序号', env);
            return;
        }

        if (!newName) {
            await sendTelegramMessage(chatId, '❌ 请输入新名称', env);
            return;
        }

        const { allSubscriptions, userNodes, indexMapping, storageAdapter } = await getNodesWithMapping(userId, env);

        if (idx >= userNodes.length) {
            await sendTelegramMessage(chatId, `❌ 序号超出范围（共 ${userNodes.length} 个节点）`, env);
            return;
        }

        const allIdx = indexMapping[idx];
        const oldName = allSubscriptions[allIdx].name;
        allSubscriptions[allIdx].name = newName;

        await storageAdapter.put(KV_KEY_SUBS, allSubscriptions);

        await sendTelegramMessage(chatId,
            `✅ <b>重命名成功</b>\n\n` +
            `原名称：${oldName}\n` +
            `新名称：${newName}`,
            env
        );

    } catch (error) {
        console.error('[Telegram Push] Rename command failed:', error);
        await sendTelegramMessage(chatId, `❌ 重命名失败: ${error.message}`, env);
    }
}

/**
 * 处理 /info 命令 - 节点详情
 */
async function handleInfoCommand(chatId, userId, args, env) {
    try {
        if (args.length === 0) {
            await sendTelegramMessage(chatId,
                '📄 <b>查看节点详情</b>\n\n' +
                '用法：/info <序号>\n' +
                '示例：/info 1',
                env
            );
            return;
        }

        const idx = parseInt(args[0]) - 1;
        if (isNaN(idx) || idx < 0) {
            await sendTelegramMessage(chatId, '❌ 请输入有效的序号', env);
            return;
        }

        const userNodes = await getUserNodes(userId, env);

        if (idx >= userNodes.length) {
            await sendTelegramMessage(chatId, `❌ 序号超出范围（共 ${userNodes.length} 个节点）`, env);
            return;
        }

        const node = userNodes[idx];
        const protocol = node.url.split('://')[0].toUpperCase();
        const status = node.enabled ? '✅ 启用' : '⛔ 禁用';
        const createdAt = node.created_at ? new Date(node.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '未知';

        // 脱敏显示服务器地址
        let serverInfo = '未解析';
        try {
            const urlPart = node.url.split('://')[1]?.split('#')[0];
            if (urlPart) {
                // 简单脱敏
                serverInfo = urlPart.length > 20 ? urlPart.substring(0, 10) + '...' + urlPart.slice(-8) : urlPart;
            }
        } catch { }

        let message = `📄 <b>节点详情 #${idx + 1}</b>\n\n`;
        message += `<b>名称：</b>${node.name}\n`;
        message += `<b>协议：</b>${protocol}\n`;
        message += `<b>状态：</b>${status}\n`;
        message += `<b>ID：</b><code>${node.id}</code>\n`;
        message += `<b>添加：</b>${createdAt}\n`;

        // 操作按钮
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📋 复制链接', callback_data: `copy_node_${idx}` },
                    { text: node.enabled ? '⛔ 禁用' : '✅ 启用', callback_data: `toggle_node_${idx}` }
                ],
                [
                    { text: '✏️ 重命名', callback_data: `prompt_rename_${idx}` },
                    { text: '🗑️ 删除', callback_data: `confirm_delete_${idx}` }
                ]
            ]
        };

        await sendTelegramMessage(chatId, message, env, { reply_markup: keyboard });

    } catch (error) {
        console.error('[Telegram Push] Info command failed:', error);
        await sendTelegramMessage(chatId, `❌ 获取详情失败: ${error.message}`, env);
    }
}

/**
 * 处理 /copy 命令 - 复制节点链接
 */
async function handleCopyCommand(chatId, userId, args, env) {
    try {
        const target = parseTargetArgs(args);

        if (target.type === 'none') {
            await sendTelegramMessage(chatId,
                '📋 <b>复制节点链接</b>\n\n' +
                '用法：/copy <序号>\n' +
                '示例：/copy 1\n' +
                '示例：/copy 1,2,3',
                env
            );
            return;
        }

        const userNodes = await getUserNodes(userId, env);

        if (userNodes.length === 0) {
            await sendTelegramMessage(chatId, '📋 暂无节点', env);
            return;
        }

        let indicesToCopy = [];

        if (target.type === 'all') {
            indicesToCopy = userNodes.map((_, i) => i);
        } else if (target.type === 'index') {
            indicesToCopy = target.values.filter(idx => idx >= 0 && idx < userNodes.length);
        }

        if (indicesToCopy.length === 0) {
            await sendTelegramMessage(chatId, '❌ 未找到指定的节点', env);
            return;
        }

        // 生成链接文本
        const links = indicesToCopy.map(idx => userNodes[idx].url).join('\n');

        if (indicesToCopy.length === 1) {
            const node = userNodes[indicesToCopy[0]];
            await sendTelegramMessage(chatId,
                `📋 <b>${node.name}</b>\n\n<code>${node.url}</code>\n\n点击上方链接可复制`,
                env
            );
        } else {
            await sendTelegramMessage(chatId,
                `📋 <b>已复制 ${indicesToCopy.length} 个节点链接</b>\n\n<code>${links}</code>`,
                env
            );
        }

    } catch (error) {
        console.error('[Telegram Push] Copy command failed:', error);
        await sendTelegramMessage(chatId, `❌ 复制失败: ${error.message}`, env);
    }
}

/**
 * 处理 /export 命令 - 导出节点
 */
async function handleExportCommand(chatId, userId, args, env) {
    try {
        const userNodes = await getUserNodes(userId, env);

        if (userNodes.length === 0) {
            await sendTelegramMessage(chatId, '📦 暂无可导出的节点', env);
            return;
        }

        const format = args[0]?.toLowerCase() || 'base64';

        let content = '';
        let formatName = '';

        switch (format) {
            case 'url':
            case 'raw':
                // 原始链接格式
                content = userNodes.map(n => n.url).join('\n');
                formatName = '原始链接';
                break;

            case 'base64':
            default:
                // Base64 格式
                const urls = userNodes.map(n => n.url).join('\n');
                content = btoa(unescape(encodeURIComponent(urls)));
                formatName = 'Base64';
                break;
        }

        let message = `📦 <b>导出成功</b>\n\n`;
        message += `格式：${formatName}\n`;
        message += `节点：${userNodes.length} 个\n\n`;

        if (content.length > 3000) {
            // 内容太长，分块发送
            message += `内容较长，请分段复制：`;
            await sendTelegramMessage(chatId, message, env);

            // 分块发送
            const chunkSize = 3000;
            for (let i = 0; i < content.length; i += chunkSize) {
                const chunk = content.substring(i, i + chunkSize);
                await sendTelegramMessage(chatId, `<code>${chunk}</code>`, env);
            }
        } else {
            message += `<code>${content}</code>`;
            await sendTelegramMessage(chatId, message, env);
        }

        await sendTelegramMessage(chatId,
            '💡 <b>导出格式</b>\n' +
            '/export - Base64（默认）\n' +
            '/export url - 原始链接',
            env
        );

    } catch (error) {
        console.error('[Telegram Push] Export command failed:', error);
        await sendTelegramMessage(chatId, `❌ 导出失败: ${error.message}`, env);
    }
}

/**
 * 处理 /import 命令 - 导入节点
 */
async function handleImportCommand(chatId, userId, args, env) {
    try {
        if (args.length === 0) {
            await sendTelegramMessage(chatId,
                '📥 <b>导入节点</b>\n\n' +
                '用法：/import <Base64 或订阅链接>\n\n' +
                '支持：\n' +
                '• Base64 编码的节点\n' +
                '• 订阅链接（http/https）\n\n' +
                '示例：\n' +
                '/import c3M6Ly9...\n' +
                '/import https://example.com/sub',
                env
            );
            return;
        }

        const input = args.join(' ').trim();
        let nodeUrls = [];

        // 判断是订阅链接还是 Base64
        if (input.startsWith('http://') || input.startsWith('https://')) {
            // 获取订阅内容
            await sendTelegramMessage(chatId, '⏳ 正在获取订阅内容...', env);

            try {
                const response = await fetch(input, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'v2rayN/7.23',
                        'Accept': '*/*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const content = await response.text();

                // 尝试 Base64 解码
                try {
                    const decoded = decodeURIComponent(escape(atob(content.trim())));
                    nodeUrls = extractNodeUrls(decoded);
                } catch {
                    // 直接尝试提取
                    nodeUrls = extractNodeUrls(content);
                }

            } catch (fetchError) {
                await sendTelegramMessage(chatId, `❌ 获取订阅失败: ${fetchError.message}`, env);
                return;
            }

        } else {
            // 尝试 Base64 解码
            try {
                const decoded = decodeURIComponent(escape(atob(input)));
                nodeUrls = extractNodeUrls(decoded);
            } catch {
                // 直接尝试提取
                nodeUrls = extractNodeUrls(input);
            }
        }

        if (nodeUrls.length === 0) {
            await sendTelegramMessage(chatId, '❌ 未识别到有效的节点链接', env);
            return;
        }

        // 添加节点
        const storageAdapter = await getStorageAdapter(env);
        const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];

        const addedNodes = [];
        for (const url of nodeUrls) {
            const node = {
                id: generateId(),
                name: extractNodeName(url),
                url: url,
                enabled: true,
                source: 'telegram',
                telegram_user_id: userId,
                created_at: new Date().toISOString()
            };
            allSubscriptions.unshift(node);
            addedNodes.push(node);
        }

        await storageAdapter.put(KV_KEY_SUBS, allSubscriptions);

        await sendTelegramMessage(chatId,
            `✅ <b>导入成功</b>\n\n成功导入 ${addedNodes.length} 个节点\n\n发送 /list 查看列表`,
            env
        );

        console.info(`[Telegram Push] User ${userId} imported ${addedNodes.length} nodes`);

    } catch (error) {
        console.error('[Telegram Push] Import command failed:', error);
        await sendTelegramMessage(chatId, `❌ 导入失败: ${error.message}`, env);
    }
}

/**
 * 处理 /sort 命令 - 节点排序
 */
async function handleSortCommand(chatId, userId, args, env) {
    try {
        const sortType = args[0]?.toLowerCase() || '';

        if (!sortType || !['name', 'protocol', 'time', 'status'].includes(sortType)) {
            await sendTelegramMessage(chatId,
                '🔄 <b>节点排序</b>\n\n' +
                '用法：/sort <类型>\n\n' +
                '类型：\n' +
                '• name - 按名称排序\n' +
                '• protocol - 按协议排序\n' +
                '• time - 按时间排序\n' +
                '• status - 按状态排序',
                env
            );
            return;
        }

        const { allSubscriptions, userNodes, indexMapping, storageAdapter } = await getNodesWithMapping(userId, env);

        if (userNodes.length === 0) {
            await sendTelegramMessage(chatId, '📋 暂无可排序的节点', env);
            return;
        }

        // 创建排序映射
        const sortedIndices = [...Array(userNodes.length).keys()];

        switch (sortType) {
            case 'name':
                sortedIndices.sort((a, b) => userNodes[a].name.localeCompare(userNodes[b].name, 'zh-CN'));
                break;
            case 'protocol':
                sortedIndices.sort((a, b) => {
                    const pa = userNodes[a].url.split('://')[0];
                    const pb = userNodes[b].url.split('://')[0];
                    return pa.localeCompare(pb);
                });
                break;
            case 'time':
                sortedIndices.sort((a, b) => {
                    const ta = new Date(userNodes[a].created_at || 0).getTime();
                    const tb = new Date(userNodes[b].created_at || 0).getTime();
                    return tb - ta; // 新的在前
                });
                break;
            case 'status':
                sortedIndices.sort((a, b) => {
                    return (userNodes[b].enabled ? 1 : 0) - (userNodes[a].enabled ? 1 : 0);
                });
                break;
        }

        // 重新排列节点
        const sortedNodes = sortedIndices.map(i => userNodes[i]);

        // 从 allSubscriptions 中移除用户节点
        const indicesToRemove = [...indexMapping].sort((a, b) => b - a);
        for (const idx of indicesToRemove) {
            allSubscriptions.splice(idx, 1);
        }

        // 将排序后的节点添加回去
        allSubscriptions.unshift(...sortedNodes);

        await storageAdapter.put(KV_KEY_SUBS, allSubscriptions);

        const sortNames = { name: '名称', protocol: '协议', time: '时间', status: '状态' };
        await sendTelegramMessage(chatId,
            `✅ <b>排序完成</b>\n\n已按${sortNames[sortType]}排序 ${userNodes.length} 个节点`,
            env
        );

    } catch (error) {
        console.error('[Telegram Push] Sort command failed:', error);
        await sendTelegramMessage(chatId, `❌ 排序失败: ${error.message}`, env);
    }
}

/**
 * 处理 /dup 命令 - 去重检测
 */
async function handleDupCommand(chatId, userId, args, env) {
    try {
        const action = args[0]?.toLowerCase() || '';

        const { allSubscriptions, userNodes, indexMapping, storageAdapter } = await getNodesWithMapping(userId, env);

        if (userNodes.length === 0) {
            await sendTelegramMessage(chatId, '📋 暂无节点', env);
            return;
        }

        // 检测重复（基于 URL）
        const urlMap = new Map();
        const duplicates = [];

        userNodes.forEach((node, idx) => {
            const url = node.url;
            if (urlMap.has(url)) {
                duplicates.push({ idx, node, originalIdx: urlMap.get(url) });
            } else {
                urlMap.set(url, idx);
            }
        });

        if (duplicates.length === 0) {
            await sendTelegramMessage(chatId, '✅ <b>未发现重复节点</b>\n\n所有节点链接都是唯一的', env);
            return;
        }

        if (action === 'clean' || action === 'remove') {
            // 自动清理重复
            const indicesToDelete = duplicates.map(d => indexMapping[d.idx]).sort((a, b) => b - a);

            for (const idx of indicesToDelete) {
                allSubscriptions.splice(idx, 1);
            }

            await storageAdapter.put(KV_KEY_SUBS, allSubscriptions);

            await sendTelegramMessage(chatId,
                `✅ <b>去重完成</b>\n\n已删除 ${duplicates.length} 个重复节点`,
                env
            );

        } else {
            // 显示重复信息
            let message = `🔍 <b>发现 ${duplicates.length} 个重复节点</b>\n\n`;

            duplicates.slice(0, 5).forEach(({ idx, node, originalIdx }) => {
                message += `• #${idx + 1} 与 #${originalIdx + 1} 重复\n`;
                message += `  ${node.name}\n`;
            });

            if (duplicates.length > 5) {
                message += `\n... 还有 ${duplicates.length - 5} 个重复`;
            }

            message += '\n\n发送 /dup clean 自动清理重复';

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🗑️ 清理重复节点', callback_data: 'cmd_dup_clean' }]
                ]
            };

            await sendTelegramMessage(chatId, message, env, { reply_markup: keyboard });
        }

    } catch (error) {
        console.error('[Telegram Push] Dup command failed:', error);
        await sendTelegramMessage(chatId, `❌ 去重检测失败: ${error.message}`, env);
    }
}

/**
 * 处理节点输入（核心逻辑）
 */
async function handleNodeInput(chatId, text, userId, env) {
    try {
        const config = await getTelegramPushConfig(env);

        // 检查频率限制
        const rateLimitCheck = await checkRateLimit(userId, env, config);
        if (!rateLimitCheck.allowed) {
            await sendTelegramMessage(chatId, `❌ ${rateLimitCheck.reason}`, env);
            return createJsonResponse({ ok: true });
        }

        // 提取节点链接
        const nodeUrls = extractNodeUrls(text);

        if (nodeUrls.length === 0) {
            await sendTelegramMessage(chatId,
                '❌ <b>未识别到有效的节点链接</b>\n\n' +
                '支持的协议：SS, SSR, VMess, VLESS, Trojan, Hysteria, Hysteria2, TUIC, Snell\n\n' +
                '发送 /help 查看使用帮助',
                env
            );
            return createJsonResponse({ ok: true });
        }

        const storageAdapter = await getStorageAdapter(env);
        const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];

        // 批量添加节点
        const addedNodes = [];
        for (const url of nodeUrls) {
            const node = {
                id: generateId(),
                name: extractNodeName(url),
                url: url,
                enabled: true,
                source: 'telegram',
                telegram_user_id: userId,
                created_at: new Date().toISOString()
            };

            allSubscriptions.unshift(node);
            addedNodes.push(node);
        }

        await storageAdapter.put(KV_KEY_SUBS, allSubscriptions);

        // 发送成功反馈
        let message;
        if (addedNodes.length === 1) {
            const node = addedNodes[0];
            message = `✅ <b>节点添加成功！</b>\n\n` +
                `📋 节点信息：\n` +
                `• 名称: ${node.name}\n` +
                `• 协议: ${node.url.split('://')[0].toUpperCase()}\n\n` +
                `💡 发送 /list 查看节点列表`;
        } else {
            message = `✅ <b>成功添加 ${addedNodes.length} 个节点</b>\n\n`;
            addedNodes.slice(0, 5).forEach((node, index) => {
                const protocol = node.url.split('://')[0].toUpperCase();
                message += `${index + 1}. ${node.name} (${protocol})\n`;
            });
            if (addedNodes.length > 5) {
                message += `... 等 ${addedNodes.length} 个节点\n`;
            }
            message += `\n📋 发送 /list 查看完整列表`;
        }

        await sendTelegramMessage(chatId, message, env);
        console.info(`[Telegram Push] User ${userId} added ${addedNodes.length} nodes`);

        return createJsonResponse({ ok: true });

    } catch (error) {
        console.error('[Telegram Push] Node addition failed:', error);
        await sendTelegramMessage(chatId, `❌ <b>添加失败</b>\n\n错误: ${error.message}`, env);
        return createJsonResponse({ ok: true });
    }
}

// ==================== 命令路由 ====================

/**
 * 处理命令
 */
async function handleCommand(chatId, text, userId, env, request) {
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase().split('@')[0]; // 移除 @botname
    const args = parts.slice(1);

    switch (command) {
        case '/start':
            await handleStartCommand(chatId, env);
            break;

        case '/help':
            await handleHelpCommand(chatId, env);
            break;

        case '/menu':
            await handleMenuCommand(chatId, env);
            break;

        case '/list':
            await handleListCommand(chatId, userId, env, 0);
            break;

        case '/stats':
            await handleStatsCommand(chatId, userId, env);
            break;

        case '/delete':
        case '/del':
        case '/rm':
            await handleDeleteCommand(chatId, userId, args, env);
            break;

        case '/enable':
        case '/on':
            await handleEnableCommand(chatId, userId, args, env);
            break;

        case '/disable':
        case '/off':
            await handleDisableCommand(chatId, userId, args, env);
            break;

        case '/search':
        case '/find':
            await handleSearchCommand(chatId, userId, args, env);
            break;

        case '/sub':
        case '/subscription':
            await handleSubCommand(chatId, args, env, request);
            break;

        case '/rename':
            await handleRenameCommand(chatId, userId, args, env);
            break;

        case '/info':
        case '/detail':
            await handleInfoCommand(chatId, userId, args, env);
            break;

        case '/copy':
        case '/cp':
            await handleCopyCommand(chatId, userId, args, env);
            break;

        case '/export':
        case '/backup':
            await handleExportCommand(chatId, userId, args, env);
            break;

        case '/import':
            await handleImportCommand(chatId, userId, args, env);
            break;

        case '/sort':
            await handleSortCommand(chatId, userId, args, env);
            break;

        case '/dup':
        case '/dedup':
            await handleDupCommand(chatId, userId, args, env);
            break;

        default:
            await sendTelegramMessage(chatId,
                '❌ 未知命令\n\n发送 /help 查看可用命令\n发送 /menu 打开快捷菜单',
                env
            );
    }

    return createJsonResponse({ ok: true });
}

// ==================== Callback Query 处理 ====================

/**
 * 处理 Callback Query（按钮回调）
 */
async function handleCallbackQuery(callbackQuery, env, request) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    try {
        // 分页命令
        if (data.startsWith('list_page_')) {
            const page = parseInt(data.replace('list_page_', ''));
            await answerCallbackQuery(callbackQuery.id, '', env);
            await handleListCommand(chatId, userId, env, page);
            return createJsonResponse({ ok: true });
        }

        // 快捷菜单命令
        switch (data) {
            case 'cmd_list':
                await answerCallbackQuery(callbackQuery.id, '', env);
                await handleListCommand(chatId, userId, env, 0);
                break;

            case 'cmd_stats':
                await answerCallbackQuery(callbackQuery.id, '', env);
                await handleStatsCommand(chatId, userId, env);
                break;

            case 'cmd_sub':
                await answerCallbackQuery(callbackQuery.id, '', env);
                await handleSubCommand(chatId, [], env, request);
                break;

            case 'cmd_enable_all':
                await answerCallbackQuery(callbackQuery.id, '正在启用所有节点...', env);
                await handleEnableCommand(chatId, userId, ['all'], env);
                break;

            case 'cmd_disable_all':
                await answerCallbackQuery(callbackQuery.id, '正在禁用所有节点...', env);
                await handleDisableCommand(chatId, userId, ['all'], env);
                break;

            case 'confirm_delete_all':
                // 显示确认按钮
                const confirmKeyboard = {
                    inline_keyboard: [
                        [
                            { text: '⚠️ 确认删除全部', callback_data: 'do_delete_all' },
                            { text: '❌ 取消', callback_data: 'cancel_action' }
                        ]
                    ]
                };
                await answerCallbackQuery(callbackQuery.id, '', env);
                await editTelegramMessage(chatId, messageId,
                    '⚠️ <b>确认删除全部节点？</b>\n\n此操作不可撤销！',
                    env, { reply_markup: confirmKeyboard }
                );
                break;

            case 'do_delete_all':
                await answerCallbackQuery(callbackQuery.id, '正在删除...', env);
                await handleDeleteCommand(chatId, userId, ['all'], env);
                break;

            case 'cancel_action':
                await answerCallbackQuery(callbackQuery.id, '已取消', env);
                await editTelegramMessage(chatId, messageId, '❌ 操作已取消', env);
                break;

            case 'prompt_search':
                await answerCallbackQuery(callbackQuery.id, '', env);
                await sendTelegramMessage(chatId,
                    '🔍 请发送搜索关键词\n\n格式：/search <关键词>\n示例：/search 香港',
                    env
                );
                break;

            case 'cmd_dup_clean':
                await answerCallbackQuery(callbackQuery.id, '正在清理重复节点...', env);
                await handleDupCommand(chatId, userId, ['clean'], env);
                break;

            default:
                // 处理动态回调
                if (data.startsWith('copy_node_')) {
                    const idx = parseInt(data.replace('copy_node_', ''));
                    await answerCallbackQuery(callbackQuery.id, '', env);
                    await handleCopyCommand(chatId, userId, [(idx + 1).toString()], env);

                } else if (data.startsWith('toggle_node_')) {
                    const idx = parseInt(data.replace('toggle_node_', ''));
                    const userNodes = await getUserNodes(userId, env);
                    if (idx >= 0 && idx < userNodes.length) {
                        const isEnabled = userNodes[idx].enabled;
                        await answerCallbackQuery(callbackQuery.id, isEnabled ? '已禁用' : '已启用', env);
                        if (isEnabled) {
                            await handleDisableCommand(chatId, userId, [(idx + 1).toString()], env);
                        } else {
                            await handleEnableCommand(chatId, userId, [(idx + 1).toString()], env);
                        }
                    } else {
                        await answerCallbackQuery(callbackQuery.id, '节点不存在', env, true);
                    }

                } else if (data.startsWith('confirm_delete_')) {
                    const idx = parseInt(data.replace('confirm_delete_', ''));
                    const confirmKeyboard = {
                        inline_keyboard: [
                            [
                                { text: '⚠️ 确认删除', callback_data: `do_delete_${idx}` },
                                { text: '❌ 取消', callback_data: 'cancel_action' }
                            ]
                        ]
                    };
                    await answerCallbackQuery(callbackQuery.id, '', env);
                    await editTelegramMessage(chatId, messageId,
                        `⚠️ <b>确认删除节点 #${idx + 1}？</b>`,
                        env, { reply_markup: confirmKeyboard }
                    );

                } else if (data.startsWith('do_delete_')) {
                    const idx = parseInt(data.replace('do_delete_', ''));
                    await answerCallbackQuery(callbackQuery.id, '正在删除...', env);
                    await handleDeleteCommand(chatId, userId, [(idx + 1).toString()], env);

                } else if (data.startsWith('prompt_rename_')) {
                    const idx = parseInt(data.replace('prompt_rename_', ''));
                    await answerCallbackQuery(callbackQuery.id, '', env);
                    await sendTelegramMessage(chatId,
                        `✏️ 重命名节点 #${idx + 1}\n\n请发送：/rename ${idx + 1} <新名称>`,
                        env
                    );

                } else {
                    await answerCallbackQuery(callbackQuery.id, '未知操作', env);
                }
        }

    } catch (error) {
        console.error('[Telegram Push] Callback query failed:', error);
        await answerCallbackQuery(callbackQuery.id, '操作失败', env, true);
    }

    return createJsonResponse({ ok: true });
}

// ==================== 主 Webhook 处理 ====================

/**
 * 主 Webhook 处理函数
 */
export async function handleTelegramWebhook(request, env) {
    try {
        // 获取配置
        const config = await getTelegramPushConfig(env);

        if (!config.enabled) {
            return createJsonResponse({ error: 'Bot disabled' }, 403);
        }

        // 验证请求来源
        if (config.webhook_secret && !verifyTelegramRequest(request, config)) {
            console.error('[Telegram Push] Invalid webhook secret');
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }

        // 解析 Telegram Update
        const update = await request.json();

        // 处理 Callback Query（按钮回调）
        if (update.callback_query) {
            const userId = update.callback_query.from.id;
            const permissionCheck = checkUserPermission(userId, config);
            if (!permissionCheck.allowed) {
                await answerCallbackQuery(update.callback_query.id, permissionCheck.reason, env, true);
                return createJsonResponse({ ok: true });
            }
            return await handleCallbackQuery(update.callback_query, env, request);
        }

        // 处理普通消息
        if (update.message) {
            const message = update.message;
            const userId = message.from.id;
            const chatId = message.chat.id;
            const text = message.text;

            if (!text) {
                return createJsonResponse({ ok: true });
            }

            // 检查用户权限
            const permissionCheck = checkUserPermission(userId, config);
            if (!permissionCheck.allowed) {
                await sendTelegramMessage(chatId, `❌ ${permissionCheck.reason}`, env);
                return createJsonResponse({ ok: true });
            }

            // 处理命令或节点输入
            if (text.startsWith('/')) {
                return await handleCommand(chatId, text, userId, env, request);
            } else {
                return await handleNodeInput(chatId, text, userId, env);
            }
        }

        // 忽略其他类型的更新
        return createJsonResponse({ ok: true });

    } catch (error) {
        console.error('[Telegram Push] Webhook handler error:', error);
        return createJsonResponse({ error: 'Internal server error' }, 500);
    }
}
