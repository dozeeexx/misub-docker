/**
 * Telegram Bot Webhook 处理模块
 * 用于接收和处理用户通过 Telegram 推送的节点
 */

import { StorageFactory } from '../../storage-adapter.js';
import { createJsonResponse } from '../utils.js';
import { KV_KEY_SUBS, KV_KEY_SETTINGS } from '../config.js';

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

    // 从 settings 读取配置
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
        // 提取 # 后的名称
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
            const encoded = url.substring(hashIndex + 1);
            try {
                return decodeURIComponent(encoded);
            } catch {
                return encoded;
            }
        }
        // 如果没有名称，返回协议类型
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
 * 发送 Telegram 消息
 */
async function sendTelegramMessage(chatId, text, env) {
    try {
        const config = await getTelegramPushConfig(env);
        if (!config.bot_token) {
            console.error('[Telegram Push] Bot token not configured');
            return;
        }

        const response = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            console.error('[Telegram Push] Failed to send message:', await response.text());
        }
    } catch (error) {
        console.error('[Telegram Push] Error sending message:', error);
    }
}

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

    // 增加计数
    await env.MISUB_KV.put(minuteKey, (minuteCount + 1).toString(), { expirationTtl: 60 });
    await env.MISUB_KV.put(dayKey, (dayCount + 1).toString(), { expirationTtl: 86400 });

    return { allowed: true };
}

/**
 * 格式化成功消息
 */
function formatSuccessMessage(addedNodes) {
    if (addedNodes.length === 1) {
        const node = addedNodes[0];
        return `✅ <b>节点添加成功！</b>\n\n` +
            `📋 节点信息：\n` +
            `• 名称: ${node.name}\n` +
            `• 协议: ${node.url.split('://')[0].toUpperCase()}\n` +
            `• ID: ${node.id}\n\n` +
            `💡 前往 Web 界面将节点加入订阅组`;
    } else {
        let message = `✅ <b>成功添加 ${addedNodes.length} 个节点</b>\n\n`;
        addedNodes.forEach((node, index) => {
            const protocol = node.url.split('://')[0].toUpperCase();
            message += `${index + 1}. ${node.name} (${protocol})\n`;
        });
        message += `\n📊 请前往 Web 界面管理节点`;
        return message;
    }
}

/**
 * 处理节点输入（核心逻辑）
 */
async function handleNodeInput(chatId, text, userId, env) {
    try {
        const config = await getTelegramPushConfig(env);

        // 1. 检查频率限制
        const rateLimitCheck = await checkRateLimit(userId, env, config);
        if (!rateLimitCheck.allowed) {
            await sendTelegramMessage(chatId, `❌ ${rateLimitCheck.reason}`, env);
            return createJsonResponse({ ok: true });
        }

        // 2. 提取节点链接（支持多行）
        const nodeUrls = extractNodeUrls(text);

        if (nodeUrls.length === 0) {
            await sendTelegramMessage(chatId,
                '❌ <b>未识别到有效的节点链接</b>\n\n' +
                '支持的协议：\n' +
                '• SS / SSR\n' +
                '• VMess / VLESS\n' +
                '• Trojan\n' +
                '• Hysteria / Hysteria2\n' +
                '• TUIC / Snell\n\n' +
                '发送 /help 查看使用帮助',
                env
            );
            return createJsonResponse({ ok: true });
        }

        // 3. 获取存储适配器
        const storageAdapter = await getStorageAdapter(env);

        // 4. 读取现有数据
        const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];

        // 5. 批量添加节点
        const addedNodes = [];
        for (const url of nodeUrls) {
            const node = {
                id: generateId(),
                name: extractNodeName(url),
                url: url,
                enabled: true,
                source: 'telegram',  // 标记来源
                telegram_user_id: userId,  // 记录推送用户
                created_at: new Date().toISOString()
            };

            allSubscriptions.unshift(node);  // 添加到数组头部
            addedNodes.push(node);
        }

        // 6. 写回存储
        await storageAdapter.put(KV_KEY_SUBS, allSubscriptions);

        // 7. 发送成功反馈
        const message = formatSuccessMessage(addedNodes);
        await sendTelegramMessage(chatId, message, env);

        console.log(`[Telegram Push] User ${userId} added ${addedNodes.length} nodes`);

        return createJsonResponse({ ok: true });

    } catch (error) {
        console.error('[Telegram Push] Node addition failed:', error);
        await sendTelegramMessage(chatId, `❌ <b>添加失败</b>\n\n错误: ${error.message}`, env);
        return createJsonResponse({ ok: true });
    }
}

/**
 * 处理 /list 命令
 */
