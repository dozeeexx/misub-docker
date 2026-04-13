import yaml from 'js-yaml';
import { normalizeUnifiedTemplateModel } from '../template-model.js';

function mapTransport(proxy) {
    const network = String(proxy.network || 'tcp').toLowerCase();
    const transport = {};

    if (network === 'ws' || network === 'websocket') {
        transport.ws = {
            path: proxy['ws-opts']?.path || '/',
            headers: proxy['ws-opts']?.headers || {}
        };
    } else if (network === 'grpc') {
        transport.grpc = {
            service_name: proxy['grpc-opts']?.['grpc-service-name'] || proxy['grpc-opts']?.['service-name'] || proxy['grpc-opts']?.serviceName || 'grpc'
        };
    } else if (network === 'h2' || network === 'http2') {
        transport.h2 = {
            path: proxy['h2-opts']?.path || '/',
            host: Array.isArray(proxy['h2-opts']?.host) ? proxy['h2-opts'].host : [proxy['h2-opts']?.host || proxy.server]
        };
    } else if (network === 'http') {
        transport.http = {
            path: proxy['http-opts']?.path || '/',
            headers: proxy['http-opts']?.headers || {}
        };
    } else if (network === 'quic') {
        transport.quic = {
            security: proxy['quic-opts']?.security || 'none',
            key: proxy['quic-opts']?.key || '',
            header: proxy['quic-opts']?.header || { type: 'none' }
        };
    }

    if (proxy.tls || !!proxy['reality-opts']) {
        transport.tls = {
            skip_tls_verify: Boolean(proxy['skip-cert-verify'] || proxy.skipCertVerify),
            alpn: proxy.alpn || ['h2', 'http/1.1']
        };
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) transport.tls.sni = sni;

        if (proxy['reality-opts']) {
            transport.tls.reality = {
                public_key: proxy['reality-opts']?.['public-key'] || proxy['reality-opts']?.publicKey || '',
                short_id: proxy['reality-opts']?.['short-id'] || proxy['reality-opts']?.shortId || ''
            };
        }
        if (proxy.fingerprint) {
            transport.tls.fingerprint = proxy.fingerprint;
        }
    }

    return Object.keys(transport).length > 0 ? transport : undefined;
}

function mapProxy(proxy) {
    const type = String(proxy.type || '').toLowerCase();
    const name = proxy.name;

    const base = {
        name,
        type: type === 'ss' ? 'shadowsocks' : type,
        server: proxy.server,
        port: proxy.port,
        tfo: Boolean(proxy.tfo),
        udp_relay: proxy.udp !== false
    };

    if (type === 'trojan') {
        Object.assign(base, {
            password: proxy.password,
            skip_tls_verify: Boolean(proxy['skip-cert-verify'])
        });
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) base.sni = sni;
        const transport = mapTransport(proxy);
        if (transport) base.transport = transport;
        return base;
    }

    if (type === 'vless') {
        Object.assign(base, { user_id: proxy.uuid });
        if (proxy.flow) base.flow = proxy.flow;
        const transport = mapTransport(proxy);
        if (transport) base.transport = transport;
        return base;
    }

    if (type === 'vmess') {
        Object.assign(base, {
            user_id: proxy.uuid,
            security: proxy.cipher || 'auto',
            legacy: Number(proxy.alterId || 0) > 0
        });
        const transport = mapTransport(proxy);
        if (transport) base.transport = transport;
        return base;
    }

    if (type === 'ss' || type === 'shadowsocks') {
        Object.assign(base, {
            method: proxy.cipher || proxy.method,
            password: proxy.password
        });
        if (proxy.plugin === 'obfs') {
            base.obfs = proxy['plugin-opts']?.mode || 'http';
            base.obfs_host = proxy['plugin-opts']?.host || proxy.server;
        }
        return base;
    }

    if (type === 'hysteria2' || type === 'hy2') {
        const h2 = {
            ...base,
            type: 'hysteria2',
            auth: proxy.password,
            skip_tls_verify: Boolean(proxy['skip-cert-verify'] || proxy.skipCertVerify)
        };
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) h2.sni = sni;
        if (proxy.obfs || proxy['obfs-opts']) {
            h2.obfuscation = {
                type: proxy.obfs || proxy['obfs-opts']?.type || 'salamander',
                password: proxy.password || proxy['obfs-opts']?.password || ''
            };
        }
        if (proxy.hop || proxy.portHopping) {
            h2.port_hopping = String(proxy.hop || proxy.portHopping);
        }
        return h2;
    }

    if (type === 'tuic') {
        const tuic = {
            ...base,
            uuid: proxy.uuid,
            password: proxy.password,
            alpn: proxy.alpn || ['h3'],
            udp_relay_mode: proxy['udp-relay-mode'] || 'native',
            congestion_control: proxy['congestion-control'] || 'cubic',
            skip_tls_verify: Boolean(proxy['skip-cert-verify'] || proxy.skipCertVerify)
        };
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) tuic.sni = sni;
        if (proxy.hop || proxy.portHopping) {
            tuic.port_hopping = String(proxy.hop || proxy.portHopping);
        }
        return tuic;
    }

    if (type === 'anytls') {
        const any = {
            ...base,
            password: proxy.password,
            skip_tls_verify: Boolean(proxy['skip-cert-verify'] || proxy.skipCertVerify)
        };
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) any.sni = sni;
        return any;
    }

    // Default catch-all for simpler protocols like http/socks5
    if (type === 'http' || type === 'https' || type === 'socks5' || type === 'socks') {
        const obj = {
            ...base,
            username: proxy.username || proxy.user,
            password: proxy.password || proxy.pass
        };
        if (type === 'https' || type === 'http') obj.type = 'http';
        if (type === 'socks5' || type === 'socks') obj.type = 'socks5';
        if (type === 'https' || !!proxy.tls) obj.tls = true;
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) obj.sni = sni;
        return obj;
    }

    return base;
}

