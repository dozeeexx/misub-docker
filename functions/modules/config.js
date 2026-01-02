/**
 * Unified config file.
 * Includes constants, KV keys, and default settings for the worker.
 */

// KV storage keys
export const KV_KEY_SUBS = 'misub_subscriptions_v1';
export const KV_KEY_PROFILES = 'misub_profiles_v1';
export const KV_KEY_GUESTBOOK = 'misub_guestbook_v1';
export const KV_KEY_SETTINGS = 'worker_settings_v1';

// Auth
export const COOKIE_NAME = 'auth_session';
export const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

// Default settings
export const DEFAULT_SETTINGS = {
    FileName: 'MiSub',
    mytoken: 'auto',
    profileToken: 'profiles',
    subConverter: 'url.v1.mk',
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    enableAccessLog: false,
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90,
    enableTrafficNode: false,
    storageType: 'kv',
    // 公告设置
    announcement: {
        enabled: false,
        title: '',
        content: '',
        type: 'info',
        dismissible: true,
        updatedAt: null
    },
    // 留言板设置
    guestbook: {
        enabled: false,           // 总开关
        allowAnonymous: true      // 是否允许匿名
    }
};

// System constants
export const SYSTEM_CONSTANTS = {
    VERSION: '2.0.0-modular-v2',
    // Use v2rayN UA to fetch subscriptions reliably.
    FETCHER_USER_AGENT: 'v2rayN/7.23'
};
