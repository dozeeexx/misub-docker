const OFFICIAL_ACL4SSR_RAW_BASE = 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master';
const OFFICIAL_ACL4SSR_CONFIG_BASE = `${OFFICIAL_ACL4SSR_RAW_BASE}/Clash/config`;

export const OFFICIAL_ACL4SSR_FORBIDDEN_GROUP_LABELS = [
    '🇭🇰 香港节点',
    '🇹🇼 台湾节点',
    '🇨🇳 台湾节点',
    '🇯🇵 日本节点',
    '🇸🇬 狮城节点',
    '🌍 狮城节点',
    '🇺🇸 美国节点',
    '🇺🇲 美国节点',
    '🇰🇷 韩国节点',
    '🇬🇧 英国节点'
];

export const OFFICIAL_ACL4SSR_FLAT_PRESETS = [
    {
        id: 201,
        file: 'ACL4SSR.ini',
        label: '基础版',
        description: 'ACL4SSR 官方基础配置，不含国家/地区节点分组。'
    },
    {
        id: 202,
        file: 'ACL4SSR_AdblockPlus.ini',
        label: '基础版 + AdblockPlus',
        description: 'ACL4SSR 官方基础广告增强配置，不含国家/地区节点分组。'
    },
    {
        id: 203,
        file: 'ACL4SSR_BackCN.ini',
        label: '回国优化版',
        description: 'ACL4SSR 官方回国/国内访问优化配置，不含国家/地区节点分组。'
    },
    {
        id: 204,
        file: 'ACL4SSR_Mini.ini',
        label: 'Mini 精简版',
        description: 'ACL4SSR 官方 Mini 精简配置，不含国家/地区节点分组。'
    },
    {
        id: 205,
        file: 'ACL4SSR_Mini_Fallback.ini',
        label: 'Mini 故障转移版',
        description: 'ACL4SSR 官方 Mini Fallback 配置，不含国家/地区节点分组。'
    },
    {
        id: 206,
        file: 'ACL4SSR_Mini_MultiMode.ini',
        label: 'Mini 多模式版',
        description: 'ACL4SSR 官方 Mini 多模式配置，不含国家/地区节点分组。'
    },
    {
        id: 207,
        file: 'ACL4SSR_Mini_NoAuto.ini',
        label: 'Mini 无自动测速版',
        description: 'ACL4SSR 官方 Mini NoAuto 配置，不含国家/地区节点分组。'
    },
    {
        id: 208,
        file: 'ACL4SSR_NoApple.ini',
        label: '无 Apple 分流版',
        description: 'ACL4SSR 官方 NoApple 配置，不含国家/地区节点分组。'
    },
    {
        id: 209,
        file: 'ACL4SSR_NoAuto.ini',
        label: '无自动测速版',
        description: 'ACL4SSR 官方 NoAuto 配置，不含国家/地区节点分组。'
    },
    {
        id: 210,
        file: 'ACL4SSR_NoAuto_NoApple.ini',
        label: '无自动测速 + 无 Apple 版',
        description: 'ACL4SSR 官方 NoAuto NoApple 配置，不含国家/地区节点分组。'
    },
    {
        id: 211,
        file: 'ACL4SSR_NoAuto_NoApple_NoMicrosoft.ini',
        label: '无自动测速 + 无 Apple/Microsoft 版',
        description: 'ACL4SSR 官方 NoAuto NoApple NoMicrosoft 配置，不含国家/地区节点分组。'
    },
    {
        id: 212,
        file: 'ACL4SSR_NoMicrosoft.ini',
        label: '无 Microsoft 分流版',
        description: 'ACL4SSR 官方 NoMicrosoft 配置，不含国家/地区节点分组。'
    },
    {
        id: 213,
        file: 'ACL4SSR_Online.ini',
        label: 'Online 默认版',
        description: 'ACL4SSR 官方 Online 默认配置，不含国家/地区节点分组。'
    },
    {
        id: 214,
        file: 'ACL4SSR_Online_AdblockPlus.ini',
        label: 'Online + AdblockPlus',
        description: 'ACL4SSR 官方 Online 广告增强配置，不含国家/地区节点分组。'
    },
    {
        id: 215,
        file: 'ACL4SSR_Online_Mini.ini',
        label: 'Online Mini 精简版',
        description: 'ACL4SSR 官方 Online Mini 配置，不含国家/地区节点分组。'
    },
    {
        id: 216,
        file: 'ACL4SSR_Online_Mini_AdblockPlus.ini',
        label: 'Online Mini + AdblockPlus',
        description: 'ACL4SSR 官方 Online Mini 广告增强配置，不含国家/地区节点分组。'
    },
    {
        id: 217,
        file: 'ACL4SSR_Online_Mini_Ai.ini',
        label: 'Online Mini AI 版',
        description: 'ACL4SSR 官方 Online Mini AI 配置，不含国家/地区节点分组。'
    },
    {
        id: 218,
        file: 'ACL4SSR_Online_Mini_Fallback.ini',
        label: 'Online Mini 故障转移版',
        description: 'ACL4SSR 官方 Online Mini Fallback 配置，不含国家/地区节点分组。'
    },
    {
        id: 219,
        file: 'ACL4SSR_Online_Mini_MultiMode.ini',
        label: 'Online Mini 多模式版',
        description: 'ACL4SSR 官方 Online Mini 多模式配置，不含国家/地区节点分组。'
    },
    {
        id: 220,
        file: 'ACL4SSR_Online_Mini_NoAuto.ini',
        label: 'Online Mini 无自动测速版',
        description: 'ACL4SSR 官方 Online Mini NoAuto 配置，不含国家/地区节点分组。'
    },
    {
        id: 221,
        file: 'ACL4SSR_Online_NoAuto.ini',
        label: 'Online 无自动测速版',
        description: 'ACL4SSR 官方 Online NoAuto 配置，不含国家/地区节点分组。'
    },
    {
        id: 222,
        file: 'ACL4SSR_Online_NoReject.ini',
        label: 'Online 无 Reject 版',
        description: 'ACL4SSR 官方 Online NoReject 配置，不含国家/地区节点分组。'
    },
    {
        id: 223,
        file: 'ACL4SSR_WithChinaIp.ini',
        label: '包含 ChinaIP 版',
        description: 'ACL4SSR 官方 WithChinaIp 配置，不含国家/地区节点分组。'
    },
    {
        id: 224,
        file: 'ACL4SSR_WithChinaIp_WithGFW.ini',
        label: '包含 ChinaIP + GFW 版',
        description: 'ACL4SSR 官方 WithChinaIp WithGFW 配置，不含国家/地区节点分组。'
    },
    {
        id: 225,
        file: 'ACL4SSR_WithGFW.ini',
        label: '包含 GFW 版',
        description: 'ACL4SSR 官方 WithGFW 配置，不含国家/地区节点分组。'
    }
].map(preset => ({
    ...preset,
    url: `${OFFICIAL_ACL4SSR_CONFIG_BASE}/${preset.file}`
}));

