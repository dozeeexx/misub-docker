// FILE: src/composables/useManualNodes.js
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/useDataStore';
import { useToastStore } from '../stores/toast';
import { extractNodeName } from '../lib/utils.js';
import { filterManualNodes, isManualNodeEntry } from './manual-nodes/filters.js';
import { buildDedupPlan as buildDedupPlanCore } from './manual-nodes/dedup.js';
import { buildAutoSortedSubscriptions } from './manual-nodes/sorting.js';
import { collectManualNodeGroups, buildGroupedManualNodes } from './manual-nodes/groups.js';

export function useManualNodes(markDirty) {
  const { showToast } = useToastStore();
  const dataStore = useDataStore();
  const { subscriptions: allSubscriptions } = storeToRefs(dataStore);

  // Manual Nodes are items in subscriptions that are NOT http/https
  // We filter from the shared store state
  // [FIX] 添加更严格的验证,确保只识别有效的手工节点
  const manualNodes = computed(() => {
    return (allSubscriptions.value || []).filter(isManualNodeEntry);
  });

  const manualNodesCurrentPage = ref(1);
  const manualNodesPerPage = 24;
  const searchTerm = ref('');

  const activeColorFilter = ref(null); // null = all, or color string

  const filteredManualNodes = computed(() => {
    return filterManualNodes(manualNodes.value, searchTerm.value, activeColorFilter.value);
  });

  const manualNodesTotalPages = computed(() => Math.ceil(filteredManualNodes.value.length / manualNodesPerPage));

  const paginatedManualNodes = computed(() => {
    const start = (manualNodesCurrentPage.value - 1) * manualNodesPerPage;
    const end = start + manualNodesPerPage;
    return filteredManualNodes.value.slice(start, end);
  });

  const enabledManualNodes = computed(() => manualNodes.value.filter(n => n.enabled));

  function changeManualNodesPage(page) {
    if (page < 1 || page > manualNodesTotalPages.value) return;
    manualNodesCurrentPage.value = page;
  }

  function setColorFilter(color) {
    activeColorFilter.value = color;
    manualNodesCurrentPage.value = 1; // Reset to page 1
  }

  function batchUpdateColor(nodeIds, color) {
    if (!nodeIds || nodeIds.length === 0) return;
    const idsSet = new Set(nodeIds);
    const updates = manualNodes.value
      .filter(n => idsSet.has(n.id))
      .map(n => {
        // Only update if changed
        if (n.colorTag === color) return null;
        return { id: n.id, updates: { ...n, colorTag: color } };
      })
      .filter(u => u);

    if (updates.length > 0) {
      updates.forEach(({ id, updates }) => {
        dataStore.updateSubscription(id, updates);
      });
      markDirty();
      showToast(`已标记 ${updates.length} 个节点`, 'success');
    }
  }

  function batchDeleteNodes(nodeIds) {
    if (!nodeIds || nodeIds.length === 0) return;
    // Confirmation moved to UI layer

    nodeIds.forEach(id => {
      dataStore.removeSubscription(id);
    });

    // Adjust pagination if needed
    if (paginatedManualNodes.value.length === 0 && manualNodesCurrentPage.value > 1) {
      manualNodesCurrentPage.value--;
    }

    markDirty();
    showToast(`已删除 ${nodeIds.length} 个节点`, 'success');
  }

  function addNode(node) {
    if (!node.name) {
      node.name = extractNodeName(node.url);
    }
    // Add to shared store
    dataStore.addSubscription(node);
    manualNodesCurrentPage.value = 1;
    markDirty();
  }

  function updateNode(updatedNode) {
    // Update in shared store
    dataStore.updateSubscription(updatedNode.id, updatedNode);
    markDirty();
  }

  function deleteNode(nodeId) {
    dataStore.removeSubscription(nodeId);
    if (paginatedManualNodes.value.length === 0 && manualNodesCurrentPage.value > 1) {
      manualNodesCurrentPage.value--;
    }
    markDirty();
  }

  function deleteAllNodes() {
    // Only remove proper manual nodes (not subscriptions)
    const idsToRemove = manualNodes.value.map(n => n.id);
    idsToRemove.forEach(id => dataStore.removeSubscription(id));

    manualNodesCurrentPage.value = 1;
    markDirty();
  }

  function addNodesFromBulk(nodes) {
    // Reverse insert
    for (let i = nodes.length - 1; i >= 0; i--) {
      dataStore.addSubscription(nodes[i]);
    }
    markDirty();
  }

  const buildDedupPlan = () => buildDedupPlanCore(manualNodes.value);

  function applyDedupPlan(plan) {
    if (!plan || !plan.removeNodes || plan.removeNodes.length === 0) {
      showToast('没有发现重复的节点。', 'info');
      return;
    }

    plan.removeNodes.forEach(node => dataStore.removeSubscription(node.id));
    showToast(`成功移除 ${plan.removeNodes.length} 个重复节点，请记得保存。`, 'success');
    markDirty();
    manualNodesCurrentPage.value = 1;
  }

  function deduplicateNodes() {
    const plan = buildDedupPlan();
    applyDedupPlan(plan);
  }

  function autoSortNodes() {
    // Sort logic requires replacing the list.
    // Since manual nodes are part of a larger list (subscriptions), we need to extract them, sort them, 
    // and then potentially re-insert them or just update their order relative to themselves?
    // The store's 'subscriptions' array is mixed.
    // If we want to sort ONLY manual nodes but keep subscriptions in place... 
    // It's complex because we don't track indices separately easily.
    // Approach: Extract all Manual Nodes, Sort them, Extract all Subscriptions (keep order),
    // Then Combine: [Subscriptions..., SortedManualNodes...]
    // This effectively moves all manual nodes to the bottom. This is acceptable/expected behavior.

    const mergedList = buildAutoSortedSubscriptions(allSubscriptions.value || [], manualNodes.value);

    // Update store with new order: Manual Nodes first, then Subscriptions
    dataStore.overwriteSubscriptions(mergedList);

    manualNodesCurrentPage.value = 1;
    markDirty();
  }

  watch(searchTerm, (newValue, oldValue) => {
    if (newValue !== oldValue) {
      manualNodesCurrentPage.value = 1;
    }
  });

  function reorderManualNodes(newOrder) {
    // 1. Get all Subscriptions (to preserve them)
    const currentSubscriptions = (allSubscriptions.value || []).filter(item => item.url && /^https?:\/\//.test(item.url));

    // 2. Combine Existing Subscriptions + New Ordered Manual Nodes
    // Logic: Manual Nodes at top, Subscriptions at bottom
    const mergedList = [...newOrder, ...currentSubscriptions];

    // 3. Update Store
    dataStore.overwriteSubscriptions(mergedList);

    // 4. Mark Dirty
    markDirty();
  }

  const manualNodeGroups = computed(() => collectManualNodeGroups(manualNodes.value));

  const groupedManualNodes = computed(() => {
    return buildGroupedManualNodes(filteredManualNodes.value, manualNodeGroups.value);
  });

  function renameGroup(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;

    const nodesInGroup = manualNodes.value.filter(n => n.group === oldName);
    nodesInGroup.forEach(node => {
      dataStore.updateSubscription(node.id, { ...node, group: newName });
    });
    markDirty();
  }

  function deleteGroup(groupName) {
    if (!groupName) return;
    // Ungroup nodes (move to default)
    const nodesInGroup = manualNodes.value.filter(n => n.group === groupName);
    nodesInGroup.forEach(node => {
      // Creating a copy logic is safe here as updateSubscription handles it
      const { group, ...rest } = node;
      dataStore.updateSubscription(node.id, { ...rest, group: '' }); // Set to empty string or remove property
    });
    markDirty();
  }

  return {
    manualNodes, // Returns computed filtered list
    manualNodeGroups,
    groupedManualNodes,
    manualNodesCurrentPage,
    manualNodesTotalPages,
    paginatedManualNodes,
    enabledManualNodesCount: computed(() => enabledManualNodes.value.length),
    searchTerm,
    activeColorFilter, // New
    changeManualNodesPage,
    addNode,
    updateNode,
    deleteNode,
    deleteAllNodes,
    addNodesFromBulk,
    autoSortNodes,
    deduplicateNodes,
    buildDedupPlan,
    applyDedupPlan,
    reorderManualNodes, // Added
    renameGroup,
    deleteGroup,
    setColorFilter, // New
    batchUpdateColor, // New
    batchDeleteNodes // New
  };
}
