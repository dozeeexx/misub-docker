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
                // Custom/Public case: /folder/profileID OR /profileID/filename

                // 1. Check if the SECOND segment is a valid profile ID (e.g. /test1/work where work is ID)
                const foundProfileSecond = allProfiles.find(p => (p.customId && p.customId === secondSeg) || p.id === secondSeg);

                // 2. Check if the FIRST segment is a valid profile ID (e.g. /myprofile/clash where myprofile is ID)
                const foundProfileFirst = allProfiles.find(p => (p.customId && p.customId === firstSeg) || p.id === firstSeg);

                if (foundProfileSecond) {
                    // /anything/ID pattern
                    profileIdentifier = secondSeg;
                    token = config.profileToken;
                } else if (foundProfileFirst) {
                    // /ID/anything pattern
                    profileIdentifier = firstSegment;
                    token = config.profileToken;
                } else {
                    // Fallback to original behavior (likely invalid)
                    token = firstSegment;
                    profileIdentifier = secondSeg;
                }
            }
        } else {
            // Check if it's the admin token
            if (firstSegment === config.mytoken) {
                token = firstSegment;
            } else {
                // Check if it matches a valid profile (Public Access)
                const foundProfile = allProfiles.find(p => (p.customId && p.customId === firstSegment) || p.id === firstSegment);
                if (foundProfile) {
                    // It is a profile! Shim the values to satisfy downstream logic
                    profileIdentifier = firstSegment;
                    token = config.profileToken;
                } else {
                    token = firstSegment;
                }
            }
        }
    } else {
        token = url.searchParams.get('token');
    }

    return { token, profileIdentifier };
}
