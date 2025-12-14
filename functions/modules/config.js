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
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90,
    enableTrafficNode: true,
    storageType: 'kv'
};

// 系统常量
export const SYSTEM_CONSTANTS = {
    VERSION: '2.0.0-modular-v2',
    // 统一使用v2rayN UA获取订阅，绕过机场过滤同时保证获取完整节点
    FETCHER_USER_AGENT: 'v2rayN/7.23'
};
