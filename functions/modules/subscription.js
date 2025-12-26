/**
 * 订阅处理模块
 * 处理订阅获取、节点解析和格式转换
 */

import { formatBytes, prependNodeName, getProcessedUserAgent } from './utils.js';
import { addFlagEmoji, fixNodeUrlEncoding } from '../utils/node-utils.js';
import { extractValidNodes } from './utils/node-parser.js';
import { sendEnhancedTgNotification } from './notifications.js';
import { applyNodeTransformPipeline } from '../utils/node-transformer.js';
import { createTimeoutFetch } from './utils.js';

/**
 * 订阅获取配置常量
 */
const FETCH_CONFIG = {
    TIMEOUT: 18000,        // 单次请求超时 18 秒
    MAX_RETRIES: 2,        // 最多重试 2 次
    BASE_DELAY: 1000,      // 重试基础延迟 1 秒
    CONCURRENCY: 4,        // 最大并发数
    RETRYABLE_STATUS: [500, 502, 503, 504, 429] // 可重试的 HTTP 状态码
};

/**
 * 带重试的订阅获取函数（支持网络错误和 HTTP 状态码重试）
 * @param {string} url - 请求 URL
 * @param {Object} init - fetch 初始化选项
 * @param {Object} options - 重试选项
 * @returns {Promise<Response>} - 响应对象
 */
