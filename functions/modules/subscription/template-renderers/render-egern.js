import yaml from 'js-yaml';
import { normalizeUnifiedTemplateModel } from '../template-model.js';

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
                sni: proxy.sni || proxy.server,
                tfo: Boolean(proxy.tfo),
                udp_relay: proxy.udp !== false,
                skip_tls_verify: Boolean(proxy['skip-cert-verify'])
            }
        };
        if (proxy.network === 'ws' && proxy['ws-opts']) {
            mapped.trojan.websocket = {
                path: proxy['ws-opts']?.path || '/',
                host: proxy['ws-opts']?.headers?.Host || proxy.sni || proxy.server
            };
        }
        return mapped;
    }

    if (type === 'vless') {
        const mapped = {
            vless: {
                name,
                server: proxy.server,
                port: proxy.port,
                user_id: proxy.uuid,
                tfo: Boolean(proxy.tfo),
                udp_relay: proxy.udp !== false
            }
        };

        if (proxy.flow) mapped.vless.flow = proxy.flow;

        if (proxy.network === 'ws' && proxy['ws-opts']) {
            mapped.vless.transport = {
                ws: {
                    path: proxy['ws-opts']?.path || '/',
                    headers: proxy['ws-opts']?.headers || {}
                }
            };
        } else if (proxy.network === 'grpc' && proxy['grpc-opts']) {
            mapped.vless.transport = {
                tls: {
                    sni: proxy.sni || proxy.server,
                    skip_tls_verify: Boolean(proxy['skip-cert-verify'])
                }
            };
        } else if (proxy.tls || proxy['reality-opts']) {
            mapped.vless.transport = {
                tls: {
                    sni: proxy.sni || proxy.server,
                    skip_tls_verify: Boolean(proxy['skip-cert-verify']),
                    ...(proxy['reality-opts'] ? {
                        reality: {
                            public_key: proxy['reality-opts']?.['public-key'],
                            short_id: proxy['reality-opts']?.['short-id']
                        }
                    } : {})
                }
            };
        }

        return mapped;
    }

    if (type === 'vmess') {
        const mapped = {
            vmess: {
                name,
                server: proxy.server,
                port: proxy.port,
                user_id: proxy.uuid,
                security: proxy.cipher || 'auto',
                legacy: Number(proxy.alterId || 0) > 0,
                tfo: Boolean(proxy.tfo),
                udp_relay: proxy.udp !== false
            }
        };

        if (proxy.network === 'ws' && proxy['ws-opts']) {
            mapped.vmess.transport = {
                ws: {
                    path: proxy['ws-opts']?.path || '/',
                    headers: proxy['ws-opts']?.headers || {}
                }
            };
        } else if (proxy.tls) {
            mapped.vmess.transport = {
                tls: {
                    sni: proxy.sni || proxy.server,
                    skip_tls_verify: Boolean(proxy['skip-cert-verify'])
                }
            };
        }

        return mapped;
    }

    if (type === 'ss') {
        return {
            shadowsocks: {
                name,
                server: proxy.server,
                port: proxy.port,
                method: proxy.cipher,
                password: proxy.password,
                udp_relay: proxy.udp !== false,
                tfo: Boolean(proxy.tfo)
            }
        };
    }

    if (type === 'hysteria2') {
        return {
            hysteria2: {
                name,
                server: proxy.server,
                port: proxy.port,
                auth: proxy.password,
                sni: proxy.sni || proxy.server,
                skip_tls_verify: Boolean(proxy['skip-cert-verify'])
            }
        };
    }

    if (type === 'tuic') {
        return {
            tuic: {
                name,
                server: proxy.server,
                port: proxy.port,
                uuid: proxy.uuid,
                password: proxy.password,
                sni: proxy.sni || proxy.server,
                alpn: proxy.alpn || ['h3'],
                udp_relay_mode: 'native',
                skip_tls_verify: Boolean(proxy['skip-cert-verify'])
            }
        };
    }

    if (type === 'wireguard') {
        return {
            wireguard: {
                name,
                server: proxy.server,
                port: proxy.port,
                private_key: proxy['private-key'],
                peer_public_key: proxy['public-key'],
                local_ipv4: Array.isArray(proxy.ip) ? proxy.ip.find(ip => !String(ip).includes(':')) : proxy.ip,
                local_ipv6: Array.isArray(proxy.ip) ? proxy.ip.find(ip => String(ip).includes(':')) : undefined,
                reserved: proxy.reserved
            }
        };
    }

    return null;
}

function mapPolicyGroup(group) {
    const type = String(group.type || 'select').toLowerCase();
    const policies = Array.isArray(group.members) ? group.members.filter(Boolean) : [];

    if (type === 'url-test') {
        return {
            auto_test: {
                name: group.name,
                policies,
                interval: Number(group.options?.interval) || 600,
                tolerance: Number(group.options?.tolerance) || 100,
                timeout: Number(group.options?.timeout) || 5
            }
        };
    }

    if (type === 'fallback') {
        return {
            fallback: {
                name: group.name,
                policies,
                interval: Number(group.options?.interval) || 600,
                timeout: Number(group.options?.timeout) || 5
            }
        };
    }

    if (type === 'load-balance') {
        return {
            load_balance: {
                name: group.name,
                policies
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

    const supported = new Set(['domain', 'domain_keyword', 'domain_suffix', 'domain_regex', 'domain_wildcard', 'geoip', 'ip_cidr', 'ip_cidr6', 'asn', 'url_regex', 'dest_port', 'protocol']);
    if (!supported.has(type)) return null;

    return {
        [type]: {
            match: value,
            policy,
            ...(rule.noResolve ? { no_resolve: true } : {})
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
        auto_update: normalizedModel.settings.managedConfigUrl
            ? {
                url: normalizedModel.settings.managedConfigUrl,
                interval: normalizedModel.settings.interval || 86400
            }
            : undefined,
        proxies,
        policy_groups: policyGroups,
        rules
    };

    return yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
    });
}
