<script setup>
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { extractNodeName } from '../../../lib/utils.js';
import { useToastStore } from '../../../stores/toast.js';
import { useUIStore } from '../../../stores/ui.js';
import { useDataStore } from '../../../stores/useDataStore.js'; // Added
import { useSubscriptions } from '../../../composables/useSubscriptions.js';
import { useManualNodes } from '../../../composables/useManualNodes.js';
import { useProfiles } from '../../../composables/useProfiles.js';
import { useSubscriptionForms } from '../../../composables/useSubscriptionForms.js';
import { useNodeForms } from '../../../composables/useNodeForms.js';
import { useBulkImportLogic } from '../../../composables/useBulkImportLogic.js';
import { storeToRefs } from 'pinia'; // Added

// --- Component Imports ---
import RightPanel from '../../profiles/RightPanel.vue';
import ProfilePanel from '../../profiles/ProfilePanel.vue';
import SubscriptionPanel from '../../subscriptions/SubscriptionPanel.vue';
import ManualNodePanel from '../../nodes/ManualNodePanel.vue';
import Modal from '../../forms/Modal.vue';
import SkeletonLoader from '../../ui/SkeletonLoader.vue';
import StatusIndicator from '../../ui/StatusIndicator.vue';

const SettingsModal = defineAsyncComponent(() => import('../../modals/SettingsModal.vue'));
const BulkImportModal = defineAsyncComponent(() => import('../../modals/BulkImportModal.vue'));
const ProfileModal = defineAsyncComponent(() => import('../../modals/ProfileModal.vue'));
const SubscriptionImportModal = defineAsyncComponent(() => import('../../modals/SubscriptionImportModal.vue'));
const LogModal = defineAsyncComponent(() => import('../../modals/LogModal.vue'));
const NodePreviewModal = defineAsyncComponent(() => import('../../modals/NodePreview/NodePreviewModal.vue'));

// --- 基礎 Props 和狀態 ---
const props = defineProps({ data: Object });
const { showToast } = useToastStore();
const uiStore = useUIStore();
const dataStore = useDataStore();
const { settings, isDirty, isLoading } = storeToRefs(dataStore); // Use store refs
const config = settings; // Compatibility alias for template
const { clearDirty } = dataStore; // Don't destructure markDirty directly
console.log('Dashboard: setup running');

const saveState = ref('idle');

// Wrapper for markDirty to also reset saveState
const markDirty = () => {
    dataStore.markDirty();
    saveState.value = 'idle';
};

// --- 將狀態和邏輯委託給 Composables ---
// Composables now use global store, so we don't pass refs
// --- UI State ---
const isSortingSubs = ref(false);
const isSortingNodes = ref(false);
const manualNodeViewMode = ref('card');

const {
  subscriptions, subsCurrentPage, subsTotalPages, paginatedSubscriptions, totalRemainingTraffic,
  changeSubsPage, addSubscription, updateSubscription, deleteSubscription, deleteAllSubscriptions,
  addSubscriptionsFromBulk, handleUpdateNodeCount, batchUpdateAllSubscriptions, startAutoUpdate, stopAutoUpdate,
  reorderSubscriptions, 
} = useSubscriptions(markDirty);

const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes, searchTerm,
  changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes,
  addNodesFromBulk, autoSortNodes, deduplicateNodes,
  reorderManualNodes, activeColorFilter, setColorFilter, batchUpdateColor, batchDeleteNodes
} = useManualNodes(markDirty);

const {
  profiles, editingProfile, isNewProfile, showProfileModal, showDeleteProfilesModal,
  initializeProfiles, handleProfileToggle, handleAddProfile, handleEditProfile,
  handleSaveProfile, handleDeleteProfile, handleDeleteAllProfiles, copyProfileLink,
  cleanupSubscriptions, cleanupNodes, cleanupAllSubscriptions, cleanupAllNodes,
} = useProfiles(markDirty);
// --- UI State ---

