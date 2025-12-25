import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useToastStore } from './toast';
import { useSubscriptionStore } from './subscriptions';
import { useProfileStore } from './profiles';
import { useSettingsStore } from './settings';
import { useEditorStore } from './editor';
import { calculateDiff } from '../lib/diff.js';
import { DEFAULT_SETTINGS } from '../constants/default-settings.js';

// SessionStorage 缓存键
const CACHE_KEY = 'misub_data_cache';
const CACHE_TIMESTAMP_KEY = 'misub_data_cache_ts';
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存有效期

export const useDataStore = defineStore('data', () => {
    const { showToast } = useToastStore();

    // Sub-stores
    const subscriptionStore = useSubscriptionStore();
    const profileStore = useProfileStore();
    const settingsStore = useSettingsStore();
    const editorStore = useEditorStore();

    // --- State Proxies (maintain reactivity for storeToRefs) ---
    const subscriptions = computed(() => subscriptionStore.items);
    const profiles = computed(() => profileStore.items);
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
    const activeSubscriptions = computed(() => subscriptionStore.activeItems);
    const activeProfiles = computed(() => profileStore.activeItems);

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
        } catch {
            // 忽略存储错误
        }
    }

    function clearCachedData() {
        try {
            sessionStorage.removeItem(CACHE_KEY);
            sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
        } catch {
            // 忽略错误
        }
    }

    // --- 数据注入方法（供 session store 调用，避免重复请求）---
    function hydrateFromData(data) {
        if (!data) return false;

        try {
            const cleanSubs = (data.misubs || []).map(sub => ({ ...sub, isUpdating: false }));
            subscriptionStore.setItems(cleanSubs);
            profileStore.setItems(data.profiles || []);
            settingsStore.setConfig({ ...DEFAULT_SETTINGS, ...data.config });

            lastSavedData = {
                subscriptions: JSON.parse(JSON.stringify(subscriptionStore.items)),
                profiles: JSON.parse(JSON.stringify(profileStore.items))
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
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const cleanSubs = (data.misubs || []).map(sub => ({ ...sub, isUpdating: false }));
            subscriptionStore.setItems(cleanSubs);
            profileStore.setItems(data.profiles || []);
            settingsStore.setConfig({ ...DEFAULT_SETTINGS, ...data.config });

            lastSavedData = {
                subscriptions: JSON.parse(JSON.stringify(subscriptionStore.items)),
                profiles: JSON.parse(JSON.stringify(profileStore.items))
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


            const sanitizedSubs = subscriptionStore.items.map(sub => {
                const { isUpdating, ...rest } = sub;
                return rest;
            });

            // Always send full payload to ensure order is preserved exactly as seen in UI
            const payload = {
                misubs: sanitizedSubs,
                profiles: profileStore.items
            };
            const isDiffSave = false;

            /* Diff logic removed to fix ordering issue
            // Calculate diffs
            const subDiff = calculateDiff(lastSavedData.subscriptions, subscriptionStore.items);
            const profileDiff = calculateDiff(lastSavedData.profiles, profileStore.items);

            let payload = {};
            let isDiffSave = false;

            if (subDiff || profileDiff) {
                console.log('[Store] Diff detect:', { subDiff, profileDiff });
                payload = {
                    diff: {
                        subscriptions: subDiff || undefined,
                        profiles: profileDiff || undefined
                    }
                };
                isDiffSave = true;
            } else {
                console.log('[Store] No diff detected, but save force called? Sending full overwrite just in case.');
                payload = {
                    misubs: subscriptionStore.items,
                    profiles: profileStore.items
                };
            }
            */

            // Fallback: If we don't have lastSavedData initialized (e.g. error on load?), do full save.
            if (!lastSavedData.subscriptions && !lastSavedData.profiles) {
                console.warn('[Store] No lastSavedData found, performing full overwrite.');
                // Payload already set above
            }


            const response = await fetch('/api/misubs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });


            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();


            if (!result.success) {
                throw new Error(result.message || '保存失败');
            }

            // Important: Update snapshot on success
            if (result.data) {
                // If backend returns data, use it (source of truth)
                if (result.data.misubs) subscriptionStore.setItems(result.data.misubs);
                if (result.data.profiles) profileStore.setItems(result.data.profiles);
            }

            // Refresh snapshot
            lastSavedData = {
                subscriptions: JSON.parse(JSON.stringify(subscriptionStore.items)),
                profiles: JSON.parse(JSON.stringify(profileStore.items))
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
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newSettings)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();

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
        subscriptionStore.add(subscription);
    }

    function overwriteSubscriptions(items) {
        subscriptionStore.setItems(items);
    }

    function removeSubscription(id) {
        subscriptionStore.remove(id);
    }

    function updateSubscription(id, updates) {
        subscriptionStore.update(id, updates);
    }

    function addProfile(profile) {
        profileStore.add(profile);
    }

    function overwriteProfiles(items) {
        profileStore.setItems(items);
    }

    function removeProfile(id) {
        profileStore.remove(id);
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
        // State (Computed proxies)
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
        markDirty,
        clearDirty
    };
});
