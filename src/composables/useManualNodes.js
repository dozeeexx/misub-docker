// FILE: src/composables/useManualNodes.js
import { ref, computed, watch } from 'vue';

export function useManualNodes(initialNodesRef, markDirty) {
  const manualNodes = ref([]);
  const manualNodesCurrentPage = ref(1);
  const manualNodesPerPage = 24;

  const searchTerm = ref('');

  function initializeManualNodes(nodesData) {
    manualNodes.value = (nodesData || []).map(node => ({
      ...node,
      id: node.id || crypto.randomUUID(),
      enabled: node.enabled ?? true,
    }));
  }

  // [新增] 根据搜索词过滤节点
  const filteredManualNodes = computed(() => {
    if (!searchTerm.value) {
      return manualNodes.value;
    }
    const lowerCaseSearch = searchTerm.value.toLowerCase();
    return manualNodes.value.filter(node => 
      (node.name && node.name.toLowerCase().includes(lowerCaseSearch)) ||
      (node.url && node.url.toLowerCase().includes(lowerCaseSearch))
    );
  });

  const manualNodesTotalPages = computed(() => Math.ceil(filteredManualNodes.value.length / manualNodesPerPage));

  // [修改] 分页使用过滤后的节点
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

  function addNode(node) {
    manualNodes.value.unshift(node);
    manualNodesCurrentPage.value = 1;
    markDirty();
  }

  function updateNode(updatedNode) {
    const index = manualNodes.value.findIndex(n => n.id === updatedNode.id);
    if (index !== -1) {
      manualNodes.value[index] = updatedNode;
      markDirty();
    }
  }

  function deleteNode(nodeId) {
    manualNodes.value = manualNodes.value.filter(n => n.id !== nodeId);
    if (paginatedManualNodes.value.length === 0 && manualNodesCurrentPage.value > 1) {
      manualNodesCurrentPage.value--;
    }
    markDirty();
  }

  function deleteAllNodes() {
    manualNodes.value = [];
    manualNodesCurrentPage.value = 1;
    markDirty();
  }

  function addNodesFromBulk(nodes) {
    manualNodes.value.unshift(...nodes);
    markDirty();
  }
  
  function autoSortNodes() {
    const regionKeywords = { HK: [/香港/,/HK/,/Hong Kong/i], TW: [/台湾/,/TW/,/Taiwan/i], SG: [/新加坡/,/SG/,/狮城/,/Singapore/i], JP: [/日本/,/JP/,/Japan/i], US: [/美国/,/US/,/United States/i], KR: [/韩国/,/KR/,/Korea/i], GB: [/英国/,/GB/,/UK/,/United Kingdom/i], DE: [/德国/,/DE/,/Germany/i], FR: [/法国/,/FR/,/France/i], CA: [/加拿大/,/CA/,/Canada/i], AU: [/澳大利亚/,/AU/,/Australia/i], };
    const regionOrder = ['HK', 'TW', 'SG', 'JP', 'US', 'KR', 'GB', 'DE', 'FR', 'CA', 'AU'];
    const getRegionCode = (name) => { for (const code in regionKeywords) { for (const keyword of regionKeywords[code]) { if (keyword.test(name)) return code; } } return 'ZZ'; };
    
    manualNodes.value.sort((a, b) => {
        const regionA = getRegionCode(a.name);
        const regionB = getRegionCode(b.name);
        const indexA = regionOrder.indexOf(regionA);
        const indexB = regionOrder.indexOf(regionB);
        const effectiveIndexA = indexA === -1 ? Infinity : indexA;
        const effectiveIndexB = indexB === -1 ? Infinity : indexB;
        if (effectiveIndexA !== effectiveIndexB) return effectiveIndexA - effectiveIndexB;
        return a.name.localeCompare(b.name, 'zh-CN');
    });
    // [修正] 只標記為 dirty，不呼叫 handleSave
    markDirty();
  }

    // [新增] 监听搜索词变化，重置分页
  watch(searchTerm, () => {
    manualNodesCurrentPage.value = 1;
  });

  watch(initialNodesRef, (newInitialNodes) => {
    initializeManualNodes(newInitialNodes);
  }, { immediate: true, deep: true });

  return {
    manualNodes,
    manualNodesCurrentPage,
    manualNodesTotalPages,
    paginatedManualNodes,
    enabledManualNodesCount: computed(() => enabledManualNodes.value.length),
    searchTerm, // [新增] 导出搜索词
    changeManualNodesPage,
    addNode,
    updateNode,
    deleteNode,
    deleteAllNodes,
    addNodesFromBulk,
    autoSortNodes,
  };
}