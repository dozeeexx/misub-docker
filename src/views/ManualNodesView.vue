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
const showBatchDeleteModal = ref(false);
const batchDeleteIds = ref([]);
const showSubscriptionImportModal = ref(false);

const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes, searchTerm,
  changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes,
  addNodesFromBulk, autoSortNodes, deduplicateNodes,
  reorderManualNodes, cleanupNodes, cleanupAllNodes,
  manualNodeGroups, renameGroup, deleteGroup,
  activeColorFilter, setColorFilter, batchUpdateColor, batchDeleteNodes
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

</script>

<template>
  <div class="max-w-(--breakpoint-xl) mx-auto">


    <ManualNodePanel
      :manual-nodes="manualNodes"
      :paginated-manual-nodes="paginatedManualNodes"
      :current-page="manualNodesCurrentPage"
      :total-pages="manualNodesTotalPages"
      :is-sorting="isSortingNodes"
      :search-term="searchTerm"
      :view-mode="manualNodeViewMode"
      :groups="manualNodeGroups"
      :active-color-filter="activeColorFilter"
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
      @rename-group="renameGroup"
      @delete-group="deleteGroup"
      @set-color-filter="setColorFilter"
      @batch-update-color="batchUpdateColor"
      @batch-delete-nodes="handleBatchDeleteRequest"
    />

    <Modal v-if="editingNode" v-model:show="showNodeModal" @confirm="handleSaveNode">
        <template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewNode ? '新增手动节点' : '编辑手动节点' }}</h3></template>
        <template #body>
        <div class="space-y-4">
            <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点名称</label><input type="text" v-model="editingNode.name" placeholder="（可选）" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"></div>
            
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
                    <!-- Clear Button -->
                     <button 
                        v-if="editingNode.colorTag"
                        @click="editingNode.colorTag = null"
                        class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
                    >清除</button>
                </div>
            </div>

            <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点链接</label><textarea v-model="editingNode.url" @input="handleNodeUrlInput" rows="4" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"></textarea></div>
        </div>
        </template>
    </Modal>

    <Modal v-model:show="showDeleteNodesModal" @confirm="handleDeleteAllNodesWithCleanup">
        <template #title><h3 class="text-lg font-bold text-red-500">确认清空节点</h3></template>
        <template #body><p class="text-sm text-gray-400">您确定要删除所有**手动节点**吗？</p></template>
    </Modal>

    <Modal v-model:show="showBatchDeleteModal" @confirm="confirmBatchDelete">
        <template #title><h3 class="text-lg font-bold text-red-500">确认批量删除</h3></template>
        <template #body><p class="text-sm text-gray-600 dark:text-gray-300">您确定要删除选中的 <span class="font-bold border-b border-red-500">{{ batchDeleteIds.length }}</span> 个节点吗？此操作不可恢复。</p></template>
    </Modal>

    <SubscriptionImportModal :show="showSubscriptionImportModal" @update:show="showSubscriptionImportModal = $event" :add-nodes-from-bulk="addNodesFromBulk" />
  </div>
</template>