// --- New Form Logic Composables ---
const {
  showModal: showSubModal,
  isNew: isNewSubscription,
  editingSubscription,
  openAdd: handleAddSubscription,
  openEdit: handleEditSubscription,
  handleSave: handleSaveSubscription
} = useSubscriptionForms({ addSubscription, updateSubscription });

const {
  showModal: showNodeModal,
  isNew: isNewNode,
  editingNode,
  openAdd: handleAddNode,
  openEdit: handleEditNode,
  handleUrlInput: handleNodeUrlInput,
  handleSave: handleSaveNode
} = useNodeForms({ addNode, updateNode });

const {
  showModal: showBulkImportModal,
  handleBulkImport
} = useBulkImportLogic({ addSubscriptionsFromBulk, addNodesFromBulk });

// --- UI State ---
const showDeleteSubsModal = ref(false);
const showDeleteNodesModal = ref(false);
const showSubscriptionImportModal = ref(false);
const showLogModal = ref(false);
const showBatchDeleteModal = ref(false);
const batchDeleteIds = ref([]);

// 节点预览相关状态
const showNodePreviewModal = ref(false);
const previewSubscriptionId = ref(null);
const previewProfileId = ref(null);
const previewSubscriptionName = ref('');
const previewSubscriptionUrl = ref('');
const previewProfileName = ref('');


// --- 初始化與生命週期 ---
const initializeState = async () => {
    console.log('Dashboard: initializeState started');
    try {
        // fetchData 内部会检查数据是否已加载，避免重复请求
        await dataStore.fetchData();
        console.log('Dashboard: fetchData completed', {
            subs: subscriptions.value?.length,
            nodes: manualNodes.value?.length
        });
        clearDirty();
    } catch (e) {
        console.error('Dashboard: initializeState error', e);
    }
};

const handleBeforeUnload = (event) => {
  if (isDirty.value) {
    event.preventDefault();
    event.returnValue = '您有未保存的更改，確定要离开嗎？';
  }
};

onMounted(() => {
  initializeState();
  window.addEventListener('beforeunload', handleBeforeUnload);
  const savedViewMode = localStorage.getItem('manualNodeViewMode');
  if (savedViewMode) {
    manualNodeViewMode.value = savedViewMode;
  }
  // 启动订阅自动更新定时器（每30分钟）
  startAutoUpdate();
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  // 停止订阅自动更新定时器
  stopAutoUpdate();
});

const setViewMode = (mode) => {
  manualNodeViewMode.value = mode;
  localStorage.setItem('manualNodeViewMode', mode);
};

// --- 其他 JS 逻辑 (省略) ---
const handleDiscard = async () => {
  // 强制刷新数据，忽略缓存
  await dataStore.fetchData(true);
  showToast('已放弃所有未保存的更改');
};

const handleSave = async () => {
  saveState.value = 'saving';
  
  try {
     await dataStore.saveData();
     
     saveState.value = 'success';
     
     if (isSortingNodes.value) isSortingNodes.value = false;
     
     setTimeout(() => { saveState.value = 'idle'; }, 1500);

  } catch (error) {
     saveState.value = 'idle';
  }
};


const handleDeleteSubscriptionWithCleanup = (subId) => {
  deleteSubscription(subId);
  cleanupSubscriptions(subId);
};
const handleDeleteNodeWithCleanup = (nodeId) => {
  deleteNode(nodeId);
  cleanupNodes(nodeId);
};
const handleDeleteAllSubscriptionsWithCleanup = () => {
  deleteAllSubscriptions();
  cleanupAllSubscriptions();
  showDeleteSubsModal.value = false;
};
const handleDeleteAllNodesWithCleanup = () => {
  deleteAllNodes();
  cleanupAllNodes();
  showDeleteNodesModal.value = false;
};
const handleAutoSortNodes = () => {
  autoSortNodes();
  showToast('已按地区排序，请手动保存', 'success');
};

const handleDeduplicateNodes = () => {
    deduplicateNodes();
    showToast('已完成去重，请手动保存', 'success');
};

const handleBatchDeleteRequest = (ids) => {
    if (ids && ids.length > 0) {
        batchDeleteIds.value = ids;
        showBatchDeleteModal.value = true;
    }
};

