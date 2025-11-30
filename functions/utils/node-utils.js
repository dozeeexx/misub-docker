/**
 * 节点处理工具函数
 * @author MiSub Team
 */

// [引入] 从 geo-utils 引入必要的函数
import { extractNodeRegion, getRegionEmoji } from './geo-utils.js';

/**
 * 节点协议正则表达式
 */
export const NODE_PROTOCOL_REGEX = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//g;

/**
 * 为节点名称添加前缀
 * @param {string} link - 节点链接
 * @param {string} prefix - 前缀文本
 * @returns {string} - 添加前缀后的链接
 */
export function prependNodeName(link, prefix) {
    if (!prefix) return link;

    const appendToFragment = (baseLink, namePrefix) => {
        const hashIndex = baseLink.lastIndexOf('#');
        const originalName = hashIndex !== -1 ? decodeURIComponent(baseLink.substring(hashIndex + 1)) : '';
        const base = hashIndex !== -1 ? baseLink.substring(0, hashIndex) : baseLink;
        if (originalName.startsWith(namePrefix)) {
            return baseLink;
        }
        const newName = originalName ? `${namePrefix} - ${originalName}` : namePrefix;
        return `${base}#${encodeURIComponent(newName)}`;
    };

    if (link.startsWith('vmess://')) {
        try {
            const base64Part = link.substring('vmess://'.length);
            const binaryString = atob(base64Part);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const jsonString = new TextDecoder('utf-8').decode(bytes);
            const nodeConfig = JSON.parse(jsonString);
            const originalPs = nodeConfig.ps || '';
            if (!originalPs.startsWith(prefix)) {
                nodeConfig.ps = originalPs ? `${prefix} - ${originalPs}` : prefix;
            }
            const newJsonString = JSON.stringify(nodeConfig);
            const newBase64Part = btoa(unescape(encodeURIComponent(newJsonString)));
            return 'vmess://' + newBase64Part;
        } catch (e) {
            console.error("为 vmess 节点添加名称前缀失败，将回退到通用方法。", e);
            return appendToFragment(link, prefix);
        }
    }
    return appendToFragment(link, prefix);
}

/**
 * [兼容导出] 从节点URL提取地区信息
 * 直接调用 geo-utils 中的 extractNodeRegion
 * @param {string} nodeName - 节点名称
 * @returns {string} - 地区名称
 */
export function extractRegionFromNodeName(nodeName) {
    return extractNodeRegion(nodeName);
}

/**
 * [新增] 为节点链接添加国旗 Emoji
 * @param {string} link - 节点链接
 * @returns {string} - 添加 Emoji 后的链接
 */
export function addFlagEmoji(link) {
    if (!link) return link;

    const appendEmoji = (name) => {
        const region = extractNodeRegion(name);
        const emoji = getRegionEmoji(region);
        if (!emoji) return name;
        
        // 简单检查是否已包含该 Emoji，避免重复添加
        if (name.includes(emoji)) return name;
        
        return `${emoji} ${name}`;
    };

    if (link.startsWith('vmess://')) {
        try {
            const base64Part = link.substring('vmess://'.length);
            const binaryString = atob(base64Part);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const jsonString = new TextDecoder('utf-8').decode(bytes);
            const nodeConfig = JSON.parse(jsonString);
            
            if (nodeConfig.ps) {
                nodeConfig.ps = appendEmoji(nodeConfig.ps);
                const newJsonString = JSON.stringify(nodeConfig);
                const newBase64Part = btoa(unescape(encodeURIComponent(newJsonString)));
                return 'vmess://' + newBase64Part;
            }
            return link;
        } catch (e) {
            return link;
        }
    } else {
        // 处理包含 hash (#) 的常规链接 (ss, vless, trojan 等)
        const hashIndex = link.lastIndexOf('#');
        if (hashIndex === -1) return link;
        
        try {
            const originalName = decodeURIComponent(link.substring(hashIndex + 1));
            const newName = appendEmoji(originalName);
            return link.substring(0, hashIndex + 1) + encodeURIComponent(newName);
        } catch (e) {
            return link;
        }
    }
}

