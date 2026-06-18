const SUBLINK_WORKER_RULE_SOURCE = 'https://github.com/7Sageer/sublink-worker';
const SUBLINK_WORKER_RULE_BASE_URL = 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo';

const SUBLINK_WORKER_RULES = [
    { source: 'Ad Block', label: '🛑 广告拦截', site: ['category-ads-all'] },
    { source: 'AI Services', label: '🤖 AI 服务', site: ['category-ai-!cn'] },
    { source: 'Bilibili', label: '📺 哔哩哔哩', site: ['bilibili'] },
    { source: 'Youtube', label: '📹 油管视频', site: ['youtube'] },
    { source: 'Google', label: '🔎 谷歌服务', site: ['google'], ip: ['google'] },
    { source: 'Private', label: '🎯 全球直连', ip: ['private'] },
    { source: 'Location:CN', label: '🎯 全球直连', site: ['geolocation-cn', 'cn'], ip: ['cn'] },
    { source: 'Telegram', label: '📲 电报消息', ip: ['telegram'] },
    { source: 'Github', label: '💻 代码托管', site: ['github', 'gitlab'] },
    { source: 'Microsoft', label: 'Ⓜ️ 微软服务', site: ['microsoft'] },
    { source: 'Apple', label: '🍎 苹果服务', site: ['apple'] },
    { source: 'Social Media', label: '🌐 社交媒体', site: ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin'] },
    { source: 'Streaming', label: '🎬 流媒体', site: ['netflix', 'hulu', 'disney', 'hbo', 'amazon', 'bahamut'] },
    { source: 'Gaming', label: '🎮 游戏平台', site: ['steam', 'epicgames', 'ea', 'ubisoft', 'blizzard'] },
    { source: 'Education', label: '🎓 学术教育', site: ['coursera', 'edx', 'udemy', 'khanacademy', 'category-scholar-!cn'] },
    { source: 'Financial', label: '💳 金融服务', site: ['paypal', 'visa', 'mastercard', 'stripe', 'wise'] },
    { source: 'Cloud Services', label: '☁️ 云服务', site: ['aws', 'azure', 'digitalocean', 'heroku', 'dropbox'] },
    { source: 'Non-China', label: '🌍 国外网站', site: ['geolocation-!cn'] }
];

const SUBLINK_WORKER_PRESET_RULES = {
    // Mirrors 7Sageer/sublink-worker src/config/rules.js PREDEFINED_RULE_SETS.
    minimal: ['Location:CN', 'Private', 'Non-China'],
    balanced: ['Location:CN', 'Private', 'Non-China', 'Github', 'Google', 'Youtube', 'AI Services', 'Telegram'],
    comprehensive: SUBLINK_WORKER_RULES.map(rule => rule.source)
};

const SUBLINK_WORKER_PRESET_LABELS = {
    minimal: '最小化',
    balanced: '均衡',
    comprehensive: '全面'
};

const SUBLINK_WORKER_GROUP_LINES = {
    '🛑 广告拦截': 'custom_proxy_group=🛑 广告拦截`select`[]REJECT`[]DIRECT',
    '🤖 AI 服务': 'custom_proxy_group=🤖 AI 服务`select`[]🚀 节点选择`[]🔯 故障转移`[]♻️ 自动选择`[]☑️ 手动切换',
    '📺 哔哩哔哩': 'custom_proxy_group=📺 哔哩哔哩`select`[]DIRECT`[]🚀 节点选择',
    '📹 油管视频': 'custom_proxy_group=📹 油管视频`select`[]🚀 节点选择`[]♻️ 自动选择`[]DIRECT',
    '🔎 谷歌服务': 'custom_proxy_group=🔎 谷歌服务`select`[]🚀 节点选择`[]♻️ 自动选择`[]☑️ 手动切换',
    '📲 电报消息': 'custom_proxy_group=📲 电报消息`select`[]🚀 节点选择`[]🔯 故障转移`[]DIRECT',
    '💻 代码托管': 'custom_proxy_group=💻 代码托管`select`[]🚀 节点选择`[]♻️ 自动选择`[]DIRECT',
    'Ⓜ️ 微软服务': 'custom_proxy_group=Ⓜ️ 微软服务`select`[]DIRECT`[]🚀 节点选择',
    '🍎 苹果服务': 'custom_proxy_group=🍎 苹果服务`select`[]DIRECT`[]🚀 节点选择',
    '🌐 社交媒体': 'custom_proxy_group=🌐 社交媒体`select`[]🚀 节点选择`[]♻️ 自动选择',
    '🎬 流媒体': 'custom_proxy_group=🎬 流媒体`select`[]🚀 节点选择`[]♻️ 自动选择`[]DIRECT',
    '🎮 游戏平台': 'custom_proxy_group=🎮 游戏平台`select`[]🚀 节点选择`[]DIRECT',
    '🎓 学术教育': 'custom_proxy_group=🎓 学术教育`select`[]🚀 节点选择`[]DIRECT',
    '💳 金融服务': 'custom_proxy_group=💳 金融服务`select`[]🚀 节点选择`[]DIRECT',
    '☁️ 云服务': 'custom_proxy_group=☁️ 云服务`select`[]🚀 节点选择`[]DIRECT',
    '🌍 国外网站': 'custom_proxy_group=🌍 国外网站`select`[]🚀 节点选择`[]♻️ 自动选择',
    '🎯 全球直连': 'custom_proxy_group=🎯 全球直连`select`[]DIRECT'
};

function sublinkWorkerRuleUrl(kind, name) {
    return `${SUBLINK_WORKER_RULE_BASE_URL}/${kind}/${name}.srs`;
}

function getSublinkWorkerSelectedRules(presetKey) {
    const selectedSources = new Set(SUBLINK_WORKER_PRESET_RULES[presetKey] || []);
    return SUBLINK_WORKER_RULES.filter(rule => selectedSources.has(rule.source));
}

function buildSublinkWorkerTemplate(presetKey) {
    const selectedRules = getSublinkWorkerSelectedRules(presetKey);
    const selectedLabels = new Set(selectedRules.map(rule => rule.label));
    const rulesetLines = selectedRules.flatMap(rule => [
        ...(rule.site || []).map(name => `ruleset=${rule.label},${sublinkWorkerRuleUrl('geosite', name)}`),
        ...(rule.ip || []).map(name => `ruleset=${rule.label},${sublinkWorkerRuleUrl('geoip', name)}`)
    ]);
    const groupLines = Object.entries(SUBLINK_WORKER_GROUP_LINES)
        .filter(([label]) => selectedLabels.has(label))
        .map(([, line]) => line);

    return [
        '[custom]',
        `; Source: ${SUBLINK_WORKER_RULE_SOURCE} (MIT), src/config/rules.js PREDEFINED_RULE_SETS.${presetKey}`,
        ...rulesetLines,
        'ruleset=🐟 漏网之鱼,[]FINAL',
        '',
        'custom_proxy_group=🚀 节点选择`select`[]♻️ 自动选择`[]🔯 故障转移`[]<%regionStrategyChain%>`[]☑️ 手动切换`[]DIRECT',
        'custom_proxy_group=☑️ 手动切换`select`.*',
        'custom_proxy_group=♻️ 自动选择`url-test`.*`http://www.gstatic.com/generate_204`300,,50',
        'custom_proxy_group=🔯 故障转移`fallback`.*`http://www.gstatic.com/generate_204`300,,50',
        ...groupLines,
        'custom_proxy_group=🐟 漏网之鱼`select`[]🚀 节点选择`[]DIRECT',
        '',
        'enable_rule_generator=true',
        'overwrite_original_rules=true'
    ].join('\n');
}

function buildSublinkWorkerTemplateEntry(presetKey) {
    const label = SUBLINK_WORKER_PRESET_LABELS[presetKey];
    return {
        id: `clash_sublink_worker_${presetKey}`,
        name: `Sublink Worker ${label}分流`,
        target: 'clash',
        format: 'ini',
        description: `提取自 7Sageer/sublink-worker 的 ${presetKey} 预设规则集，使用 MetaCubeX geosite/geoip SRS 规则源；Clash 输出时自动转为 MetaCubeX YAML providers。`,
        content: buildSublinkWorkerTemplate(presetKey)
    };
}

export const BUILTIN_TEMPLATE_REGISTRY = {
    clash_misub_minimal: {
        id: 'clash_misub_minimal',
        name: 'MiSub 极简默认分流',
        target: 'clash',
        format: 'ini',
        description: '更偏日常使用的极简模板，仅保留主选择、自动选择、常用媒体与兜底分组，适合作为统一模板主线默认配置。',
        content: `[custom]
ruleset=🎬 流媒体,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list
ruleset=📲 电报消息,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list
ruleset=🎯 全球直连,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list
ruleset=🎯 全球直连,[]GEOIP,CN
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]🔯 故障转移\`[]<%regionStrategyChain%>\`[]☑️ 手动切换\`[]DIRECT
custom_proxy_group=♻️ 自动选择\`url-test\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=🔯 故障转移\`fallback\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=☑️ 手动切换\`select\`.*
custom_proxy_group=🎬 流媒体\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=📲 电报消息\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=🎯 全球直连\`select\`[]DIRECT\`[]🚀 节点选择
custom_proxy_group=🐟 漏网之鱼\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT

enable_rule_generator=true
overwrite_original_rules=true`
    },
    clash_acl4ssr_lite: {
        id: 'clash_acl4ssr_lite',
        name: 'ACL4SSR 精简分流',
        target: 'clash',
        format: 'ini',
        description: '内置精简 ACL4SSR 分流模板，保留常用分组和核心规则，适合作为轻量默认预设。',
        content: `[custom]
ruleset=🎯 全球直连,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list
ruleset=🛑 广告拦截,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list
ruleset=📲 电报消息,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list
ruleset=📹 油管视频,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list
ruleset=🎥 奈飞视频,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Netflix.list
ruleset=🚀 节点选择,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list
ruleset=🎯 全球直连,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list
ruleset=🎯 全球直连,[]GEOIP,CN
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]<%regionStrategyChain%>\`[]☑️ 手动切换\`[]DIRECT
custom_proxy_group=☑️ 手动切换\`select\`.*
custom_proxy_group=♻️ 自动选择\`url-test\`[]<%regionStrategyChain%>\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=📲 电报消息\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=📹 油管视频\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=🎥 奈飞视频\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=🎯 全球直连\`select\`[]DIRECT\`[]🚀 节点选择
custom_proxy_group=🛑 广告拦截\`select\`[]REJECT\`[]DIRECT
custom_proxy_group=🐟 漏网之鱼\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=🇭🇰 香港节点\`url-test\`(港|HK|Hong Kong|HKG)\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=🇯🇵 日本节点\`url-test\`(日本|JP|Japan|Tokyo|NRT|KIX)\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=🇺🇸 美国节点\`url-test\`(美|US|United States|LAX|SJC|SEA)\`http://www.gstatic.com/generate_204\`300,,100

enable_rule_generator=true
overwrite_original_rules=true`
    },
    clash_misub_media_ai: {
        id: 'clash_misub_media_ai',
        name: 'MiSub 流媒体与 AI 分流',
        target: 'clash',
        format: 'ini',
        description: '面向常见流媒体和 AI 服务场景的内置模板，保留自动选择、地区组和核心服务分流。',
        content: `[custom]
ruleset=🤖 AI 服务,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list
ruleset=🤖 AI 服务,https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/Claude.list
ruleset=📹 油管视频,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list
ruleset=🎥 奈飞视频,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Netflix.list
ruleset=📲 电报消息,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list
ruleset=🎯 全球直连,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list
ruleset=🎯 全球直连,[]GEOIP,CN
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]<%regionStrategyChain%>\`[]☑️ 手动切换\`[]DIRECT
custom_proxy_group=♻️ 自动选择\`url-test\`[]<%regionStrategyChain%>\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=☑️ 手动切换\`select\`.*
custom_proxy_group=🤖 AI 服务\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]🇺🇸 美国节点\`[]🇯🇵 日本节点
custom_proxy_group=📹 油管视频\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=🎥 奈飞视频\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=📲 电报消息\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=🎯 全球直连\`select\`[]DIRECT\`[]🚀 节点选择
custom_proxy_group=🐟 漏网之鱼\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT

enable_rule_generator=true
overwrite_original_rules=true`
    },
    clash_acl4ssr_full: {
        id: 'clash_acl4ssr_full',
        name: 'ACL4SSR 完整分流',
        target: 'clash',
        format: 'ini',
        description: '内置完整 ACL4SSR 分流模板，适合作为 Clash 系列的高完整度规则预设。',
        content: `[custom]
ruleset=🎯 全球直连,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list
ruleset=🛑 广告拦截,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list
ruleset=📲 电报消息,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list
ruleset=🤖 AI 服务,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list
ruleset=📹 油管视频,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list
ruleset=🎥 奈飞视频,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Netflix.list
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Steam.list
ruleset=🚀 节点选择,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list
ruleset=🎯 全球直连,[]GEOIP,CN
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]🔯 故障转移\`[]<%regionStrategyChain%>\`[]☑️ 手动切换\`[]DIRECT
custom_proxy_group=☑️ 手动切换\`select\`.*
custom_proxy_group=♻️ 自动选择\`url-test\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=🔯 故障转移\`fallback\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=🤖 AI 服务\`select\`[]🚀 节点选择\`[]🔯 故障转移\`[]🇺🇸 美国节点\`[]🌍 狮城节点
custom_proxy_group=📲 电报消息\`select\`[]🚀 节点选择\`[]🇸🇬 狮城节点\`[]🇭🇰 香港节点
custom_proxy_group=📹 油管视频\`select\`[]🚀 节点选择\`[]♻️ 自动选择
custom_proxy_group=🎥 奈飞视频\`select\`[]🚀 节点选择\`[]♻️ 自动选择
custom_proxy_group=🎮 游戏平台\`select\`[]🚀 节点选择\`[]DIRECT
custom_proxy_group=🎯 全球直连\`select\`[]DIRECT
custom_proxy_group=🛑 广告拦截\`select\`[]REJECT\`[]DIRECT
custom_proxy_group=🐟 漏网之鱼\`select\`[]🚀 节点选择\`[]DIRECT

enable_rule_generator=true
overwrite_original_rules=true`
    },
    clash_sublink_worker_minimal: buildSublinkWorkerTemplateEntry('minimal'),
    clash_sublink_worker_balanced: buildSublinkWorkerTemplateEntry('balanced'),
    clash_sublink_worker_comprehensive: buildSublinkWorkerTemplateEntry('comprehensive'),
    clash_exclusive_ai: {
        id: 'clash_exclusive_ai',
        name: 'MiSub 深度 AI 开发者模板',
        target: 'clash',
        format: 'ini',
        description: '专为 AI 开发者优化，强化 OpenAI/Claude 路由，增加固定节点漂移保护与纯净度检测引导。',
        content: `[custom]
ruleset=🤖 AI 核心服务,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list
ruleset=🤖 AI 核心服务,https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/Claude.list
ruleset=🌍 国外媒体,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list
ruleset=🎯 全球直连,[]GEOIP,CN
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]🔯 故障转移\`[]🇺🇲 美国节点\`[]🇸🇬 狮城节点\`[]☑️ 手动切换\`[]DIRECT
custom_proxy_group=♻️ 自动选择\`url-test\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=🔯 故障转移\`fallback\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=☑️ 手动切换\`select\`.*
custom_proxy_group=🤖 AI 核心服务\`select\`[]🔯 故障转移\`[]🇺🇲 美国节点\`[]🇸🇬 狮城节点\`[]🚀 节点选择
custom_proxy_group=🌍 国外媒体\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT

enable_rule_generator=true
overwrite_original_rules=true`
    },
    clash_game_optimized: {
        id: 'clash_game_optimized',
        name: 'MiSub 游戏加速竞技模板',
        target: 'clash',
        format: 'ini',
        description: '强化各平台游戏规则（Steam, Epic, Sony 等），优先选择低延迟线路。',
        content: `[custom]
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Steam.list
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Epic.list
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Sony.list
ruleset=🚀 节点选择,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list
ruleset=🎯 全球直连,[]GEOIP,CN
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]🎮 游戏平台\`[]☑️ 手动切换
custom_proxy_group=🎮 游戏平台\`url-test\`.*\`http://www.gstatic.com/generate_204\`300,,20
custom_proxy_group=♻️ 自动选择\`url-test\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=☑️ 手动切换\`select\`.*

enable_rule_generator=true
overwrite_original_rules=true`
    }
};

export function getBuiltinTemplate(templateId) {
    return BUILTIN_TEMPLATE_REGISTRY[templateId] || null;
}
