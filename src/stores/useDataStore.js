import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useToastStore } from './toast';
import { DEFAULT_SETTINGS } from '@/constants/default-settings';

export const useDataStore = defineStore('data', () => {
    const { showToast } = useToastStore();

    // 状态
    const subscriptions = ref([]);
    const profiles = ref([]);
    const settings = ref({ ...DEFAULT_SETTINGS });
    const isLoading = ref(false);
    const lastUpdated = ref(null);
    const hasDataLoaded = ref(false);

    // Getters
    const activeSubscriptions = computed(() => subscriptions.value.filter(sub => sub.enabled));
    const activeProfiles = computed(() => profiles.value.filter(profile => profile.enabled));

    // Actions
    async function fetchData() {
        if (isLoading.value) return;

        isLoading.value = true;
        try {
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            subscriptions.value = data.misubs || [];
            profiles.value = data.profiles || [];
            // 合并默认设置，确保新字段存在
            settings.value = { ...DEFAULT_SETTINGS, ...data.config };

            lastUpdated.value = new Date();
            hasDataLoaded.value = true;

        } catch (error) {
            console.error('Failed to fetch data:', error);
            showToast('获取由于网络问题数据失败: ' + error.message, 'error');
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    async function saveData() {
        console.log('[Store] saveData called. isLoading:', isLoading.value);
        if (isLoading.value) {
            console.warn('[Store] saveData aborted: isLoading is true');
            showToast('操作过于频繁，请稍候...', 'warning');
            return;
        }

        isLoading.value = true;
        try {
            console.log('[Store] saveData: preparing payload...');
            const payload = {
                misubs: subscriptions.value,
                profiles: profiles.value
            };

            console.log('[Store] saveData: sending fetch request...');
            const response = await fetch('/api/misubs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('[Store] saveData: response status:', response.status);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
            console.log('[Store] saveData: result:', result);

            if (!result.success) {
                throw new Error(result.message || '保存失败');
            }

            showToast('数据已保存', 'success');
            lastUpdated.value = new Date();
            clearDirty();
            console.log('[Store] saveData: success, dirty cleared.');

        } catch (error) {
            console.error('[Store] Failed to save data:', error);
            showToast('保存数据失败: ' + error.message, 'error');
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    async function saveSettings(newSettings) {
        isLoading.value = true;
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

            settings.value = { ...settings.value, ...newSettings };
            showToast('设置已更新', 'success');

        } catch (error) {
            console.error('Failed to save settings:', error);
            showToast('保存设置失败: ' + error.message, 'error');
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    // 辅助方法
    function addSubscription(subscription) {
        subscriptions.value.unshift(subscription);
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

    // 订阅组辅助方法
    function addProfile(profile) {
        profiles.value.unshift(profile);
    }

    function removeProfile(id) {
        const index = profiles.value.findIndex(p => p.id === id || p.customId === id);
        if (index !== -1) {
            profiles.value.splice(index, 1);
        }
    }

    // 标记数据变更（用于触发保存提示等，如果需要）
    const isDirty = ref(false);
    function markDirty() {
        isDirty.value = true;
    }
    function clearDirty() {
        isDirty.value = false;
    }

    return {
        // State
        subscriptions,
        profiles,
        settings,
        isLoading,
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
        addSubscription,
        removeSubscription,
        updateSubscription,
        addProfile,
        removeProfile,
        markDirty,
        clearDirty
    };
});
