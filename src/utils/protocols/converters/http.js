/**
 * HTTP代理转换为URL
 */
export function convertHttpToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port) {
            return null;
        }

        let userinfo = '';
        if (proxy.username) {
            const password = proxy.password || '';
            userinfo = `${encodeURIComponent(proxy.username)}:${encodeURIComponent(password)}@`;
        }

        let url = `http://${userinfo}${proxy.server}:${proxy.port}`;

        const params = new URLSearchParams();
        if (proxy.tls || proxy['skip-cert-verify'] !== undefined) {
            params.set('tls', proxy.tls ? 'true' : 'false');
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    } catch (e) {
        console.error('HTTP转换失败:', e);
        return null;
    }
}
