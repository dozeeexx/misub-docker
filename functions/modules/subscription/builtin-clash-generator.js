/**
 * 内置 Clash 配置生成器
 * 不依赖外部 subconverter，直接将节点 URL 转换为完整 Clash 配置
 * 支持 dialer-proxy、reality-opts 等特殊参数
 */

import { urlToClashProxy, urlsToClashProxies } from '../../utils/url-to-clash.js';
import yaml from 'js-yaml';

/**
 * 生成内置 Clash 配置
 * @param {string} nodeList - 节点列表（换行分隔的 URL）
 * @param {Object} options - 配置选项
 * @returns {string} Clash YAML 配置
 */
export function generateBuiltinClashConfig(nodeList, options = {}) {
    const {
        fileName = 'MiSub',
        enableUdp = true,
        externalConfig = null
    } = options;

    // 解析节点 URL 列表
    const nodeUrls = nodeList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    // 转换为 Clash 代理对象
    const proxies = urlsToClashProxies(nodeUrls);

    if (proxies.length === 0) {
        return '# No valid proxies found\nproxies: []\n';
    }

    // 获取所有代理名称
    const proxyNames = proxies.map(p => p.name);

    // 分离出带有 dialer-proxy 的节点（链式代理）
    const chainedProxies = proxies.filter(p => p['dialer-proxy']);
    const directProxies = proxies.filter(p => !p['dialer-proxy']);

    // 基础配置
    const config = {
        'mixed-port': 7890,
        'allow-lan': true,
        'mode': 'rule',
        'log-level': 'info',
        'external-controller': ':9090',

        'dns': {
            'enable': true,
            'listen': '0.0.0.0:1053',
            'default-nameserver': ['223.5.5.5', '1.1.1.1'],
            'enhanced-mode': 'fake-ip',
            'fake-ip-range': '198.18.0.1/16',
            'fake-ip-filter': ['*.lan', '*.localhost'],
            'nameserver': [
                'https://dns.alidns.com/dns-query',
                'https://doh.pub/dns-query'
            ]
        },

        'proxies': proxies,

        'proxy-groups': [
            {
                'name': '🚀 节点选择',
                'type': 'select',
                'proxies': ['♻️ 自动选择', '🔯 故障转移', ...proxyNames]
            },
            {
                'name': '♻️ 自动选择',
                'type': 'url-test',
                'url': 'http://www.gstatic.com/generate_204',
                'interval': 300,
                'tolerance': 50,
                'proxies': proxyNames
            },
            {
                'name': '🔯 故障转移',
                'type': 'fallback',
                'url': 'http://www.gstatic.com/generate_204',
                'interval': 300,
                'proxies': proxyNames
            }
        ],

        'rules': [
            'GEOIP,CN,DIRECT',
            'MATCH,🚀 节点选择'
        ]
    };

    // 如果有链式代理节点，添加说明注释
    if (chainedProxies.length > 0) {
        console.log(`[BuiltinClash] ${chainedProxies.length} proxies with dialer-proxy`);
    }

    // 生成 YAML
    try {
        return yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            quotingType: '"',
            forceQuotes: false
        });
    } catch (e) {
        console.error('[BuiltinClash] YAML generation failed:', e);
        // Fallback: 使用简单的 JSON 转换
        return `proxies:\n${proxies.map(p => `  - ${JSON.stringify(p)}`).join('\n')}\n`;
    }
}

/**
 * 仅生成代理列表（不包含完整配置）
 * @param {string} nodeList - 节点列表
 * @returns {string} 仅包含 proxies 部分的 YAML
 */
export function generateProxiesOnly(nodeList) {
    const nodeUrls = nodeList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    const proxies = urlsToClashProxies(nodeUrls);

    try {
        return yaml.dump({ proxies }, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
    } catch (e) {
        return `proxies:\n${proxies.map(p => `  - ${JSON.stringify(p)}`).join('\n')}\n`;
    }
}
