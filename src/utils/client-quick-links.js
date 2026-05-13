const CLIENT_PRESETS = [
  {
    id: 'clash-verge-rev',
    name: 'Clash Verge Rev',
    badge: '推荐',
    icon: '🧩',
    summary: '桌面端推荐，自动使用 Clash/Mihomo 兼容配置。',
    query: '?clash',
    scheme: 'clash://install-config?url={url}&name={name}'
  },
  {
    id: 'mihomo-party',
    name: 'Mihomo Party',
    badge: '推荐',
    icon: '⚡',
    summary: 'Mihomo 用户优先，适合规则与策略组配置。',
    query: '?clash',
    scheme: 'clash://install-config?url={url}&name={name}'
  },
  {
    id: 'hiddify',
    name: 'Hiddify',
    badge: '自动适配',
    icon: '🛡️',
    summary: '自动适配 Hiddify，避免不兼容模板导致导入失败。',
    query: '?clash',
    scheme: 'hiddify://import/{url}'
  },
  {
    id: 'sing-box',
    name: 'Sing-box',
    badge: '',
    icon: '📦',
    summary: '适合 sing-box 内核客户端，输出通用节点订阅。',
    query: '?base64'
  },
  {
    id: 'shadowrocket',
    name: 'Shadowrocket',
    badge: 'iOS',
    icon: '🚀',
    summary: 'iPhone 常用客户端，一键导入通用订阅。',
    query: '?base64',
    scheme: 'shadowrocket://add/sub://{url_base64}?remark={name}'
  },
  {
    id: 'quantumult-x',
    name: 'Quantumult X',
    badge: 'iOS',
    icon: '🔷',
    summary: '自动使用 QuanX 兼容输出。',
    query: '?quanx',
    scheme: 'quantumult-x:///add-resource?remote-resource={url}'
  },
  {
    id: 'surge',
    name: 'Surge',
    badge: '',
    icon: '🌊',
    summary: '适合 Surge 托管配置导入。',
    query: '?surge',
    scheme: 'surge:///install-config?url={url}'
  },
  {
    id: 'loon',
    name: 'Loon',
    badge: '',
    icon: '🪶',
    summary: '自动使用 Loon 兼容输出。',
    query: '?loon',
    scheme: 'loon://import?sub={url}&name={name}'
  }
];

function encodeBase64Url(value) {
  try {
    return btoa(value);
  } catch {
    return value;
  }
}

function normalizeOrigin(origin) {
  return String(origin || '').replace(/\/$/, '');
}

function hasStableToken(token) {
  return Boolean(token && token !== 'auto' && String(token).trim());
}

function buildImportUrl(preset, url, profileName) {
  if (!preset.scheme) return '';
  return preset.scheme
    .replace('{url}', encodeURIComponent(url))
    .replace('{name}', encodeURIComponent(profileName || '订阅'))
    .replace('{url_base64}', encodeBase64Url(url));
}

export function buildClientQuickLinks({ origin, token, profile } = {}) {
  if (!profile || !hasStableToken(token)) return [];

  const identifier = profile.customId || profile.id;
  if (!identifier) return [];

  const baseUrl = `${normalizeOrigin(origin)}/${token}/${identifier}`;
  const profileName = profile.name || '订阅';

  return CLIENT_PRESETS.map((preset) => {
    const url = `${baseUrl}${preset.query || ''}`;
    return {
      ...preset,
      url,
      importUrl: buildImportUrl(preset, url, profileName)
    };
  });
}

export function getClientQuickLinkPresets() {
  return CLIENT_PRESETS.map(preset => ({ ...preset }));
}
