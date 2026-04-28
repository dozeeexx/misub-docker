import { afterEach, describe, it, expect, vi } from 'vitest';
import { generateCombinedNodeList } from '../../functions/services/subscription-service.js';
import { convertClashProxyToUrl } from '../../functions/utils/clash-to-url.js';
import { urlsToClashProxies } from '../../functions/utils/url-to-clash.js';

describe('subscription-service 手动节点健壮性', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('应在包含异常节点时跳过坏节点并继续生成订阅', async () => {
        const misubs = [
            {
                id: 'bad-1',
                name: '坏节点',
                // 故意传非字符串，模拟历史脏数据
                url: null,
                enabled: true
            },
            {
                id: 'bad-2',
                name: '坏节点2',
                // 非法编码，历史导入可能出现
                url: 'vless://uuid@example.com:443?security=tls#%E0%A4%A',
                enabled: true
            },
            {
                id: 'ok-1',
                name: '正常节点',
                url: 'trojan://pass@example.com:443#ok',
                enabled: true
            }
        ];

        const result = await generateCombinedNodeList(
            {},
            { enableAccessLog: false },
            'ClashMeta',
            misubs,
            '',
            {
                enableManualNodes: true,
                manualNodePrefix: '手动节点',
                enableSubscriptions: true
            },
            false
        );

        expect(typeof result).toBe('string');
        expect(result).toContain('trojan://pass@example.com:443#');
        expect(result).toContain(encodeURIComponent('手动节点 - 正常节点'));
    });

    it('HTTP 订阅源返回 SSR 节点时，添加订阅名前缀和国旗后仍应保持可解析', async () => {
        const ssrUrl = convertClashProxyToUrl({
            name: '台湾 1',
            type: 'ssr',
            server: 'example.com',
            port: 12345,
            protocol: 'auth_aes128_sha1',
            cipher: 'chacha20-ietf',
            obfs: 'http_simple',
            password: 'password',
            'obfs-param': 'microsoft.com',
            'protocol-param': 'user:pass',
            udp: true
        });
        vi.stubGlobal('fetch', vi.fn(async () => new Response(ssrUrl, { status: 200 })));

        const result = await generateCombinedNodeList(
            {},
            { enableAccessLog: false },
            'ClashMeta',
            [{ id: 'ssr-sub', name: '月兔', url: 'https://example.com/sub', enabled: true }],
            '',
            { enableSubscriptions: true },
            false
        );
        const proxies = urlsToClashProxies(result.trim().split('\n'));

        expect(result).not.toContain('#');
        expect(proxies).toHaveLength(1);
        expect(proxies[0].type).toBe('ssr');
        expect(proxies[0].name).toContain('月兔 - 台湾 1');
    });
});
