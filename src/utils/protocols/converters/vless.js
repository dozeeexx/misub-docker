/**
 * VLESS配置转换为URL
 */
export function convertVlessToUrl(proxy) {
    try {
        if (!proxy.server || !proxy.port || !proxy.uuid) {
            return null;
        }

        const params = new URLSearchParams({
            encryption: proxy.encryption || 'none',
            type: proxy.network || 'tcp'
        });

        // 添加传输参数
        if (proxy.network === 'ws' && proxy['ws-opts']) {
            params.set('type', 'ws');
            if (proxy['ws-opts'].path) {
                params.set('path', proxy['ws-opts'].path);
            }
            if (proxy['ws-opts']['headers']?.Host) {
                params.set('host', proxy['ws-opts']['headers'].Host);
            }
        } else if (proxy.network === 'grpc' && proxy['grpc-opts']) {
            params.set('type', 'grpc');
            if (proxy['grpc-opts']['grpc-service-name']) {
                params.set('serviceName', proxy['grpc-opts']['grpc-service-name']);
            }
        }

        if (proxy.flow) {
            params.set('flow', proxy.flow);
        }

        if (proxy.tls) {
            params.set('security', 'tls');
            if (proxy.skipCertVerify !== undefined) {
                params.set('allowInsecure', proxy.skipCertVerify ? 1 : 0);
            }
        } else if (proxy.reality) {
            params.set('security', 'reality');
            if (proxy['reality-opts']) {
                if (proxy['reality-opts']['public-key']) {
                    params.set('publicKey', proxy['reality-opts']['public-key']);
                }
                if (proxy['reality-opts']['short-id']) {
                    params.set('shortId', proxy['reality-opts']['short-id']);
                }
                if (proxy['reality-opts']['spider-x']) {
                    params.set('spiderX', proxy['reality-opts']['spider-x']);
                }
            }
        }

        const url = `vless://${proxy.uuid}@${proxy.server}:${proxy.port}?${params.toString()}`;

        if (proxy.name) {
            return `${url}#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    } catch (e) {
        console.error('VLESS转换失败:', e);
        return null;
    }
}
