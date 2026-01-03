const DEFAULT_SUBCONVERTER_FALLBACKS = [
    'subapi.cmliussss.net',
    'sub.d1.mk',
    'sub.xeton.dev'
];

/**
 * 构建 SubConverter 请求的基础 URL，兼容带/不带协议的配置
 * @param {string} backend - 用户配置的 SubConverter 地址
 * @returns {URL} - 规范化后的 URL 对象，指向 /sub 路径
 */
export function normalizeSubconverterUrl(backend) {
    if (!backend || backend.trim() === '') {
        throw new Error('Subconverter backend is not configured.');
    }

    const trimmed = backend.trim();
    const hasProtocol = /^https?:\/\//i.test(trimmed);

    let baseUrl;
    try {
        baseUrl = new URL(hasProtocol ? trimmed : `https://${trimmed}`);
    } catch (err) {
        throw new Error(`Invalid Subconverter backend: ${trimmed}`);
    }

    const normalizedPath = baseUrl.pathname.replace(/\/+$/, '');
    if (!normalizedPath || normalizedPath === '') {
        baseUrl.pathname = '/sub';
    } else if (!/\/sub$/i.test(normalizedPath)) {
        baseUrl.pathname = `${normalizedPath}/sub`;
    } else {
        baseUrl.pathname = normalizedPath;
    }

    return baseUrl;
}

/**
 * 针对无协议的后端生成 https/http 两种候选，确保最大兼容性
 * @param {string} backend - 用户输入的后端
 * @returns {URL[]} - 去重后的 URL 列表
 */
export function buildSubconverterUrlVariants(backend) {
    const variants = [];
    const hasProtocol = /^https?:\/\//i.test(backend.trim());

    const rawCandidates = hasProtocol
        ? [backend.trim()]
        : [`https://${backend.trim()}`, `http://${backend.trim()}`];

    for (const candidate of rawCandidates) {
        try {
            const urlObj = normalizeSubconverterUrl(candidate);
            // 去重：比较 href
            if (!variants.some(v => v.href === urlObj.href)) {
                variants.push(urlObj);
            }
        } catch (err) {
            // 如果某个变体非法，忽略并继续下一个
            continue;
        }
    }

    return variants;
}

/**
 * 获取 SubConverter 备选列表（去重）
 * @param {string} primary - 首选后端
 * @returns {string[]} - 去重后的候选列表
 */
export function getSubconverterCandidates(primary) {
    const all = [primary, ...DEFAULT_SUBCONVERTER_FALLBACKS];
    return all
        .filter(Boolean)
        .map(item => item.trim())
        .filter((item, index, arr) => item !== '' && arr.indexOf(item) === index);
}
