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
        manualNodePrefix: '\u624b\u52a8\u8282\u70b9'
    }
};
