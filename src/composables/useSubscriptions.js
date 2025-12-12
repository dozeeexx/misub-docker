// FILE: src/composables/useSubscriptions.js
import { ref, computed, watch } from 'vue';
import { fetchNodeCount, batchUpdateNodes } from '../lib/api.js';
import { useToastStore } from '../stores/toast.js';
import { handleError } from '../utils/errorHandler.js';

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

      if (data.error) {
        // 根据错误类型提供不同的用户提示
        let userMessage = `${subToUpdate.name || '订阅'} 更新失败`;

        switch (data.errorType) {
          case 'timeout':
            userMessage = `${subToUpdate.name || '订阅'} 更新超时，请稍后重试`;
            break;
          case 'network':
            userMessage = `${subToUpdate.name || '订阅'} 网络连接失败`;
            break;
          case 'server':
            userMessage = `${subToUpdate.name || '订阅'} 服务器错误`;
            break;
          default:
            userMessage = `${subToUpdate.name || '订阅'} 更新失败: ${data.error}`;
        }

        if (!isInitialLoad) showToast(userMessage, 'error');
        console.error(`[handleUpdateNodeCount] Failed for ${subToUpdate.name}:`, data.error);
      } else {
        subToUpdate.nodeCount = data.count || 0;
        subToUpdate.userInfo = data.userInfo || null;

        if (!isInitialLoad) {
          showToast(`${subToUpdate.name || '订阅'} 更新成功！`, 'success');
          markDirty();
        }
      }
    } catch (error) {
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
  
  // [优化] 批量導入使用批量更新API，减少KV写入次数
  async function addSubscriptionsFromBulk(subs) {
    subscriptions.value.unshift(...subs);
    markDirty();

    // 过滤出需要更新的订阅（只有http/https链接）
    const subsToUpdate = subs.filter(sub => sub.url && sub.url.startsWith('http'));

    if (subsToUpdate.length > 0) {
      showToast(`正在批量更新 ${subsToUpdate.length} 个订阅...`, 'success');

      try {
        const result = await batchUpdateNodes(subsToUpdate.map(sub => sub.id));

        if (result.success) {
          // 更新本地数据
          let successCount = 0;
          result.results.forEach(updateResult => {
            if (updateResult.success) {
              const sub = subscriptions.value.find(s => s.id === updateResult.id);
              if (sub) {
                sub.nodeCount = updateResult.nodeCount;
                // userInfo会在下次数据同步时更新
                successCount++;
              }
            }
          });

          showToast(`批量更新完成！成功更新 ${successCount}/${subsToUpdate.length} 个订阅`, 'success');
          markDirty(); // 标记需要保存
        } else {
          showToast(`批量更新失败: ${result.message}`, 'error');
          // 降级到逐个更新
          showToast('正在降级到逐个更新模式...', 'info');
          for(const sub of subsToUpdate) {
            await handleUpdateNodeCount(sub.id);
          }
        }
      } catch (error) {
        handleError(error, 'Batch Subscription Update Error', {
          subscriptionCount: subsToUpdate.length,
          hasInitialData: !!subs
        });

        // 分析错误类型并显示相应消息
        let userMessage = '批量更新失败';
        if (error.message.includes('timeout') || error.name === 'AbortError') {
          userMessage = '批量更新超时，正在降级到逐个更新...';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          userMessage = '网络连接失败，正在降级到逐个更新...';
        } else {
          userMessage = '批量更新发生错误，正在降级到逐个更新...';
        }

        showToast(userMessage, 'error');

        // 降级到逐个更新
        for(const sub of subsToUpdate) {
          await handleUpdateNodeCount(sub.id);
        }
      }
    } else {
      showToast('批量导入完成！', 'success');
    }
  }

  watch(initialSubsRef, (newInitialSubs) => {
    initializeSubscriptions(newInitialSubs);
  }, { immediate: true, deep: true });

  // ========== 全部刷新功能 ==========
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

        // 第一步：更新节点数
        resultList.forEach(updateResult => {
          const id = updateResult.subscriptionId || updateResult.id;
          const sub = subscriptions.value.find(s => s.id === id);
          if (!sub) return;

          if (updateResult.success) {
            sub.nodeCount = updateResult.nodeCount || 0;
            successCount++;
          }
        });

        // 第二步：静默获取流量信息（批量API不返回userInfo）
        for (const sub of subsToUpdate) {
          try {
            const data = await fetchNodeCount(sub.url);
            if (!data?.error && data.userInfo) {
              sub.userInfo = data.userInfo;
            }
          } catch {
            // 静默更新：忽略单个订阅的流量获取失败
          }
        }

        const failedCount = subsToUpdate.length - successCount;
        showToast(`全部刷新完成：成功 ${successCount}/${subsToUpdate.length}，失败 ${failedCount}`, 'success');
        markDirty();
      } else {
        showToast(`全部刷新失败: ${result?.message || '未知错误'}`, 'error');
        // 降级：逐个更新
        for (const sub of subsToUpdate) {
          await handleUpdateNodeCount(sub.id);
        }
      }
    } catch (error) {
      handleError(error, 'Batch Subscription Update Error', {
        subscriptionCount: subsToUpdate.length
      });
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
  let autoUpdateRunning = false;

  async function autoUpdateAllSubscriptions() {
    if (autoUpdateRunning) return;
    autoUpdateRunning = true;
    try {
      // 过滤掉正在更新的订阅，避免并发冲突
      const subsToUpdate = subscriptions.value.filter(sub =>
        sub.enabled && sub.url && sub.url.startsWith('http') && !sub.isUpdating
      );
      for (const sub of subsToUpdate) {
        await handleUpdateNodeCount(sub.id, true); // 静默更新，不显示toast
      }
      // 静默更新不触发 markDirty，避免每30分钟弹出"未保存"提示
      // 用户手动刷新时会触发 markDirty
    } finally {
      autoUpdateRunning = false;
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
  };
}