/**
 * 统一配置文件
 * 包含后端所有的常量、KV键名和默认设置
 */

// KV 存储键名
export const KV_KEY_SUBS = 'misub_subscriptions_v1';
export const KV_KEY_PROFILES = 'misub_profiles_v1';
export const KV_KEY_SETTINGS = 'worker_settings_v1';

// 认证相关
export const COOKIE_NAME = 'auth_session';
export const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8小时

// 默认设置
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
    enableAccessLog: false,
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
    enableTrafficNode: false,
    storageType: 'kv'
};

// 系统常量
export const SYSTEM_CONSTANTS = {
    VERSION: '2.0.0-modular-v2',
    // 统一使用v2rayN UA获取订阅，绕过机场过滤同时保证获取完整节点
    FETCHER_USER_AGENT: 'v2rayN/7.23'
};
