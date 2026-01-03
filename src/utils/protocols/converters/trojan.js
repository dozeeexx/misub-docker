/**
 * Trojan配置转换为URL
 */
export function convertTrojanToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port || !proxy.password) {
            return null;
        }

        let url = `trojan://${encodeURIComponent(proxy.password)}@${proxy.server}:${proxy.port}`;

        const params = [];
        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        // 添加传输参数
        if (proxy.network === 'ws' && proxy['ws-opts']) {
            params.push(`type=ws`);
            if (proxy['ws-opts'].path) {
                params.push(`path=${encodeURIComponent(proxy['ws-opts'].path)}`);
            }
            if (proxy['ws-opts']['headers']?.Host) {
                params.push(`host=${encodeURIComponent(proxy['ws-opts']['headers'].Host)}`);
            }
        } else if (proxy.network === 'grpc' && proxy['grpc-opts']) {
            params.push(`type=grpc`);
            if (proxy['grpc-opts']['grpc-service-name']) {
                params.push(`serviceName=${encodeURIComponent(proxy['grpc-opts']['grpc-service-name'])}`);
            }
        }

        if (proxy.skipCertVerify !== undefined) {
            params.push(`allowInsecure=${proxy.skipCertVerify ? 1 : 0}`);
        }

        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        return url;
    } catch (e) {
        console.error('Trojan转换失败:', e);
        return null;
    }
}