const confirmBatchDelete = () => {
    batchDeleteNodes(batchDeleteIds.value);
    batchDeleteIds.value = [];
    showBatchDeleteModal.value = false;
};

// 节点预览处理函数
const handlePreviewSubscription = (subscriptionId) => {
  const subscription = subscriptions.value.find(s => s.id === subscriptionId);
  if (subscription) {
    previewSubscriptionId.value = subscriptionId;
    previewSubscriptionName.value = subscription.name || '未命名订阅';
    previewSubscriptionUrl.value = subscription.url;
    previewProfileId.value = null;
    previewProfileName.value = '';
    showNodePreviewModal.value = true;
  }
};

const handlePreviewProfile = (profileId) => {
  const profile = profiles.value.find(p => p.id === profileId || p.customId === profileId);
  if (profile) {
    previewProfileId.value = profileId;
    previewProfileName.value = profile.name;
    previewSubscriptionId.value = null;
    previewSubscriptionName.value = '';
    previewSubscriptionUrl.value = '';
    showNodePreviewModal.value = true;
  }
};

const handleProfileReorder = (fromIndex, toIndex) => {
  // 使用 splice 方法保持响应性,而不是直接赋值
  const [item] = profiles.value.splice(fromIndex, 1);
  profiles.value.splice(toIndex, 0, item);
  markDirty();
};