async function fetchWithRetry(url, init = {}, options = {}) {
    const {
        timeout = FETCH_CONFIG.TIMEOUT,
        maxRetries = FETCH_CONFIG.MAX_RETRIES,
        baseDelay = FETCH_CONFIG.BASE_DELAY,
        retryableStatus = FETCH_CONFIG.RETRYABLE_STATUS
    } = options;

    let lastError;
    let lastResponse;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await createTimeoutFetch(url, init, timeout);

            // 检查是否需要重试（可重试的 HTTP 状态码）
            if (!response.ok && retryableStatus.includes(response.status)) {
                if (attempt < maxRetries) {
                    // 计算延迟：优先使用 Retry-After 头，否则使用指数退避
                    let delay = baseDelay * Math.pow(2, attempt);
                    const retryAfter = response.headers.get('Retry-After');
                    if (retryAfter) {
                        const retryAfterSeconds = parseInt(retryAfter, 10);
                        if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
                            delay = Math.min(retryAfterSeconds * 1000, 30000); // 最多等待 30 秒
                        }
                    }

                    console.warn(`[Retry] HTTP ${response.status} (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`);

                    // 释放响应体，避免连接占用
                    try {
                        await response.body?.cancel();
                    } catch { /* 忽略取消错误 */ }

                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                // 最后一次重试仍失败，保存响应供上层处理
                lastResponse = response;
            }

            return response;
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`[Retry] ${error.message} (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // 如果有最后的响应（可重试状态码耗尽），返回它
    if (lastResponse) {
        return lastResponse;
    }

    throw lastError;
}

/**
 * 并发控制器 - 限制同时进行的请求数量
 * @param {number} limit - 最大并发数
 * @returns {Function} - 包装函数
 */
function createConcurrencyLimiter(limit) {
    const safeLimit = Math.max(1, limit || 1); // 防御性检查，确保至少为 1
    let running = 0;
    const queue = [];

    const runNext = () => {
        if (running >= safeLimit || queue.length === 0) return;
        running++;
        const { task, resolve, reject } = queue.shift();
        // 使用 Promise.resolve().then() 包装，确保同步异常也能被捕获
        Promise.resolve()
            .then(task)
            .then(resolve)
            .catch(reject)
            .finally(() => {
                running--;
                runNext();
            });
    };

    return (task) => new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });
        runNext();
    });
}



export async function generateCombinedNodeList(context, config, userAgent, misubs, prependedContent = '', profilePrefixSettings = null) {
    const shouldPrependManualNodes = profilePrefixSettings?.enableManualNodes ??
        config.prefixConfig?.enableManualNodes ??
        config.prependSubName ?? true;

    const manualNodePrefix = profilePrefixSettings?.manualNodePrefix ??
        config.prefixConfig?.manualNodePrefix ??
        '手动节点';

    const shouldAddEmoji = profilePrefixSettings?.enableNodeEmoji ??
        config.prefixConfig?.enableNodeEmoji ??
        true;

    // --- 处理手动节点 ---
    const processedManualNodes = misubs.filter(sub => !sub.url.toLowerCase().startsWith('http')).map(node => {
        if (node.isExpiredNode) {
            return node.url;
        } else {
            let processedUrl = node.url;
            processedUrl = fixNodeUrlEncoding(processedUrl);
            if (shouldAddEmoji) {
                processedUrl = addFlagEmoji(processedUrl);
            }

            return shouldPrependManualNodes ? prependNodeName(processedUrl, manualNodePrefix) : processedUrl;
        }
    }).join('\n');

    // --- 处理订阅节点 ---
    const httpSubs = misubs.filter(sub => sub.url.toLowerCase().startsWith('http'));
    const limiter = createConcurrencyLimiter(FETCH_CONFIG.CONCURRENCY);

    /**
     * 获取单个订阅内容
     * @param {Object} sub - 订阅对象
     * @returns {Promise<string>} - 处理后的节点列表
     */
    const fetchSingleSubscription = async (sub) => {
        try {
            // [增强] 支持订阅级别的自定义 UA
            const effectiveUserAgent = sub.customUserAgent && sub.customUserAgent.trim() !== ''
                ? sub.customUserAgent
                : getProcessedUserAgent(userAgent, sub.url);

            const requestHeaders = { 'User-Agent': effectiveUserAgent };

            const response = await fetchWithRetry(sub.url, {
                headers: requestHeaders,
                redirect: "follow",
                cf: {
                    insecureSkipVerify: true,
                    allowUntrusted: true,
                    validateCertificate: false
                }
            });

            if (!response.ok) {
                console.warn(`订阅请求失败: ${sub.url}, 状态: ${response.status}`);
                return '';
            }

            const text = await response.text();

            // [核心修复] 移除了之前会拦截 proxies: 和 outbounds 的 if 判断
            // 直接使用 extractValidNodes，它会自动识别 Clash YAML、Base64 或纯文本
            const rawNodes = extractValidNodes(text);

            let validNodes = rawNodes
                .map(line => line.trim())
                .map(line => {
                    // 1. 修复编码 (包含 Hysteria2 密码解码)
                    return fixNodeUrlEncoding(line);
                })
                .map(line => {
                    // 2. 添加国旗 Emoji
                    return shouldAddEmoji ? addFlagEmoji(line) : line;
                });

            // 过滤规则处理
            if (sub.exclude && sub.exclude.trim() !== '') {
                const rules = sub.exclude.trim().split('\n').map(r => r.trim()).filter(Boolean);
                const keepRules = rules.filter(r => r.toLowerCase().startsWith('keep:'));

                if (keepRules.length > 0) {
                    // 白名单模式
                    const nameRegexParts = [];
                    const protocolsToKeep = new Set();
                    keepRules.forEach(rule => {
                        const content = rule.substring('keep:'.length).trim();
                        if (content.toLowerCase().startsWith('proto:')) {
                            const protocols = content.substring('proto:'.length).split(',').map(p => p.trim().toLowerCase());
                            protocols.forEach(p => protocolsToKeep.add(p));
                        } else {
                            nameRegexParts.push(content);
                        }
                    });
                    const nameRegex = nameRegexParts.length > 0 ? new RegExp(nameRegexParts.join('|'), 'i') : null;

                    validNodes = validNodes.filter(nodeLink => {
                        const protocolMatch = nodeLink.match(/^(.*?):\/\//);
                        const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : '';
                        if (protocolsToKeep.has(protocol)) return true;
                        if (nameRegex) {
                            const hashIndex = nodeLink.lastIndexOf('#');
                            if (hashIndex !== -1) {
                                try {
                                    const nodeName = decodeURIComponent(nodeLink.substring(hashIndex + 1));
                                    if (nameRegex.test(nodeName)) return true;
                                } catch (e) { }
                            }
                        }
                        return false;
                    });
                } else {
                    // 黑名单模式
                    const protocolsToExclude = new Set();
                    const nameRegexParts = [];
                    rules.forEach(rule => {
                        if (rule.toLowerCase().startsWith('proto:')) {
                            const protocols = rule.substring('proto:'.length).split(',').map(p => p.trim().toLowerCase());
                            protocols.forEach(p => protocolsToExclude.add(p));
                        } else {
                            nameRegexParts.push(rule);
                        }
                    });
                    const nameRegex = nameRegexParts.length > 0 ? new RegExp(nameRegexParts.join('|'), 'i') : null;

                    validNodes = validNodes.filter(nodeLink => {
                        const protocolMatch = nodeLink.match(/^(.*?):\/\//);
                        const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : '';
                        if (protocolsToExclude.has(protocol)) return false;
                        if (nameRegex) {
                            const hashIndex = nodeLink.lastIndexOf('#');
                            if (hashIndex !== -1) {
                                try {
                                    const nodeName = decodeURIComponent(nodeLink.substring(hashIndex + 1));
                                    if (nameRegex.test(nodeName)) return false;
                                } catch (e) { }
                            }
                            else if (protocol === 'vmess') {
                                try {
                                    const base64Part = nodeLink.substring('vmess://'.length);
                                    const binaryString = atob(base64Part);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                                    const nodeConfig = JSON.parse(new TextDecoder('utf-8').decode(bytes));
                                    if (nameRegex.test(nodeConfig.ps || '')) return false;
                                } catch (e) { }
                            }
                        }
                        return true;
                    });
                }
            }

            const shouldPrependSubscriptions = profilePrefixSettings?.enableSubscriptions ??
                config.prefixConfig?.enableSubscriptions ??
                config.prependSubName ?? true;

            return (shouldPrependSubscriptions && sub.name)
                ? validNodes.map(node => prependNodeName(node, sub.name)).join('\n')
                : validNodes.join('\n');
        } catch (e) {
            console.warn(`订阅获取失败 [${sub.name || sub.url}]:`, e.message);
            const errorNodeName = `连接错误-${sub.name || '未知'}`;
            return `trojan://error@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp#${encodeURIComponent(errorNodeName)}`;
        }
    };

    // 使用并发控制器限制同时请求数量，避免网络拥塞
    const subPromises = httpSubs.map(sub => limiter(() => fetchSingleSubscription(sub)));
    const processedSubContents = await Promise.all(subPromises);
    const combinedLines = (processedManualNodes + '\n' + processedSubContents.join('\n'))
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    const nodeTransformConfig = profilePrefixSettings?.nodeTransform ?? config.nodeTransform;
    const outputLines = nodeTransformConfig?.enabled
        ? applyNodeTransformPipeline(combinedLines, { ...nodeTransformConfig, enableEmoji: shouldAddEmoji })
        : [...new Set(combinedLines)];
    const uniqueNodesString = outputLines.join('\n');

    let finalNodeList = uniqueNodesString;
    if (finalNodeList.length > 0 && !finalNodeList.endsWith('\n')) {
        finalNodeList += '\n';
    }

    if (prependedContent) {
        return `${prependedContent}\n${finalNodeList}`;
    }
    return finalNodeList;
}