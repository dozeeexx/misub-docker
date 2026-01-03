/**
 * SOCKS5代理转换为URL
 */
export function convertSocks5ToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port) {
            return null;
        }

        let userinfo = '';
        if (proxy.username) {
            const password = proxy.password || '';
            userinfo = `${encodeURIComponent(proxy.username)}:${encodeURIComponent(password)}@`;
        }

        let url = `socks5://${userinfo}${proxy.server}:${proxy.port}`;

        const params = new URLSearchParams();
        if (proxy.tls || proxy['skip-cert-verify'] !== undefined) {
            params.set('tls', proxy.tls ? 'true' : 'false');
        }
        if (proxy.udp) {
            params.set('udp', proxy.udp ? 'true' : 'false');
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    } catch (e) {
        console.error('SOCKS5转换失败:', e);
        return null;
    }
}
