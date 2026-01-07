import { StorageFactory } from '../../storage-adapter.js';
import { migrateConfigSettings, formatBytes, getCallbackToken } from '../utils.js';
import { generateCombinedNodeList } from '../../services/subscription-service.js';
import { sendEnhancedTgNotification } from '../notifications.js';
import { KV_KEY_SUBS, KV_KEY_PROFILES, KV_KEY_SETTINGS, DEFAULT_SETTINGS as defaultSettings } from '../config.js';
import { renderDisguisePage } from '../disguise-page.js';
import { generateCacheKey, setCache } from '../../services/node-cache-service.js';
import { resolveRequestContext } from './request-context.js';
import { buildSubconverterUrlVariants, getSubconverterCandidates } from './subconverter-client.js';
import { resolveNodeListWithCache } from './cache-manager.js';
import { logAccessError, logAccessSuccess, shouldSkipLogging as shouldSkipAccessLog } from './access-logger.js';

/**
 * 处理MiSub订阅请求
 * @param {Object} context - Cloudflare上下文
 * @returns {Promise<Response>} HTTP响应
 */
export async function handleMisubRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";

    const storageAdapter = StorageFactory.createAdapter(env, await StorageFactory.getStorageType(env));
    const [settingsData, misubsData, profilesData] = await Promise.all([
        storageAdapter.get(KV_KEY_SETTINGS),
        storageAdapter.get(KV_KEY_SUBS),
        storageAdapter.get(KV_KEY_PROFILES)
    ]);
    const settings = settingsData || {};
    const allMisubs = misubsData || [];
    const allProfiles = profilesData || [];
    // 关键：我们在这里定义了 `config`，后续都应该使用它
    const config = migrateConfigSettings({ ...defaultSettings, ...settings });

    const isBrowser = /Mozilla|Chrome|Safari|Edge|Opera/i.test(userAgentHeader) &&
        !/clash|v2ray|surge|loon|shadowrocket|quantumult|stash|shadowsocks|mihomo|meta|nekobox|nekoray|sfi|sfa|sfra/i.test(userAgentHeader);

    if (config.disguise?.enabled && isBrowser && !url.searchParams.has('callback_token')) {
        // [Smart Camouflage] Allow Admin Access
        // Check if the user has a valid admin session cookie
        const { authMiddleware } = await import('../auth-middleware.js');
        const isAuthenticated = await authMiddleware(request, env); // Returns boolean

        if (!isAuthenticated) {
            if (config.disguise.pageType === 'redirect' && config.disguise.redirectUrl) {
                let redirectUrl = config.disguise.redirectUrl.trim();
                // Ensure URL has a protocol
                if (!/^https?:\/\//i.test(redirectUrl)) {
                    redirectUrl = 'https://' + redirectUrl;
                }
                return Response.redirect(redirectUrl, 302);
            } else {
                return renderDisguisePage();
            }
        }
    }

    const { token, profileIdentifier } = resolveRequestContext(url, config, allProfiles);
    const shouldSkipLogging = shouldSkipAccessLog(userAgentHeader);

    let targetMisubs;
    let subName = config.FileName;
    let effectiveSubConverter;
    let effectiveSubConfig;
    let isProfileExpired = false; // Moved declaration here

    const DEFAULT_EXPIRED_NODE = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent('您的订阅已失效')}`;

    if (profileIdentifier) {
        // [修正] 使用 config 變量
        if (!token || token !== config.profileToken) {
            return new Response('Invalid Profile Token', { status: 403 });
        }
        const profile = allProfiles.find(p => (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier);
        if (profile && profile.enabled) {
            // Check if the profile has an expiration date and if it's expired
            if (profile.expiresAt) {
                const expiryDate = new Date(profile.expiresAt);
                const now = new Date();
                if (now > expiryDate) {
                    isProfileExpired = true;
                }
            }

            if (isProfileExpired) {
                subName = profile.name; // Still use profile name for filename
                targetMisubs = [{ id: 'expired-node', url: DEFAULT_EXPIRED_NODE, name: '您的订阅已到期', isExpiredNode: true }]; // Set expired node as the only targetMisub
            } else {
                subName = profile.name;
                const profileSubIds = new Set(profile.subscriptions);
                const profileNodeIds = new Set(profile.manualNodes);
                targetMisubs = allMisubs.filter(item => {
                    const isSubscription = item.url.startsWith('http');
                    const isManualNode = !isSubscription;

                    // Check if the item belongs to the current profile and is enabled
                    const belongsToProfile = (isSubscription && profileSubIds.has(item.id)) || (isManualNode && profileNodeIds.has(item.id));
                    if (!item.enabled || !belongsToProfile) {
                        return false;
                    }
                    return true;
                });
            }
            effectiveSubConverter = profile.subConverter && profile.subConverter.trim() !== '' ? profile.subConverter : config.subConverter;
            effectiveSubConfig = profile.subConfig && profile.subConfig.trim() !== '' ? profile.subConfig : config.subConfig;

            // [新增] 增加订阅组下载计数
            // 仅在非回调请求时及非内部请求时增加计数(避免重复计数)
            // 且仅当开启访问日志时才计数
            if (!url.searchParams.has('callback_token') && !shouldSkipLogging && config.enableAccessLog) {
                try {
                    // 初始化下载计数(如果不存在)
                    if (typeof profile.downloadCount !== 'number') {
                        profile.downloadCount = 0;
                    }
                    // 增加计数
                    profile.downloadCount += 1;

                    // 更新存储中的订阅组数据
                    const updatedProfiles = allProfiles.map(p =>
                        ((p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier)
                            ? profile
                            : p
                    );

                    // 异步保存,不阻塞响应
                    context.waitUntil(
                        storageAdapter.put(KV_KEY_PROFILES, updatedProfiles)
                            .catch(err => console.error('[Download Count] Failed to update:', err))
                    );

                } catch (err) {
                    // 计数失败不影响订阅服务
                    console.error('[Download Count] Error:', err);
                }
            }
        } else {
            return new Response('Profile not found or disabled', { status: 404 });
        }
    } else {
        // [修正] 使用 config 變量
        if (!token || token !== config.mytoken) {
            return new Response('Invalid Token', { status: 403 });
        }
        targetMisubs = allMisubs.filter(s => s.enabled);
        // [修正] 使用 config 變量
        effectiveSubConverter = config.subConverter;
        effectiveSubConfig = config.subConfig;
    }

    if (!effectiveSubConverter || effectiveSubConverter.trim() === '') {
        return new Response('Subconverter backend is not configured.', { status: 500 });
    }

    let targetFormat = url.searchParams.get('target');
    if (!targetFormat) {
        const supportedFormats = ['clash', 'singbox', 'surge', 'loon', 'base64', 'v2ray', 'trojan'];
        for (const format of supportedFormats) {
            if (url.searchParams.has(format)) {
                if (format === 'v2ray' || format === 'trojan') { targetFormat = 'base64'; } else { targetFormat = format; }
                break;
            }
        }
    }
    if (!targetFormat) {
        const ua = userAgentHeader.toLowerCase();
        // 使用陣列來保證比對的優先順序
        const uaMapping = [
            // Mihomo/Meta 核心的客戶端 - 需要clash格式
            ['flyclash', 'clash'],
            ['mihomo', 'clash'],
            ['clash.meta', 'clash'],
            ['clash-verge', 'clash'],
            ['meta', 'clash'],

            // 其他客戶端
            ['stash', 'clash'],
            ['nekoray', 'clash'],
            ['sing-box', 'singbox'],
            ['shadowrocket', 'base64'],
            ['v2rayn', 'base64'],
            ['v2rayng', 'base64'],
            ['surge', 'surge'],
            ['loon', 'loon'],
            ['quantumult%20x', 'quanx'],
            ['quantumult', 'quanx'],

            // 最後才匹配通用的 clash，作為向下相容
            ['clash', 'clash']
        ];

        for (const [keyword, format] of uaMapping) {
            if (ua.includes(keyword)) {
                targetFormat = format;
                break; // 找到第一個符合的就停止
            }
        }
    }
    if (!targetFormat) { targetFormat = 'base64'; }

    // [Access Log] Record access log and stats if enabled
    if (!url.searchParams.has('callback_token') && !shouldSkipLogging && config.enableAccessLog) {
        // [Log Deduplication]
        // Removed the premature LogService.addLog here.
        // We will pass the log metadata to generateCombinedNodeList (or log manually for cache hits)
        // to ensure we have the correct stats and avoid duplicates.
    }

    let prependedContentForSubconverter = '';

    if (isProfileExpired) { // Use the flag set earlier
        prependedContentForSubconverter = ''; // Expired node is now in targetMisubs
    } else {
        // Otherwise, add traffic remaining info if applicable
        const totalRemainingBytes = targetMisubs.reduce((acc, sub) => {
            if (sub.enabled && sub.userInfo && sub.userInfo.total > 0) {
                const used = (sub.userInfo.upload || 0) + (sub.userInfo.download || 0);
                const remaining = sub.userInfo.total - used;
                return acc + Math.max(0, remaining);
            }
            return acc;
        }, 0);
        if (config.enableTrafficNode !== false && totalRemainingBytes > 0) {
            const formattedTraffic = formatBytes(totalRemainingBytes);
            const fakeNodeName = `流量剩余 ≫ ${formattedTraffic}`;
            prependedContentForSubconverter = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent(fakeNodeName)}`;
        }
    }

    // === 缓存机制：快速响应客户端请求 ===
    const cacheKey = generateCacheKey(
        profileIdentifier ? 'profile' : 'token',
        profileIdentifier || token
    );

    // 检查是否强制刷新（通过 URL 参数）
    const forceRefresh = url.searchParams.has('refresh') || url.searchParams.has('nocache');

    // 定义刷新函数（用于后台刷新）
    const refreshNodes = async (isBackground = false) => {
        const isDebugToken = (token === 'b0b422857bb46aba65da8234c84f38c6');
        // 组合节点列表
        // 传递 context 对象以获取请求信息用于日志记录
        context.startTime = Date.now();

        // Prepare log metadata to pass down
        const clientIp = request.headers.get('CF-Connecting-IP') || 'N/A';
        const country = request.headers.get('CF-IPCountry') || 'N/A';
        const domain = url.hostname;

        context.logMetadata = {
            clientIp,
            geoInfo: { country, city: request.cf?.city, isp: request.cf?.asOrganization, asn: request.cf?.asn },
            format: targetFormat,
            token: profileIdentifier ? (profileIdentifier) : token,
            type: profileIdentifier ? 'profile' : 'token',
            domain
        };

        const currentProfile = profileIdentifier ? allProfiles.find(p => (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier) : null;
        const generationSettings = {
            ...(currentProfile?.prefixSettings || {}),
            nodeTransform: currentProfile?.nodeTransform,
            name: subName
        };

        const freshNodes = await generateCombinedNodeList(
            context, // 传入完整 context
            { ...config, enableAccessLog: false }, // [Deferred Logging] Disable service-side logging, we will log manually in handler
            userAgentHeader,
            targetMisubs,
            prependedContentForSubconverter,
            generationSettings,
            isDebugToken
        );
        const sourceNames = targetMisubs
            .filter(s => s.url.startsWith('http'))
            .map(s => s.name || s.url);
        await setCache(storageAdapter, cacheKey, freshNodes, sourceNames);
        return freshNodes;
    };

    const { combinedNodeList, cacheHeaders } = await resolveNodeListWithCache({
        storageAdapter,
        cacheKey,
        forceRefresh,
        refreshNodes,
        context,
        targetMisubsCount: targetMisubs.length
    });

    const domain = url.hostname;

    if (targetFormat === 'base64') {
        let contentToEncode;
        if (isProfileExpired) {
            contentToEncode = DEFAULT_EXPIRED_NODE + '\n';
        } else {
            contentToEncode = combinedNodeList;
        }
        const headers = { "Content-Type": "text/plain; charset=utf-8", 'Cache-Control': 'no-store, no-cache' };
        Object.entries(cacheHeaders).forEach(([key, value]) => {
            headers[key] = value;
        });

        // [Deferred Logging] Log Success for Base64 (Direct Return)
        if (!url.searchParams.has('callback_token') && !shouldSkipLogging && config.enableAccessLog) {
            logAccessSuccess({
                context,
                env,
                request,
                userAgentHeader,
                targetFormat,
                token,
                profileIdentifier,
                subName,
                domain
            });
        }

        return new Response(btoa(unescape(encodeURIComponent(contentToEncode))), { headers });
    }

    const base64Content = btoa(unescape(encodeURIComponent(combinedNodeList)));

    const callbackToken = await getCallbackToken(env);
    const callbackPath = profileIdentifier ? `/${token}/${profileIdentifier}` : `/${token}`;
    const callbackUrl = `${url.protocol}//${url.host}${callbackPath}?target=base64&callback_token=${callbackToken}`;
    if (url.searchParams.get('callback_token') === callbackToken) {
        const headers = { "Content-Type": "text/plain; charset=utf-8", 'Cache-Control': 'no-store, no-cache' };
        return new Response(base64Content, { headers });
    }

    const candidates = getSubconverterCandidates(effectiveSubConverter);
    let lastError = null;
    const triedEndpoints = [];

    for (const backend of candidates) {
        const variants = buildSubconverterUrlVariants(backend);
        for (const subconverterUrl of variants) {
            triedEndpoints.push(subconverterUrl.origin + subconverterUrl.pathname);
            try {
                subconverterUrl.searchParams.set('target', targetFormat);
                subconverterUrl.searchParams.set('url', callbackUrl);
                subconverterUrl.searchParams.set('scv', 'true');
                subconverterUrl.searchParams.set('udp', 'true');
                if ((targetFormat === 'clash' || targetFormat === 'loon' || targetFormat === 'surge') && effectiveSubConfig && effectiveSubConfig.trim() !== '') {
                    subconverterUrl.searchParams.set('config', effectiveSubConfig);
                }
                subconverterUrl.searchParams.set('new_name', 'true');

                const subconverterResponse = await fetch(subconverterUrl.toString(), {
                    method: 'GET',
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MiSub-Backend)' },
                });
                if (!subconverterResponse.ok) {
                    const errorBody = await subconverterResponse.text();
                    lastError = new Error(`Subconverter(${subconverterUrl.origin}) returned status ${subconverterResponse.status}. Body: ${errorBody}`);
                    console.warn('[SubConverter] Non-OK response, trying next backend if available:', lastError.message);
                    continue;
                }
                const responseText = await subconverterResponse.text();

                const responseHeaders = new Headers(subconverterResponse.headers);
                responseHeaders.set("Content-Disposition", `attachment; filename*=utf-8''${encodeURIComponent(subName)}`);
                responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
                responseHeaders.set('Cache-Control', 'no-store, no-cache');

                // 添加缓存状态头
                Object.entries(cacheHeaders).forEach(([key, value]) => {
                    responseHeaders.set(key, value);
                });

                // [Deferred Logging] Log Success for Subconverter
                if (!url.searchParams.has('callback_token') && !shouldSkipLogging && config.enableAccessLog) {
                    logAccessSuccess({
                        context,
                        env,
                        request,
                        userAgentHeader,
                        targetFormat,
                        token,
                        profileIdentifier,
                        subName,
                        domain
                    });
                }

                return new Response(responseText, { status: subconverterResponse.status, statusText: subconverterResponse.statusText, headers: responseHeaders });
            } catch (error) {
                lastError = error;
                console.warn(`[SubConverter] Error with backend ${subconverterUrl.origin}: ${error.message}. Trying next fallback if available.`);
            }
        }
    }

    const errorMessage = lastError ? `${lastError.message}. Tried: ${triedEndpoints.join(', ')}` : 'Unknown subconverter error';
    console.error(`[MiSub Final Error] ${errorMessage}`);

    // [Deferred Logging] Log Error for Subconverter Failures (Timeout/Error)
    if (!url.searchParams.has('callback_token') && !shouldSkipLogging && config.enableAccessLog) {
        logAccessError({
            context,
            env,
            request,
            userAgentHeader,
            targetFormat,
            token,
            profileIdentifier,
            subName,
            domain,
            errorMessage
        });
    }

    // 提供回退的 Base64 输出，避免客户端直接收到 502
    if (combinedNodeList) {
        const fallbackHeaders = new Headers({
            "Content-Type": "text/plain; charset=utf-8",
            'Cache-Control': 'no-store, no-cache',
            'X-MiSub-Fallback': 'base64'
        });

        // 保留缓存状态提示，便于客户端诊断
        Object.entries(cacheHeaders).forEach(([key, value]) => {
            fallbackHeaders.set(key, value);
        });

        // 附带简短错误信息，防止 header 过长
        fallbackHeaders.set('X-MiSub-Error', errorMessage.slice(0, 200));

        const fallbackContent = btoa(unescape(encodeURIComponent(combinedNodeList)));
        return new Response(fallbackContent, { headers: fallbackHeaders, status: 200 });
    }

    return new Response(`Error connecting to subconverter: ${errorMessage}`, { status: 502 });
}
