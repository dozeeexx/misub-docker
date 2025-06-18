// src/composables/useManualNodes.js
import { ref, computed, watch } from 'vue';

export function useManualNodes(initialNodesRef, markDirty) {
  const manualNodes = ref([]);
  const manualNodesCurrentPage = ref(1);
  const manualNodesPerPage = 24;

  const initializeManualNodes = (nodesData) => {
    manualNodes.value = (nodesData || []).map(node => ({
      ...node, id: crypto.randomUUID(), enabled: node.enabled ?? true,
    }));
  };

  watch(initialNodesRef, (newInitialNodes) => {
    initializeManualNodes(newInitialNodes);
  }, { immediate: true, deep: true });

  const manualNodesTotalPages = computed(() => Math.ceil(manualNodes.value.length / manualNodesPerPage));
  const paginatedManualNodes = computed(() => {
    const start = (manualNodesCurrentPage.value - 1) * manualNodesPerPage;
    const end = start + manualNodesPerPage;
    return manualNodes.value.slice(start, end);
  });
  const enabledManualNodes = computed(() => manualNodes.value.filter(n => n.enabled));

  const changeManualNodesPage = (page) => {
    if (page < 1 || page > manualNodesTotalPages.value) return;
    manualNodesCurrentPage.value = page;
  };

  const addNode = (node) => {
    manualNodes.value.unshift(node);
    manualNodesCurrentPage.value = 1;
    markDirty();
  };

  const updateNode = (updatedNode) => {
    const index = manualNodes.value.findIndex(n => n.id === updatedNode.id);
    if (index !== -1) {
      manualNodes.value[index] = updatedNode;
      markDirty();
    }
  };

  const deleteNode = (nodeId) => {
    manualNodes.value = manualNodes.value.filter(n => n.id !== nodeId);
    if (paginatedManualNodes.value.length === 0 && manualNodesCurrentPage.value > 1) {
      manualNodesCurrentPage.value--;
    }
    markDirty();
  };

  const deleteAllNodes = () => {
    manualNodes.value = [];
    manualNodesCurrentPage.value = 1;
    markDirty();
  };

  const addNodesFromBulk = (nodes) => {
    manualNodes.value.unshift(...nodes);
    markDirty();
  };

  return {
    manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes,
    enabledManualNodesCount: computed(() => enabledManualNodes.value.length),
    changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes, addNodesFromBulk,
  };
}