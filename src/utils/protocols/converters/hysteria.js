/**
 * Hysteria/Hysteria2配置转换为URL
 */
export function convertHysteriaToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port || !proxy.password) {
            return null;
        }

        const protocol = proxy.type === 'hysteria2' ? 'hysteria2' : 'hysteria';

        let url = `${protocol}://${encodeURIComponent(proxy.password)}@${proxy.server}:${proxy.port}`;

        const params = [];

        if (proxy.name) {
            params.push(`name=${encodeURIComponent(proxy.name)}`);
        }

        if (proxy.protocol) {
            params.push(`protocol=${encodeURIComponent(proxy.protocol)}`);
        }

        if (proxy.up) {
            params.push(`up=${proxy.up}`);
        }

        if (proxy.down) {
            params.push(`down=${proxy.down}`);
        }

        if (proxy['alpn']) {
            params.push(`alpn=${encodeURIComponent(proxy['alpn'].join(','))}`);
        }

        if (proxy['obfs']) {
            params.push(`obfs=${encodeURIComponent(proxy['obfs'].type || proxy['obfs'])}`);
            if (proxy['obfs'].host) {
                params.push(`obfs-host=${encodeURIComponent(proxy['obfs'].host)}`);
            }
        }

        if (proxy['skip-cert-verify'] !== undefined) {
            params.push(`insecure=${proxy['skip-cert-verify'] ? 1 : 0}`);
        }

        if (params.length > 0) {
            url += `?${params.join('&')}`;
        } else {
            if (proxy.name) {
                url += `#${encodeURIComponent(proxy.name)}`;
            }
        }

        return url;
    } catch (e) {
        console.error('Hysteria转换失败:', e);
        return null;
    }
}
