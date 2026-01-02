/**
 * Default settings constants.
 * @author MiSub Team
 */

export const DEFAULT_SETTINGS = {
    FileName: 'MiSub',
    mytoken: 'auto',
    profileToken: 'profiles',
    subConverter: 'url.v1.mk',
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90,
    enableTrafficNode: false,
    enablePublicPage: true,
    storageType: 'kv',
    // 公告设置
    announcement: {
        enabled: false,           // 是否启用公告
        title: '',                // 公告标题
        content: '',              // 公告内容（支持富文本/Markdown）
        type: 'info',             // 类型: 'info' | 'warning' | 'success'
        dismissible: true,        // 是否可关闭
        updatedAt: null           // 更新时间
    },
    // 留言板设置
    guestbook: {
        enabled: false,
        allowAnonymous: true
    }
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
        manualNodePrefix: '\u624b\u52a8\u8282\u70b9'
    }
};
