/**
 * 解析订阅请求路径中的 token 与订阅组信息
 *
 * 支持的 URL 格式：
 *   1. /{token}                        → 管理员全量订阅（mytoken）
 *   2. /{profileToken}/{profileId}     → 订阅组访问
 *   3. /sub/{token}                    → 管理员全量订阅（带 /sub/ 路由前缀）
 *   4. /sub/{profileToken}/{profileId} → 订阅组访问（带 /sub/ 路由前缀）
 *
 * 注意：当 profileToken 恰好为 'sub' 时，格式 2 和 3 的路径相同（/sub/xxx），
 * 此时优先按格式 2 处理（profileToken 优先级高于路由前缀）。
 *
 * @param {URL} url - 请求 URL
 * @param {Object} config - 全局配置
 * @param {Array} allProfiles - 订阅组列表
 * @returns {{token: string, profileIdentifier: (string|null)}}
 */
export function resolveRequestContext(url, config, allProfiles) {
    let token = '';
    let profileIdentifier = null;
    const pathSegments = url.pathname.split('/').filter(Boolean);

    if (pathSegments.length >= 3) {
        // 3+ 段：/sub/{token}/{profileId}
        // 第一段为路由前缀 'sub'，跳过
        token = pathSegments[1];
        profileIdentifier = pathSegments[2];
    } else if (pathSegments.length === 2) {
        const [firstSeg, secondSeg] = pathSegments;

        if (firstSeg === config.profileToken) {
            // /{profileToken}/{profileId} — 订阅组访问
            // 当 profileToken='sub' 时，/sub/{id} 也会进入此分支（正确行为）
            token = firstSeg;
            profileIdentifier = secondSeg;
        } else if (firstSeg === config.mytoken) {
            // /{mytoken}/{profileId} — 管理员指定订阅组
            token = firstSeg;
            profileIdentifier = secondSeg;
        } else {
            // 第一段不是已知 token，视为路由前缀 'sub'，第二段为实际 token
            // 例如：/sub/{mytoken}
            token = secondSeg;
        }
    } else if (pathSegments.length === 1) {
        // 单段：/{token}（管理员 mytoken 或 profileToken）
        token = pathSegments[0];
    } else {
        token = url.searchParams.get('token');
    }

    return { token, profileIdentifier };
}
