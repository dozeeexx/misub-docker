<script setup>
import { ref, defineAsyncComponent } from 'vue';
import { useDataStore } from '../stores/useDataStore.js';
import { useManualNodes } from '../composables/useManualNodes.js';
import { useToastStore } from '../stores/toast.js';
import { extractNodeName } from '../lib/utils.js';
import ManualNodePanel from '../components/nodes/ManualNodePanel.vue';
import Modal from '../components/forms/Modal.vue';
import SubscriptionImportModal from '../components/modals/SubscriptionImportModal.vue';

const dataStore = useDataStore();
const { showToast } = useToastStore();
const { markDirty } = dataStore;

// Component Logic Reuse
const isSortingNodes = ref(false);
const manualNodeViewMode = ref(localStorage.getItem('manualNodeViewMode') || 'card');
const editingNode = ref(null);
const isNewNode = ref(false);
const showNodeModal = ref(false);
const showDeleteNodesModal = ref(false);
const showSubscriptionImportModal = ref(false);

const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes, searchTerm,
  changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes,
  addNodesFromBulk, autoSortNodes, deduplicateNodes,
  reorderManualNodes, cleanupNodes, cleanupAllNodes
} = useManualNodes(markDirty);

// Actions
const setViewMode = (mode) => {
  manualNodeViewMode.value = mode;
  localStorage.setItem('manualNodeViewMode', mode);
};

const handleDeleteNodeWithCleanup = (nodeId) => {
  deleteNode(nodeId);
  cleanupNodes(nodeId);
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

const handleAddNode = () => {
  isNewNode.value = true;
  editingNode.value = { id: crypto.randomUUID(), name: '', url: '', enabled: true };
  showNodeModal.value = true;
};

const handleEditNode = (nodeId) => {
  const node = manualNodes.value.find(n => n.id === nodeId);
  if (node) {
    isNewNode.value = false;
    editingNode.value = { ...node };
    showNodeModal.value = true;
  }
};

const handleNodeUrlInput = (event) => {
  if (!editingNode.value) return;
  const newUrl = event.target.value;
  if (newUrl && !editingNode.value.name) {
    editingNode.value.name = extractNodeName(newUrl);
  }
};

const handleSaveNode = () => {
    if (!editingNode.value || !editingNode.value.url) { showToast('节点链接不能为空', 'error'); return; }
    if (isNewNode.value) {
        addNode(editingNode.value);
    } else {
        updateNode(editingNode.value);
    }
    showNodeModal.value = false;
};

</script>

<template>
  <div class="max-w-(--breakpoint-xl) mx-auto">
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">手工节点</h1>
    </div>

    <ManualNodePanel
      :manual-nodes="manualNodes"
      :paginated-manual-nodes="paginatedManualNodes"
      :current-page="manualNodesCurrentPage"
      :total-pages="manualNodesTotalPages"
      :is-sorting="isSortingNodes"
      :search-term="searchTerm"
      :view-mode="manualNodeViewMode"
      @add="handleAddNode"
      @delete="handleDeleteNodeWithCleanup"
      @edit="handleEditNode"
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
    />

    <Modal v-if="editingNode" v-model:show="showNodeModal" @confirm="handleSaveNode">
        <template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewNode ? '新增手动节点' : '编辑手动节点' }}</h3></template>
        <template #body>
        <div class="space-y-4">
            <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点名称</label><input type="text" v-model="editingNode.name" placeholder="（可选）" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"></div>
            <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点链接</label><textarea v-model="editingNode.url" @input="handleNodeUrlInput" rows="4" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"></textarea></div>
        </div>
        </template>
    </Modal>

    <Modal v-model:show="showDeleteNodesModal" @confirm="handleDeleteAllNodesWithCleanup">
        <template #title><h3 class="text-lg font-bold text-red-500">确认清空节点</h3></template>
        <template #body><p class="text-sm text-gray-400">您确定要删除所有**手动节点**吗？</p></template>
    </Modal>

    <SubscriptionImportModal :show="showSubscriptionImportModal" @update:show="showSubscriptionImportModal = $event" :add-nodes-from-bulk="addNodesFromBulk" />
  </div>
</template>
