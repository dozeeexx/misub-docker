import { base64Encode } from '../common/base64.js';

/**
 * Shadowsocks配置转换为URL
 */
export function convertShadowsocksToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port || !proxy.cipher || !proxy.password) {
            return null;
        }

        // 构建用户信息部分：cipher:password
        const userinfo = `${proxy.cipher}:${encodeURIComponent(proxy.password)}`;
        const encodedUserinfo = base64Encode(userinfo);

        return `ss://${encodedUserinfo}@${proxy.server}:${proxy.port}#${encodeURIComponent(proxy.name || 'SS')}`;
    } catch (e) {
        console.error('Shadowsocks转换失败:', e);
        return null;
    }
}

/**
 * ShadowsocksR配置转换为URL
 */
export function convertShadowsocksRToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port || !proxy.password) {
            return null;
        }

        const params = new URLSearchParams({
            server: proxy.server,
            server_port: proxy.port,
            protocol: proxy.protocol || 'origin',
            method: proxy.cipher || 'rc4-md5',
            password: proxy.password,
            remarks: proxy.name || 'SSR',
            obfs: proxy.obfs || 'plain',
            obfsparam: proxy['obfs-param'] || '',
            protoparam: proxy['protocol-param'] || ''
        });

        const base64Param = base64Encode(params.toString());
        return `ssr://${base64Param}`;
    } catch (e) {
        console.error('ShadowsocksR转换失败:', e);
        return null;
    }
}
