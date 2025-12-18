/**
 * 默认设置常量
 * @author MiSub Team
 */

export const DEFAULT_SETTINGS = {
    FileName: 'MiSub',
    mytoken: 'auto',
    profileToken: 'profiles',
    subConverter: 'url.v1.mk',
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    prependSubName: true,
    prefixConfig: {
        enableManualNodes: true,
        enableSubscriptions: true,
        manualNodePrefix: '手动节点',
        enableNodeEmoji: true
    },
    nodeTransform: {
        enabled: false,
        rename: {
            regex: {
                enabled: false,
                rules: []
            },
            template: {
                enabled: false,
                template: '{emoji}{region}-{protocol}-{index}',
                indexStart: 1,
                indexPad: 2,
                indexScope: 'regionProtocol',
                regionAlias: {},
                protocolAlias: { hysteria2: 'hy2' }
            }
        },
        dedup: {
            enabled: false,
            mode: 'serverPort',
            includeProtocol: false,
            prefer: {
                protocolOrder: ['vless', 'trojan', 'vmess', 'hysteria2', 'ss', 'ssr']
            }
        },
        sort: {
            enabled: false,
            nameIgnoreEmoji: true,
            keys: [
                { key: 'region', order: 'asc', customOrder: ['香港', '台湾', '日本', '新加坡', '美国', '韩国', '英国', '德国', '法国', '加拿大'] },
                { key: 'protocol', order: 'asc', customOrder: ['vless', 'trojan', 'vmess', 'hysteria2', 'ss', 'ssr'] },
                { key: 'name', order: 'asc' }
            ]
        }
    },
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90,
    enableTrafficNode: true,
    storageType: 'kv'
};

export const DEFAULT_NODE_FORM = {
    name: '',
    url: '',
    enabled: true
};

export const DEFAULT_PROFILE_FORM = {
    name: '',
    customId: '',
    subConverter: '',
    subConfig: '',
    subscriptions: [],
    manualNodes: [],
    enabled: true,
    prefixSettings: {
        enableManualNodes: true,
        enableSubscriptions: true,
        manualNodePrefix: '手动节点'
    }
};