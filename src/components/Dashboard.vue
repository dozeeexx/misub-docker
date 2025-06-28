<script setup>
import { ref, computed, onMounted } from 'vue';
import draggable from 'vuedraggable'; // [新增] 导入 vuedraggable 库
import { saveMisubs, fetchNodeCount } from '../lib/api.js';
import { extractNodeName } from '../lib/utils.js';
import { useToast, showSettingsModal } from '../lib/stores.js';
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
const { showToast } = useToast();

// --- 状态声明 ---
const subscriptions = ref([]);
const manualNodes = ref([]);
const config = ref({});
const isLoading = ref(true);
const subsDirty = ref(false);
const saveState = ref('idle'); 
const subsCurrentPage = ref(1);
const manualNodesCurrentPage = ref(1);
const subsItemsPerPage = 6;
const manualNodesPerPage = 24;

// [修改] 排序状态现在更简单
const isSortingSubs = ref(false);
const isSortingNodes = ref(false);

// [移除] 所有手写的 handleDrag, handleDrop 等函数和相关状态变量

// --- 模态框等其他状态... (保持不变) ---
const showBulkImportModal = ref(false);
const showDeleteSubsModal = ref(false);
const showDeleteNodesModal = ref(false);
const showSubModal = ref(false);
const showNodeModal = ref(false);
const editingSubscription = ref(null);
const isNewSubscription = ref(false);
const editingNode = ref(null);
const isNewNode = ref(false);

// --- 初始化 (保持不变) ---
const initializeState = () => {
  isLoading.value = true;
  if (props.data && props.data.misubs) {
    const subsData = props.data.misubs || [];
    const subsArray = [], nodesArray = [];
    for (const item of subsData) {
      // --- [核心修改] 在此處初始化 userInfo ---
      const newItem = { 
        ...item, 
        id: crypto.randomUUID(), 
        enabled: item.enabled ?? true, 
        isUpdating: false,
        userInfo: item.userInfo || null, // <-- 新增此行
      };
      // --- 修改結束 ---
      if (/^https?:\/\//.test(item.url)) {
        subsArray.push({ ...newItem, nodeCount: item.nodeCount || 0 });
      } else {
        nodesArray.push({ ...newItem, nodeCount: 1 });
      }
    }
    subscriptions.value = subsArray;
    manualNodes.value = nodesArray;
    config.value = props.data.config || {};
    // 更新節點時，會自動帶上 userInfo
    subsArray.forEach(sub => handleUpdateNodeCount(sub.id, true)); 
  }
  isLoading.value = false;
};
onMounted(initializeState);

// --- 计算属性 (保持不变) ---
const stats = computed(() => {
  const enabledSubscriptions = subscriptions.value.filter(s => s.enabled);
  const nodesFromSubs = enabledSubscriptions.reduce((acc, sub) => acc + (parseInt(sub.nodeCount, 10) || 0), 0);
  const enabledManualNodesCount = manualNodes.value.filter(n => n.enabled).length;
  return { totalSubscriptions: subscriptions.value.length, enabledSubscriptions: enabledSubscriptions.length, totalNodes: nodesFromSubs + enabledManualNodesCount };
});
const subsTotalPages = computed(() => Math.ceil(subscriptions.value.length / subsItemsPerPage));
const paginatedSubscriptions = computed(() => {
  const start = (subsCurrentPage.value - 1) * subsItemsPerPage;
  return subscriptions.value.slice(start, start + subsItemsPerPage);
});
const manualNodesTotalPages = computed(() => Math.ceil(manualNodes.value.length / manualNodesPerPage));
const paginatedManualNodes = computed(() => {
  const start = (manualNodesCurrentPage.value - 1) * manualNodesPerPage;
  return manualNodes.value.slice(start, start + manualNodesPerPage);
});

