/**
 * 节点解析工具模块
 * 提供节点URL解析和处理功能
 */

import yaml from 'js-yaml';
import { parseNodeInfo, extractNodeRegion } from './geo-utils.js';
// [修复] 引入 node-utils 中的修复函数，确保预览与订阅结果一致
// 注意路径：node-parser.js 在 functions/modules/utils/，需要向上两级找到 functions/utils/
import { fixNodeUrlEncoding, addFlagEmoji } from '../../utils/node-utils.js';

/**
 * 支持的节点协议正则表达式
 */
export const NODE_PROTOCOL_REGEX = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//i;

/**
 * Base64编码辅助函数
 */
function base64Encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

/**
 * 将 Clash 代理对象转换为标准 URL
 */
function convertClashProxyToUrl(proxy) {
    try {
        const type = (proxy.type || '').toLowerCase();
        const name = proxy.name || 'Untitled';
        const server = proxy.server;
        const port = proxy.port;
        
        if (!server || !port) return null;

        if (type === 'ss' || type === 'shadowsocks') {
            const userInfo = base64Encode(`${proxy.cipher}:${proxy.password}`);
            return `ss://${userInfo}@${server}:${port}#${encodeURIComponent(name)}`;
        }
        
        if (type === 'vmess') {
            const vmessConfig = {
                v: "2",
                ps: name,
                add: server,
                port: port,
                id: proxy.uuid || '',
                aid: proxy.alterId || 0,
                net: proxy.network || 'tcp',
                type: 'none',
                host: proxy.servername || proxy.wsOpts?.headers?.Host || '',
                path: proxy.wsOpts?.path || '',
                tls: proxy.tls ? 'tls' : ''
            };
            return `vmess://${base64Encode(JSON.stringify(vmessConfig))}`;
        }
        
        if (type === 'trojan') {
            const params = [];
            if (proxy.network === 'ws') params.push('type=ws');
            if (proxy.wsOpts?.path) params.push(`path=${encodeURIComponent(proxy.wsOpts.path)}`);
            if (proxy.wsOpts?.headers?.Host) params.push(`host=${encodeURIComponent(proxy.wsOpts.headers.Host)}`);
            if (proxy.sni) params.push(`sni=${encodeURIComponent(proxy.sni)}`);
            if (proxy.skipCertVerify) params.push('allowInsecure=1');
            
            const query = params.length > 0 ? `?${params.join('&')}` : '';
            return `trojan://${encodeURIComponent(proxy.password)}@${server}:${port}${query}#${encodeURIComponent(name)}`;
        }
        
        if (type === 'vless') {
             const params = ['encryption=none'];
             if (proxy.network) params.push(`type=${proxy.network}`);
             if (proxy.wsOpts?.path) params.push(`path=${encodeURIComponent(proxy.wsOpts.path)}`);
             if (proxy.wsOpts?.headers?.Host) params.push(`host=${encodeURIComponent(proxy.wsOpts.headers.Host)}`);
             if (proxy.tls) params.push('security=tls');
             if (proxy.flow) params.push(`flow=${proxy.flow}`);
             
             return `vless://${proxy.uuid}@${server}:${port}?${params.join('&')}#${encodeURIComponent(name)}`;
        }
        
        if (type === 'hysteria2') {
            const params = [];
            if (proxy.password) params.push(`obfs-password=${encodeURIComponent(proxy.password)}`);
            if (proxy.sni) params.push(`sni=${encodeURIComponent(proxy.sni)}`);
            if (proxy.skipCertVerify) params.push('insecure=1');
            
            return `hysteria2://${proxy.password || ''}@${server}:${port}?${params.join('&')}#${encodeURIComponent(name)}`;
        }

        return null;
    } catch (e) {
        return null;
    }
}

/**
 * 从文本中提取所有有效的节点URL
 * 支持：Clash YAML, Base64, 纯文本列表
 */
export function extractValidNodes(text) {
    if (!text || typeof text !== 'string') return [];

    let nodes = [];

    // 1. 尝试解析为 Clash YAML
    try {
        if (text.includes('proxies:') || text.includes('Proxy:')) {
            const yamlObj = yaml.load(text);
            const proxies = yamlObj.proxies || yamlObj.Proxy;
            if (Array.isArray(proxies)) {
                proxies.forEach(proxy => {
                    const url = convertClashProxyToUrl(proxy);
                    if (url) nodes.push(url);
                });
                if (nodes.length > 0) return nodes;
            }
        }
    } catch (e) {}

    // 2. 尝试 Base64 解码
    let processedText = text;
    try {
        const cleanedText = text.replace(/\s/g, '');
        const base64Regex = /^[A-Za-z0-9+\/=]+$/;
        if (base64Regex.test(cleanedText) && cleanedText.length > 20) {
            const binaryString = atob(cleanedText);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            processedText = new TextDecoder('utf-8').decode(bytes);
        }
    } catch (e) {}

    // 3. 正则提取链接
    const lines = processedText
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trim());
        
    for (const line of lines) {
        if (NODE_PROTOCOL_REGEX.test(line)) {
            nodes.push(line);
        }
    }

    return nodes;
}

/**
 * 解析节点列表 (用于预览和计数)
 * [修复] 增加节点清洗逻辑，确保预览结果与实际订阅一致
 */
export function parseNodeList(content) {
    const validNodes = extractValidNodes(content);
    
    return validNodes.map(nodeUrl => {
        // 1. 修复编码 (如 Hysteria2 密码)
        let fixedUrl = fixNodeUrlEncoding(nodeUrl);
        
        // 2. 添加 Emoji (保持预览一致性)
        fixedUrl = addFlagEmoji(fixedUrl);

        // 3. 解析信息
        const nodeInfo = parseNodeInfo(fixedUrl);
        
        return {
            url: fixedUrl,
            ...nodeInfo
        };
    });
}

/**
 * 统计节点协议类型分布
 */
export function calculateProtocolStats(nodes) {
    const stats = {};
    const total = nodes.length;
    nodes.forEach(node => {
        const protocol = node.protocol || 'unknown';
        stats[protocol] = (stats[protocol] || 0) + 1;
    });
    for (const [protocol, count] of Object.entries(stats)) {
        stats[protocol] = { count, percentage: Math.round((count / total) * 100) };
    }
    return stats;
}

/**
 * 统计节点地区分布
 */
export function calculateRegionStats(nodes) {
    const stats = {};
    const total = nodes.length;
    nodes.forEach(node => {
        const region = extractNodeRegion(node.name || '');
        stats[region] = (stats[region] || 0) + 1;
    });
    for (const [region, count] of Object.entries(stats)) {
        stats[region] = { count, percentage: Math.round((count / total) * 100) };
    }
    return stats;
}

/**
 * [恢复] 去除重复节点
 * 虽然当前没用到，但保留作为工具函数是个好习惯
 */
export function removeDuplicateNodes(nodes) {
    if (!Array.isArray(nodes)) return [];
    const seen = new Set();
    return nodes.filter(node => {
        const url = node.url || '';
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
    });
}

/**
 * [恢复] 格式化节点数量显示
 */
export function formatNodeCount(count) {
    if (typeof count !== 'number' || count < 0) return '0 个节点';
    return `${count} 个节点`;
}