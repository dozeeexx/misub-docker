/**
 * 订阅处理服务
 * @author MiSub Team
 */

import { parseNodeList } from '../modules/utils/node-parser.js';
import { getProcessedUserAgent, isValidBase64 } from '../utils/format-utils.js';
import { prependNodeName, removeFlagEmoji } from '../utils/node-utils.js';
import { applyNodeTransformPipeline } from '../utils/node-transformer.js';
import {
    createConcurrencyLimiter,
    fetchWithRetry,
    robustCollect
} from './fetch-utils.js';
import {
    fixNodeUrlEncoding,
    applyManualNodeName,
    applyFilterRules,
    fixSSEncoding
} from '../modules/utils/node-cleaner.js';

// --- 配置常量 ---
const DEFAULT_FETCH_POLICY = {
    timeoutMs: 15000,
    maxRetries: 2,
    concurrency: 4
};

/**
 * 生成组合节点列表
 * @param {Object} context - 请求上下文
 * @param {Object} config - 配置对象
 * @param {string} userAgent - 用户代理
 * @param {Array} misubs - 订阅列表 
 * @param {string} prependedContent - 预置内容
 * @param {Object|null} profilePrefixSettings - 订阅组前缀配置
 * @param {boolean} debug - 调试模式
 * @param {Object|null} fetchPolicy - 拉取策略配置
 * @returns {Promise<string>} - 组合后的节点列表
 */
