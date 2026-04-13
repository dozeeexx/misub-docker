import yaml from 'js-yaml';
import { normalizeUnifiedTemplateModel } from '../template-model.js';

function mapTransport(proxy) {
    const network = String(proxy.network || 'tcp').toLowerCase();
    const transport = {};

    const tls = (proxy.tls || !!proxy['reality-opts']) ? {
        skip_tls_verify: Boolean(proxy['skip-cert-verify'] || proxy.skipCertVerify),
        sni: proxy.servername ?? proxy.sni ?? proxy.server
    } : null;

    if (network === 'ws' || network === 'websocket') {
        if (tls) {
            // Merge into wss for Egern
            transport.wss = {
                path: proxy['ws-opts']?.path || '/',
                headers: proxy['ws-opts']?.headers || {},
                ...tls
            };
        } else {
            transport.ws = {
                path: proxy['ws-opts']?.path || '/',
                headers: proxy['ws-opts']?.headers || {}
            };
        }
    } else if (network === 'grpc') {
        transport.grpc = {
            service_name: proxy['grpc-opts']?.['grpc-service-name'] || proxy['grpc-opts']?.['service-name'] || proxy['grpc-opts']?.serviceName || 'grpc'
        };
        if (tls) transport.tls = tls;
    } else if (network === 'h2' || network === 'http2') {
        transport.h2 = {
            path: proxy['h2-opts']?.path || '/',
            host: Array.isArray(proxy['h2-opts']?.host) ? proxy['h2-opts'].host : [proxy['h2-opts']?.host || proxy.server]
        };
        if (tls) transport.tls = tls;
    } else {
        if (tls) transport.tls = tls;
    }

    if (transport.tls && proxy['reality-opts']) {
        transport.tls.reality = {
            public_key: proxy['reality-opts']?.['public-key'] || proxy['reality-opts']?.publicKey || '',
            short_id: proxy['reality-opts']?.['short-id'] || proxy['reality-opts']?.shortId || ''
        };
    }

    return Object.keys(transport).length > 0 ? transport : undefined;
}

function mapProxy(proxy) {
    const type = String(proxy.type || '').toLowerCase();
    const name = proxy.name;

    if (type === 'trojan') {
        const mapped = {
            trojan: {
                name,
                server: proxy.server,
                port: proxy.port,
                password: proxy.password,
                skip_tls_verify: Boolean(proxy['skip-cert-verify'] || proxy.skipCertVerify)
            }
        };
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) mapped.trojan.sni = sni;
        const transport = mapTransport(proxy);
        if (transport) mapped.trojan.transport = transport;
        return mapped;
    }

    if (type === 'vless') {
        const mapped = {
            vless: {
                name,
                server: proxy.server,
                port: proxy.port,
                user_id: proxy.uuid
            }
        };
        if (proxy.flow) {
            // Egern standard flow is xtls-rprx-vision
            mapped.vless.flow = proxy.flow.includes('vision') ? 'xtls-rprx-vision' : proxy.flow;
        }
        const transport = mapTransport(proxy);
        if (transport) mapped.vless.transport = transport;
        return mapped;
    }

    if (type === 'vmess') {
        const mapped = {
            vmess: {
                name,
                server: proxy.server,
                port: proxy.port,
                user_id: proxy.uuid,
                security: proxy.cipher || 'auto'
            }
        };
        const transport = mapTransport(proxy);
        if (transport) mapped.vmess.transport = transport;
        return mapped;
    }

    if (type === 'ss' || type === 'shadowsocks') {
        const mapped = {
            shadowsocks: {
                name,
                server: proxy.server,
                port: proxy.port,
                method: proxy.cipher || proxy.method,
                password: proxy.password
            }
        };
        if (proxy.plugin === 'obfs') {
            mapped.shadowsocks.obfs = proxy['plugin-opts']?.mode || 'http';
            mapped.shadowsocks.obfs_host = proxy['plugin-opts']?.host || proxy.server;
        }
        return mapped;
    }

    if (type === 'hysteria2' || type === 'hy2') {
        const mapped = {
            hysteria2: {
                name,
                server: proxy.server,
                port: proxy.port,
                password: proxy.password,
                skip_tls_verify: Boolean(proxy['skip-cert-verify'] || proxy.skipCertVerify)
            }
        };
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) mapped.hysteria2.sni = sni;
        return mapped;
    }

    if (type === 'tuic') {
        const mapped = {
            tuic: {
                name,
                server: proxy.server,
                port: proxy.port,
                user_id: proxy.uuid,
                password: proxy.password,
                congestion_control: proxy['congestion-control'] || 'cubic',
                skip_tls_verify: Boolean(proxy['skip-cert-verify'] || proxy.skipCertVerify)
            }
        };
        const sni = proxy.servername ?? proxy.sni ?? proxy.server;
        if (sni) mapped.tuic.sni = sni;
        return mapped;
    }

    return {
        [type]: {
            name,
            server: proxy.server,
            port: proxy.port
        }
    };
}

function mapPolicyGroup(group) {
    const type = String(group.type || 'select').toLowerCase();
    const policies = Array.isArray(group.members) ? group.members.filter(Boolean) : [];

    if (type === 'url-test' || type === 'urltest' || type === 'auto-test') {
        return {
            auto_test: {
                name: group.name,
                policies,
                interval: Number(group.options?.interval) || 600,
                tolerance: Number(group.options?.tolerance) || 100
            }
        };
    }

    if (type === 'fallback') {
        return {
            fallback: {
                name: group.name,
                policies,
                interval: Number(group.options?.interval) || 600
            }
        };
    }

    return {
        select: {
            name: group.name,
            policies
        }
    };
}

function mapRule(rule) {
    const type = String(rule.type || '').toLowerCase();
    const policy = rule.policy || 'DIRECT';
    const value = rule.value;

    if (type === 'final' || type === 'match') {
        return { default: { policy } };
    }

    if (type === 'rule-set' && /^https?:\/\//i.test(value || '')) {
        return {
            rule_set: {
                match: value,
                policy,
                update_interval: 86400
            }
        };
    }

    const targetType = type.replace(/-/g, '_');
    
    return {
        [targetType]: {
            match: value,
            policy
        }
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
        sortKeys: false,
        // Force quotes for names and passwords to prevent YAML parsing issues
        styles: {
            '!!str': 'quoted'
        }
    });
}
