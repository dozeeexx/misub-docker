import { parseNodeList } from '../utils/node-parser.js';

/**
 * 获取单个订阅的节点
 * @param {string} url - 订阅URL
 * @param {string} subscriptionName - 订阅名称
 * @param {string} userAgent - 用户代理
 * @param {string} customUserAgent - 自定义用户代理 (可选)
 * @param {boolean} debug - 是否启用调试日志
 * @returns {Promise<Object>} 节点获取结果
 */
export async function fetchSubscriptionNodes(url, subscriptionName, userAgent, customUserAgent = null, debug = false, excludeRules = '') {
    // 自动检测调试 Token，无论哪种模式都能触发
    const shouldDebug = debug || (url && url.includes('b0b422857bb46aba65da8234c84f38c6'));

    try {
        // [增强] 支持自定义 UA
        const effectiveUserAgent = customUserAgent && customUserAgent.trim() !== ''
            ? customUserAgent
            : userAgent;

        const response = await fetch(new Request(url, {
            headers: { 'User-Agent': effectiveUserAgent },
            redirect: "follow",
            cf: { insecureSkipVerify: true }
        }));

        if (!response.ok) {
            return {
                subscriptionName,
                url,
                success: false,
                nodes: [],
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }

        const buffer = await response.arrayBuffer();
        let text = new TextDecoder('utf-8').decode(buffer);

        let parsedNodes = parseNodeList(text);

        if (parsedNodes.length === 0) {
            const fallbackBase64 = encodeArrayBufferToBase64(buffer);
            const fallbackNodes = parseNodeList(fallbackBase64);
            if (fallbackNodes.length > 0) {
                parsedNodes = fallbackNodes;
            }
        }
        if (excludeRules && excludeRules.trim()) {
            parsedNodes = applyExcludeRulesToNodes(parsedNodes, excludeRules);
        }

        return {
            subscriptionName,
            url,
            success: true,
            nodes: parsedNodes,
            error: null
        };
    } catch (e) {
        if (shouldDebug) {
            console.debug(`[DEBUG PREVIEW] Error: ${e.message}`);
        }
        return {
            subscriptionName,
            url,
            success: false,
            nodes: [],
            error: e.message
        };
    }
}

function applyExcludeRulesToNodes(nodes, ruleText) {
    if (!ruleText || !ruleText.trim()) return nodes;
    const lines = ruleText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    if (lines.length === 0) return nodes;

    const dividerIndex = lines.findIndex(line => line === '---');
    const includeLines = dividerIndex === -1 ? [] : lines.slice(dividerIndex + 1);
    const excludeLines = dividerIndex === -1 ? lines : lines.slice(0, dividerIndex);

    const includeRules = buildRuleSet(includeLines, true);
    const excludeRules = buildRuleSet(excludeLines);

    let resultNodes = nodes;
    if (includeRules.hasRules) {
        resultNodes = filterNodes(resultNodes, includeRules, 'include');
    }
    if (excludeRules.hasRules) {
        resultNodes = filterNodes(resultNodes, excludeRules, 'exclude');
    }

    return resultNodes;
}

function buildRuleSet(lines, stripKeepPrefix = false) {
    if (!lines || lines.length === 0) {
        return { protocols: new Set(), nameRegex: null, hasRules: false };
    }

    const protocols = new Set();
    const namePatterns = [];

    for (const rawLine of lines) {
        let line = rawLine.trim();
        if (!line) continue;

        if (stripKeepPrefix && line.startsWith('+')) {
            line = line.slice(1).trim();
        }

        if (!line) continue;

        if (/^[a-z0-9]+$/i.test(line)) {
            protocols.add(line.toLowerCase());
        } else {
            namePatterns.push(line);
        }
    }

    return {
        protocols,
        nameRegex: buildSafeRegex(namePatterns),
        hasRules: protocols.size > 0 || namePatterns.length > 0
    };
}

function buildSafeRegex(patterns) {
    if (!patterns.length) return null;
    try {
        return new RegExp(patterns.join('|'), 'i');
    } catch (e) {
        console.warn('Invalid include/exclude regex, skipped:', e.message);
        return null;
    }
}

function filterNodes(nodes, rules, mode = 'exclude') {
    if (!rules || !rules.hasRules) return nodes;
    const isInclude = mode === 'include';

    return nodes.filter(node => {
        const protocol = (node.protocol || '').toLowerCase();
        const name = node.name || '';
        const protocolHit = protocol && rules.protocols.has(protocol);
        const nameHit = rules.nameRegex ? rules.nameRegex.test(name) : false;

        if (isInclude) {
            return protocolHit || nameHit;
        }
        return !(protocolHit || nameHit);
    });
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