async function handleListCommand(chatId, userId, env) {
    try {
        const storageAdapter = await getStorageAdapter(env);
        const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];

        // 只显示该用户通过Telegram添加的节点
        const userNodes = allSubscriptions.filter(sub =>
            sub.source === 'telegram' && sub.telegram_user_id === userId
        );

        if (userNodes.length === 0) {
            await sendTelegramMessage(chatId, '📋 <b>暂无节点</b>\n\n直接发送节点链接即可添加', env);
            return;
        }

        let message = `📋 <b>你的节点列表（共 ${userNodes.length} 个）</b>\n\n`;
        userNodes.slice(0, 10).forEach((node, index) => {
            const protocol = node.url.split('://')[0].toUpperCase();
            message += `<b>${index + 1}. ${node.name}</b> (${protocol})\n`;
            message += `   状态: ${node.enabled ? '✅ 启用' : '⛔ 禁用'}\n`;
            const date = new Date(node.created_at);
            message += `   添加: ${date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
        });

        if (userNodes.length > 10) {
            message += `... 还有 ${userNodes.length - 10} 个节点，请在 Web 界面查看\n\n`;
        }

        message += '💡 前往 Web 管理界面进行更多操作';

        await sendTelegramMessage(chatId, message, env);
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
        const storageAdapter = await getStorageAdapter(env);
        const allSubscriptions = await storageAdapter.get(KV_KEY_SUBS) || [];

        // 统计信息
        const userNodes = allSubscriptions.filter(sub =>
            sub.source === 'telegram' && sub.telegram_user_id === userId
        );
        const enabledNodes = userNodes.filter(n => n.enabled);

        // 按协议分组
        const protocolCounts = {};
        userNodes.forEach(node => {
            const protocol = node.url.split('://')[0].toUpperCase();
            protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
        });

        let message = `📊 <b>节点统计</b>\n\n`;
        message += `总节点数: ${userNodes.length}\n`;
        message += `已启用: ${enabledNodes.length}\n`;
        message += `已禁用: ${userNodes.length - enabledNodes.length}\n\n`;

        if (Object.keys(protocolCounts).length > 0) {
            message += `<b>协议分布：</b>\n`;
            Object.entries(protocolCounts).forEach(([protocol, count]) => {
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
 * 处理命令
 */
async function handleCommand(chatId, text, userId, env) {
    const [command, ...args] = text.split(' ');

    const HELP_TEXT =
        '📖 <b>MiSub Telegram Bot 使用帮助</b>\n\n' +
        '<b>快速开始：</b>\n' +
        '直接发送节点链接即可添加，支持批量（多行）\n\n' +
        '<b>命令列表：</b>\n' +
        '/start - 显示欢迎信息\n' +
        '/help - 显示此帮助\n' +
        '/list - 查看你的节点列表\n' +
        '/stats - 查看节点统计\n\n' +
        '<b>支持的协议：</b>\n' +
        'SS, SSR, VMess, VLESS, Trojan, Hysteria, Hysteria2, TUIC, Snell\n\n' +
        '💡 节点管理请访问 Web 界面';

    switch (command.toLowerCase()) {
        case '/start':
            await sendTelegramMessage(chatId,
                '👋 <b>欢迎使用 MiSub Telegram Bot！</b>\n\n' +
                '通过这个 Bot，你可以快速添加代理节点到 MiSub。\n\n' +
                '直接发送节点链接即可，支持批量添加。\n\n' +
                '发送 /help 查看详细帮助',
                env
            );
            break;

        case '/help':
            await sendTelegramMessage(chatId, HELP_TEXT, env);
            break;

        case '/list':
            await handleListCommand(chatId, userId, env);
            break;

        case '/stats':
            await handleStatsCommand(chatId, userId, env);
            break;

        default:
            await sendTelegramMessage(chatId,
                '❌ 未知命令\n\n发送 /help 查看可用命令',
                env
            );
    }

    return createJsonResponse({ ok: true });
}

/**
 * 主 Webhook 处理函数
 */
export async function handleTelegramWebhook(request, env) {
    try {
        // 1. 获取配置
        const config = await getTelegramPushConfig(env);

        if (!config.enabled) {
            return createJsonResponse({ error: 'Bot disabled' }, 403);
        }

        // 2. 验证请求来源（如果配置了 webhook_secret）
        if (config.webhook_secret && !verifyTelegramRequest(request, config)) {
            console.error('[Telegram Push] Invalid webhook secret');
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }

        // 3. 解析 Telegram Update
        const update = await request.json();

        // 处理普通消息
        if (update.message) {
            const message = update.message;
            const userId = message.from.id;
            const chatId = message.chat.id;
            const text = message.text;

            if (!text) {
                return createJsonResponse({ ok: true });
            }

            // 4. 检查用户权限
            const permissionCheck = checkUserPermission(userId, config);
            if (!permissionCheck.allowed) {
                await sendTelegramMessage(chatId, `❌ ${permissionCheck.reason}`, env);
                return createJsonResponse({ ok: true });
            }

            // 5. 处理命令或节点输入
            if (text.startsWith('/')) {
                return await handleCommand(chatId, text, userId, env);
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