export const OFFICIAL_ACL4SSR_FLAT_PRESET_URLS = OFFICIAL_ACL4SSR_FLAT_PRESETS.map(preset => preset.url);

const OFFICIAL_ACL4SSR_FLAT_PRESET_URL_SET = new Set(OFFICIAL_ACL4SSR_FLAT_PRESET_URLS);
const OFFICIAL_ACL4SSR_FLAT_PRESET_FILE_SET = new Set(OFFICIAL_ACL4SSR_FLAT_PRESETS.map(preset => preset.file));

export const OFFICIAL_ACL4SSR_FLAT_PRESET_ASSETS = OFFICIAL_ACL4SSR_FLAT_PRESETS.map(preset => ({
    id: preset.id,
    name: `ACL4SSR 官方无国家分组 - ${preset.label}`,
    url: preset.url,
    group: 'ACL4SSR Official Flat',
    is_default: false,
    sourceType: 'preset',
    recommendedFor: ['clash'],
    compatibleClients: ['clash', 'mihomo', 'clash-meta'],
    strategy: 'official-flat',
    description: `${preset.description}Docker 自托管会定时拉取缓存该官方配置；相对 rules/ACL4SSR 路径会规范化为官方 raw 规则 URL。`
}));

function officialAcl4ssrConfigFileName(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return '';
        if (parsed.hostname.toLowerCase() !== 'raw.githubusercontent.com') return '';
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length !== 6) return '';
        const [owner, repo, branch, directory, subdirectory, fileName] = parts;
        if (owner !== 'ACL4SSR' || repo !== 'ACL4SSR' || branch !== 'master') return '';
        if (directory !== 'Clash' || subdirectory !== 'config') return '';
        return fileName || '';
    } catch {
        return '';
    }
}

