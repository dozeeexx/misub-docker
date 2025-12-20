/**
 * 节点解析工具模块
 * 提供节点URL解析和处理功能
 */

import yaml from 'js-yaml';
import { parseNodeInfo, extractNodeRegion } from './geo-utils.js';
// [注意] node-parser.js 在 functions/modules/utils/，而 node-utils.js 在 functions/utils/
// 所以需要向上两级找到 functions/utils/
import { fixNodeUrlEncoding, addFlagEmoji } from '../../utils/node-utils.js';
import { validateSS2022Node, fixSS2022Node } from './ss2022-validator.js';

/**
 * 支持的节点协议正则表达式
 */
export const NODE_PROTOCOL_REGEX = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|snell|naive\+https?|naive\+quic|socks5|http):\/\//i;

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
            let url = `ss://${userInfo}@${server}:${port}`;

            // 支持 AnyTLS 插件
            if (proxy.plugin === 'anytls' || proxy.plugin === 'obfs-local') {
                const params = [];
                if (proxy.plugin) params.push(`plugin=${proxy.plugin}`);

                const pluginOpts = proxy['plugin-opts'];
                if (pluginOpts) {
                    if (pluginOpts.enabled !== undefined) params.push(`enabled=${pluginOpts.enabled}`);
                    if (pluginOpts.padding !== undefined) params.push(`padding=${pluginOpts.padding}`);
                    if (pluginOpts.mode) params.push(`obfs=${pluginOpts.mode}`);
                    if (pluginOpts.host) params.push(`obfs-host=${encodeURIComponent(pluginOpts.host)}`);
                }

                if (params.length > 0) {
                    url += `?${params.join('&')}`;
                }
            }

            url += `#${encodeURIComponent(name)}`;
            return url;
        }

        if (type === 'ssr' || type === 'shadowsocksr') {
            const password = base64Encode(proxy.password);
            const params = `obfs=${proxy.obfs || 'plain'}&obfsparam=${base64Encode(proxy['obfs-param'] || '')}&protocol=${proxy.protocol || 'origin'}&protoparam=${base64Encode(proxy['protocol-param'] || '')}&remarks=${base64Encode(name)}`;
            const ssrBody = `${server}:${port}:${proxy.protocol || 'origin'}:${proxy.cipher || 'none'}:${proxy.obfs || 'plain'}:${password}/?${params}`;
            return `ssr://${base64Encode(ssrBody)}`;
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
                host: proxy.servername || proxy.wsOpts?.headers?.Host || proxy['ws-opts']?.headers?.Host || '',
                path: proxy.wsOpts?.path || proxy['ws-opts']?.path || '',
                tls: proxy.tls ? 'tls' : ''
            };
            return `vmess://${base64Encode(JSON.stringify(vmessConfig))}`;
        }

        if (type === 'trojan') {
            const params = [];
            const network = proxy.network || 'tcp';
            if (network === 'ws') params.push('type=ws');

            const wsOpts = proxy.wsOpts || proxy['ws-opts'];
            if (wsOpts) {
                if (wsOpts.path) params.push(`path=${encodeURIComponent(wsOpts.path)}`);
                if (wsOpts.headers?.Host) params.push(`host=${encodeURIComponent(wsOpts.headers.Host)}`);
            }

            if (proxy.sni) params.push(`sni=${encodeURIComponent(proxy.sni)}`);
            if (proxy.skipCertVerify) params.push('allowInsecure=1');

            const query = params.length > 0 ? `?${params.join('&')}` : '';
            return `trojan://${encodeURIComponent(proxy.password)}@${server}:${port}${query}#${encodeURIComponent(name)}`;
        }

        if (type === 'vless') {
            const params = ['encryption=none'];
            if (proxy.network) params.push(`type=${proxy.network}`);

            const wsOpts = proxy.wsOpts || proxy['ws-opts'];
            if (wsOpts) {
                if (wsOpts.path) params.push(`path=${encodeURIComponent(wsOpts.path)}`);
                if (wsOpts.headers?.Host) params.push(`host=${encodeURIComponent(wsOpts.headers.Host)}`);
            }

            if (proxy.tls) params.push('security=tls');
            if (proxy.flow) params.push(`flow=${proxy.flow}`);

            return `vless://${proxy.uuid}@${server}:${port}?${params.join('&')}#${encodeURIComponent(name)}`;
        }

        if (type === 'hysteria2') {
            const params = [];
            const password = proxy.password || proxy.auth || '';
            if (password) params.push(`obfs-password=${encodeURIComponent(password)}`);
            if (proxy.sni) params.push(`sni=${encodeURIComponent(proxy.sni)}`);
            if (proxy.skipCertVerify) params.push('insecure=1');

            return `hysteria2://${password}@${server}:${port}?${params.join('&')}#${encodeURIComponent(name)}`;
        }

        if (type === 'socks5') {
            let auth = '';
            if (proxy.username && proxy.password) {
                auth = `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
            }
            return `socks5://${auth}${server}:${port}#${encodeURIComponent(name)}`;
        }

        if (type === 'http') {
            let auth = '';
            if (proxy.username && proxy.password) {
                auth = `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
            }
            return `http://${auth}${server}:${port}#${encodeURIComponent(name)}`;
        }

        if (type === 'snell') {
            const params = [];
            if (proxy.version) params.push(`version=${proxy.version}`);

            const obfsOpts = proxy['obfs-opts'];
            if (obfsOpts) {
                if (obfsOpts.mode) params.push(`obfs=${obfsOpts.mode}`);
                if (obfsOpts.host) params.push(`obfs-host=${encodeURIComponent(obfsOpts.host)}`);
            }

            const query = params.length > 0 ? `?${params.join('&')}` : '';
            return `snell://${encodeURIComponent(proxy.psk)}@${server}:${port}${query}#${encodeURIComponent(name)}`;
        }

        if (type === 'naive' || proxy.protocol === 'naive') {
            const username = proxy.username || '';
            const password = proxy.password || '';
            const auth = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';

            const params = [];
            if (proxy.padding !== undefined) params.push(`padding=${proxy.padding}`);
            if (proxy['extra-headers']) params.push(`extra-headers=${encodeURIComponent(proxy['extra-headers'])}`);

            const query = params.length > 0 ? `?${params.join('&')}` : '';
            const scheme = proxy.quic ? 'naive+quic' : 'naive+https';
            return `${scheme}://${auth}${server}:${port}${query}#${encodeURIComponent(name)}`;
        }

        return null;
    } catch (e) {
        console.error('Error converting proxy:', e);
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
    // 只有当包含 proxies 关键字时才尝试，避免普通文本解析报错
    if (text.includes('proxies:') || text.includes('Proxy:')) {
        try {
            const yamlObj = yaml.load(text);
            // 兼容 proxies 和 Proxy 字段
            const proxies = yamlObj.proxies || yamlObj.Proxy;

            if (Array.isArray(proxies)) {
                proxies.forEach(proxy => {
                    const url = convertClashProxyToUrl(proxy);
                    if (url) nodes.push(url);
                });
                // 如果成功解析出节点，直接返回，不再尝试其他方式
                if (nodes.length > 0) return nodes;
            }
        } catch (e) {
            // YAML 解析失败，继续尝试其他格式
            // console.warn('YAML parse failed, trying other formats');
        }
    }

    // 2. 尝试 Base64 解码
    let processedText = text;
    try {
        const cleanedText = text.replace(/\s/g, '');
        // 简单的 Base64 特征检查
        const base64Regex = /^[A-Za-z0-9+\/=]+$/;
        if (base64Regex.test(cleanedText) && cleanedText.length > 20) {
            const binaryString = atob(cleanedText);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            processedText = new TextDecoder('utf-8').decode(bytes);
        }
    } catch (e) {
        // 解码失败使用原文
    }

    // 3. 正则提取链接 (ss://, vmess:// 等)
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
 */
export function parseNodeList(content) {
    const validNodes = extractValidNodes(content);

    return validNodes.map(nodeUrl => {
        // 1. 修复编码 (如 Hysteria2 密码)
        let fixedUrl = fixNodeUrlEncoding(nodeUrl);

        // 2. [新增] 验证和修复 SS 2022 节点
        let ss2022Warning = null;
        if (fixedUrl.startsWith('ss://')) {
            const validation = validateSS2022Node(fixedUrl);

            if (!validation.valid && validation.details?.suggestedCipher) {
                // 尝试自动修复
                const fixResult = fixSS2022Node(fixedUrl);
                if (fixResult.fixed) {
                    fixedUrl = fixResult.fixedUrl;
                    ss2022Warning = {
                        type: 'ss2022_auto_fixed',
                        message: `已自动修复: ${fixResult.changes.from} → ${fixResult.changes.to}`,
                        originalCipher: fixResult.changes.from,
                        fixedCipher: fixResult.changes.to
                    };
                    console.warn(`[SS 2022] 自动修复节点: ${fixResult.changes.reason}`);
                } else {
                    ss2022Warning = {
                        type: 'ss2022_invalid',
                        message: validation.error,
                        details: validation.details
                    };
                    console.error(`[SS 2022] 节点验证失败:`, validation.details);
                }
            } else if (validation.warning) {
                ss2022Warning = {
                    type: 'ss2022_warning',
                    message: validation.warning
                };
            }
        }

        // 3. 添加 Emoji (保持预览一致性)
        fixedUrl = addFlagEmoji(fixedUrl);

        // 4. 解析信息
        const nodeInfo = parseNodeInfo(fixedUrl);

        // 5. 添加 SS 2022 警告信息
        const result = {
            url: fixedUrl,
            ...nodeInfo
        };

        if (ss2022Warning) {
            result.warning = ss2022Warning;
        }

        return result;
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
 * 去除重复节点
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
 * 格式化节点数量显示
 */
export function formatNodeCount(count) {
    if (typeof count !== 'number' || count < 0) return '0 个节点';
    return `${count} 个节点`;
}