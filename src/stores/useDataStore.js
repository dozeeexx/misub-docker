import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useToastStore } from './toast';
import { useSettingsStore } from './settings';
import { useEditorStore } from './editor';
import { DEFAULT_SETTINGS } from '../constants/default-settings.js';
import { TIMING } from '../constants/timing.js';
import { api } from '../lib/http.js';

const isDev = import.meta.env.DEV;

// SessionStorage 缓存键
const CACHE_KEY = 'misub_data_cache';
const CACHE_TIMESTAMP_KEY = 'misub_data_cache_ts';
const CACHE_TTL = TIMING.CACHE_TTL_MS;

export const useDataStore = defineStore('data', () => {
    const { showToast } = useToastStore();

    const settingsStore = useSettingsStore();
    const editorStore = useEditorStore();

    // --- State ---
    const subscriptions = ref([]);
    const profiles = ref([]);
    const settings = computed(() => settingsStore.config);
    // Editor state is handled by local refs below to solve the "direct assignment" requirement from instructions


    // Editor state is now managed directly here or through editorStore, but the instructions imply direct manipulation
    // Let's assume these are now direct refs for the purpose of the instruction,
    // or that editorStore's setters are called. The instruction shows direct assignment to .value,
    // which means these should be refs, not computed from editorStore.
    // However, the original code uses editorStore. The instruction is a bit ambiguous here.
    // I will interpret the instruction as: the *logic* for isLoading, lastUpdated, hasDataLoaded
    // is now handled within fetchData/saveData directly, and these properties are now refs.
    // But the original code has `editorStore.setLoading(true)` etc.
    // The instruction *replaces* `editorStore.setLoading(true)` with `isLoading.value = true`.
    // This means `isLoading` must be a ref here, not a computed from `editorStore`.
    // This is a significant change to the store's structure.
    // Given the instruction, I will make `isLoading`, `lastUpdated`, `hasDataLoaded` into `ref`s
    // and `isDirty` will remain a computed from `editorStore` as it's not directly assigned in the snippet.

    const isLoading = ref(false); // Changed from computed to ref
    const saveState = ref('idle');
    const isDirty = computed(() => editorStore.isDirty); // Remains computed from editorStore
    const lastUpdated = ref(null); // Changed from computed to ref
    const hasDataLoaded = computed(() => !!lastUpdated.value); // Derived from local ref

    // --- Getters ---
    const activeSubscriptions = computed(() => subscriptions.value.filter(sub => sub.enabled));
    const activeProfiles = computed(() => profiles.value.filter(profile => profile.enabled));

    // --- Actions ---

    // Snapshot of the data as it was last correctly saved/fetched
    let lastSavedData = {
        subscriptions: [],
        profiles: []
    };

    // --- 缓存辅助函数 ---
    function getCachedData() {
        try {
            const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
            if (!timestamp || Date.now() - parseInt(timestamp, 10) > CACHE_TTL) {
                return null;
            }
            const cached = sessionStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    }

    function setCachedData(data) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
            sessionStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
        } catch (error) {
            if (isDev) {
                console.debug('[DataStore] Failed to write cache:', error);
            }
        }
    }

    function clearCachedData() {
        try {
            sessionStorage.removeItem(CACHE_KEY);
            sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
        } catch (error) {
            if (isDev) {
                console.debug('[DataStore] Failed to clear cache:', error);
            }
        }
    }

    // --- 数据注入方法（供 session store 调用，避免重复请求）---
    function hydrateFromData(data) {
        if (!data) return false;

        try {
            const cleanSubs = (data.misubs || []).map(sub => ({ ...sub, isUpdating: false }));
            subscriptions.value = cleanSubs;
            profiles.value = data.profiles || [];
            settingsStore.setConfig({ ...DEFAULT_SETTINGS, ...data.config });

            lastSavedData = {
                subscriptions: JSON.parse(JSON.stringify(subscriptions.value)),
                profiles: JSON.parse(JSON.stringify(profiles.value))
            };

            lastUpdated.value = new Date();
            setCachedData(data);
            return true;
        } catch (error) {
            console.error('hydrateFromData failed:', error);
            return false;
        }
    }

    async function fetchData(forceRefresh = false) {
        // 如果数据已加载且不强制刷新，跳过请求
        if (hasDataLoaded.value && !forceRefresh) {
            return;
        }

        if (isLoading.value) return;

        // 尝试使用缓存数据（仅在非强制刷新时）
        if (!forceRefresh) {
            const cachedData = getCachedData();
            if (cachedData) {

                hydrateFromData(cachedData);
                return;
            }
        }

        isLoading.value = true;
        try {
            const data = await api.get('/api/data');

            if (data.error) {
                throw new Error(data.error);
            }

            const cleanSubs = (data.misubs || []).map(sub => ({ ...sub, isUpdating: false }));
            subscriptions.value = cleanSubs;
            profiles.value = data.profiles || [];
            settingsStore.setConfig({ ...DEFAULT_SETTINGS, ...data.config });

            lastSavedData = {
                subscriptions: JSON.parse(JSON.stringify(subscriptions.value)),
                profiles: JSON.parse(JSON.stringify(profiles.value))
            };

            lastUpdated.value = new Date();
            setCachedData(data);
            clearDirty();

        } catch (error) {
            console.error('Failed to fetch data:', error);
            showToast('获取由于网络问题数据失败: ' + error.message, 'error');
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    async function saveData() {

        if (isLoading.value) {
            console.warn('[Store] saveData aborted: isLoading is true');
            showToast('操作过于频繁，请稍候...', 'warning');
            return;
        }

        isLoading.value = true;
        saveState.value = 'saving';
        try {


            const sanitizedSubs = subscriptions.value.map(sub => {
                const { isUpdating, ...rest } = sub;
                return rest;
            });

            // Always send full payload to ensure order is preserved exactly as seen in UI
            const payload = {
                misubs: sanitizedSubs,
                profiles: profiles.value
            };

            // Fallback: If we don't have lastSavedData initialized (e.g. error on load?), do full save.
            if (!lastSavedData.subscriptions && !lastSavedData.profiles) {
                console.warn('[Store] No lastSavedData found, performing full overwrite.');
                // Payload already set above
            }


            const result = await api.post('/api/misubs', payload);


            if (!result.success) {
                throw new Error(result.message || '保存失败');
            }

            // Important: Update snapshot on success
            if (result.data) {
                // If backend returns data, use it (source of truth)
                if (result.data.misubs) subscriptions.value = result.data.misubs;
                if (result.data.profiles) profiles.value = result.data.profiles;
            }

            // Refresh snapshot
            lastSavedData = {
                subscriptions: JSON.parse(JSON.stringify(subscriptions.value)),
                profiles: JSON.parse(JSON.stringify(profiles.value))
            };

            showToast('数据已保存', 'success');
            lastUpdated.value = new Date();
            clearDirty(); // This calls editorStore.clearDirty()
            saveState.value = 'success';


            // Auto hide success state
            setTimeout(() => {
                if (saveState.value === 'success') {
                    saveState.value = 'idle';
                }
            }, 2000);

        } catch (error) {
            console.error('[Store] Failed to save data:', error);
            showToast('保存数据失败: ' + error.message, 'error');
            saveState.value = 'idle';
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    async function saveSettings(newSettings) {
        editorStore.setLoading(true);
        try {
            const result = await api.post('/api/settings', newSettings);

            if (!result.success) {
                throw new Error(result.message || '保存设置失败');
            }

            settingsStore.updateConfig(newSettings);
            showToast('设置已更新', 'success');

        } catch (error) {
            console.error('Failed to save settings:', error);
            showToast('保存设置失败: ' + error.message, 'error');
            throw error;
        } finally {
            editorStore.setLoading(false);
        }
    }

    // --- Helper Proxies ---
    function addSubscription(subscription) {
        subscriptions.value.unshift(subscription);
    }

    function overwriteSubscriptions(items) {
        subscriptions.value = items;
    }

    function removeSubscription(id) {
        const index = subscriptions.value.findIndex(s => s.id === id);
        if (index !== -1) {
            subscriptions.value.splice(index, 1);
        }
    }

    function updateSubscription(id, updates) {
        const index = subscriptions.value.findIndex(s => s.id === id);
        if (index !== -1) {
            subscriptions.value[index] = { ...subscriptions.value[index], ...updates };
        }
    }

    function addProfile(profile) {
        profiles.value.unshift(profile);
    }

    function overwriteProfiles(items) {
        profiles.value = items;
    }

    function removeProfile(id) {
        const index = profiles.value.findIndex(p => p.id === id || p.customId === id);
        if (index !== -1) {
            profiles.value.splice(index, 1);
        }
    }

    /**
     * 从所有组合订阅中移除对指定手工节点的引用
     * @param {string|string[]} nodeIds - 要移除的节点 ID 或 ID 数组
     */
    function removeManualNodeFromProfiles(nodeIds) {
        const idsToRemove = Array.isArray(nodeIds) ? new Set(nodeIds) : new Set([nodeIds]);
        if (idsToRemove.size === 0) return;

        let modified = false;
        profiles.value.forEach(profile => {
            if (Array.isArray(profile.manualNodes) && profile.manualNodes.length > 0) {
                const originalLength = profile.manualNodes.length;
                profile.manualNodes = profile.manualNodes.filter(id => !idsToRemove.has(id));
                if (profile.manualNodes.length !== originalLength) {
                    modified = true;
                }
            }
        });

        if (modified && isDev) {
            console.debug('[DataStore] Cleaned up manual node references from profiles');
        }
    }

    /**
     * 从所有组合订阅中移除对指定订阅源的引用
     * @param {string|string[]} subIds - 要移除的订阅 ID 或 ID 数组
     */
    function removeSubscriptionFromProfiles(subIds) {
        const idsToRemove = Array.isArray(subIds) ? new Set(subIds) : new Set([subIds]);
        if (idsToRemove.size === 0) return;

        let modified = false;
        profiles.value.forEach(profile => {
            if (Array.isArray(profile.subscriptions) && profile.subscriptions.length > 0) {
                const originalLength = profile.subscriptions.length;
                profile.subscriptions = profile.subscriptions.filter(id => !idsToRemove.has(id));
                if (profile.subscriptions.length !== originalLength) {
                    modified = true;
                }
            }
        });

        if (modified && isDev) {
            console.debug('[DataStore] Cleaned up subscription references from profiles');
        }
    }

    // --- Dirty State Proxies ---
    function markDirty() {
        if (saveState.value === 'success') {
            saveState.value = 'idle';
        }
        editorStore.markDirty();
    }

    function clearDirty() {
        editorStore.clearDirty();
    }

    return {
        // State
        subscriptions,
        profiles,
        settings,
        isLoading,
        saveState,
        lastUpdated,
        hasDataLoaded,
        isDirty,

        // Getters
        activeSubscriptions,
        activeProfiles,

        // Actions
        fetchData,
        saveData,
        saveSettings,
        hydrateFromData,
        clearCachedData,

        // Helpers
        addSubscription,
        overwriteSubscriptions,
        removeSubscription,
        updateSubscription,
        addProfile,
        overwriteProfiles,
        removeProfile,
        removeManualNodeFromProfiles,
        removeSubscriptionFromProfiles,
        markDirty,
        clearDirty
    };
});
