import { StorageFactory } from '../../storage-adapter.js';
import { fetchTransformTemplate } from './transform-template-cache.js';
import {
    OFFICIAL_ACL4SSR_FLAT_PRESETS,
    validateOfficialAcl4ssrFlatTemplate
} from '../../../src/shared/acl4ssr-official-flat-presets.js';

const STATE_KEY = 'misub_acl4ssr_official_flat_refresh_v1';
const DEFAULT_REFRESH_INTERVAL_SECONDS = 24 * 60 * 60;
const MIN_REFRESH_INTERVAL_SECONDS = 60 * 60;

function parseBoolean(value, defaultValue = true) {
    if (value === undefined || value === null || value === '') return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseIntervalSeconds(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REFRESH_INTERVAL_SECONDS;
    return Math.max(MIN_REFRESH_INTERVAL_SECONDS, Math.floor(parsed));
}

function sanitizeFailure(error) {
    return String(error?.message || error || 'unknown error')
        .replace(/[A-Za-z0-9_-]{24,}/g, '<redacted>')
        .slice(0, 500);
}

async function readRefreshState(storageAdapter) {
    try {
        const state = await storageAdapter.get(STATE_KEY);
        return state && typeof state === 'object' ? state : {};
    } catch {
        return {};
    }
}

async function writeRefreshState(storageAdapter, state) {
    try {
        await storageAdapter.put(STATE_KEY, state);
    } catch (error) {
        console.warn('[ACL4SSR Official Flat] Failed to persist refresh state:', error?.message || error);
    }
}

export async function refreshOfficialAcl4ssrFlatPresets(storageAdapter, options = {}) {
    const forceRefresh = options.forceRefresh !== false;
    const refreshed = [];
    const failures = [];

    for (const preset of OFFICIAL_ACL4SSR_FLAT_PRESETS) {
        try {
            const templateText = await fetchTransformTemplate(storageAdapter, preset.url, forceRefresh);
            const validation = validateOfficialAcl4ssrFlatTemplate(preset.url, templateText);
            if (!validation.ok) {
                throw new Error(validation.errors.join('; '));
            }
            refreshed.push({
                file: preset.file,
                url: preset.url,
                rulesetCount: validation.rulesetSources.length
            });
        } catch (error) {
            failures.push({
                file: preset.file,
                url: preset.url,
                error: sanitizeFailure(error)
            });
        }
    }

    const summary = {
        ok: failures.length === 0,
        refreshedCount: refreshed.length,
        failureCount: failures.length,
        totalCount: OFFICIAL_ACL4SSR_FLAT_PRESETS.length,
        refreshed,
        failures
    };

    await writeRefreshState(storageAdapter, {
        timestamp: Date.now(),
        updatedAt: new Date().toISOString(),
        ok: summary.ok,
        refreshedCount: summary.refreshedCount,
        failureCount: summary.failureCount,
        failures: failures.slice(0, 5)
    });

    return summary;
}

export async function maybeRefreshOfficialAcl4ssrFlatPresets(env, options = {}) {
    if (!parseBoolean(env?.ACL4SSR_TEMPLATE_REFRESH_ENABLED, true)) {
        return { skipped: true, reason: 'disabled' };
    }

    const storageAdapter = StorageFactory.createAdapter(env);
    const intervalSeconds = parseIntervalSeconds(env?.ACL4SSR_TEMPLATE_REFRESH_INTERVAL_SECONDS);
    const state = await readRefreshState(storageAdapter);
    const now = Date.now();

    if (!options.force && state?.timestamp && now - Number(state.timestamp) < intervalSeconds * 1000) {
        return {
            skipped: true,
            reason: 'fresh',
            lastUpdatedAt: state.updatedAt || null,
            nextRefreshAt: new Date(Number(state.timestamp) + intervalSeconds * 1000).toISOString()
        };
    }

    const source = options.source || 'docker-cron';
    console.info(`[ACL4SSR Official Flat] Refreshing ${OFFICIAL_ACL4SSR_FLAT_PRESETS.length} official flat presets (${source})`);
    const summary = await refreshOfficialAcl4ssrFlatPresets(storageAdapter, { forceRefresh: true });
    if (summary.ok) {
        console.info(`[ACL4SSR Official Flat] Refreshed ${summary.refreshedCount}/${summary.totalCount} presets`);
    } else {
        console.warn(`[ACL4SSR Official Flat] Refresh completed with ${summary.failureCount} failure(s)`);
        for (const failure of summary.failures.slice(0, 3)) {
            console.warn(`[ACL4SSR Official Flat] ${failure.file}: ${failure.error}`);
        }
    }
    return summary;
}