export function isOfficialAcl4ssrConfigUrl(url) {
    return Boolean(officialAcl4ssrConfigFileName(url));
}

export function isOfficialAcl4ssrFlatPresetUrl(url) {
    return OFFICIAL_ACL4SSR_FLAT_PRESET_URL_SET.has(String(url || ''))
        || OFFICIAL_ACL4SSR_FLAT_PRESET_FILE_SET.has(officialAcl4ssrConfigFileName(url));
}

export function normalizeOfficialAcl4ssrTemplateText(templateUrl, templateText) {
    const text = String(templateText || '');
    if (!isOfficialAcl4ssrConfigUrl(templateUrl)) return text;

    return text.replace(
        /((?:clash-classic:|surge:|quanx:|loon:|sing-box:|singbox:)?)rules\/ACL4SSR\/([^\s`,]+)/gi,
        (_match, prefix, relativePath) => `${prefix}${OFFICIAL_ACL4SSR_RAW_BASE}/${relativePath}`
    );
}

export function extractOfficialAcl4ssrRulesetSources(templateUrl, templateText) {
    const normalized = normalizeOfficialAcl4ssrTemplateText(templateUrl, templateText);
    const sources = [];

    for (const rawLine of normalized.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!/^ruleset=/i.test(line) || !line.includes(',')) continue;
        let source = line.replace(/^ruleset=/i, '').split(',').slice(1).join(',').trim();
        source = source.replace(/^(clash-classic|surge|quanx|loon|sing-box|singbox):/i, '');
        if (source.startsWith('[]')) continue;
        if (source) sources.push(source);
    }

    return Array.from(new Set(sources));
}

export function validateOfficialAcl4ssrFlatTemplate(templateUrl, templateText) {
    const normalized = normalizeOfficialAcl4ssrTemplateText(templateUrl, templateText);
    const errors = [];

    if (!isOfficialAcl4ssrFlatPresetUrl(templateUrl)) {
        errors.push(`not an allowlisted official ACL4SSR flat preset URL: ${templateUrl}`);
    }

    for (const label of OFFICIAL_ACL4SSR_FORBIDDEN_GROUP_LABELS) {
        if (normalized.includes(label)) {
            errors.push(`contains forbidden country/region group label: ${label}`);
        }
    }

    if (/rules\/ACL4SSR\//i.test(normalized)) {
        errors.push('contains unnormalized relative rules/ACL4SSR path');
    }

    const lines = normalized.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const groupLines = lines.filter(line => /^custom_proxy_group=/i.test(line));
    const ruleLines = lines.filter(line => /^ruleset=/i.test(line));

    if (groupLines.length === 0) {
        errors.push('contains no custom_proxy_group entries');
    }
    if (ruleLines.length === 0) {
        errors.push('contains no ruleset entries');
    }

    for (const line of groupLines) {
        if (OFFICIAL_ACL4SSR_FORBIDDEN_GROUP_LABELS.some(label => line.includes(label))) {
            errors.push(`country/region group appears in custom_proxy_group line: ${line}`);
        }
    }

    return {
        ok: errors.length === 0,
        errors,
        normalizedText: normalized,
        rulesetSources: extractOfficialAcl4ssrRulesetSources(templateUrl, normalized)
    };
}