function mapPolicyGroup(group) {
    const type = String(group.type || 'select').toLowerCase();
    const policies = Array.isArray(group.members) ? group.members.filter(Boolean) : [];

    const base = {
        name: group.name,
        policies
    };

    if (type === 'url-test' || type === 'urltest' || type === 'auto-test') {
        return {
            ...base,
            type: 'url-test',
            interval: Number(group.options?.interval) || 600,
            tolerance: Number(group.options?.tolerance) || 100,
            timeout: Number(group.options?.timeout) || 5
        };
    }

    if (type === 'fallback') {
        return {
            ...base,
            type: 'fallback',
            interval: Number(group.options?.interval) || 600,
            timeout: Number(group.options?.timeout) || 5
        };
    }

    return {
        ...base,
        type: 'select'
    };
}

function mapRule(rule) {
    const type = String(rule.type || '').toLowerCase();
    const policy = rule.policy || 'DIRECT';
    const value = rule.value;

    if (type === 'final' || type === 'match') {
        return { final: policy };
    }

    if (type === 'rule-set' && /^https?:\/\//i.test(value || '')) {
        return {
            type: 'rule-set',
            match: value,
            policy,
            update_interval: 86400
        };
    }

    // Standardize hyphenated names
    const typeMap = {
        'domain-suffix': 'domain-suffix',
        'domain_suffix': 'domain-suffix',
        'domain-keyword': 'domain-keyword',
        'domain_keyword': 'domain-keyword',
        'ip-cidr': 'ip-cidr',
        'ip_cidr': 'ip-cidr',
        'ip-cidr6': 'ip-cidr6',
        'ip_cidr6': 'ip-cidr6',
        'domain-regex': 'domain-regex',
        'domain_regex': 'domain-regex',
        'domain': 'domain'
    };

    const targetType = typeMap[type] || type.replace(/_/g, '-');
    
    return {
        type: targetType,
        match: value,
        policy,
        ...(rule.noResolve ? { no_resolve: true } : {})
    };
}

export function renderEgernFromTemplateModel(model) {
    const normalizedModel = normalizeUnifiedTemplateModel(model);

    const proxies = normalizedModel.proxies
        .map(mapProxy)
        .filter(Boolean);

    const policyGroups = normalizedModel.groups
        .filter(group => Array.isArray(group.members) && group.members.length > 0)
        .map(mapPolicyGroup);

    const rules = normalizedModel.rules
        .map(mapRule)
        .filter(Boolean);

    const config = {
        proxies,
        policy_groups: policyGroups,
        rules
    };

    if (normalizedModel.settings.managedConfigUrl) {
        config.auto_update = {
            url: normalizedModel.settings.managedConfigUrl,
            interval: normalizedModel.settings.interval || 86400
        };
    }

    return yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
    });
}
