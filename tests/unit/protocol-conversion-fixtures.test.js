import { describe, it, expect } from 'vitest';
import { convertClashProxyToUrl } from '../../functions/utils/clash-to-url.js';
import { urlToClashProxy, urlsToClashProxies } from '../../functions/utils/url-to-clash.js';

const stripGeneratedFields = (proxy) => {
    const { metadata, ...rest } = proxy;
    return rest;
};

const expectRoundTrip = (proxy, expected) => {
    const url = convertClashProxyToUrl(proxy);
    expect(url).toBeTruthy();

    const parsed = urlToClashProxy(url);
    expect(parsed).toMatchObject(expected);

    const [batched] = urlsToClashProxies([url], { addFlagEmoji: false });
    expect(stripGeneratedFields(batched)).toMatchObject(expected);
};

describe('protocol conversion fixtures', () => {
    it('preserves common proxy fields across Clash proxy -> URL -> Clash proxy round trips', () => {
        const fixtures = [
            {
                proxy: {
                    name: 'Fixture SS Obfs',
                    type: 'ss',
                    server: 'ss.example.com',
                    port: 8388,
                    cipher: 'chacha20-ietf-poly1305',
                    password: 'ss-pass',
                    plugin: 'obfs',
                    'plugin-opts': {
                        mode: 'tls',
                        host: 'cdn.example.com'
                    }
                },
                expected: {
                    name: 'Fixture SS Obfs',
                    type: 'ss',
                    server: 'ss.example.com',
                    port: 8388,
                    cipher: 'chacha20-ietf-poly1305',
                    password: 'ss-pass',
                    plugin: 'obfs',
                    'plugin-opts': {
                        mode: 'tls',
                        host: 'cdn.example.com'
                    }
                }
            },
            {
                proxy: {
                    name: 'Fixture SSR',
                    type: 'ssr',
                    server: 'ssr.example.com',
                    port: 12345,
                    protocol: 'auth_aes128_sha1',
                    cipher: 'chacha20-ietf',
                    obfs: 'http_simple',
                    password: 'ssr-pass',
                    'obfs-param': 'download.example.com',
                    'protocol-param': '32:token'
                },
                expected: {
                    name: 'Fixture SSR',
                    type: 'ssr',
                    server: 'ssr.example.com',
                    port: 12345,
                    protocol: 'auth_aes128_sha1',
                    cipher: 'chacha20-ietf',
                    obfs: 'http_simple',
                    password: 'ssr-pass',
                    'obfs-param': 'download.example.com',
                    'protocol-param': '32:token'
                }
            },
            {
                proxy: {
                    name: 'Fixture VMess WS',
                    type: 'vmess',
                    server: 'vmess.example.com',
                    port: 443,
                    uuid: '11111111-1111-4111-8111-111111111111',
                    alterId: 0,
                    cipher: 'auto',
                    network: 'ws',
                    tls: true,
                    sni: 'vmess-sni.example.com',
                    'client-fingerprint': 'chrome',
                    'ws-opts': {
                        path: '/ws',
                        headers: { Host: 'front.example.com' }
                    }
                },
                expected: {
                    name: 'Fixture VMess WS',
                    type: 'vmess',
                    server: 'vmess.example.com',
                    port: 443,
                    uuid: '11111111-1111-4111-8111-111111111111',
                    alterId: 0,
                    cipher: 'auto',
                    network: 'ws',
                    tls: true,
                    servername: 'vmess-sni.example.com',
                    'client-fingerprint': 'chrome',
                    'ws-opts': {
                        path: '/ws',
                        headers: { Host: 'front.example.com' }
                    }
                }
            },
            {
                proxy: {
                    name: 'Fixture VLESS Reality',
                    type: 'vless',
                    server: 'vless.example.com',
                    port: 443,
                    uuid: '22222222-2222-4222-8222-222222222222',
                    network: 'grpc',
                    tls: true,
                    servername: 'www.example.com',
                    flow: 'xtls-rprx-vision',
                    'client-fingerprint': 'chrome',
                    'dialer-proxy': '前置节点',
                    'reality-opts': {
                        'public-key': 'public-key-value',
                        'short-id': 'abcd',
                        'spider-x': '/'
                    }
                },
                expected: {
                    name: 'Fixture VLESS Reality',
                    type: 'vless',
                    server: 'vless.example.com',
                    port: 443,
                    uuid: '22222222-2222-4222-8222-222222222222',
                    network: 'grpc',
                    tls: true,
                    servername: 'www.example.com',
                    sni: 'www.example.com',
                    flow: 'xtls-rprx-vision',
                    'client-fingerprint': 'chrome',
                    'dialer-proxy': '前置节点',
                    'reality-opts': {
                        'public-key': 'public-key-value',
                        'short-id': 'abcd',
                        'spider-x': '/'
                    }
                }
            },
            {
                proxy: {
                    name: 'Fixture Trojan WS',
                    type: 'trojan',
                    server: 'trojan.example.com',
                    port: 443,
                    password: 'tr@jan:pass',
                    network: 'ws',
                    sni: 'trojan-sni.example.com',
                    'skip-cert-verify': true,
                    'ws-opts': {
                        path: '/trojan',
                        headers: { Host: 'trojan-front.example.com' }
                    }
                },
                expected: {
                    name: 'Fixture Trojan WS',
                    type: 'trojan',
                    server: 'trojan.example.com',
                    port: 443,
                    password: 'tr@jan:pass',
                    network: 'ws',
                    servername: 'trojan-sni.example.com',
                    sni: 'trojan-sni.example.com',
                    'skip-cert-verify': true,
                    'ws-opts': {
                        path: '/trojan',
                        headers: { Host: 'trojan-front.example.com' }
                    }
                }
            },
            {
                proxy: {
                    name: 'Fixture HY2 Realm',
                    type: 'hysteria2',
                    server: 'hy2.example.com',
                    port: 443,
                    password: 'hy2-pass',
                    sni: 'hy2-sni.example.com',
                    obfs: 'salamander',
                    'obfs-password': 'obfs-pass',
                    'skip-cert-verify': true,
                    'realm-opts': {
                        enable: true,
                        'realm-id': 'realm-id-value',
                        token: 'realm-token-value',
                        'server-url': 'https://realm.example.com',
                        'stun-servers': ['stun.example.com:3478', 'stun2.example.com:3478']
                    }
                },
                expected: {
                    name: 'Fixture HY2 Realm',
                    type: 'hysteria2',
                    server: 'hy2.example.com',
                    port: 443,
                    password: 'hy2-pass',
                    servername: 'hy2-sni.example.com',
                    sni: 'hy2-sni.example.com',
                    obfs: 'salamander',
                    'obfs-password': 'obfs-pass',
                    'skip-cert-verify': true,
                    'realm-opts': {
                        enable: true,
                        'realm-id': 'realm-id-value',
                        token: 'realm-token-value',
                        'server-url': 'https://realm.example.com',
                        'stun-servers': ['stun.example.com:3478', 'stun2.example.com:3478']
                    }
                }
            },
            {
                proxy: {
                    name: 'Fixture TUIC',
                    type: 'tuic',
                    server: 'tuic.example.com',
                    port: 443,
                    uuid: '33333333-3333-4333-8333-333333333333',
                    password: 'p@ss:word%23?x',
                    sni: 'tuic-sni.example.com',
                    alpn: ['h3'],
                    'skip-cert-verify': true,
                    'congestion-controller': 'bbr',
                    'udp-relay-mode': 'native',
                    'zero-rtt-handshake': true,
                    heartbeat: '10s'
                },
                expected: {
                    name: 'Fixture TUIC',
                    type: 'tuic',
                    server: 'tuic.example.com',
                    port: 443,
                    uuid: '33333333-3333-4333-8333-333333333333',
                    password: 'p@ss:word%23?x',
                    servername: 'tuic-sni.example.com',
                    sni: 'tuic-sni.example.com',
                    alpn: ['h3'],
                    'skip-cert-verify': true,
                    'congestion-controller': 'bbr',
                    'udp-relay-mode': 'native',
                    'zero-rtt-handshake': true,
                    'reduce-rtt': true,
                    heartbeat: '10s'
                }
            }
        ];

        for (const fixture of fixtures) {
            expectRoundTrip(fixture.proxy, fixture.expected);
        }
    });
});
