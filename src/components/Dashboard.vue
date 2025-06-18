<script setup>
import { ref, computed, onMounted } from 'vue';
import draggable from 'vuedraggable'; // 引入 draggable
import { saveMisubs } from '../lib/api.js';
import { extractNodeName } from '../lib/utils.js';
import { useToast, showSettingsModal } from '../lib/stores.js';
import { useSubscriptions } from '../composables/useSubscriptions.js';
import { useManualNodes } from '../composables/useManualNodes.js';

// ... (import other components)
import SettingsModal from './SettingsModal.vue';
import Overview from './Overview.vue';
import Card from './Card.vue';
import ManualNodeCard from './ManualNodeCard.vue';
import Modal from './Modal.vue';
import BulkImportModal from './BulkImportModal.vue';
import RightPanel from './RightPanel.vue';

const props = defineProps({
  data: Object,
});

const config = computed(() => props.data?.config || {});

// --- 全局状态、工具、模态框等 ---
const { showToast } = useToast();
const isLoading = ref(true);
const subsDirty = ref(false);
const saveState = ref('idle');
const markDirty = () => { subsDirty.value = true; saveState.value = 'idle'; };

// 【新】用于控制排序模式的状态
const isReorderingSubs = ref(false);
const isReorderingNodes = ref(false);

