/**
 * TUIC配置转换为URL
 */
export function convertTuicToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port || !proxy.uuid || !proxy.password) {
            return null;
        }

        const params = new URLSearchParams({
            congestion: proxy.congestion || 'bbr',
            udp_relay: proxy['udp-relay'] ? '1' : '0',
            alpn: proxy['alpn']?.join(',') || 'h3'
        });

        if (proxy['reduce-rtt'] !== undefined) {
            params.set('reduce_rtt', proxy['reduce-rtt'] ? '1' : '0');
        }

        const url = `tuic://${encodeURIComponent(proxy.uuid)}:${encodeURIComponent(proxy.password)}@${proxy.server}:${proxy.port}?${params.toString()}`;

        if (proxy.name) {
            return `${url}#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    } catch (e) {
        console.error('TUIC转换失败:', e);
        return null;
    }
}
