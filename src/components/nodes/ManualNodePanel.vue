<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import BulkOperations from './ManualNodePanel/BulkOperations.vue';
import NodeActions from './ManualNodePanel/NodeActions.vue';
import NodeTable from './ManualNodePanel/NodeTable.vue';

const props = defineProps({
  manualNodes: { type: Array, default: () => [] },
  paginatedManualNodes: Array,
  currentPage: Number,
  totalPages: Number,
  isSorting: Boolean,
  searchTerm: String,
  viewMode: String,
  groups: { type: Array, default: () => [] },
  activeGroupFilter: { type: String, default: null }, // New
  itemsPerPage: { type: Number, default: 24 }, // Added
});

const emit = defineEmits([
  'add', 'delete', 'edit', 'changePage', 'update:searchTerm', 'update:viewMode',
  'toggleSort', 'markDirty', 'autoSort', 'deduplicate', 'import', 'deleteAll', 'reorder',
  'rename-group', 'delete-group',
  'set-group-filter', 'batch-update-group', 'batch-delete-nodes',
  'update:itemsPerPage', // Added
  'open-batch-group-modal' // Added
]);

const isSelectionMode = ref(false);
const selectedNodeIds = ref(new Set());

const toggleSelectionMode = () => {
    isSelectionMode.value = !isSelectionMode.value;
    selectedNodeIds.value.clear();
};

const toggleNodeSelection = (nodeId) => {
    if (selectedNodeIds.value.has(nodeId)) {
        selectedNodeIds.value.delete(nodeId);
    } else {
        selectedNodeIds.value.add(nodeId);
    }
};

const isAllSelected = computed(() => {
    if (paginatedNodes.value.length === 0) return false;
    return paginatedNodes.value.every(node => selectedNodeIds.value.has(node.id));
});

const selectedCount = computed(() => selectedNodeIds.value.size);

const toggleSelectAll = () => {
    if (isAllSelected.value) {
        // Deselect all on current page
        paginatedNodes.value.forEach(node => selectedNodeIds.value.delete(node.id));
    } else {
        // Select all on current page
        paginatedNodes.value.forEach(node => selectedNodeIds.value.add(node.id));
    }
};

const handleBatchGroup = () => {
    emit('open-batch-group-modal', Array.from(selectedNodeIds.value));
    // Do not clear selection yet, wait for action to complete?
    // Or clear it now? If user cancels modal, selection is lost.
    // Better to keep selection until action confirms.
    // But if we clear here, we can't re-select easily.
    // Let's NOT clear here. The parent can handle it or we clear on success?
    // Actually, usually we clear after the operation is DONE.
    // Since operation is async/handled by parent, we might need a way to clear selection.
    // For now, let's keep selection.
};

const handleBatchDelete = () => {
    emit('batch-delete-nodes', Array.from(selectedNodeIds.value));
    selectedNodeIds.value.clear();
    isSelectionMode.value = false;
};


// ... (props setup for computed etc.)
// Re-declare computed in context? No, just use existing but injected
// But need to update the Templates where ManualNodeCard is used

const groupedNodes = computed(() => {
    const nodes = paginatedNodes.value;
// ... (keep this)
    const groups = {};
    if (!nodes || nodes.length === 0) return {};

    // Sort nodes by group status first? No, preserve order (pagination) but bucket them
    
    nodes.forEach(node => {
        const groupName = node.group || '默认';
        if (!groups[groupName]) {
            groups[groupName] = [];
        }
        groups[groupName].push(node);
    });
    
    // Sort keys so '默认' is last, others alphabetical
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === '默认') return 1;
        if (b === '默认') return -1;
        return a.localeCompare(b);
    });
    
    const sortedResult = {};
    sortedKeys.forEach(key => {
        sortedResult[key] = groups[key];
    });
    
    return sortedResult;
});

const handleRenameGroup = (oldName) => {
    const newName = prompt('请输入新的分组名称:', oldName);
    if (newName && newName !== oldName) {
        emit('rename-group', oldName, newName);
    }
};

