<script setup>
import { ref, defineAsyncComponent } from 'vue';
import { useDataStore } from '../stores/useDataStore.js';
import { useManualNodes } from '../composables/useManualNodes.js';
import { useNodeForms } from '../composables/useNodeForms.js'; // Added
import { useToastStore } from '../stores/toast.js';
import { extractNodeName } from '../lib/utils.js';
import ManualNodePanel from '../components/nodes/ManualNodePanel.vue';
import Modal from '../components/forms/Modal.vue';
import ManualNodeEditModal from '../components/modals/ManualNodeEditModal.vue';
import ManualNodeDedupModal from '../components/modals/ManualNodeDedupModal.vue';
import SubscriptionImportModal from '../components/modals/SubscriptionImportModal.vue';

const dataStore = useDataStore();
const { showToast } = useToastStore();
const { markDirty } = dataStore;

// Component Logic Reuse
const isSortingNodes = ref(false);
const manualNodeViewMode = ref(localStorage.getItem('manualNodeViewMode') || 'card');
const showDeleteNodesModal = ref(false);
const showBatchDeleteModal = ref(false);
const batchDeleteIds = ref([]);
const showSubscriptionImportModal = ref(false);
const showDedupModal = ref(false);
const dedupPlan = ref(null);

const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes, searchTerm,
  changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes,
  addNodesFromBulk, autoSortNodes, deduplicateNodes, buildDedupPlan, applyDedupPlan,
  reorderManualNodes, cleanupNodes, cleanupAllNodes,
  manualNodeGroups, renameGroup, deleteGroup,
  activeColorFilter, setColorFilter, batchUpdateColor, batchDeleteNodes
} = useManualNodes(markDirty);

const {
  showModal: showNodeModal,
  isNew: isNewNode,
  editingNode,
  openAdd: handleAddNode,
  openEdit: handleEditNode,
  handleUrlInput: handleNodeUrlInput,
  handleSave: handleSaveNode
} = useNodeForms({ addNode, updateNode });

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
  const plan = buildDedupPlan();
  if (!plan || plan.removeCount === 0) {
    showToast('没有发现重复的节点。', 'info');
    return;
  }
  dedupPlan.value = plan;
  showDedupModal.value = true;
};

// Old Handlers Removed

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
      @rename-group="renameGroup"
      @delete-group="deleteGroup"
      @set-color-filter="setColorFilter"
      @batch-update-color="batchUpdateColor"
      @batch-delete-nodes="handleBatchDeleteRequest"
    />

    <ManualNodeEditModal
      v-model:show="showNodeModal"
      :is-new="isNewNode"
      :editing-node="editingNode"
      @confirm="handleSaveNode"
      @input-url="handleNodeUrlInput"
    />
    <ManualNodeDedupModal
      v-model:show="showDedupModal"
      :plan="dedupPlan"
      @confirm="applyDedupPlan(dedupPlan); showDedupModal = false; dedupPlan = null"
    />

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
