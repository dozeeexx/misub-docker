import { base64Encode } from '../common/base64.js';

/**
 * VMess配置转换为URL
 */
export function convertVmessToUrl(proxy) {
    try {
        const config = {
            v: "2",
            ps: proxy.name || proxy['server-name'] || 'VMess',
            add: proxy.server,
            port: proxy.port,
            id: proxy.uuid || proxy['client-id'] || '',
            aid: proxy.alterId || proxy['alter-id'] || 0,
            net: proxy.network || 'tcp',
            type: proxy.headerType || 'none',
            host: proxy.host || proxy['ws-opts']?.['headers']?.Host || '',
            path: proxy.path || proxy['ws-opts']?.path || '/',
            tls: proxy.tls ? 'tls' : '',
            cipher: proxy.cipher || 'auto'
        };

        // 处理不同的网络类型
        if (config.net === 'ws') {
            if (proxy['ws-opts']) {
                config.host = proxy['ws-opts']['headers']?.Host || config.host;
                config.path = proxy['ws-opts'].path || config.path;
            }
        } else if (config.net === 'grpc') {
            if (proxy['grpc-opts']) {
                config.path = proxy['grpc-opts']['grpc-service-name'] || config.path;
            }
        }

        return 'vmess://' + base64Encode(JSON.stringify(config));
    } catch (e) {
        console.error('VMess转换失败:', e);
        return null;
    }
}
