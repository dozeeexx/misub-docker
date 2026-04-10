/**
 * MiSub Operator Runner
 * Implements Sub-Store like operators for node transformation.
 */

import * as NodeUtils from './node-transformer.js';
import { extractNodeRegion, getRegionEmoji } from '../modules/utils/geo-utils.js';

/**
 * Filter Operator
 */
function opFilter(nodes, params) {
    if (!params) return nodes;
    const { include, exclude, protocols, regions } = params;
    let result = [...nodes];

    if (include?.enabled && Array.isArray(include.rules)) {
        result = result.filter(r => {
            // 优先尝试匹配原始名称，如果元数据中有纯净版名称则也尝试匹配
            const matchRaw = NodeUtils.matchesRegexRules(r.name, include.rules);
            const matchClean = r.metadata?.cleanName ? NodeUtils.matchesRegexRules(r.metadata.cleanName, include.rules) : false;
            return matchRaw || matchClean;
        });
    }
    if (exclude?.enabled && Array.isArray(exclude.rules)) {
        result = result.filter(r => {
            const matchRaw = NodeUtils.matchesRegexRules(r.name, exclude.rules);
            const matchClean = r.metadata?.cleanName ? NodeUtils.matchesRegexRules(r.metadata.cleanName, exclude.rules) : false;
            return !(matchRaw || matchClean);
        });
    }
    if (protocols?.enabled && Array.isArray(protocols.values)) {
        const allowed = new Set(protocols.values.map(p => p.toLowerCase()));
        result = result.filter(r => allowed.has(r.protocol.toLowerCase()));
    }
    if (regions?.enabled && Array.isArray(regions.values)) {
        // Ensure region info is present
        result = result.map(r => NodeUtils.ensureRegionInfo(r, true));
        const allowed = new Set(regions.values);
        result = result.filter(r => allowed.has(r.regionZh) || allowed.has(r.region));
    }
    return result;
}

/**
 * Rename Operator
 */
function opRename(nodes, params) {
    if (!params) return nodes;
    const { regex, template } = params;
    let result = [...nodes];

    if (regex?.enabled && Array.isArray(regex.rules)) {
        result = result.map(r => ({
            ...r,
            name: NodeUtils.applyRegexRename(r.name, regex.rules)
        }));
    }

    if (template?.enabled && template.text) {
        // Simple template rendering
        result = result.map((r, index) => {
            const enriched = NodeUtils.ensureRegionInfo(r, true);
            const vars = {
                name: r.name,
                protocol: r.protocol,
                region: enriched.region,
                regionZh: enriched.regionZh,
                emoji: enriched.emoji,
                index: index + (template.offset || 1)
            };
            const newName = template.text.replace(/\{(\w+)\}/g, (match, key) => vars[key] || match);
            return { ...r, name: newName };
        });
    }

    return result;
}

/**
 * Script Operator (The heart of Sub-Store)
 */
async function opScript(nodes, params, context) {
    const { code, url } = params;
    let scriptCode = code;

    if (url) {
        try {
             // In Cloudflare Workers, we use fetch
            const response = await fetch(url);
            if (response.ok) {
                scriptCode = await response.text();
            } else {
                console.warn(`[Operator] Failed to fetch remote script from ${url}: ${response.status}`);
            }
        } catch (e) {
            console.error('[Operator] Script fetch error:', e);
        }
    }

    if (!scriptCode) return nodes;

    try {
        // Enriched context for the script
        const scriptEnv = {
            $proxies: nodes,
            $context: context,
            $utils: {
                decodeBase64: s => atob(s),
                encodeBase64: s => btoa(s),
                // Add more helpers if needed
            }
        };

        // Create a wrapper to support common Sub-Store script patterns
        const wrapper = `
            return (async () => {
                const $proxies = Array.from(arguments[0]);
                const $context = arguments[1];
                const { $utils } = arguments[2];
                
                ${scriptCode}

                if (typeof operator === 'function') {
                    return await operator($proxies, $context);
                }
                return $proxies;
            })();
        `;

        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const runner = new AsyncFunction(wrapper);
        const result = await runner(nodes, context, scriptEnv);
        
        return Array.isArray(result) ? result : nodes;
    } catch (e) {
        console.error('[Operator] Script execution failed:', e);
        return nodes;
    }
}

/**
 * Main Entry Point for Operator Chain
 * @param {string[]} nodeUrls 
 * @param {Object[]} operators 
 * @param {Object} context 
 */
export async function runOperatorChain(nodeUrls, operators, context = {}) {
    if (!Array.isArray(operators) || operators.length === 0) {
        return nodeUrls;
    }

    // 1. Convert URLs to Records
    let records = NodeUtils.nodeUrlsToRecords(nodeUrls, { 
        needServerPort: true, 
        ensureRegion: false 
    });

    // 1.5 Determine platform info for scripts
    const ua = (context.userAgent || '').toLowerCase();
    const platform = {
        isClash: /clash|mihomo|stash|meta|verge/i.test(ua),
        isSurge: /surge/i.test(ua),
        isQuanX: /quantumult/i.test(ua),
        isLoon: /loon/i.test(ua),
        isShadowrocket: /shadowrocket/i.test(ua),
        isSingBox: /sing-box|singbox/i.test(ua),
        userAgent: context.userAgent,
        target: context.target || 'base64'
    };

    const enrichedContext = { ...context, ...platform };

    // 2. Run Operators sequentially
    for (const op of operators) {
        const { type, params, enabled } = op;
        if (enabled === false) continue;

        switch (type) {
            case 'filter':
                records = opFilter(records, params);
                break;
            case 'rename':
                records = opRename(records, params);
                break;
            case 'script':
                records = await opScript(records, params, enrichedContext);
                break;
            case 'sort':
                if (params && Array.isArray(params.keys)) {
                    records.sort(NodeUtils.makeComparator({ keys: params.keys }));
                }
                break;
            case 'dedup':
                // Simple dedup by server:port
                const seen = new Set();
                records = records.filter(r => {
                    const key = `${r.server}:${r.port}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                break;
        }
    }

    // 3. Convert Records back to URLs
    return NodeUtils.recordsToNodeUrls(records);
}
