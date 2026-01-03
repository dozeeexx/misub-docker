/**
 * WireGuard转换为URL（简化版本）
 */
export function convertWireguardToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port || !proxy['private-key']) {
            return null;
        }

        // WireGuard需要特殊处理，这里提供基础支持
        const params = new URLSearchParams({
            private_key: proxy['private-key'],
            public_key: proxy['public-key'] || '',
            endpoint: `${proxy.server}:${proxy.port}`,
            allowed_ips: proxy['allowed-ips']?.join(',') || '0.0.0.0/0,::/0',
            mtu: proxy.mtu || '1420'
        });

        // 添加DNS配置
        if (proxy.dns) {
            params.set('dns', Array.isArray(proxy.dns) ? proxy.dns.join(',') : proxy.dns);
        }

        return `wireguard://${params.toString()}#${encodeURIComponent(proxy.name || 'WireGuard')}`;
    } catch (e) {
        console.error('WireGuard转换失败:', e);
        return null;
    }
}