// --- 数据与逻辑 ---
const httpSubs = computed(() => props.data?.misubs?.filter(item => /^https?:\/\//.test(item.url)));
const nonHttpNodes = computed(() => props.data?.misubs?.filter(item => !/^https?:\/\//.test(item.url)));

const {
  subscriptions, subsCurrentPage, subsTotalPages, paginatedSubscriptions,
  nodesFromSubs, enabledSubscriptionsCount, changeSubsPage,
  addSubscription, updateSubscription, deleteSubscription, deleteAllSubscriptions,
} = useSubscriptions(httpSubs, markDirty);

const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes,
  enabledManualNodesCount, changeManualNodesPage,
  addNode, updateNode, deleteNode, deleteAllNodes, addNodesFromBulk
} = useManualNodes(nonHttpNodes, markDirty);

// ... (其他逻辑和之前一样) ...
const stats = computed(() => ({
  totalSubscriptions: subscriptions.value.length,
  enabledSubscriptions: enabledSubscriptionsCount.value,
  totalNodes: nodesFromSubs.value + enabledManualNodesCount.value,
}));

const showBulkImportModal = ref(false);
const showDeleteSubsModal = ref(false);
const showDeleteNodesModal = ref(false);
const showSubModal = ref(false);
const showNodeModal = ref(false);

const editingSubscription = ref(null);
const isNewSubscription = ref(false);
const editingNode = ref(null);
const isNewNode = ref(false);

onMounted(() => {
  isLoading.value = false;
});

const handleDiscard = () => window.location.reload();

const handleSave = async () => {
  saveState.value = 'saving';
  const combinedMisubs = [
    ...subscriptions.value.map(({ isNew, isUpdating, id, ...rest }) => rest),
    ...manualNodes.value.map(({ id, ...rest }) => rest)
  ];
  try {
    const result = await saveMisubs(combinedMisubs);
    if (result.success) {
      saveState.value = 'success';
      // 退出可能存在的排序模式
      isReorderingSubs.value = false;
      isReorderingNodes.value = false;
      setTimeout(() => { subsDirty.value = false; saveState.value = 'idle'; }, 1500);
    } else { throw new Error(result.message || '保存失败'); }
  } catch (error) {
    showToast(error.message, 'error');
    saveState.value = 'idle';
  }
};

// ... (所有 handle* 方法都保持不变) ...
const handleAddSubscription = () => { isNewSubscription.value = true; editingSubscription.value = { name: '', url: '', enabled: true }; showSubModal.value = true; };
const handleEditSubscription = (subId) => { const sub = subscriptions.value.find(s => s.id === subId); if (sub) { isNewSubscription.value = false; editingSubscription.value = { ...sub }; showSubModal.value = true; } };
const handleSaveSubscription = () => { if (!editingSubscription.value || !editingSubscription.value.url) { showToast('订阅链接不能为空', 'error'); return; } if (!/^https?:\/\//.test(editingSubscription.value.url)) { showToast('请输入有效的 http:// 或 https:// 订阅链接', 'error'); return; } if (isNewSubscription.value) { addSubscription({ ...editingSubscription.value, id: crypto.randomUUID(), isUpdating: false }); } else { updateSubscription(editingSubscription.value); } showSubModal.value = false; };
const handleAddNode = () => { isNewNode.value = true; editingNode.value = { id: crypto.randomUUID(), name: '', url: '', enabled: true }; showNodeModal.value = true; };
const handleEditNode = (nodeId) => { const node = manualNodes.value.find(n => n.id === nodeId); if (node) { isNewNode.value = false; editingNode.value = { ...node }; showNodeModal.value = true; } };
const handleNodeUrlInput = (event) => { if (!editingNode.value) return; const newUrl = event.target.value; if (newUrl) { const extractedName = extractNodeName(newUrl); if (extractedName) { editingNode.value.name = extractedName; } } };
const handleSaveNode = () => { if (!editingNode.value || !editingNode.value.url) { showToast('节点链接不能为空', 'error'); return; } if (isNewNode.value) { addNode(editingNode.value); } else { updateNode(editingNode.value); } showNodeModal.value = false; };
const handleBulkImport = (importText) => { if (!importText) return; const lines = importText.split('\n').map(line => line.trim()).filter(Boolean); const newSubs = []; const newNodes = []; for (const line of lines) { const newItem = { id: crypto.randomUUID(), name: extractNodeName(line) || '未命名', url: line, enabled: true, isUpdating: false }; if (/^https?:\/\//.test(line)) { newSubs.push({ ...newItem, nodeCount: 0 }); } else if (/^(ss|vmess|trojan|vless|hysteria2?):\/\//.test(line)) { newNodes.push(newItem); } } newSubs.forEach(s => addSubscription(s)); addNodesFromBulk(newNodes); showToast(`成功导入 ${newSubs.length} 条订阅和 ${newNodes.length} 个手动节点，请点击保存`); };
const confirmDeleteAllSubs = () => { deleteAllSubscriptions(); showDeleteSubsModal.value = false; };
const confirmDeleteAllNodes = () => { deleteAllNodes(); showDeleteNodesModal.value = false; };
</script>

<template>
  <div v-if="isLoading" class="text-center py-16 text-gray-500">正在加载...</div>
  <div v-else class="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
    <div class="flex justify-between items-center mb-6"><h1 class="text-2xl font-bold text-gray-800 dark:text-white">总览</h1><div class="flex items-center gap-2"><button @click="showBulkImportModal = true" class="text-sm font-semibold px-4 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 border-2 border-indigo-500/50 hover:bg-indigo-500/10 transition-colors">批量导入</button></div></div>
    <Transition name="slide-fade"><div v-if="subsDirty" class="p-3 mb-6 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 ring-1 ring-inset ring-indigo-600/20 flex items-center justify-between"><p class="text-sm font-medium text-indigo-800 dark:text-indigo-200">您有未保存的更改</p><div class="flex items-center gap-3"><button @click="handleDiscard" class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">放弃更改</button><button @click="handleSave" :disabled="saveState !== 'idle'" class="px-5 py-2 text-sm text-white font-semibold rounded-lg shadow-sm flex items-center justify-center transition-all duration-300 w-28" :class="{'bg-green-600 hover:bg-green-700': saveState === 'idle', 'bg-gray-500 cursor-not-allowed': saveState === 'saving', 'bg-teal-500 cursor-not-allowed': saveState === 'success' }"><div v-if="saveState === 'saving'" class="flex items-center"><svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>保存中...</span></div><div v-else-if="saveState === 'success'" class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg><span>已保存</span></div><span v-else>保存更改</span></button></div></div></Transition>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div class="lg:col-span-2 space-y-8">
        <Overview :stats="stats" />

        <div>
          <div class="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">我的订阅</h2>
            <div class="flex items-center gap-2">
              <button @click="isReorderingSubs = !isReorderingSubs" class="text-sm font-medium px-3 py-1.5 rounded-lg border-2" :class="isReorderingSubs ? 'text-indigo-500 border-indigo-500/60 bg-indigo-500/10' : 'text-gray-600 dark:text-gray-300 border-gray-500/30 hover:bg-gray-500/10'">
                {{ isReorderingSubs ? '完成排序' : '排序模式' }}
              </button>
              <button @click="showDeleteSubsModal = true" class="text-sm font-medium px-3 py-1.5 rounded-lg text-red-500 border-2 border-red-500/60 hover:bg-red-500 hover:text-white dark:text-red-400 dark:border-red-400/60 dark:hover:bg-red-400 dark:hover:text-white transition-all">清空</button>
              <button @click="handleAddSubscription" class="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">新增</button>
            </div>
          </div>

          <div v-if="subscriptions.length > 0">
            <div v-if="isReorderingSubs">
                <p class="text-xs text-center text-gray-500 mb-3">拖动项目调整顺序，完成后请点击“完成排序”并“保存更改”。</p>
                <draggable
                  v-model="subscriptions"
                  item-key="id"
                  class="space-y-2"
                  ghost-class="opacity-50"
                  drag-class="shadow-lg"
                  @end="markDirty"
                >
                  <template #item="{ element }">
                    <div class="p-3 bg-white dark:bg-gray-800/80 rounded-lg shadow cursor-move flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                      <span class="font-medium text-sm">{{ element.name || '未命名订阅' }}</span>
                    </div>
                  </template>
                </draggable>
            </div>

            <div v-else>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <Card
                  v-for="subscription in paginatedSubscriptions"
                  :key="subscription.id"
                  :misub="subscription"
                  @delete="handleDeleteSubscription(subscription.id)"
                  @change="markDirty"
                  @update="handleUpdateNodeCount(subscription.id)"
                  @edit="handleEditSubscription(subscription.id)"
                />
              </div>
              <div v-if="subsTotalPages > 1" class="flex justify-center items-center space-x-4 mt-8 text-sm font-medium">
                  <button @click="changeSubsPage(subsCurrentPage - 1)" :disabled="subsCurrentPage === 1" class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">&laquo; 上一页</button>
                  <span class="text-gray-500 dark:text-gray-400">第 {{ subsCurrentPage }} / {{ subsTotalPages }} 页</span>
                  <button @click="changeSubsPage(subsCurrentPage + 1)" :disabled="subsCurrentPage === subsTotalPages" class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">下一页 &raquo;</button>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-16 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">没有机场订阅</h3><p class="mt-1 text-sm text-gray-500">你可以通过批量导入或点击新增。</p>
          </div>
        </div>

        <div class="mt-4">
           <div class="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">手动节点</h2>
             <div class="flex items-center gap-2">
                <button @click="isReorderingNodes = !isReorderingNodes" class="text-sm font-medium px-3 py-1.5 rounded-lg border-2" :class="isReorderingNodes ? 'text-indigo-500 border-indigo-500/60 bg-indigo-500/10' : 'text-gray-600 dark:text-gray-300 border-gray-500/30 hover:bg-gray-500/10'">
                    {{ isReorderingNodes ? '完成排序' : '排序模式' }}
                </button>
                <button @click="showDeleteNodesModal = true" class="text-sm font-medium px-3 py-1.5 rounded-lg text-red-500 border-2 border-red-500/60 hover:bg-red-500 hover:text-white dark:text-red-400 dark:border-red-400/60 dark:hover:bg-red-400 dark:hover:text-white transition-all">清空</button>
                <button @click="handleAddNode" class="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">新增</button>
            </div>
          </div>
           <div v-if="manualNodes.length > 0">
                <div v-if="isReorderingNodes">
                     <p class="text-xs text-center text-gray-500 mb-3">拖动项目调整顺序，完成后请点击“完成排序”并“保存更改”。</p>
                    <draggable
                      v-model="manualNodes"
                      item-key="id"
                      class="space-y-2"
                      ghost-class="opacity-50"
                      drag-class="shadow-lg"
                      @end="markDirty"
                    >
                      <template #item="{ element }">
                        <div class="p-3 bg-white dark:bg-gray-800/80 rounded-lg shadow cursor-move flex items-center gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                          <span class="font-medium text-sm">{{ element.name || '未命名节点' }}</span>
                        </div>
                      </template>
                    </draggable>
                </div>
                <div v-else>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <ManualNodeCard v-for="node in paginatedManualNodes" :key="node.id" :node="node" @edit="handleEditNode(node.id)" @delete="handleDeleteNode(node.id)"/>
                    </div>
                    <div v-if="manualNodesTotalPages > 1" class="flex justify-center items-center space-x-4 mt-8 text-sm font-medium">
                      <button @click="changeManualNodesPage(manualNodesCurrentPage - 1)" :disabled="manualNodesCurrentPage === 1" class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">&laquo; 上一页</button>
                      <span class="text-gray-500 dark:text-gray-400">第 {{ manualNodesCurrentPage }} / {{ manualNodesTotalPages }} 页</span>
                      <button @click="changeManualNodesPage(manualNodesCurrentPage + 1)" :disabled="manualNodesCurrentPage === manualNodesTotalPages" class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">下一页 &raquo;</button>
                    </div>
                </div>
           </div>
          <div v-else class="text-center py-16 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">没有手动节点</h3><p class="mt-1 text-sm text-gray-500">你可以通过批量导入或点击新增。</p>
          </div>
        </div>
      </div>
      <div class="lg:col-span-1"><RightPanel :config="config" /></div>
    </div>
  </div>
  <BulkImportModal v-model:show="showBulkImportModal" @import="handleBulkImport" /><Modal v-model:show="showDeleteSubsModal" @confirm="confirmDeleteAllSubs"><template #title><h3 class="text-lg font-bold text-red-500">确认清空订阅</h3></template><template #body><p class="text-sm text-gray-400">您确定要删除所有**订阅**吗？此操作将标记为待保存，不会影响手动节点。</p></template></Modal><Modal v-model:show="showDeleteNodesModal" @confirm="confirmDeleteAllNodes"><template #title><h3 class="text-lg font-bold text-red-500">确认清空节点</h3></template><template #body><p class="text-sm text-gray-400">您确定要删除所有**手动节点**吗？此操作将标记为待保存，不会影响订阅。</p></template></Modal><Modal v-if="editingNode" v-model:show="showNodeModal" @confirm="handleSaveNode"><template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewNode ? '新增手动节点' : '编辑手动节点' }}</h3></template><template #body><div class="space-y-4"><div><label for="node-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点名称</label><input type="text" id="node-name" v-model="editingNode.name" placeholder="（可选）不填将自动获取" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"></div><div><label for="node-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点链接</label><textarea id="node-url" v-model="editingNode.url" @input="handleNodeUrlInput" rows="4" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"></textarea></div></div></template></Modal><Modal v-if="editingSubscription" v-model:show="showSubModal" @confirm="handleSaveSubscription"><template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewSubscription ? '新增订阅' : '编辑订阅' }}</h3></template><template #body><div class="space-y-4"><div><label for="sub-edit-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅名称</label><input type="text" id="sub-edit-name" v-model="editingSubscription.name" placeholder="（可选）不填将自动获取" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"></div><div><label for="sub-edit-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅链接</label><input type="text" id="sub-edit-url" v-model="editingSubscription.url" placeholder="https://..." class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"></div></div></template></Modal><SettingsModal v-model:show="showSettingsModal" />
</template>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>