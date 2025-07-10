// FILE: src/composables/useSubscriptions.js
import { ref, computed, watch } from 'vue';
import { fetchNodeCount } from '../lib/api.js';
import { useToastStore } from '../stores/toast.js';

export function useSubscriptions(initialSubsRef, markDirty) {
  const { showToast } = useToastStore();
  const subscriptions = ref([]);
  const subsCurrentPage = ref(1);
  const subsItemsPerPage = 6;

  function initializeSubscriptions(subsData) {
    subscriptions.value = (subsData || []).map(sub => ({
      ...sub,
      id: sub.id || crypto.randomUUID(),
      enabled: sub.enabled ?? true,
      nodeCount: sub.nodeCount || 0,
      isUpdating: false,
      userInfo: sub.userInfo || null,
      exclude: sub.exclude || '', // 新增 exclude 属性
    }));
    // [最終修正] 移除此處的自動更新迴圈，以防止本地開發伺服器因併發請求過多而崩潰。
    // subscriptions.value.forEach(sub => handleUpdateNodeCount(sub.id, true)); 
  }

  const enabledSubscriptions = computed(() => subscriptions.value.filter(s => s.enabled));
  
  const totalRemainingTraffic = computed(() => {
    return subscriptions.value.reduce((acc, sub) => {
      if (sub.enabled && sub.userInfo && sub.userInfo.total > 0) {
        const used = (sub.userInfo.upload || 0) + (sub.userInfo.download || 0);
        const remaining = sub.userInfo.total - used;
        return acc + Math.max(0, remaining);
      }
      return acc;
    }, 0);
  });

  const subsTotalPages = computed(() => Math.ceil(subscriptions.value.length / subsItemsPerPage));
  const paginatedSubscriptions = computed(() => {
    const start = (subsCurrentPage.value - 1) * subsItemsPerPage;
    const end = start + subsItemsPerPage;
    return subscriptions.value.slice(start, end);
  });

  function changeSubsPage(page) {
    if (page < 1 || page > subsTotalPages.value) return;
    subsCurrentPage.value = page;
  }

  async function handleUpdateNodeCount(subId, isInitialLoad = false) {
    const subToUpdate = subscriptions.value.find(s => s.id === subId);
    if (!subToUpdate || !subToUpdate.url.startsWith('http')) return;
    
    if (!isInitialLoad) {
        subToUpdate.isUpdating = true;
    }

    try {
      const data = await fetchNodeCount(subToUpdate.url);
      subToUpdate.nodeCount = data.count || 0;
      subToUpdate.userInfo = data.userInfo || null;
      
      if (!isInitialLoad) {
        showToast(`${subToUpdate.name || '订阅'} 更新成功！`, 'success');
        markDirty();
      }
    } catch (error) {
      if (!isInitialLoad) showToast(`${subToUpdate.name || '订阅'} 更新失败`, 'error');
      console.error(`Failed to fetch node count for ${subToUpdate.name}:`, error);
    } finally {
      subToUpdate.isUpdating = false;
    }
  }

  function addSubscription(sub) {
    subscriptions.value.unshift(sub);
    subsCurrentPage.value = 1;
    handleUpdateNodeCount(sub.id); // 新增時自動更新單個
    markDirty();
  }

  function updateSubscription(updatedSub) {
    const index = subscriptions.value.findIndex(s => s.id === updatedSub.id);
    if (index !== -1) {
      if (subscriptions.value[index].url !== updatedSub.url) {
        updatedSub.nodeCount = 0;
        handleUpdateNodeCount(updatedSub.id); // URL 變更時自動更新單個
      }
      subscriptions.value[index] = updatedSub;
      markDirty();
    }
  }

  function deleteSubscription(subId) {
    subscriptions.value = subscriptions.value.filter((s) => s.id !== subId);
    if (paginatedSubscriptions.value.length === 0 && subsCurrentPage.value > 1) {
      subsCurrentPage.value--;
    }
    markDirty();
  }

  function deleteAllSubscriptions() {
    subscriptions.value = [];
    subsCurrentPage.value = 1;
    markDirty();
  }
  
  // [修正] 批量導入後也逐個更新，防止併發問題
  async function addSubscriptionsFromBulk(subs) {
    subscriptions.value.unshift(...subs);
    markDirty();
    showToast('正在後台逐一更新導入的訂閱...', 'success');
    for(const sub of subs) {
        await handleUpdateNodeCount(sub.id);
    }
    showToast('批量導入的訂閱已全部更新完畢!', 'success');
  }

  watch(initialSubsRef, (newInitialSubs) => {
    initializeSubscriptions(newInitialSubs);
  }, { immediate: true, deep: true });

  return {
    subscriptions,
    subsCurrentPage,
    subsTotalPages,
    paginatedSubscriptions,
    totalRemainingTraffic,
    enabledSubscriptionsCount: computed(() => enabledSubscriptions.value.length),
    changeSubsPage,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    deleteAllSubscriptions,
    addSubscriptionsFromBulk,
    handleUpdateNodeCount,
  };
}