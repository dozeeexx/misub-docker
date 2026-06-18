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
     clash_sublink_worker_comprehensive: {
         id: 'clash_sublink_worker_comprehensive',
         name: 'Sublink Worker 综合分流',
         target: 'clash',
         format: 'ini',
         description: '提取自 7Sageer/sublink-worker 的 comprehensive 规则集，使用 MetaCubeX geosite/geoip SRS 规则源；Clash 输出时自动转为 MetaCubeX YAML providers。',
         content: `[custom]
; Source: https://github.com/7Sageer/sublink-worker (MIT), src/config/rules.js PREDEFINED_RULE_SETS.comprehensive
ruleset=🛑 广告拦截,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/category-ads-all.srs
ruleset=🤖 AI 服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/category-ai-!cn.srs
ruleset=📺 哔哩哔哩,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/bilibili.srs
ruleset=📹 油管视频,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/youtube.srs
ruleset=🔎 谷歌服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/google.srs
ruleset=🔎 谷歌服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/google.srs
ruleset=🎯 全球直连,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/private.srs
ruleset=🎯 全球直连,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/geolocation-cn.srs
ruleset=🎯 全球直连,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/cn.srs
ruleset=🎯 全球直连,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/cn.srs
ruleset=📲 电报消息,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/telegram.srs
ruleset=💻 代码托管,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/github.srs
ruleset=💻 代码托管,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/gitlab.srs
ruleset=Ⓜ️ 微软服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/microsoft.srs
ruleset=🍎 苹果服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/apple.srs
ruleset=🌐 社交媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/facebook.srs
ruleset=🌐 社交媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/instagram.srs
ruleset=🌐 社交媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/twitter.srs
ruleset=🌐 社交媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/tiktok.srs
ruleset=🌐 社交媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/linkedin.srs
ruleset=🎬 流媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/netflix.srs
ruleset=🎬 流媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/hulu.srs
ruleset=🎬 流媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/disney.srs
ruleset=🎬 流媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/hbo.srs
ruleset=🎬 流媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/amazon.srs
ruleset=🎬 流媒体,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/bahamut.srs
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/steam.srs
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/epicgames.srs
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/ea.srs
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/ubisoft.srs
ruleset=🎮 游戏平台,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/blizzard.srs
ruleset=🎓 学术教育,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/coursera.srs
ruleset=🎓 学术教育,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/edx.srs
ruleset=🎓 学术教育,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/udemy.srs
ruleset=🎓 学术教育,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/khanacademy.srs
ruleset=🎓 学术教育,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/category-scholar-!cn.srs
ruleset=💳 金融服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/paypal.srs
ruleset=💳 金融服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/visa.srs
ruleset=💳 金融服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/mastercard.srs
ruleset=💳 金融服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/stripe.srs
ruleset=💳 金融服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/wise.srs
ruleset=☁️ 云服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/aws.srs
ruleset=☁️ 云服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/azure.srs
ruleset=☁️ 云服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/digitalocean.srs
ruleset=☁️ 云服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/heroku.srs
ruleset=☁️ 云服务,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/dropbox.srs
ruleset=🌍 国外网站,https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/geolocation-!cn.srs
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]🔯 故障转移\`[]<%regionStrategyChain%>\`[]☑️ 手动切换\`[]DIRECT
custom_proxy_group=☑️ 手动切换\`select\`.*
custom_proxy_group=♻️ 自动选择\`url-test\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=🔯 故障转移\`fallback\`.*\`http://www.gstatic.com/generate_204\`300,,50
custom_proxy_group=🤖 AI 服务\`select\`[]🚀 节点选择\`[]🔯 故障转移\`[]🇺🇸 美国节点\`[]🇯🇵 日本节点\`[]🌍 狮城节点
custom_proxy_group=📺 哔哩哔哩\`select\`[]DIRECT\`[]🚀 节点选择
custom_proxy_group=📹 油管视频\`select\`[]🚀 节点选择\`[]♻️ 自动选择
custom_proxy_group=🔎 谷歌服务\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]🇺🇸 美国节点
custom_proxy_group=📲 电报消息\`select\`[]🚀 节点选择\`[]🇸🇬 狮城节点\`[]🇭🇰 香港节点
custom_proxy_group=💻 代码托管\`select\`[]🚀 节点选择\`[]♻️ 自动选择\`[]DIRECT
custom_proxy_group=Ⓜ️ 微软服务\`select\`[]DIRECT\`[]🚀 节点选择
custom_proxy_group=🍎 苹果服务\`select\`[]DIRECT\`[]🚀 节点选择
custom_proxy_group=🌐 社交媒体\`select\`[]🚀 节点选择\`[]♻️ 自动选择
custom_proxy_group=🎬 流媒体\`select\`[]🚀 节点选择\`[]♻️ 自动选择
custom_proxy_group=🎮 游戏平台\`select\`[]🚀 节点选择\`[]DIRECT
custom_proxy_group=🎓 学术教育\`select\`[]🚀 节点选择\`[]DIRECT
custom_proxy_group=💳 金融服务\`select\`[]🚀 节点选择\`[]DIRECT
custom_proxy_group=☁️ 云服务\`select\`[]🚀 节点选择\`[]DIRECT
custom_proxy_group=🌍 国外网站\`select\`[]🚀 节点选择\`[]♻️ 自动选择
custom_proxy_group=🎯 全球直连\`select\`[]DIRECT
custom_proxy_group=🛑 广告拦截\`select\`[]REJECT\`[]DIRECT
custom_proxy_group=🐟 漏网之鱼\`select\`[]🚀 节点选择\`[]DIRECT

enable_rule_generator=true
overwrite_original_rules=true`
     },
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