// --- 方法 (只保留业务逻辑) ---
const markDirty = () => { subsDirty.value = true; saveState.value = 'idle'; };
const handleDiscard = () => { initializeState(); subsDirty.value = false; showToast('已放弃所有未保存的更改'); };
const handleUpdateNodeCount = async (subId, isInitialLoad = false) => {
    const subToUpdate = subscriptions.value.find(s => s.id === subId);
    if (!subToUpdate || !subToUpdate.url.startsWith('http')) return;
    
    subToUpdate.isUpdating = true;
    try {
        // [核心修改] API 不再直接回傳數字，而是回傳一個物件
        const res = await fetch('/api/node_count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: subToUpdate.url })
        });
        const data = await res.json();
        
        // 將回傳的節點數和用戶資訊賦值給訂閱物件
        subToUpdate.nodeCount = data.count || 0;
        subToUpdate.userInfo = data.userInfo || null; // 新增 userInfo 屬性

        if (!isInitialLoad) { 
            showToast(`${subToUpdate.name || '訂閱'} 更新成功！`, 'success'); 
            markDirty(); 
        }
    } catch (error) { 
        if (!isInitialLoad) showToast(`${subToUpdate.name || '訂閱'} 更新失敗`, 'error'); 
    } finally { 
        subToUpdate.isUpdating = false; 
    }
};
const handleSave = async () => {
  saveState.value = 'saving';
  const combinedMisubs = [ ...subscriptions.value.map(({ id, ...rest }) => rest), ...manualNodes.value.map(({ id, ...rest }) => rest) ];
  try {
    const result = await saveMisubs(combinedMisubs);
    if (result.success) { saveState.value = 'success'; setTimeout(() => { subsDirty.value = false; saveState.value = 'idle'; }, 1500); } 
    else { throw new Error(result.message || '保存失败'); }
  } catch (error) { showToast(error.message, 'error'); saveState.value = 'idle'; }
};
const handleAddSubscription = () => { isNewSubscription.value = true; editingSubscription.value = { name: '', url: '', enabled: true }; showSubModal.value = true; };
const handleEditSubscription = (subId) => { const sub = subscriptions.value.find(s => s.id === subId); if (sub) { isNewSubscription.value = false; editingSubscription.value = { ...sub }; showSubModal.value = true; }};
const handleSaveSubscription = () => {
  if (!editingSubscription.value || !editingSubscription.value.url) { showToast('订阅链接不能为空', 'error'); return; }
  if (!/^https?:\/\//.test(editingSubscription.value.url)) { showToast('请输入有效的 http:// 或 https:// 订阅链接', 'error'); return; }
  if (isNewSubscription.value) { const subToAdd = { ...editingSubscription.value, id: crypto.randomUUID(), nodeCount: 0, isUpdating: false }; subscriptions.value.unshift(subToAdd); subsCurrentPage.value = 1; handleUpdateNodeCount(subToAdd.id);
  } else { const index = subscriptions.value.findIndex(s => s.id === editingSubscription.value.id); if (index !== -1) { if (subscriptions.value[index].url !== editingSubscription.value.url) { editingSubscription.value.nodeCount = 0; handleUpdateNodeCount(editingSubscription.value.id); } subscriptions.value[index] = editingSubscription.value; }}
  markDirty(); showSubModal.value = false;
};
const handleDeleteSubscription = (id) => { subscriptions.value = subscriptions.value.filter((s) => s.id !== id); markDirty(); };
const handleDeleteAllSubscriptions = () => { subscriptions.value = []; subsCurrentPage.value = 1; markDirty(); showDeleteSubsModal.value = false; };
const changeSubsPage = (page) => { if (page < 1 || page > subsTotalPages.value) return; subsCurrentPage.value = page; };
const handleAddNode = () => { isNewNode.value = true; editingNode.value = { id: crypto.randomUUID(), name: '', url: '', enabled: true }; showNodeModal.value = true; };
const handleEditNode = (nodeId) => { const node = manualNodes.value.find(n => n.id === nodeId); if (node) { isNewNode.value = false; editingNode.value = { ...node }; showNodeModal.value = true; }};
const handleNodeUrlInput = (event) => { if (!editingNode.value) return; const newUrl = event.target.value; if (newUrl) { const extractedName = extractNodeName(newUrl); if (extractedName) { editingNode.value.name = extractedName; }}};
const handleSaveNode = () => {
    if (!editingNode.value || !editingNode.value.url) { showToast('节点链接不能为空', 'error'); return; }
    if (isNewNode.value) { manualNodes.value.unshift(editingNode.value); manualNodesCurrentPage.value = 1; } 
    else { manualNodes.value = manualNodes.value.map(n => n.id === editingNode.value.id ? editingNode.value : n); }
    markDirty(); showNodeModal.value = false;
};
const handleDeleteNode = (nodeId) => { manualNodes.value = manualNodes.value.filter(n => n.id !== nodeId); markDirty(); };
const handleDeleteAllNodes = () => { manualNodes.value = []; manualNodesCurrentPage.value = 1; markDirty(); showDeleteNodesModal.value = false; };
const changeManualNodesPage = (page) => { if (page < 1 || page > manualNodesTotalPages.value) return; manualNodesCurrentPage.value = page; };
const handleBulkImport = (importText) => {
  if (!importText) return;
  const lines = importText.split('\n').map(line => line.trim()).filter(Boolean);
  const newSubs = [], newNodes = [];
  for (const line of lines) { const newItem = { id: crypto.randomUUID(), name: extractNodeName(line) || '未命名', url: line, enabled: true, isUpdating: false }; if (/^https?:\/\//.test(line)) { newSubs.push({ ...newItem, nodeCount: 0 }); } else if (/^(ss|vmess|trojan|vless|hysteria2?):\/\//.test(line)) { newNodes.push(newItem); }}
  subscriptions.value = [...newSubs, ...subscriptions.value]; manualNodes.value = [...newNodes, ...manualNodes.value];
  subsCurrentPage.value = 1; manualNodesCurrentPage.value = 1; markDirty();
  showToast(`成功导入 ${newSubs.length} 条订阅和 ${newNodes.length} 个手动节点，请点击保存`, 'success');
  newSubs.forEach(sub => handleUpdateNodeCount(sub.id));
};
</script>

<template>
  <div v-if="isLoading" class="text-center py-16 text-gray-500">
    正在加载...
  </div>
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
                        <button v-if="!isSortingSubs" @click="isSortingSubs = true" class="text-sm font-medium px-3 py-1.5 rounded-lg text-blue-500 border-2 border-blue-500/60 hover:bg-blue-500/10 transition-all">编辑排序</button>
                        <button v-else @click="() => { isSortingSubs = false; markDirty(); }" class="text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-500 text-white transition-all">完成排序</button>
                        <button @click="showDeleteSubsModal = true" class="text-sm font-medium px-3 py-1.5 rounded-lg text-red-500 border-2 border-red-500/60 hover:bg-red-500 hover:text-white dark:text-red-400 dark:border-red-400/60 dark:hover:bg-red-400 dark:hover:text-white transition-all">清空订阅</button>
                        <button @click="handleAddSubscription" class="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">新增订阅</button>
                    </div>
                </div>

                <div v-if="subscriptions.length > 0">
                   <draggable
                      tag="div"
                      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                      :list="isSortingSubs ? subscriptions : paginatedSubscriptions"
                      :item-key="item => item.id"
                      :disabled="!isSortingSubs"
                      animation="300"
                   >
                     <template #item="{ element: subscription }">
                       <div :class="{'cursor-move': isSortingSubs}">
                         <Card
                           :misub="subscription"
                           @delete="handleDeleteSubscription(subscription.id)"
                           @change="markDirty"
                           @update="handleUpdateNodeCount(subscription.id)"
                           @edit="handleEditSubscription(subscription.id)"
                         />
                       </div>
                     </template>
                  </draggable>

                  <div v-if="subsTotalPages > 1 && !isSortingSubs" class="flex justify-center items-center space-x-4 mt-8 text-sm font-medium">
                      <button @click="changeSubsPage(subsCurrentPage - 1)" :disabled="subsCurrentPage === 1" class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">&laquo; 上一页</button>
                      <span class="text-gray-500 dark:text-gray-400">第 {{ subsCurrentPage }} / {{ subsTotalPages }} 页</span>
                      <button @click="changeSubsPage(subsCurrentPage + 1)" :disabled="subsCurrentPage === subsTotalPages" class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">下一页 &raquo;</button>
                  </div>
                </div>
                <div v-else class="text-center py-16 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg><h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">没有机场订阅</h3><p class="mt-1 text-sm text-gray-500">从添加你的第一个订阅开始。</p><div class="mt-6 flex justify-center gap-3"><button @click="showBulkImportModal = true" class="text-sm font-semibold px-4 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 border-2 border-indigo-500/50 hover:bg-indigo-500/10 transition-colors">批量导入</button><button @click="handleAddSubscription" class="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">新增订阅</button></div></div>
            </div>

            <div class="mt-4">
                <div class="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white">手动节点</h2>
                     <div class="flex items-center gap-2">
                        <button v-if="!isSortingNodes" @click="isSortingNodes = true" class="text-sm font-medium px-3 py-1.5 rounded-lg text-blue-500 border-2 border-blue-500/60 hover:bg-blue-500/10 transition-all">编辑排序</button>
                        <button v-else @click="() => { isSortingNodes = false; markDirty(); }" class="text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-500 text-white transition-all">完成排序</button>
                        <button @click="showDeleteNodesModal = true" class="text-sm font-medium px-3 py-1.5 rounded-lg text-red-500 border-2 border-red-500/60 hover:bg-red-500 hover:text-white dark:text-red-400 dark:border-red-400/60 dark:hover:bg-red-400 dark:hover:text-white transition-all">清空节点</button>
                        <button @click="handleAddNode" class="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">新增节点</button>
                    </div>
                </div>
                <div v-if="manualNodes.length > 0">
                    <draggable
                      tag="div"
                      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                      :list="isSortingNodes ? manualNodes : paginatedManualNodes"
                      :item-key="item => item.id"
                      :disabled="!isSortingNodes"
                      animation="300"
                    >
                      <template #item="{ element: node }">
                        <div :class="{'cursor-move': isSortingNodes}">
                          <ManualNodeCard 
                              :node="node"
                              @edit="handleEditNode(node.id)"
                              @delete="handleDeleteNode(node.id)"
                          />
                        </div>
                      </template>
                    </draggable>
                    <div v-if="manualNodesTotalPages > 1 && !isSortingNodes" class="flex justify-center items-center space-x-4 mt-8 text-sm font-medium">
                      <button @click="changeManualNodesPage(manualNodesCurrentPage - 1)" :disabled="manualNodesCurrentPage === 1" class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">&laquo; 上一页</button>
                      <span class="text-gray-500 dark:text-gray-400">第 {{ manualNodesCurrentPage }} / {{ manualNodesTotalPages }} 页</span>
                      <button @click="changeManualNodesPage(manualNodesCurrentPage + 1)" :disabled="manualNodesCurrentPage === manualNodesTotalPages" class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">下一页 &raquo;</button>
                    </div>
                </div>
                <div v-else class="text-center py-16 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" /></svg><h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">没有手动节点</h3><p class="mt-1 text-sm text-gray-500">添加分享链接或单个节点。</p><div class="mt-6 flex justify-center gap-3"><button @click="showBulkImportModal = true" class="text-sm font-semibold px-4 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 border-2 border-indigo-500/50 hover:bg-indigo-500/10 transition-colors">批量导入</button><button @click="handleAddNode" class="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">新增节点</button></div></div>
             </div>
        </div>
        <div class="lg:col-span-1">
            <RightPanel :config="config" />
        </div>
    </div>
  </div>

  <BulkImportModal v-model:show="showBulkImportModal" @import="handleBulkImport" />
  <Modal v-model:show="showDeleteSubsModal" @confirm="handleDeleteAllSubscriptions"><template #title><h3 class="text-lg font-bold text-red-500">确认清空订阅</h3></template><template #body><p class="text-sm text-gray-400">您确定要删除所有**订阅**吗？此操作将标记为待保存，不会影响手动节点。</p></template></Modal>
  <Modal v-model:show="showDeleteNodesModal" @confirm="handleDeleteAllNodes"><template #title><h3 class="text-lg font-bold text-red-500">确认清空节点</h3></template><template #body><p class="text-sm text-gray-400">您确定要删除所有**手动节点**吗？此操作将标记为待保存，不会影响订阅。</p></template></Modal>
  <Modal v-if="editingNode" v-model:show="showNodeModal" @confirm="handleSaveNode"><template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewNode ? '新增手动节点' : '编辑手动节点' }}</h3></template><template #body><div class="space-y-4"><div><label for="node-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点名称</label><input type="text" id="node-name" v-model="editingNode.name" placeholder="（可选）不填将自动获取" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"></div><div><label for="node-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点链接</label><textarea id="node-url" v-model="editingNode.url" @input="handleNodeUrlInput" rows="4" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"></textarea></div></div></template></Modal>
  <Modal v-if="editingSubscription" v-model:show="showSubModal" @confirm="handleSaveSubscription"><template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewSubscription ? '新增订阅' : '编辑订阅' }}</h3></template><template #body><div class="space-y-4"><div><label for="sub-edit-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅名称</label><input type="text" id="sub-edit-name" v-model="editingSubscription.name" placeholder="（可选）不填将自动获取" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"></div><div><label for="sub-edit-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅链接</label><input type="text" id="sub-edit-url" v-model="editingSubscription.url" placeholder="https://..." class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"></div></div></template></Modal>
  <SettingsModal v-model:show="showSettingsModal" />
</template>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);  }
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
.list-fade-move,
.list-fade-enter-active,
.list-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}
.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(30px, 0);
}
.list-fade-leave-active {
  position: absolute;
}
.cursor-move {
  cursor: move;
}
</style>
