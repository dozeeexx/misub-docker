/**
 * 解析订阅请求路径中的 token 与订阅组信息
 * @param {URL} url - 请求 URL
 * @param {Object} config - 全局配置
 * @param {Array} allProfiles - 订阅组列表
 * @returns {{token: string, profileIdentifier: (string|null)}}
 */
export function resolveRequestContext(url, config, allProfiles) {
    let token = '';
    let profileIdentifier = null;
    const pathSegments = url.pathname.replace(/^\/sub\//, '/').split('/').filter(Boolean);

    if (pathSegments.length > 0) {
        const firstSegment = pathSegments[0];
        if (pathSegments.length > 1) {
            const firstSeg = pathSegments[0];
            const secondSeg = pathSegments[1];

            if (firstSeg === config.profileToken) {
                // Standard case: /sub/profiles/ID
                token = firstSeg;
                profileIdentifier = secondSeg;
            } else if (firstSeg === config.mytoken) {
                // Admin token case? Currently not supported for 2 segments but preserving existing var assignment
                token = firstSeg;
                profileIdentifier = secondSeg;
            } else {
                // 未匹配到已知 Token 时，保持原样，避免错误绕过 Token 校验
                token = firstSegment;
                profileIdentifier = secondSeg;
            }
        } else {
            // Check if it's the admin token
            if (firstSegment === config.mytoken) {
                token = firstSegment;
            } else {
                token = firstSegment;
            }
        }
    } else {
        token = url.searchParams.get('token');
    }

    return { token, profileIdentifier };
}
