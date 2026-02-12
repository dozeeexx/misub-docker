const DEFAULT_SUBCONVERTER_FALLBACKS = [
    'sub.d1.mk', // [Changed] Prioritize d1.mk
    'subapi.cmliussss.net',
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

/**
 * 从 Subconverter 获取转换后的订阅
 * @param {string[]} candidates - 后端 URL 列表
 * @param {Object} options - 请求选项
 * @param {string} options.targetFormat - 目标格式
 * @param {string} options.callbackUrl - 回调 URL (for conversion)
 * @param {string|null} options.subConfig - 外部配置 URL
 * @param {string} options.subName - 订阅名称 (for filename)
 * @param {Object} options.cacheHeaders - 需要透传的缓存头
 * @param {boolean} [options.enableScv=false] - 是否禁用证书校验
 * @param {boolean} [options.enableUdp=false] - 是否启用 UDP
 * @param {number} [options.timeout=15000] - 单次请求超时时间(ms)
 * @returns {Promise<{response: Response, usedEndpoint: string}>}
 * @throws {Error} 如果所有尝试都失败
 */
export async function fetchFromSubconverter(candidates, options) {
    const {
        targetFormat,
        callbackUrl,
        subConfig,
        subName,
        cacheHeaders = {},
        enableScv = false,
        enableUdp = false,
        enableEmoji = false, // [Added]
        timeout = 15000
    } = options;

    const triedEndpoints = [];
    let lastError = null;

    // [Debug Logging Entry]
    console.log(`[SubConverter Start] Candidates: ${JSON.stringify(candidates)}`);

    for (const backend of candidates) {
        const variants = buildSubconverterUrlVariants(backend);

        for (const subconverterUrl of variants) {
            triedEndpoints.push(subconverterUrl.origin + subconverterUrl.pathname);

            try {
                // Build Query Params
                subconverterUrl.searchParams.set('target', targetFormat);
                subconverterUrl.searchParams.set('url', callbackUrl);
                if (enableScv) {
                    subconverterUrl.searchParams.set('scv', 'true');
                }
                if (enableUdp) {
                    subconverterUrl.searchParams.set('udp', 'true');
                }
                subconverterUrl.searchParams.set('emoji', enableEmoji ? 'true' : 'false'); // [Added]

                if ((targetFormat === 'clash' || targetFormat === 'loon' || targetFormat === 'surge') &&
                    subConfig && subConfig.trim() !== '') {
                    subconverterUrl.searchParams.set('config', subConfig);
                }

                // [Fixed] Do not force 'new_name=true' as it causes Subconverter to reorder/rename nodes
                // subconverterUrl.searchParams.set('new_name', 'true');

                // Timeout Control
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                let response;
                try {
                    response = await fetch(subconverterUrl.toString(), {
                        method: 'GET',
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MiSub-Backend)' },
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Status ${response.status}: ${errorBody}`);
                }

                // Success! Prepare Response
                let responseText = await response.text();

                // [Sanitize Response] Fix YAML syntax errors (e.g. name: * ...)
                // Support both Plain Text and Base64 response
                let replaceCount = 0;
                let isBase64 = false;
                let decodedText = responseText;

                // Simple Base64 detection (no spaces, high entropy?) 
                // Alternatively, blindly try to decode if target=base64 param is present?
                // But we don't have easy access to params here without passing them.
                // Let's try heuristic: if no newlines and looks like base64.
                if (!responseText.includes('\n') && /^[A-Za-z0-9+/=]+$/.test(responseText.trim())) {
                    try {
                        const rawDecoded = atob(responseText.trim());
                        // Verify if it looks like YAML/Config (contains "proxies:" or "name:")
                        if (rawDecoded.includes('proxies:') || rawDecoded.includes('name:')) {
                            decodedText = rawDecoded;
                            isBase64 = true;
                        }
                    } catch (e) {
                        // Not base64 or failed to decode, treat as text
                    }
                }

                // [Sanitize Response V8] Aggressive Whitelist & Hex Logging
                // Find 'name:' and check the immediate next non-whitespace char
                // If it is NOT a safe char (Letter, Number, Chinese, opened parenthesis, etc), replace it.

                // Regex to find "name:" followed by optional spaces, then capture the next char
                // We also capture the position to log context
                const namePattern = /(name:\s*)([^])/g;
                // [^] matches any char including newline (though name: usually single line)

                if (decodedText) {
                    let logCount = 0;
                    decodedText = decodedText.replace(namePattern, (match, prefix, char) => {
                        // Whitelist: 
                        // \w (Alphanumeric + _)
                        // \u4e00-\u9fa5 (Chinese)
                        // \u0000-\u007F (ASCII - we filter unsafe ones)
                        // Safe Symbols: ( [ { " ' < -

                        // Check for UNSAFE chars: 
                        // * & ! # % @ | > ? : 
                        const isUnsafe = /[*&!#%@|>:?]/.test(char);

                        // Check if it is a control char?
                        const code = char.codePointAt(0);
                        const isControl = code < 32 && code !== 10 && code !== 13; // Ignore newline/cr

                        if (isUnsafe || isControl) {
                            logCount++;
                            if (logCount <= 5) {
                                console.log(`[MiSub Sanitize V8] Replaced unsafe char '${char}' (Hex: 0x${code.toString(16).toUpperCase()}) at "${match.slice(0, 20)}..."`);
                            }
                            // Replace with Fullwidth Star
                            return prefix + '★';
                        }

                        return match;
                    });
                }

                // Re-assign responseText
                if (isBase64) {
                    responseText = btoa(decodedText);
                } else {
                    responseText = decodedText;
                }

                if (replaceCount > 0) {
                    console.log(`[MiSub Sanitize] Replaced ${replaceCount} unsafe chars in ${isBase64 ? 'Base64' : 'Plain'} content.`);
                    if (isBase64) {
                        responseText = btoa(decodedText);
                    } else {
                        responseText = decodedText;
                    }
                } else if (isBase64) {
                    // Check if we missed something by logging a sample
                    const nameMsg = decodedText.match(/name:\s*.{0,10}/);
                    if (nameMsg) {
                        console.log(`[MiSub Debug V7] Found name sample: "${nameMsg[0]}"`);
                        // Log Hex of the char after name:
                        const afterName = nameMsg[0].replace(/name:\s*/, '');
                        if (afterName.length > 0) {
                            console.log(`[MiSub Debug V7] Char after name hex: ${afterName.codePointAt(0).toString(16)}`);
                        }
                    }
                }

                if (replaceCount > 0) {
                    console.log(`[MiSub Sanitize] Replaced ${replaceCount} unsafe chars in ${isBase64 ? 'Base64' : 'Plain'} content.`);
                    if (isBase64) {
                        responseText = btoa(decodedText);
                    } else {
                        responseText = decodedText;
                    }
                } else if (isBase64) {
                    // Even if no replace, we decoded/encoded? No, keep original responseText if no changes needed.
                    // But if we want to be safe, maybe we should use our re-encoded version? 
                    // No, simpler to touch only if needed.
                }

                // [Debug Logging Response - Forced STDERR]
                console.log(`[SubConverter Response] Status: ${response.status}`);
                console.log(`[SubConverter Preview] ${responseText.slice(0, 500)}`);

                // [Validation] Check for invalid HTML response 
                if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.includes('<html')) {
                    throw new Error(`Backend returned HTML instead of subscription content: ${responseText.slice(0, 100)}...`);
                }

                const responseHeaders = new Headers(response.headers);

                // Set Filename
                responseHeaders.set("Content-Disposition", `attachment; filename*=utf-8''${encodeURIComponent(subName)}`);
                responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
                responseHeaders.set('Cache-Control', 'no-store, no-cache');

                // Pass-through Cache Headers
                Object.entries(cacheHeaders).forEach(([key, value]) => {
                    responseHeaders.set(key, value);
                });

                return {
                    response: new Response(responseText, {
                        status: 200,
                        statusText: 'OK',
                        headers: responseHeaders
                    }),
                    usedEndpoint: subconverterUrl.origin
                };

            } catch (error) {
                lastError = error;
                // [Enhanced Logging] 打印完整堆栈和错误详情
                console.log(`[SubConverter Error] Backend: ${subconverterUrl.origin}, URL: ${subconverterUrl.toString()}`);
                console.log(`[SubConverter Error] Details:`, error);

                console.warn(`[SubConverter] Error with backend ${subconverterUrl.origin}: ${error.message}`);
                // Continue to next variant/candidate
            }
        }
    }

    // If we get here, all failed
    throw new Error(`${lastError ? lastError.message : 'Unknown error'}. Tried: ${triedEndpoints.join(', ')}`);
}