// --- Backup & Restore ---
const exportBackup = () => {
  try {
    const backupData = {
      subscriptions: subscriptions.value,
      manualNodes: manualNodes.value,
      profiles: profiles.value,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    a.download = `misub-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('备份已成功导出', 'success');
  } catch (error) {
    console.error('Backup export failed:', error);
    showToast('备份导出失败', 'error');
  }
};

const importBackup = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || !Array.isArray(data.subscriptions) || !Array.isArray(data.manualNodes) || !Array.isArray(data.profiles)) {
          throw new Error('无效的备份文件格式');
        }

        if (confirm('这将覆盖您当前的所有数据（需要手动保存后生效），确定要从备份中恢复吗？')) {
          // Merge subscriptions and manual nodes as they are stored together in the backend/store
          const mergedSubscriptions = [...data.subscriptions, ...data.manualNodes];
          dataStore.overwriteSubscriptions(mergedSubscriptions);
          dataStore.overwriteProfiles(data.profiles);
          markDirty();
          showToast('数据已从备份恢复，请点击“保存更改”以持久化', 'success');
          uiStore.hide(); // Close settings modal after import
        }
      } catch (error) {
        console.error('Backup import failed:', error);
        showToast(`备份导入失败: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};
// Old handlers removed. Replaced by composables.

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes || bytes < 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  if (i < 0) return '0 B';
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
const formattedTotalRemainingTraffic = computed(() => formatBytes(totalRemainingTraffic.value));

</script>

<template>

  <div v-if="isLoading" class="w-full max-w-(--breakpoint-xl) mx-auto p-4 sm:p-6 lg:p-8">
    <SkeletonLoader type="dashboard" />
  </div>
  <div v-else class="w-full max-w-(--breakpoint-xl) mx-auto p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 md:gap-0">
      <div class="flex flex-wrap items-center gap-3 md:gap-4">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white">仪表盘</h1>
        <span 
          v-if="formattedTotalRemainingTraffic !== '0 B'"
          class="px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-500/20 rounded-full"
        >
          剩余总流量: {{ formattedTotalRemainingTraffic }}
        </span>
      </div>
      <div class="flex items-center gap-2 w-full md:w-auto">
        <button @click="showLogModal = true" class="flex-1 md:flex-none text-center text-sm font-semibold px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">订阅日志</button>
        <button @click="showBulkImportModal = true" class="flex-1 md:flex-none text-center text-sm font-semibold px-4 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 border-2 border-indigo-500/50 hover:bg-indigo-500/10 transition-colors">批量导入</button>
      </div>
    </div>

    <!-- Dirty State Banner -->
    <Transition name="slide-fade">
      <div v-if="isDirty || saveState === 'success'" 
           class="p-3 mb-6 rounded-lg ring-1 ring-inset flex items-center justify-between transition-colors duration-300"
           :class="saveState === 'success' ? 'bg-teal-500/10 ring-teal-500/20' : 'bg-indigo-600/10 dark:bg-indigo-500/20 ring-indigo-600/20'">
        <p class="text-sm font-medium transition-colors duration-300" 
           :class="saveState === 'success' ? 'text-teal-800 dark:text-teal-200' : 'text-indigo-800 dark:text-indigo-200'">
          {{ saveState === 'success' ? '保存成功' : '您有未保存的更改' }}
        </p>
        <div class="flex items-center gap-3">
          <button v-if="saveState !== 'success'" @click="handleDiscard" class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">放弃更改</button>
          <button @click.prevent="handleSave" :disabled="saveState !== 'idle'" class="px-5 py-2 text-sm text-white font-semibold rounded-lg shadow-xs flex items-center justify-center transition-all duration-300 w-28" :class="{'bg-indigo-600 hover:bg-indigo-700': saveState === 'idle', 'bg-gray-500 cursor-not-allowed': saveState === 'saving', 'bg-teal-500 cursor-not-allowed': saveState === 'success' }">
            <div v-if="saveState === 'saving'" class="flex items-center">
              <StatusIndicator status="loading" size="sm" class="mr-2" />
              <span>保存中...</span>
            </div>
            <div v-else-if="saveState === 'success'" class="flex items-center">
              <StatusIndicator status="success" size="sm" class="mr-2" />
              <span>已保存</span>
            </div>
            <span v-else>保存更改</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-start">
      <div class="lg:col-span-2 md:col-span-2 space-y-12">
        <!-- Subscription Panel -->
        <SubscriptionPanel
          :subscriptions="subscriptions"
          :paginated-subscriptions="paginatedSubscriptions"
          :current-page="subsCurrentPage"
          :total-pages="subsTotalPages"
          :is-sorting="isSortingSubs"
          @add="handleAddSubscription"
          @delete="handleDeleteSubscriptionWithCleanup"
          @change-page="changeSubsPage"
          @update-node-count="handleUpdateNodeCount"
          @refresh-all="batchUpdateAllSubscriptions"
          @edit="(id) => handleEditSubscription(subscriptions.find(s => s.id === id))"
          @toggle-sort="isSortingSubs = !isSortingSubs"
          @mark-dirty="markDirty"
          @delete-all="showDeleteSubsModal = true"
          @preview="handlePreviewSubscription"
          @reorder="reorderSubscriptions"
        />

        <!-- Manual Node Panel -->
        <ManualNodePanel
          :manual-nodes="manualNodes"
          :paginated-manual-nodes="paginatedManualNodes"
          :current-page="manualNodesCurrentPage"
          :total-pages="manualNodesTotalPages"
          :is-sorting="isSortingNodes"
          :search-term="searchTerm"
          :view-mode="manualNodeViewMode"
          :active-color-filter="activeColorFilter"
          @add="handleAddNode"
          @delete="handleDeleteNodeWithCleanup"
          @edit="(id) => handleEditNode(manualNodes.find(n => n.id === id))"
          @change-page="changeManualNodesPage"
          @update:search-term="newVal => searchTerm.value = newVal"
          @update:view-mode="setViewMode"
          @toggle-sort="isSortingNodes = !isSortingNodes"
          @mark-dirty="markDirty"
          @auto-sort="handleAutoSortNodes"
          @deduplicate="handleDeduplicateNodes"
          @import="showSubscriptionImportModal = true"
          @delete-all="showDeleteNodesModal = true"
          @reorder="reorderManualNodes"
          @set-color-filter="setColorFilter"
          @batch-update-color="batchUpdateColor"
          @batch-delete-nodes="handleBatchDeleteRequest"
        />
      </div>
      
      <!-- Right Column -->
      <div class="lg:col-span-1 space-y-8">
        <RightPanel :config="config" :profiles="profiles" />
        <ProfilePanel 
          :profiles="profiles"
          @add="handleAddProfile"
          @edit="handleEditProfile"
          @delete="handleDeleteProfile"
          @deleteAll="showDeleteProfilesModal = true"
          @toggle="handleProfileToggle"
          @copyLink="copyProfileLink"
          @preview="handlePreviewProfile"
          @reorder="handleProfileReorder"
        />
      </div>
    </div>
  </div>

  <BulkImportModal v-model:show="showBulkImportModal" @import="(txt, tag) => handleBulkImport(txt, tag)" />
  <LogModal v-model:show="showLogModal" />
  <Modal v-model:show="showDeleteSubsModal" @confirm="handleDeleteAllSubscriptionsWithCleanup"><template #title><h3 class="text-lg font-bold text-red-500">确认清空订阅</h3></template><template #body><p class="text-sm text-gray-400">您确定要删除所有**订阅**吗？此操作将标记为待保存，不会影响手动节点。</p></template></Modal>
  <Modal v-model:show="showDeleteNodesModal" @confirm="handleDeleteAllNodesWithCleanup"><template #title><h3 class="text-lg font-bold text-red-500">确认清空节点</h3></template><template #body><p class="text-sm text-gray-400">您确定要删除所有**手动节点**吗？此操作将标记为待保存，不会影响订阅。</p></template></Modal>
  <Modal v-model:show="showBatchDeleteModal" @confirm="confirmBatchDelete">
      <template #title><h3 class="text-lg font-bold text-red-500">确认批量删除</h3></template>
      <template #body><p class="text-sm text-gray-600 dark:text-gray-300">您确定要删除选中的 <span class="font-bold border-b border-red-500">{{ batchDeleteIds.length }}</span> 个节点吗？此操作不可恢复。</p></template>
  </Modal>
  <Modal v-model:show="showDeleteProfilesModal" @confirm="handleDeleteAllProfiles"><template #title><h3 class="text-lg font-bold text-red-500">确认清空订阅组</h3></template><template #body><p class="text-sm text-gray-400">您确定要删除所有**订阅组**吗？此操作不可逆。</p></template></Modal>
  
  <ProfileModal v-if="showProfileModal" v-model:show="showProfileModal" :profile="editingProfile" :is-new="isNewProfile" :all-subscriptions="subscriptions" :all-manual-nodes="manualNodes" @save="handleSaveProfile" size="2xl" />
  
  <Modal v-if="editingNode" v-model:show="showNodeModal" @confirm="handleSaveNode" @vue:mounted="console.log('NodeModal Mounted, data:', editingNode)">
    <template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewNode ? '新增手动节点' : '编辑手动节点' }}</h3></template>
    <template #body>
      <div class="space-y-4">
        <div><label for="node-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点名称</label><input type="text" id="node-name" v-model="editingNode.name" placeholder="（可选）不填将自动获取" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"></div>
        
        <!-- Color Tag Selection -->
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">颜色标签</label>
            <div class="flex items-center gap-3">
                <button 
                    v-for="color in ['red', 'orange', 'green', 'blue']" 
                    :key="color"
                    @click="editingNode.colorTag = editingNode.colorTag === color ? null : color"
                    class="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
                    :class="[
                        editingNode.colorTag === color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105',
                        `bg-${color}-500`
                    ]"
                >
                     <svg v-if="editingNode.colorTag === color" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                </button>
                <button 
                    v-if="editingNode.colorTag"
                    @click="editingNode.colorTag = null"
                    class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
                >清除</button>
            </div>
        </div>

        <div><label for="node-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点链接</label><textarea id="node-url" v-model="editingNode.url" @input="handleNodeUrlInput" rows="4" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"></textarea></div>
      </div>
    </template>
  </Modal>

  <Modal v-if="editingSubscription" v-model:show="showSubModal" @confirm="handleSaveSubscription" @vue:mounted="console.log('SubModal Mounted, data:', editingSubscription)">
    <template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewSubscription ? '新增订阅' : '编辑订阅' }}</h3></template>
    <template #body>
      <div class="space-y-4">
        <div><label for="sub-edit-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅名称</label><input type="text" id="sub-edit-name" v-model="editingSubscription.name" placeholder="（可选）不填将自动获取" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"></div>
        <div><label for="sub-edit-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅链接</label><input type="text" id="sub-edit-url" v-model="editingSubscription.url" placeholder="https://..." class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"></div>
        <div>
          <label for="sub-edit-exclude" class="block text-sm font-medium text-gray-700 dark:text-gray-300">包含/排除节点</label>
          <textarea 
            id="sub-edit-exclude" 
            v-model="editingSubscription.exclude"
            placeholder="[排除模式 (默认)]&#10;proto:vless,trojan&#10;(过期|官网)&#10;---&#10;[包含模式 (只保留匹配项)]&#10;keep:(香港|HK)&#10;keep:proto:ss"
            rows="5" 
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white">
          </textarea>
          <p class="text-xs text-gray-400 mt-1">每行一条规则。使用 `keep:` 切换为白名单模式。</p>
        </div>
        <!-- [新增] User-Agent 设置 -->
        <div>
          <label for="sub-edit-ua" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            自定义 User-Agent
            <span class="text-xs text-gray-500 ml-2">(可选,留空使用默认)</span>
          </label>
          <select 
            id="sub-edit-ua"
            v-model="editingSubscription.customUserAgent"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
          >
            <option value="">使用默认 UA</option>
            <optgroup label="Clash 系列">
              <option value="clash-verge/v2.4.3">Clash Verge (v2.4.3)</option>
              <option value="clash.meta">Clash Meta</option>
              <option value="ClashForAndroid/2.5.12">Clash for Android</option>
            </optgroup>
            <optgroup label="V2Ray 系列">
              <option value="v2rayN/7.23">v2rayN (v7.23)</option>
              <option value="v2rayNG/1.8.5">v2rayNG (v1.8.5)</option>
            </optgroup>
            <optgroup label="其他客户端">
              <option value="Shadowrocket/1.9.0">Shadowrocket</option>
              <option value="Surge/5.0.0">Surge</option>
              <option value="Quantumult%20X/1.4.0">Quantumult X</option>
            </optgroup>
            <optgroup label="浏览器">
              <option value="Mozilla/5.0">Mozilla (通用)</option>
            </optgroup>
          </select>
          <p v-if="editingSubscription.customUserAgent" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            当前 UA: {{ editingSubscription.customUserAgent }}
          </p>
        </div>
        <!-- [新增] 备注 -->
        <div>
          <label for="sub-edit-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            备注
            <span class="text-xs text-gray-500 ml-2">(可选,如官网、价格等)</span>
          </label>
          <textarea 
            id="sub-edit-notes" 
            v-model="editingSubscription.notes"
            placeholder="例如: 官网: example.com | 价格: ￥20/月 | 到期: 2024-12-31"
            rows="2" 
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
          ></textarea>
        </div>
      </div>
    </template>
  </Modal>
  
  <SettingsModal 
    v-model:show="uiStore.isSettingsModalVisible" 
    :export-backup="exportBackup"
    :import-backup="importBackup"
  />
  <SubscriptionImportModal :show="showSubscriptionImportModal" @update:show="showSubscriptionImportModal = $event" :add-nodes-from-bulk="addNodesFromBulk" />

  <!-- 节点预览模态窗口 -->
  <NodePreviewModal
    :show="showNodePreviewModal"
    :subscription-id="previewSubscriptionId"
    :subscription-name="previewSubscriptionName"
    :subscription-url="previewSubscriptionUrl"
    :profile-id="previewProfileId"
    :profile-name="previewProfileName"
    @update:show="showNodePreviewModal = $event"
  />
</template>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
.cursor-move {
  cursor: move;
}

.slide-fade-sm-enter-active,
.slide-fade-sm-leave-active {
  transition: all 0.2s ease-out;
}
.slide-fade-sm-enter-from,
.slide-fade-sm-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