const handleDeleteGroup = (groupName) => {
    if (confirm(`确定要解散分组 "${groupName}" 吗？\n组内节点将被移动到"默认"分组。`)) {
        emit('delete-group', groupName);
    }
};

const draggableManualNodes = computed({
  get: () => [...props.manualNodes],
  set: (val) => emit('reorder', val)
});

const localSearchTerm = ref(props.searchTerm || '');

// 简化搜索逻辑 - 直接在组件内处理


// 在组件内部直接计算过滤结果
const filteredNodes = computed(() => {
  if (!localSearchTerm.value) {
    return props.manualNodes;
  }
  
  const searchQuery = localSearchTerm.value.toLowerCase().trim();
  
  // 国家/地区代码到中文名称的映射
  const countryCodeMap = {
    'hk': ['香港', 'hk'],
    'tw': ['台湾', '臺灣', 'tw'],
    'sg': ['新加坡', '狮城', 'sg'],
    'jp': ['日本', 'jp'],
    'us': ['美国', ' США', 'us'],
    'kr': ['韩国', '韓國', 'kr'],
    'gb': ['英国', '英國', 'gb', 'uk'],
    'de': ['德国', '德國', 'de'],
    'fr': ['法国', '法國', 'fr'],
    'ca': ['加拿大', 'ca'],
    'au': ['澳大利亚', '澳洲', '澳大利亞', 'au'],
    'cn': ['中国', '大陸', '内地', 'cn'],
    'my': ['马来西亚', '馬來西亞', 'my'],
    'th': ['泰国', '泰國', 'th'],
    'vn': ['越南', 'vn'],
    'ph': ['菲律宾', '菲律賓', 'ph'],
    'id': ['印度尼西亚', '印尼', 'id'],
    'in': ['印度', 'in'],
    'pk': ['巴基斯坦', 'pk'],
    'bd': ['孟加拉国', '孟加拉國', 'bd'],
    'ae': ['阿联酋', '阿聯酋', 'ae'],
    'sa': ['沙特阿拉伯', 'sa'],
    'tr': ['土耳其', 'tr'],
    'ru': ['俄罗斯', '俄羅斯', 'ru'],
    'br': ['巴西', 'br'],
    'mx': ['墨西哥', 'mx'],
    'ar': ['阿根廷', 'ar'],
    'cl': ['智利', 'cl'],
    'za': ['南非', 'za'],
    'eg': ['埃及', 'eg'],
    'ng': ['尼日利亚', '尼日利亞', 'ng'],
    'ke': ['肯尼亚', '肯尼亞', 'ke'],
    'il': ['以色列', 'il'],
    'ir': ['伊朗', 'ir'],
    'iq': ['伊拉克', 'iq'],
    'ua': ['乌克兰', '烏克蘭', 'ua'],
    'pl': ['波兰', '波蘭', 'pl'],
    'cz': ['捷克', 'cz'],
    'hu': ['匈牙利', 'hu'],
    'ro': ['罗马尼亚', '羅馬尼亞', 'ro'],
    'gr': ['希腊', '希臘', 'gr'],
    'pt': ['葡萄牙', 'pt'],
    'es': ['西班牙', 'es'],
    'it': ['意大利', 'it'],
    'nl': ['荷兰', '荷蘭', 'nl'],
    'be': ['比利时', '比利時', 'be'],
    'se': ['瑞典', 'se'],
    'no': ['挪威', 'no'],
    'dk': ['丹麦', '丹麥', 'dk'],
    'fi': ['芬兰', '芬蘭', 'fi'],
    'ch': ['瑞士', 'ch'],
    'at': ['奥地利', '奧地利', 'at'],
    'ie': ['爱尔兰', '愛爾蘭', 'ie'],
    'nz': ['新西兰', '紐西蘭', 'nz'],
  };
  
  const filtered = props.manualNodes.filter(node => {
    if (!node.name) return false;
    
    const nodeName = node.name.toLowerCase();
    
    // 直接搜索匹配
    if (nodeName.includes(searchQuery)) {
      return true;
    }
    
    // 国家代码映射匹配
    const alternativeTerms = countryCodeMap[searchQuery] || [];
    for (const altTerm of alternativeTerms) {
      if (nodeName.includes(altTerm.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  });
  
  return filtered;
});

// 分页处理
const currentPage = ref(1);
const nodesPerPage = 24;
const totalPages = computed(() => Math.ceil(filteredNodes.value.length / nodesPerPage));

// 计算当前显示的节点数据
const paginatedNodes = computed(() => {
  if (localSearchTerm.value) {
    // 搜索时使用本地过滤和分页
    const start = (currentPage.value - 1) * nodesPerPage;
    const end = start + nodesPerPage;
    return filteredNodes.value.slice(start, end);
  } else {
    // 非搜索时使用props传入的分页数据
    return props.paginatedManualNodes;
  }
});

// 监听搜索词变化重置分页
watch(localSearchTerm, () => {
  currentPage.value = 1;
});

const handleDelete = (id) => emit('delete', id);
const handleEdit = (id) => emit('edit', id);
const handleAdd = () => emit('add');
const handleChangePage = (page) => {
  if (localSearchTerm.value) {
    // 搜索时使用本地分页
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  } else {
    // 非搜索时使用原来的分页
    emit('changePage', page);
  }
};
const handleSetViewMode = (mode) => emit('update:viewMode', mode);
const handleToggleSort = () => {
  emit('toggleSort');

  // 使用 nextTick 等待状态更新完成后重置分页
  nextTick(() => {
    // 如果已经退出排序模式且没有搜索，重置到第一页
    if (!props.isSorting && !props.searchTerm) {
      emit('changePage', 1);
    }
  });
};
const handleSortEnd = () => {
  emit('markDirty');
  // 手动排序完成后重置到第一页
  if (!props.searchTerm) {
    emit('changePage', 1);
  }
};
const handleAutoSort = () => {
  emit('autoSort');
};
const handleDeduplicate = () => {
  emit('deduplicate');
};
const handleImport = () => {
  emit('import');
};
const handleDeleteAll = () => {
  emit('deleteAll');
};
</script>

<template>
  <div>
    <NodeActions
      :manual-nodes-count="manualNodes.length"
      :filtered-nodes-count="filteredNodes.length"
      :search-term="localSearchTerm"
      :active-group-filter="activeGroupFilter"
      :manual-node-groups="groups"
      :view-mode="viewMode"
      :is-sorting="isSorting"
      :is-selection-mode="isSelectionMode"
      @update:search-term="localSearchTerm = $event"
      @update:view-mode="handleSetViewMode"
      @set-group-filter="emit('set-group-filter', $event)"
      @add="handleAdd"
      @import="handleImport"
      @auto-sort="handleAutoSort"
      @deduplicate="handleDeduplicate"
      @toggle-sort="handleToggleSort"
      @delete-all="handleDeleteAll"
      @toggle-selection-mode="toggleSelectionMode"
    />

    <BulkOperations
      :is-selection-mode="isSelectionMode"
      :is-all-selected="isAllSelected"
      :selected-count="selectedCount"
      :groups="groups"
      @toggle-select-all="toggleSelectAll"
      @batch-group="handleBatchGroup"
      @batch-delete="handleBatchDelete"
      @exit="() => { selectedNodeIds.clear(); isSelectionMode = false; }"
    />

    <NodeTable
      v-model:draggable-manual-nodes="draggableManualNodes"
      :manual-nodes="manualNodes"
      :paginated-nodes="paginatedNodes"
      :filtered-nodes="filteredNodes"
      :local-search-term="localSearchTerm"
      :is-sorting="isSorting"
      :view-mode="viewMode"
      :is-selection-mode="isSelectionMode"
      :selected-node-ids="selectedNodeIds"
      :search-page="currentPage"
      :search-total-pages="totalPages"
      :base-page="props.currentPage"
      :base-total-pages="props.totalPages"
      :items-per-page="itemsPerPage"
      @update:items-per-page="emit('update:itemsPerPage', $event)"
      @toggle-select="toggleNodeSelection"
      @edit="handleEdit"
      @delete="handleDelete"
      @sort-end="handleSortEnd"
      @change-page="handleChangePage"
      @set-group-filter="emit('set-group-filter', $event)"
    />
  </div>
</template>