/**
 * 从节点URL提取协议类型
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 协议类型
 */
export function extractProtocolFromNodeUrl(nodeUrl) {
    const protocolMatch = nodeUrl.match(/^(.*?):\/\//);
    return protocolMatch ? protocolMatch[1].toLowerCase() : 'unknown';
}

/**
 * 从节点URL提取节点名称
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 节点名称
 */
export function extractNodeNameFromUrl(nodeUrl) {
    const hashIndex = nodeUrl.lastIndexOf('#');
    if (hashIndex !== -1) {
        try {
            return decodeURIComponent(nodeUrl.substring(hashIndex + 1));
        } catch (e) {
            return nodeUrl.substring(hashIndex + 1);
        }
    }
    return '未命名节点';
}

/**
 * 修复手动SS节点中的URL编码问题
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 修复后的URL
 */
export function fixSSEncoding(nodeUrl) {
    if (!nodeUrl.startsWith('ss://')) {
        return nodeUrl;
    }

    try {
        const hashIndex = nodeUrl.indexOf('#');
        let baseLink = hashIndex !== -1 ? nodeUrl.substring(0, hashIndex) : nodeUrl;
        let fragment = hashIndex !== -1 ? nodeUrl.substring(hashIndex) : '';

        // 检查base64部分是否包含URL编码字符
        const protocolEnd = baseLink.indexOf('://');
        const atIndex = baseLink.indexOf('@');
        if (protocolEnd !== -1 && atIndex !== -1) {
            const base64Part = baseLink.substring(protocolEnd + 3, atIndex);
            if (base64Part.includes('%')) {
                // 解码URL编码的base64部分
                const decodedBase64 = decodeURIComponent(base64Part);
                baseLink = 'ss://' + decodedBase64 + baseLink.substring(atIndex);
            }
        }
        return baseLink + fragment;
    } catch (e) {
        // 如果处理失败，返回原始链接
        return nodeUrl;
    }
}

/**
 * 修复节点URL中的编码问题（支持多种协议）
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 修复后的URL
 */
export function fixNodeUrlEncoding(nodeUrl) {
    // [新增] Hysteria2 修复逻辑
    if (nodeUrl.startsWith('hysteria2://')) {
        return nodeUrl.replace(/([?&]obfs-password=)([^&]+)/g, (match, prefix, value) => {
            try {
                return prefix + decodeURIComponent(value);
            } catch (e) {
                return match;
            }
        });
    }

    if (!nodeUrl.startsWith('ss://') && !nodeUrl.startsWith('vless://') && !nodeUrl.startsWith('trojan://')) {
        return nodeUrl;
    }

    try {
        const hashIndex = nodeUrl.indexOf('#');
        let baseLink = hashIndex !== -1 ? nodeUrl.substring(0, hashIndex) : nodeUrl;
        let fragment = hashIndex !== -1 ? nodeUrl.substring(hashIndex) : '';

        // 检查base64部分是否包含URL编码字符
        const protocolEnd = baseLink.indexOf('://');
        const atIndex = baseLink.indexOf('@');
        if (protocolEnd !== -1 && atIndex !== -1) {
            const base64Part = baseLink.substring(protocolEnd + 3, atIndex);
            if (base64Part.includes('%')) {
                // 解码URL编码的base64部分
                const decodedBase64 = decodeURIComponent(base64Part);
                const protocol = baseLink.substring(0, protocolEnd);
                baseLink = protocol + '://' + decodedBase64 + baseLink.substring(atIndex);
            }
        }
        return baseLink + fragment;
    } catch (e) {
        // 如果处理失败，返回原始链接
        return nodeUrl;
    }
}