export async function generateCombinedNodeList(context, config, userAgent, misubs, prependedContent = '', profilePrefixSettings = null, debug = false, fetchPolicy = null) {

    // 1. 初始化策略
    // 确保 policy 对象中有所有必要的属性
    const policy = {
        timeoutMs: fetchPolicy?.timeoutMs ?? DEFAULT_FETCH_POLICY.timeoutMs,
        maxRetries: fetchPolicy?.maxRetries ?? DEFAULT_FETCH_POLICY.maxRetries,
        concurrency: fetchPolicy?.concurrency ?? DEFAULT_FETCH_POLICY.concurrency,
        overallTimeoutMs: fetchPolicy?.overallTimeoutMs
    };

    // 2. 区分订阅源和手动节点
    const enabledSubs = [];
    const manualNodes = [];

    for (const item of misubs) {
        if (!item.enabled) continue;
        if (item.isExpiredNode) {
            manualNodes.push(item);
            continue;
        }

        if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
            enabledSubs.push(item);
        } else {
            manualNodes.push(item);
        }
    }

    // 3. 并发获取订阅内容
    const limiter = createConcurrencyLimiter(policy.concurrency);

    // 定义获取单个订阅的任务函数
    const fetchTask = async (sub) => {
        try {
            return await fetchSingleSubscription(sub, userAgent, policy.maxRetries);
        } catch (error) {
            console.error(`[Sub Fetch] Failed to fetch ${sub.name || sub.url}: ${error.message}`);
            return ''; // 失败返回空字符串，在 robustCollect 中被收集
        }
    };

    // 包装任务
    const fetchTasks = enabledSubs.map(sub => limiter(() => fetchTask(sub)));

    // 使用 robustCollect 在规定时间内收集结果
    // 即使部分超时，也会返回已完成的结果
    const fetchedResults = await robustCollect(fetchTasks, policy.timeoutMs);

    // 4. 解析和合并节点
    let allNodes = [];

    // 4.1 处理手动节点
    for (const node of manualNodes) {
        let nodeUrl = node.url.trim();

        if (!node.isExpiredNode) {
            // 修复手动SS节点中的URL编码问题
            nodeUrl = fixSSEncoding(nodeUrl);

            // 应用自定义名称
            const customNodeName = typeof node.name === 'string' ? node.name.trim() : '';
            if (customNodeName) {
                nodeUrl = applyManualNodeName(nodeUrl, customNodeName);
            }
        }

        allNodes.push(nodeUrl);
    }

    // 4.2 处理订阅内容
    for (const content of fetchedResults) {
        if (!content) continue;
        const nodes = parseNodeList(content);
        allNodes = allNodes.concat(nodes);
    }

    // 5. 应用前缀、替换和 Emoji 移除逻辑
    const shouldPrependManualNodes = profilePrefixSettings?.enableManualNodes ?? true;
    const manualNodePrefix = profilePrefixSettings?.manualNodePrefix ?? '\u624b\u52a8\u8282\u70b9'; // Default '手动节点'

    const nodeTransformConfig = profilePrefixSettings?.nodeTransform || (config.defaultNodeTransform ? config.defaultNodeTransform : {});

    // 模板重命名逻辑检查
    const templateEnabled = nodeTransformConfig?.enabled && nodeTransformConfig?.rename?.template?.enabled;
    const templateContainsEmoji = templateEnabled && (nodeTransformConfig?.rename?.template?.template || '').includes('{emoji}');
    const skipPrefixDueToRenaming = templateEnabled; // 如果启用了智能重命名，跳过简单前缀
    const shouldAddEmoji = templateContainsEmoji || config.enableNodeEmoji;

    // 对所有节点进行统一格式处理 (Fix -> Rename/Prefix -> Transform)
    // 注意：这里的逻辑顺序很重要。原本的逻辑是 Manual 节点先加前缀，Subs 节点先加前缀，然后统一 Transform。
    // 我们需要尽量保持一致。

    // 重新构建处理流程：
    // Manual Nodes 已经在上面进行了 fix 和 name application。
    // Subs Nodes 已经在 fetch 中进行了解码和 filter。

    // 我们在这里统一再跑一遍 fixNodeUrlEncoding 确保万无一失，并添加前缀
    const finalNodesList = [];

    // 处理手动节点的前缀
    const processedManuals = manualNodes.map((node, index) => {
        // Find existing URL in allNodes (manual nodes are at the beginning)
        // This is a bit disjointed because I put them in allNodes earlier.
        // Let's iterate allNodes directly but we lost the source info (isManual or Sub).
        // Refactoring: it's better to keep them separate until this step.
        return null; // Logic approach change
    });

    // Re-approach: clear allNodes and rebuild it with prefixes applied
    allNodes = [];

    // Manual Nodes
    for (const node of manualNodes) {
        let nodeUrl = node.url.trim();
        if (node.isExpiredNode) {
            allNodes.push(nodeUrl);
            continue;
        }

        let processedUrl = fixSSEncoding(nodeUrl);
        const customNodeName = typeof node.name === 'string' ? node.name.trim() : '';
        if (customNodeName) {
            processedUrl = applyManualNodeName(processedUrl, customNodeName);
        }

        const shouldAddPrefix = shouldPrependManualNodes && !skipPrefixDueToRenaming;
        if (shouldAddPrefix) {
            processedUrl = prependNodeName(processedUrl, manualNodePrefix);
        }
        allNodes.push(processedUrl);
    }

    // Subscription Nodes
    // 实际上我们需要知道哪些节点属于哪个订阅，以便添加订阅名称前缀。
    // robustCollect 返回的是 result array，对应 enabledSubs 的顺序。

    const shouldPrependSubscriptions = profilePrefixSettings?.enableSubscriptions ?? true;
    const shouldAddSubPrefix = shouldPrependSubscriptions && !skipPrefixDueToRenaming;

    for (let i = 0; i < enabledSubs.length; i++) {
        const sub = enabledSubs[i];
        const content = fetchedResults[i];
        if (!content) continue;

        const nodes = parseNodeList(content);
        for (const nodeLink of nodes) {
            let finalLink = nodeLink;
            if (shouldAddSubPrefix && sub.name) {
                finalLink = prependNodeName(finalLink, sub.name);
            }
            allNodes.push(finalLink);
        }
    }

    // 6. 最终清洗和变换
    const normalizedLines = allNodes
        .map(line => fixNodeUrlEncoding(line))
        .filter(Boolean);

    // Emoji 移除 (如果未启用 Emoji)
    const emojiHandledLines = shouldAddEmoji
        ? normalizedLines
        : normalizedLines.map(line => removeFlagEmoji(line));

    // 高级变换 (正则替换、模板重命名、排序等)
    const outputLines = nodeTransformConfig?.enabled
        ? applyNodeTransformPipeline(emojiHandledLines, { ...nodeTransformConfig, enableEmoji: shouldAddEmoji })
        : [...new Set(emojiHandledLines)];

    let result = outputLines.join('\n');

    if (result.length > 0 && !result.endsWith('\n')) {
        result += '\n';
    }

    if (prependedContent) {
        result = `${prependedContent}\n${result}`;
    }

    // --- 日志记录 (Stats) ---
    // 生成统计信息供上层使用
    if (context) {
        const endTime = Date.now();
        const successCount = fetchedResults.filter(Boolean).length;
        const failCount = enabledSubs.length - successCount;

        context.generationStats = {
            totalNodes: outputLines.length,
            sourceCount: enabledSubs.length,
            successCount,
            failCount,
            duration: endTime - (context.startTime || Date.now())
        };

        // 注意：具体的 LogService.addLog 调用现在移到了主 handler (Deferred Logging) 或者我们可以保留在这里？
        // 原有代码保留了在这里记录日志的逻辑。为了兼容性，我们保留它。

        const isInternalRequest = userAgent.includes('MiSub-Backend') || userAgent.includes('TelegramBot');
        if (!debug && config.enableAccessLog && !isInternalRequest) {
            // Async log
            logAccessAsync(context, config, userAgent, outputLines.length, enabledSubs.length, successCount, failCount, profilePrefixSettings?.name);
        }
    }

    return result;
}

