// FILE: src/composables/useSubscriptions.js
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/useDataStore';
import { useToastStore } from '../stores/toast.js';
import { fetchNodeCount, batchUpdateNodes } from '../lib/api.js';
import { handleError } from '../utils/errorHandler.js';

export function useSubscriptions(markDirty) {
  const { showToast } = useToastStore();
  const dataStore = useDataStore();
  // Rename the store ref to avoid confusion, as it contains ALL items
  const { subscriptions: allSubscriptions } = storeToRefs(dataStore);

  // Filtered computed property: Only http/https links are "Subscriptions"
  const subscriptions = computed(() => {
    return (allSubscriptions.value || []).filter(sub => sub.url && /^https?:\/\//.test(sub.url));
  });

  const subsCurrentPage = ref(1);
  const subsItemsPerPage = 6;

  const enabledSubscriptions = computed(() => subscriptions.value.filter(s => s.enabled));

  const totalRemainingTraffic = computed(() => {
    const REASONABLE_TRAFFIC_LIMIT_BYTES = 10 * 1024 * 1024 * 1024 * 1024 * 1024; // 10 PB in bytes
    return subscriptions.value.reduce((acc, sub) => {
      if (
        sub.enabled &&
        sub.userInfo &&
        sub.userInfo.total > 0 &&
        sub.userInfo.total < REASONABLE_TRAFFIC_LIMIT_BYTES
      ) {
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
    // Use the filtered list for pagination
    return subscriptions.value.slice(start, end);
  });

  function changeSubsPage(page) {
    if (page < 1 || page > subsTotalPages.value) return;
    subsCurrentPage.value = page;
  }

  async function handleUpdateNodeCount(subId, isInitialLoad = false) {
    // Find in the filtered list
    const subToUpdate = subscriptions.value.find(s => s.id === subId);
    if (!subToUpdate) return;
    // Double check URL just in case
    if (!subToUpdate.url.startsWith('http')) return;

    if (!isInitialLoad) {
      subToUpdate.isUpdating = true;
    }

    // 添加超时保护:如果30秒后仍在更新状态,强制重置
    const timeoutId = setTimeout(() => {
      if (subToUpdate.isUpdating) {
        console.warn(`[handleUpdateNodeCount] Timeout protection triggered for ${subToUpdate.name}`);
        subToUpdate.isUpdating = false;
        if (!isInitialLoad) {
          showToast(`${subToUpdate.name || '订阅'} 更新超时,已自动重置`, 'warning');
        }
      }
    }, 30000); // 30秒超时保护

    try {
      const data = await fetchNodeCount(subToUpdate.url);

      // 清除超时保护
      clearTimeout(timeoutId);

      // 更明确的错误检测:检查 error 字段
      if (data.error || data.errorType) {
        let userMessage = `${subToUpdate.name || '订阅'} 更新失败`;

        // 根据 errorType 提供更友好的错误提示
        switch (data.errorType) {
          case 'timeout':
            userMessage = `${subToUpdate.name || '订阅'} 更新超时,请稍后重试`;
            break;
          case 'network':
            userMessage = `${subToUpdate.name || '订阅'} 网络连接失败`;
            break;
          case 'server':
            userMessage = `${subToUpdate.name || '订阅'} 服务器错误`;
            break;
          case 'fetch_failed':
            userMessage = `${subToUpdate.name || '订阅'} 订阅获取失败,请检查链接是否有效`;
            break;
          case 'processing_error':
            userMessage = `${subToUpdate.name || '订阅'} 处理失败`;
            break;
          default:
            userMessage = `${subToUpdate.name || '订阅'} 更新失败: ${data.error}`;
        }

        if (!isInitialLoad) showToast(userMessage, 'error');
        console.error(`[handleUpdateNodeCount] Failed for ${subToUpdate.name}:`, data.error);

        // 失败时不调用 markDirty(),避免误导用户
      } else {
        // 成功获取数据
        // Direct mutation works because subToUpdate is a reactive object from the store
        subToUpdate.nodeCount = data.count || 0;
        subToUpdate.userInfo = data.userInfo || null;

        if (!isInitialLoad) {
          showToast(`${subToUpdate.name || '订阅'} 更新成功！`, 'success');
          markDirty();
        }
      }
    } catch (error) {
      // 清除超时保护
      clearTimeout(timeoutId);

      handleError(error, 'Subscription Update Error', {
        subscriptionName: subToUpdate.name,
        subscriptionId: subId,
        isInitialLoad
      });

      const errorMessage = `${subToUpdate.name || '订阅'} 更新过程中发生错误`;
      if (!isInitialLoad) {
        showToast(errorMessage, 'error');
      }
    } finally {
      if (subToUpdate) subToUpdate.isUpdating = false;
    }
  }

  function addSubscription(sub) {
    dataStore.addSubscription(sub);
    subsCurrentPage.value = 1;
    handleUpdateNodeCount(sub.id);
    markDirty();
  }

  function updateSubscription(updatedSub) {
    // Verify it exists in our filtered list
    const originalSub = subscriptions.value.find(s => s.id === updatedSub.id);
    if (originalSub) {
      const urlChanged = originalSub.url !== updatedSub.url;
      dataStore.updateSubscription(updatedSub.id, updatedSub);

      if (urlChanged) {
        // Re-fetch from filtered list to get the reactive object
        const sub = subscriptions.value.find(s => s.id === updatedSub.id);
        if (sub) {
          sub.nodeCount = 0;
          handleUpdateNodeCount(sub.id);
        }
      }
      markDirty();
    }
  }

  function deleteSubscription(subId) {
    dataStore.removeSubscription(subId);
    if (paginatedSubscriptions.value.length === 0 && subsCurrentPage.value > 1) {
      subsCurrentPage.value--;
    }
    markDirty();
  }

  function deleteAllSubscriptions() {
    // Only remove the subscriptions visible in this composable (i.e. HTTP subs)
    // Avoid removing manual nodes which are also in dataStore but filtered out here
    const idsToRemove = subscriptions.value.map(s => s.id);
    idsToRemove.forEach(id => dataStore.removeSubscription(id));

    subsCurrentPage.value = 1;
    markDirty();
  }

  async function addSubscriptionsFromBulk(subs) {
    // Reverse insert to maintain order
    for (let i = subs.length - 1; i >= 0; i--) {
      dataStore.addSubscription(subs[i]);
    }
    markDirty();

    const subsToUpdate = subs.filter(sub => sub.url && sub.url.startsWith('http'));

    if (subsToUpdate.length > 0) {
      showToast(`正在批量更新 ${subsToUpdate.length} 个订阅...`, 'success');

      try {
        const result = await batchUpdateNodes(subsToUpdate.map(sub => sub.id));

        if (result.success) {
          let successCount = 0;
          result.results.forEach(updateResult => {
            if (updateResult.success) {
              // Find in filtered list
              const sub = subscriptions.value.find(s => s.id === updateResult.id);
              if (sub) {
                sub.nodeCount = updateResult.nodeCount;
                successCount++;
              }
            }
          });

          showToast(`批量更新完成！成功更新 ${successCount}/${subsToUpdate.length} 个订阅`, 'success');
          markDirty();
        } else {
          showToast(`批量更新失败: ${result.message}`, 'error');
          showToast('正在降级到逐个更新模式...', 'info');
          for (const sub of subsToUpdate) {
            await handleUpdateNodeCount(sub.id);
          }
        }
      } catch (error) {
        handleError(error, 'Batch Subscription Update Error', {
          subscriptionCount: subsToUpdate.length,
          hasInitialData: !!subs
        });

        let userMessage = '批量更新失败';
        if (error.message.includes('timeout') || error.name === 'AbortError') {
          userMessage = '批量更新超时，正在降级到逐个更新...';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          userMessage = '网络连接失败，正在降级到逐个更新...';
        } else {
          userMessage = '批量更新发生错误，正在降级到逐个更新...';
        }
        showToast(userMessage, 'error');

        for (const sub of subsToUpdate) {
          await handleUpdateNodeCount(sub.id);
        }
      }
    } else {
      showToast('批量导入完成！', 'success');
    }
  }

  async function batchUpdateAllSubscriptions() {
    const subsToUpdate = subscriptions.value.filter(sub =>
      sub.enabled && sub.url && sub.url.startsWith('http') && !sub.isUpdating
    );

    if (subsToUpdate.length === 0) {
      showToast('没有可刷新的订阅', 'info');
      return;
    }

    subsToUpdate.forEach(sub => { sub.isUpdating = true; });
    showToast(`正在刷新 ${subsToUpdate.length} 个订阅...`, 'info');

    try {
      const result = await batchUpdateNodes(subsToUpdate.map(sub => sub.id));

      if (result && result.success) {
        let successCount = 0;
        const resultList = Array.isArray(result.results) ? result.results : [];

        resultList.forEach(updateResult => {
          const id = updateResult.subscriptionId || updateResult.id;
          const sub = subscriptions.value.find(s => s.id === id);
          if (!sub) return;

          if (updateResult.success) {
            sub.nodeCount = updateResult.nodeCount || 0;
            successCount++;
          }
        });

        for (const sub of subsToUpdate) {
          try {
            const data = await fetchNodeCount(sub.url);
            if (!data?.error && data.userInfo) {
              sub.userInfo = data.userInfo;
            }
          } catch {
            // ignore
          }
        }

        const failedCount = subsToUpdate.length - successCount;
        showToast(`全部刷新完成：成功 ${successCount}/${subsToUpdate.length}，失败 ${failedCount}`, 'success');
        markDirty();
      } else {
        showToast(`全部刷新失败: ${result?.message || '未知错误'}`, 'error');
        for (const sub of subsToUpdate) {
          await handleUpdateNodeCount(sub.id);
        }
      }
    } catch (error) {
      handleError(error, 'Batch Subscription Update Error', { subscriptionCount: subsToUpdate.length });
      showToast('全部刷新失败，正在降级逐个更新...', 'error');
      for (const sub of subsToUpdate) {
        await handleUpdateNodeCount(sub.id);
      }
    } finally {
      subsToUpdate.forEach(sub => { sub.isUpdating = false; });
    }
  }

  // ========== 定时自动更新功能 ==========
  const AUTO_UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30分钟
  let autoUpdateTimerId = null;

  async function autoUpdateAllSubscriptions() {
    try {
      const subsToUpdate = subscriptions.value.filter(sub =>
        sub.enabled && sub.url && sub.url.startsWith('http') && !sub.isUpdating
      );
      for (const sub of subsToUpdate) {
        await handleUpdateNodeCount(sub.id, true);
      }
    } catch (e) {
      console.error('Auto update failed', e);
    }
  }

  function startAutoUpdate() {
    if (autoUpdateTimerId) return;
    autoUpdateTimerId = setInterval(() => {
      void autoUpdateAllSubscriptions();
    }, AUTO_UPDATE_INTERVAL_MS);
  }

  function stopAutoUpdate() {
    if (autoUpdateTimerId) {
      clearInterval(autoUpdateTimerId);
      autoUpdateTimerId = null;
    }
  }

  function reorderSubscriptions(newOrder) {
    // 1. Get all Manual Nodes (to preserve them)
    // We can't rely just on manualNodes computed because it might be filtered or not imported here.
    // Instead, filter from source of truth: allSubscriptions
    const currentManualNodes = (allSubscriptions.value || []).filter(item => !item.url || !/^https?:\/\//.test(item.url));

    // 2. Combine New Ordered Subscriptions + Existing Manual Nodes
    // Logic: Keep Subscriptions at top, Manual Nodes at bottom
    const mergedList = [...newOrder, ...currentManualNodes];

    // 3. Update Store
    dataStore.overwriteSubscriptions(mergedList);

    // 4. Mark Dirty
    markDirty();
  }

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
    batchUpdateAllSubscriptions,
    startAutoUpdate,
    stopAutoUpdate,
    reorderSubscriptions, // Added
  };
}