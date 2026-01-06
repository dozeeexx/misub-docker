/**
 * 节点清洗与处理工具模块
 * 负责节点URL的解码、修复、重命名和过滤
 */

/**
 * 修复节点URL编码问题（支持多种协议）
 * @param {string} nodeUrl 
 * @returns {string}
 */
export function fixNodeUrlEncoding(nodeUrl) {
    if (!nodeUrl) return '';

    // 辅助函数：安全解码
    const safeDecode = (value) => {
        try {
            return decodeURIComponent(value);
        } catch (e) {
            return value;
        }
    };

    // 辅助函数：判断是否需要保持原样（即解码后出现乱码）
    const shouldKeepRaw = (decoded) => {
        return decoded.includes('');
    };

    let fixedUrl = nodeUrl;

    if (fixedUrl.startsWith('vmess://')) {
        return fixedUrl;
    }

    if (fixedUrl.startsWith('ss://')) {
        return fixSSEncoding(fixedUrl);
    }

    if (fixedUrl.startsWith('trojan://') || fixedUrl.startsWith('vless://') || fixedUrl.startsWith('hy2://') || fixedUrl.startsWith('hysteria2://')) {
        try {
            const urlObj = new URL(fixedUrl);

            // 修复 hash (节点名称)
            if (urlObj.hash) {
                const rawHash = urlObj.hash.substring(1);
                const decodedHash = safeDecode(rawHash);
                if (!shouldKeepRaw(decodedHash)) {
                    urlObj.hash = '#' + encodeURIComponent(decodedHash);
                }
            }

            // 修复 query params (参数)
            // 简单处理：hysteria2 特殊 fix
            /* ... kept simplified ... */

            return urlObj.toString();
        } catch (e) {
            return fixedUrl;
        }
    }

    return fixedUrl;
}

/**
 * 修复SS节点编码
 */
export function fixSSEncoding(nodeUrl) {
    if (!nodeUrl.startsWith('ss://')) return nodeUrl;

    try {
        const urlObj = new URL(nodeUrl);
        if (urlObj.hash) {
            try {
                urlObj.hash = '#' + encodeURIComponent(decodeURIComponent(urlObj.hash.substring(1)));
            } catch (e) { }
        }
        return urlObj.toString();
    } catch (e) {
        const parts = nodeUrl.split('#');
        if (parts.length > 1) {
            try {
                const name = decodeURIComponent(parts[1]);
                return parts[0] + '#' + encodeURIComponent(name);
            } catch (e) {
                return nodeUrl;
            }
        }
        return nodeUrl;
    }
}

/**
 * ArrayBuffer -> Base64
 */
export function encodeArrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
}

// --- Rule Helpers (Exported) ---

/**
 * 将多行规则文本解析为规则对象
 * @param {string|string[]} lines 
 * @param {boolean} stripKeepPrefix 
 */
export function buildRuleSet(lines, stripKeepPrefix = false) {
    const protocols = new Set();
    const patterns = [];

    const lineArray = Array.isArray(lines) ? lines : (typeof lines === 'string' ? lines.split('\n') : []);

    for (const rawLine of lineArray) {
        let line = rawLine.trim();
        if (!line || line === '---') continue;

        if (stripKeepPrefix && line.toLowerCase().startsWith('keep:')) {
            line = line.substring('keep:'.length).trim();
        }
        if (!line) continue;

        if (line.toLowerCase().startsWith('proto:')) {
            const parts = line.substring('proto:'.length)
                .split(',')
                .map(p => p.trim().toLowerCase())
                .filter(Boolean);
            parts.forEach(p => protocols.add(p));
            continue;
        }

        patterns.push(line);
    }

    const nameRegex = buildSafeRegex(patterns);
    return {
        protocols,
        nameRegex,
        hasRules: protocols.size > 0 || Boolean(nameRegex)
    };
}

export function buildSafeRegex(patterns) {
    if (!patterns || patterns.length === 0) return null;
    try {
        return new RegExp(patterns.join('|'), 'i');
    } catch (e) {
        console.warn('Invalid include/exclude regex, skipped:', e.message);
        return null;
    }
}

/**
 * 过滤节点对象列表 (用于 preview/node-fetcher)
 * @param {Array<Object>} nodes 
 * @param {Object} rules 
 * @param {string} mode 'include' | 'exclude'
 */
export function filterNodeObjects(nodes, rules, mode = 'exclude') {
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
 * 将手动节点的自定义名称应用到节点链接中
 */
export function applyManualNodeName(nodeUrl, customName) {
    if (!customName || !nodeUrl) return nodeUrl;

    const encodedName = encodeURIComponent(customName);

    if (nodeUrl.startsWith('vmess://')) {
        try {
            const base64Part = nodeUrl.substring(8);
            const jsonStr = atob(base64Part);
            const config = JSON.parse(jsonStr);
            config.ps = customName;
            return 'vmess://' + btoa(JSON.stringify(config));
        } catch (e) {
            return nodeUrl;
        }
    }

    if (nodeUrl.startsWith('ss://')) {
        const hashIndex = nodeUrl.indexOf('#');
        const baseUrl = hashIndex === -1 ? nodeUrl : nodeUrl.substring(0, hashIndex);
        return `${baseUrl}#${encodedName}`;
    }

    if (nodeUrl.startsWith('trojan://') || nodeUrl.startsWith('vless://') ||
        nodeUrl.startsWith('hysteria2://') || nodeUrl.startsWith('hy2://') ||
        nodeUrl.startsWith('tuic://')) {
        try {
            const urlObj = new URL(nodeUrl);
            urlObj.hash = '#' + encodedName;
            return urlObj.toString();
        } catch (e) {
            const hashIndex = nodeUrl.indexOf('#');
            const baseUrl = hashIndex === -1 ? nodeUrl : nodeUrl.substring(0, hashIndex);
            return `${baseUrl}#${encodedName}`;
        }
    }

    return nodeUrl;
}

/**
 * 应用过滤规则 (针对 URL string 列表)
 * @param {Array} validNodes 
 * @param {Object} sub 
 * @returns {Array} filtered nodes
 */
export function applyFilterRules(validNodes, sub) {
    if (!sub || !Array.isArray(validNodes)) return validNodes;

    let filteredNodes = [...validNodes];

    // 1. 包含关键词 (Include)
    if (sub.filterInclude && sub.filterInclude.trim() !== '') {
        const includeRules = buildRuleSet(sub.filterInclude); // Reuse exported
        if (includeRules.hasRules) { // Reuse object structure
            const regex = includeRules.nameRegex;
            if (regex) {
                // Note: applyFilterRules historically only supported REGEX string matching for Include/Exclude fields in Subscription object.
                // But buildRuleSet now supports 'proto:'.
                // For validNodes (which are strings), checking protocol is harder without parsing.
                // Keep it simple: use regex only for string nodes.
                filteredNodes = filteredNodes.filter(node => regex.test(node));
            }
        }
    }

    // 2. 排除关键词 (Exclude)
    if (sub.filterExclude && sub.filterExclude.trim() !== '') {
        const excludeRules = buildRuleSet(sub.filterExclude);
        if (excludeRules.hasRules) {
            const regex = excludeRules.nameRegex;
            if (regex) {
                filteredNodes = filteredNodes.filter(node => !regex.test(node));
            }
        }
    }

    return filteredNodes;
}