/**
 * 异步记录访问日志
 */
async function logAccessAsync(context, config, userAgent, totalNodes, sourceCount, successCount, failCount, profileName) {
    try {
        const { LogService } = await import('./log-service.js');
        const endTime = Date.now();

        // 提取客户信息
        let clientIp = 'Unknown';
        let geoInfo = {};
        if (context.logMetadata) {
            clientIp = context.logMetadata.clientIp || clientIp;
            geoInfo = context.logMetadata.geoInfo || geoInfo;
        } else if (context.request) {
            clientIp = context.request.headers.get('CF-Connecting-IP') || 'Unknown';
            const cf = context.request.cf;
            if (cf) geoInfo = { country: cf.country, city: cf.city, isp: cf.asOrganization, asn: cf.asn };
        }

        await LogService.addLog(context.env, {
            profileName: profileName || 'Unknown Profile',
            clientIp,
            geoInfo,
            userAgent: userAgent || 'Unknown',
            status: failCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'error'),
            ...((context.logMetadata) ? {
                format: context.logMetadata.format,
                token: context.logMetadata.token,
                type: context.logMetadata.type,
                domain: context.logMetadata.domain
            } : {}),
            details: {
                totalNodes,
                sourceCount,
                successCount,
                failCount,
                duration: endTime - (context.startTime || Date.now())
            },
            summary: `生成 ${totalNodes} 个节点 (成功: ${successCount}, 失败: ${failCount})`
        });
    } catch (e) {
        console.error('Failed to save access log:', e);
    }
}

/**
 * 获取单个订阅内容
 */
async function fetchSingleSubscription(sub, userAgent, maxRetries) {
    const headers = {
        'User-Agent': userAgent && userAgent !== 'Unknown'
            ? userAgent
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (sub.ua && sub.ua.trim() !== '') {
        headers['User-Agent'] = sub.ua.trim();
    }

    const response = await fetchWithRetry(sub.url, {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
    }, {
        maxRetries: maxRetries
    });

    const buffer = await response.arrayBuffer();
    // 使用 TextDecoder 解码
    let text = new TextDecoder('utf-8').decode(buffer);

    // Base64 解码
    text = await decodeBase64Content(text, buffer);

    // 简单解析，提取 nodes (不负责解析 deep logic, 交给 node-parser)
    // 但在 robustCollect 模式下，我们要返回 text content，后续统一 parse。
    // 但是！原逻辑中有 applyFilterRules 是针对每个 sub 单独做的。
    // 所以我们需要在这里做一部分 filter。

    // 如果我们返回 raw text，外层循环怎么知道用哪个 sub 的 filter rules？
    // 所以最好在这里就把 nodes 提取出来，filter 好，然后重新 join 或者返回 array。
    // 为了保持接口 Promise<string>，我们返回换行分隔的节点列表。

    const parsedObjects = parseNodeList(text);

    // 简单的 Fallback 检查 (如果 parse 为空，尝试直接作为 raw base64 解析，可能 node-parser 已经做了)
    // 这里简化逻辑，信任 node-parser。

    let validNodes = parsedObjects.map(node => node.url);

    // 应用特定订阅的过滤规则
    validNodes = applyFilterRules(validNodes, sub);

    return validNodes.join('\n');
}

/**
 * 解码Base64内容
 * @param {string} text 
 * @param {ArrayBuffer} originalBuffer - 原 Buffer，作为 fallback
 */
async function decodeBase64Content(text, originalBuffer) {
    try {
        const cleanedText = text.replace(/\s/g, '');
        if (isValidBase64(cleanedText)) {
            let normalized = cleanedText.replace(/-/g, '+').replace(/_/g, '/');
            const padding = normalized.length % 4;
            if (padding) normalized += '='.repeat(4 - padding);

            const binaryString = atob(normalized);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
            return new TextDecoder('utf-8').decode(bytes);
        }
    } catch (e) {
        // 解码失败
    }

    // 如果 Base64 解码失败，或者不是 Base64，但 originalBuffer 可能是某种编码
    // 我们假设 TextDecoder 已经正确处理了。
    return text;
}

/**
 * ArrayBuffer -> Base64
 */
function encodeArrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}
