/**
 * 节点统一转换管道
 * 支持：正则重命名、模板重命名、智能去重、排序
 */

import { extractNodeRegion, getRegionEmoji } from '../modules/utils/geo-utils.js';

// ============ 工具函数 ============

function safeDecodeURI(value) {
    try { return decodeURIComponent(value); }
    catch { return value; }
}

function normalizeBase64(input) {
    let s = String(input || '').trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!s) return '';
    while (s.length % 4 !== 0) s += '=';
    return s;
}

function getSchemePayload(url, prefixLen) {
    const rest = String(url || '').slice(prefixLen);
    const cut = rest.search(/[?#]/);
    return (cut === -1 ? rest : rest.slice(0, cut)).trim();
}

function splitSchemeQueryAndFragment(url, prefixLen) {
    const rest = String(url || '').slice(prefixLen);
    const hashIdx = rest.indexOf('#');
    const queryIdx = rest.indexOf('?');
    const queryActive = queryIdx !== -1 && (hashIdx === -1 || queryIdx < hashIdx);
    let payloadEnd = -1;
    if (hashIdx !== -1) payloadEnd = hashIdx;
    if (queryActive) payloadEnd = payloadEnd === -1 ? queryIdx : Math.min(payloadEnd, queryIdx);
    const payload = (payloadEnd === -1 ? rest : rest.slice(0, payloadEnd)).trim();
    const query = queryActive ? rest.slice(queryIdx, hashIdx === -1 ? undefined : hashIdx) : '';
    return { payload, query, hasFragment: hashIdx !== -1 };
}

function base64Decode(base64) {
    const binary = atob(normalizeBase64(base64));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
}

function base64Encode(text) {
    const bytes = new TextEncoder().encode(String(text));
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function getProtocol(url) {
    const m = String(url || '').match(/^([a-zA-Z0-9+.-]+):\/\//);
    return m ? m[1].toLowerCase() : 'unknown';
}

function getFragment(url) {
    const idx = String(url || '').lastIndexOf('#');
    if (idx === -1) return '';
    return safeDecodeURI(url.slice(idx + 1)).trim();
}

function setFragment(url, name) {
    const s = String(url || '');
    const idx = s.lastIndexOf('#');
    const base = idx === -1 ? s : s.slice(0, idx);
    return `${base}#${encodeURIComponent(String(name || ''))}`;
}

function parseHostPort(hostPort) {
    const s = String(hostPort || '').trim();
    if (!s) return { server: '', port: '' };
    if (s.startsWith('[') && s.includes(']')) {
        const end = s.indexOf(']');
        const host = s.slice(1, end);
        const rest = s.slice(end + 1);
        return { server: host, port: rest.startsWith(':') ? rest.slice(1) : '' };
    }
    const lastColon = s.lastIndexOf(':');
    if (lastColon === -1) return { server: s, port: '' };
    const host = s.slice(0, lastColon);
    if (host.includes(':')) return { server: s, port: '' };
    return { server: host, port: s.slice(lastColon + 1) };
}

// ============ 节点解析 ============

function parseSsrServerPort(decoded) {
    const s = String(decoded || '');
    const m1 = s.match(/^\[([^\]]+)\]:(\d+):/);
    if (m1) return { server: m1[1], port: m1[2] };
    const m2 = s.match(/^(.+):(\d+):/);
    if (!m2) return { server: '', port: '' };
    return { server: m2[1], port: m2[2] };
}

function extractSsrRemarks(decoded) {
    const s = String(decoded || '');
    const slashQ = s.indexOf('/?');
    const q = slashQ !== -1 ? slashQ + 2 : (s.indexOf('?') !== -1 ? s.indexOf('?') + 1 : -1);
    if (q === -1) return '';
    const params = s.slice(q);
    const m = params.match(/(?:^|&)remarks=([^&]*)/);
    if (!m) return '';
    const raw = safeDecodeURI(m[1]).replace(/\s+/g, '');
    try { return base64Decode(raw).trim(); } catch { return ''; }
}

function extractServerPort(url, protocol) {
    const proto = protocol || getProtocol(url);

    if (proto === 'vmess') {
        try {
            const payload = getSchemePayload(url, 8);
            const obj = JSON.parse(base64Decode(payload));
            return { server: String(obj.add || ''), port: String(obj.port || '') };
        } catch { return { server: '', port: '' }; }
    }

    if (proto === 'ssr') {
        try {
            const payload = getSchemePayload(url, 6);
            const decoded = base64Decode(payload);
            return parseSsrServerPort(decoded);
        } catch { return { server: '', port: '' }; }
    }

    try {
        const parsed = new URL(url);
        if (parsed.hostname) {
            if (!(proto === 'ss' && !parsed.port && !parsed.username && !url.includes('@'))) {
                return { server: parsed.hostname, port: parsed.port || '' };
            }
        }
    } catch {}

    try {
        const main = url.split('#')[0];
        const protocolEnd = main.indexOf('://');
        if (protocolEnd === -1) return { server: '', port: '' };
        let rest = main.slice(protocolEnd + 3).split('?')[0].split('/')[0];

        if (proto === 'ss' && !rest.includes('@')) {
            try {
                const decoded = base64Decode(rest);
                if (decoded.includes('@')) rest = decoded;
            } catch {}
        }

        const at = rest.lastIndexOf('@');
        return parseHostPort(at === -1 ? rest : rest.slice(at + 1));
    } catch { return { server: '', port: '' }; }
}

function getNodeName(url, protocol) {
    const proto = protocol || getProtocol(url);
    const fragmentName = getFragment(url);
    if (fragmentName) return fragmentName;

    if (proto === 'vmess') {
        try {
            const payload = getSchemePayload(url, 8);
            const obj = JSON.parse(base64Decode(payload));
            return String(obj.ps || '').trim();
        } catch { return ''; }
    }
    if (proto === 'ssr') {
        try {
            const payload = getSchemePayload(url, 6);
            const decoded = base64Decode(payload);
            return extractSsrRemarks(decoded);
        } catch { return ''; }
    }
    return '';
}

function setNodeName(url, protocol, name) {
    const proto = protocol || getProtocol(url);

    if (proto === 'vmess') {
        try {
            const { payload, query, hasFragment } = splitSchemeQueryAndFragment(url, 8);
            const obj = JSON.parse(base64Decode(payload));
            obj.ps = String(name || '');
            const rebuilt = `vmess://${base64Encode(JSON.stringify(obj))}${query}`;
            return hasFragment ? setFragment(rebuilt, name) : rebuilt;
        } catch { return setFragment(url, name); }
    }
    return setFragment(url, name);
}

function stripLeadingEmoji(name) {
    return String(name || '').replace(/^[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]\s*/g, '').trim();
}

// ============ 配置标准化 ============

function normalizeConfig(cfg) {
    const config = cfg && typeof cfg === 'object' ? cfg : {};
    const rename = config.rename || {};
    const regex = rename.regex || {};
    const template = rename.template || {};
    const dedup = config.dedup || {};
    const sort = config.sort || {};

    return {
        enabled: Boolean(config.enabled),
        rename: {
            regex: {
                enabled: Boolean(regex.enabled),
                rules: Array.isArray(regex.rules) ? regex.rules : []
            },
            template: {
                enabled: Boolean(template.enabled),
                template: template.template || '{emoji}{region}-{protocol}-{index}',
                indexStart: Number.isFinite(template.indexStart) ? template.indexStart : 1,
                indexPad: Number.isFinite(template.indexPad) ? template.indexPad : 0,
                indexScope: template.indexScope || 'global',
                regionAlias: template.regionAlias || {},
                protocolAlias: template.protocolAlias || {}
            }
        },
        dedup: {
            enabled: Boolean(dedup.enabled),
            mode: dedup.mode === 'url' ? 'url' : 'serverPort',
            includeProtocol: Boolean(dedup.includeProtocol),
            prefer: {
                protocolOrder: Array.isArray(dedup.prefer?.protocolOrder)
                    ? dedup.prefer.protocolOrder.map(s => String(s).toLowerCase())
                    : []
            }
        },
        sort: {
            enabled: Boolean(sort.enabled),
            nameIgnoreEmoji: sort.nameIgnoreEmoji !== false,
            keys: Array.isArray(sort.keys) ? sort.keys : []
        }
    };
}

// ============ 转换函数 ============

function applyRegexRename(name, rules) {
    let result = String(name || '');
    for (const rule of rules) {
        if (!rule?.pattern) continue;
        try {
            const re = new RegExp(rule.pattern, rule.flags || 'g');
            result = result.replace(re, rule.replacement || '');
        } catch {}
    }
    return result.trim();
}

function makeDedupKey(record, cfg) {
    const server = String(record.server || '').trim().toLowerCase();
    const port = String(record.port || '').trim();
    if (!server || !port) return '';
    const base = `${server}:${port}`;
    return cfg.dedup.includeProtocol ? `${record.protocol}|${base}` : base;
}

function choosePreferred(existing, candidate, protocolOrder) {
    if (!existing) return candidate;
    if (!protocolOrder?.length) return existing;
    const rank = p => {
        const idx = protocolOrder.indexOf(String(p || '').toLowerCase());
        return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    return rank(candidate.protocol) < rank(existing.protocol) ? candidate : existing;
}

function renderTemplate(template, vars) {
    return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
        const v = vars[key];
        return v == null ? '' : String(v);
    }).trim();
}

function padIndex(n, width) {
    return width > 0 ? String(n).padStart(width, '0') : String(n);
}

function getIndexGroupKey(record, scope) {
    switch (scope) {
        case 'region': return `r:${record.region}`;
        case 'protocol': return `p:${record.protocol}`;
        case 'regionProtocol': return `rp:${record.region}|${record.protocol}`;
        default: return 'global';
    }
}

function makeComparator(sortCfg) {
    const keys = sortCfg.keys || [];
    const nameIgnoreEmoji = sortCfg.nameIgnoreEmoji !== false;

    const cmpStr = (a, b) => String(a || '').localeCompare(String(b || ''));
    const cmpNum = (a, b) => {
        const an = Number(a), bn = Number(b);
        if (Number.isNaN(an) && Number.isNaN(bn)) return 0;
        if (Number.isNaN(an)) return 1;
        if (Number.isNaN(bn)) return -1;
        return an - bn;
    };

    return (ra, rb) => {
        for (const k of keys) {
            if (!k?.key) continue;
            const key = String(k.key);
            const order = String(k.order || 'asc').toLowerCase() === 'desc' ? -1 : 1;
            const customOrder = k.customOrder;

            let va, vb;
            if (key === 'name') {
                va = nameIgnoreEmoji ? stripLeadingEmoji(ra.name) : ra.name;
                vb = nameIgnoreEmoji ? stripLeadingEmoji(rb.name) : rb.name;
                const r = cmpStr(va, vb);
                if (r !== 0) return r * order;
                continue;
            }
            if (key === 'port') {
                const r = cmpNum(ra.port, rb.port);
                if (r !== 0) return r * order;
                continue;
            }

            va = ra[key];
            vb = rb[key];

            if (Array.isArray(customOrder)) {
                const ia = customOrder.indexOf(String(va || ''));
                const ib = customOrder.indexOf(String(vb || ''));
                const raIdx = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
                const rbIdx = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
                if (raIdx !== rbIdx) return (raIdx - rbIdx) * order;
            }

            const r = cmpStr(va, vb);
            if (r !== 0) return r * order;
        }
        return 0;
    };
}

// ============ 主管道函数 ============

/**
 * 对节点 URL 列表应用统一转换管道
 * @param {string[]} nodeUrls - 节点 URL 数组
 * @param {Object} transformConfig - 转换配置
 * @returns {string[]} 处理后的节点 URL 数组
 */
export function applyNodeTransformPipeline(nodeUrls, transformConfig = {}) {
    const cfg = normalizeConfig(transformConfig);
    const input = Array.isArray(nodeUrls)
        ? nodeUrls.map(s => String(s || '').trim()).filter(Boolean)
        : [];

    if (!cfg.enabled) return input;

    // 解析为结构化记录
    let records = input.map(url => {
        const protocol = getProtocol(url);
        const name = getNodeName(url, protocol);
        const region = extractNodeRegion(name);
        const emoji = getRegionEmoji(region);
        const { server, port } = extractServerPort(url, protocol);
        return { url, protocol, name, originalName: name, region, emoji, server, port };
    });

    // Stage 1: 正则重命名
    if (cfg.rename.regex.enabled && cfg.rename.regex.rules.length > 0) {
        records = records.map(r => ({
            ...r,
            name: applyRegexRename(r.name, cfg.rename.regex.rules)
        }));
    }

    // Stage 2: 智能去重
    if (cfg.dedup.enabled) {
        if (cfg.dedup.mode === 'url') {
            const seen = new Set();
            records = records.filter(r => {
                if (seen.has(r.url)) return false;
                seen.add(r.url);
                return true;
            });
        } else {
            const map = new Map();
            for (const r of records) {
                const key = makeDedupKey(r, cfg);
                if (!key) {
                    map.set(`__raw__:${r.url}`, r);
                    continue;
                }
                map.set(key, choosePreferred(map.get(key), r, cfg.dedup.prefer.protocolOrder));
            }
            records = Array.from(map.values());
        }
    }

    // Stage 3: 模板重命名
    if (cfg.rename.template.enabled) {
        const groupBuckets = new Map();
        for (const r of records) {
            const gk = getIndexGroupKey(r, cfg.rename.template.indexScope);
            const arr = groupBuckets.get(gk) || [];
            arr.push(r);
            groupBuckets.set(gk, arr);
        }

        for (const arr of groupBuckets.values()) {
            arr.sort((a, b) => {
                const ak = `${a.server}:${a.port}|${a.protocol}|${a.name}`;
                const bk = `${b.server}:${b.port}|${b.protocol}|${b.name}`;
                return ak < bk ? -1 : ak > bk ? 1 : 0;
            });
        }

        const nextIndex = new Map();
        for (const [gk, arr] of groupBuckets.entries()) {
            nextIndex.set(gk, cfg.rename.template.indexStart);
            for (const r of arr) {
                const regionText = cfg.rename.template.regionAlias[r.region] || r.region;
                const protocolText = cfg.rename.template.protocolAlias[r.protocol] || r.protocol;
                const currentIndex = nextIndex.get(gk);
                nextIndex.set(gk, currentIndex + 1);

                const vars = {
                    emoji: r.emoji,
                    region: regionText,
                    protocol: protocolText,
                    index: padIndex(currentIndex, cfg.rename.template.indexPad),
                    name: r.name,
                    server: r.server,
                    port: r.port
                };
                const newName = renderTemplate(cfg.rename.template.template, vars);
                r.name = newName;
                r.url = setNodeName(r.url, r.protocol, newName);
            }
        }
    } else if (cfg.rename.regex.enabled && cfg.rename.regex.rules.length > 0) {
        // 仅正则时也要写回 URL
        records = records.map(r => ({
            ...r,
            url: r.name ? setNodeName(r.url, r.protocol, r.name) : r.url
        }));
    }

    // Stage 4: 排序
    if (cfg.sort.enabled && cfg.sort.keys.length > 0) {
        records.sort(makeComparator(cfg.sort));
    }

    return records.map(r => r.url);
}
