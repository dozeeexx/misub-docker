<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import draggable from 'vuedraggable';
import ManualNodeCard from './ManualNodeCard.vue';
import ManualNodeList from './ManualNodeList.vue';

const props = defineProps({
  manualNodes: { type: Array, default: () => [] },
  paginatedManualNodes: Array,
  currentPage: Number,
  totalPages: Number,
  isSorting: Boolean,
  searchTerm: String,
  viewMode: String,
  groups: { type: Array, default: () => [] },
  activeColorFilter: { type: String, default: null }, // New
});

const emit = defineEmits([
  'add', 'delete', 'edit', 'changePage', 'update:searchTerm', 'update:viewMode',
  'toggleSort', 'markDirty', 'autoSort', 'deduplicate', 'import', 'deleteAll', 'reorder',
  'rename-group', 'delete-group',
  'set-color-filter', 'batch-update-color', 'batch-delete-nodes'
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

const handleBatchColor = (color) => {
    emit('batch-update-color', Array.from(selectedNodeIds.value), color);
    // Maintain selection? Or clear? Usually clear after action.
    selectedNodeIds.value.clear();
    isSelectionMode.value = false;
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

const nodesMoreMenuRef = ref(null);
const showNodesMoreMenu = ref(false);
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
  showNodesMoreMenu.value = false;

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
  showNodesMoreMenu.value = false;
};
const handleDeduplicate = () => {
  emit('deduplicate');
  showNodesMoreMenu.value = false;
};
const handleImport = () => {
  emit('import');
  showNodesMoreMenu.value = false;
};
const handleDeleteAll = () => {
  emit('deleteAll');
  showNodesMoreMenu.value = false;
};

// 添加点击外部关闭下拉菜单的功能
const handleClickOutside = (event) => {
  if (nodesMoreMenuRef.value && !nodesMoreMenuRef.value.contains(event.target)) {
    showNodesMoreMenu.value = false;
  }
};

// 在组件挂载和卸载时添加/移除事件监听器


onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
      <div class="flex items-center gap-3 flex-wrap">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">手动节点</h2>
        <span class="px-2.5 py-0.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-full">{{ manualNodes.length }}</span>
        
        <!-- Mobile Color Filter -->
            <div class="flex md:hidden items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ml-auto sm:ml-2">
                <button 
                    @click="emit('set-color-filter', null)"
                    class="px-3 py-1 text-xs font-medium rounded-md transition-all !min-w-0 !min-h-0"
                    :class="!activeColorFilter ? 'bg-white dark:bg-gray-700 shadow-xs text-gray-800 dark:text-white' : 'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200'"
                >全</button>
                <div class="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
                <button 
                    v-for="color in ['red', 'orange', 'green', 'blue']" 
                    :key="color"
                    @click="emit('set-color-filter', activeColorFilter === color ? null : color)"
                    class="w-6 h-6 mx-0.5 rounded-full flex items-center justify-center transition-transform !min-w-0 !min-h-0"
                    :class="[
                        `bg-${color}-500`,
                        activeColorFilter === color ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-900 scale-110' : 'opacity-60'
                    ]"
                ></button>
            </div>

        <span v-if="localSearchTerm" class="px-2.5 py-0.5 text-sm font-semibold text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/20 rounded-full w-full sm:w-auto mt-2 sm:mt-0">
          搜索: "{{ localSearchTerm }}" ({{ filteredNodes.length }}/{{ manualNodes.length }})
        </span>
      </div>
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <!-- Color Filter -->
        <div class="hidden md:flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mr-2 shrink-0">
            <button 
                @click="emit('set-color-filter', null)"
                class="px-2 py-0.5 text-[11px] font-medium rounded-md transition-all"
                :class="!activeColorFilter ? 'bg-white dark:bg-gray-700 shadow-xs text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            >全部</button>
            <button 
                v-for="color in ['red', 'orange', 'green', 'blue']" 
                :key="color"
                @click="emit('set-color-filter', color)"
                class="w-5 h-5 mx-0.5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                :class="[
                    `bg-${color}-500`,
                    activeColorFilter === color ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900 scale-110' : 'opacity-70 hover:opacity-100'
                ]"
            ></button>
        </div>



        <div class="relative grow">
          <input 
            type="text" 
            v-model="localSearchTerm"
            placeholder="搜索节点..."
            class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <div class="p-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center shrink-0">
            <button @click="handleSetViewMode('card')" class="view-mode-toggle p-1.5 rounded-md transition-colors flex items-center justify-center" :class="viewMode === 'card' ? 'bg-white dark:bg-gray-900 text-indigo-600' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button @click="handleSetViewMode('list')" class="view-mode-toggle p-1.5 rounded-md transition-colors flex items-center justify-center" :class="viewMode === 'list' ? 'bg-white dark:bg-gray-900 text-indigo-600' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
            </button>
        </div>
        <button @click="handleAdd" class="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs shrink-0">新增</button>
        <div class="relative shrink-0" ref="nodesMoreMenuRef">
          <button @click="showNodesMoreMenu = !showNodesMoreMenu" class="p-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
          </button>
           <Transition name="slide-fade-sm">
            <div v-if="showNodesMoreMenu" class="absolute right-0 mt-2 w-36 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-2xl z-50 ring-1 ring-black/5">
              <button 
                @click="toggleSelectionMode(); showNodesMoreMenu = false"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                :class="isSelectionMode ? 'text-indigo-600 dark:text-indigo-400' : ''"
              >
                {{ isSelectionMode ? '退出批量' : '批量操作' }}
              </button>
              <div class="border-t border-gray-100 dark:border-gray-700/50 my-1"></div>
              <button @click="handleImport" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">导入订阅</button>
              <button @click="handleAutoSort" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">一键排序</button>
              <button @click="handleDeduplicate" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">一键去重</button>
              <button 
                @click="handleToggleSort" 
                class="w-full text-left px-4 py-2 text-sm transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {{ isSorting ? '完成排序' : '手动排序' }}
              </button>
              <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button @click="handleDeleteAll" class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10">清空所有</button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Selection Toolbar -->
    <Transition name="slide-fade-sm">
        <div v-if="isSelectionMode && selectedNodeIds.size > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] sm:w-auto max-w-xl bg-white dark:bg-gray-800 shadow-xl rounded-2xl sm:rounded-full px-4 py-3 sm:px-6 sm:py-3 flex flex-col sm:flex-row items-center justify-between sm:justify-center gap-3 sm:gap-4 z-50 border border-gray-200 dark:border-gray-700">
            
            <div class="flex items-center justify-between w-full sm:w-auto gap-4">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">已选 {{ selectedNodeIds.size }}</span>
            </div>

            <div class="h-px w-full sm:w-px sm:h-4 bg-gray-200 dark:bg-gray-600 flex-shrink-0 hidden sm:block"></div>

            <div class="flex flex-col sm:flex-row items-center justify-between w-full sm:w-auto gap-3 sm:gap-2">
                <!-- Colors (Scrollable area if needed, but now has full width) -->
                <div class="flex items-center justify-center w-full sm:w-auto gap-2 sm:gap-3 overflow-x-auto no-scrollbar mask-gradient">
                    <span class="text-xs text-gray-500 hidden sm:inline">标记:</span>
                    <div class="flex items-center gap-3 sm:gap-2">
                        <button v-for="color in ['red', 'orange', 'green', 'blue']" :key="color" 
                            @click="handleBatchColor(color)"
                            class="w-6 h-6 sm:w-6 sm:h-6 rounded-full hover:scale-110 transition-transform ring-1 ring-black/5"
                            :class="`bg-${color}-500 shadow-sm`"
                        ></button>
                    </div>
                    <div class="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1 hidden sm:block"></div>
                    <button @click="handleBatchColor(null)" class="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap px-1 py-1 sm:px-0">清除颜色</button>
                </div>
                
                <!-- Fixed Actions (Bottom row on mobile, Right side on desktop) -->
                 <div class="flex items-center justify-center w-full sm:w-auto gap-4 sm:gap-2 shrink-0 sm:ml-1 sm:pl-2 sm:border-l border-gray-200 dark:border-gray-600 pt-1 sm:pt-0 border-t sm:border-t-0 w-full sm:w-auto">
                    <button @click="handleBatchDelete" class="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap flex items-center gap-1 px-2 py-1 bg-red-50 sm:bg-transparent rounded-md sm:rounded-none">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                        删除
                    </button>
                    <button @click="selectedNodeIds.clear(); isSelectionMode = false" class="text-xs sm:text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white whitespace-nowrap px-2 py-1 bg-gray-100 sm:bg-transparent rounded-md sm:rounded-none">取消</button>
                 </div>
            </div>
        </div>
    </Transition>
    <div v-if="manualNodes.length > 0">
      <!-- 如果有搜索词，显示搜索提示 -->
      <div v-if="localSearchTerm && filteredNodes.length === 0" class="text-center py-8 text-gray-500">
        <p>没有找到包含 "{{ localSearchTerm }}" 的节点</p>
      </div>
      
      <div v-if="isSorting">
        <!-- 排序模式保持原有扁平列表，方便跨组排序 -->
        <div v-if="viewMode === 'card'">
           <draggable 
             tag="div" 
             class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3" 
             v-model="draggableManualNodes" 
             item-key="id" 
             animation="300" 
             @end="handleSortEnd"
           >
             <template #item="{ element: node }">
                <div class="cursor-move">
                   <ManualNodeCard 
                       :node="node" 
                       :is-selection-mode="isSelectionMode"
                       :is-selected="selectedNodeIds.has(node.id)"
                       @toggle-select="toggleNodeSelection(node.id)"
                       @edit="handleEdit(node.id)" 
                       @delete="handleDelete(node.id)" />
               </div>
             </template>
           </draggable>
        </div>
        <div v-else class="space-y-2">
            <draggable 
              tag="div" 
              class="space-y-2" 
              v-model="draggableManualNodes" 
              item-key="id" 
              animation="300" 
              @end="handleSortEnd"
            >
              <template #item="{ element: node, index }">
                <div class="cursor-move">
                  <ManualNodeList
                      :node="node"
                      :index="index + 1"
                      class="list-item-animation"
                      :style="{ '--delay-index': index }"
                      @edit="handleEdit(node.id)"
                      @delete="handleDelete(node.id)"
                  />
                </div>
              </template>
            </draggable>
        </div>
      </div>

      <div v-else>
        <!-- Flat List Display (No Groups) -->
        <div v-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <div 
                v-for="(node, index) in paginatedNodes" 
                :key="node.id"
                class="list-item-animation"
                :style="{ '--delay-index': index }"
            >
                <ManualNodeCard 
                    :node="node" 
                    :is-selection-mode="isSelectionMode"
                    :is-selected="selectedNodeIds.has(node.id)"
                    @toggle-select="toggleNodeSelection(node.id)"
                    @edit="handleEdit(node.id)" 
                    @delete="handleDelete(node.id)" 
                />
            </div>
        </div>
        <div v-else class="space-y-2">
             <ManualNodeList
              v-for="(node, index) in paginatedNodes"
              :key="node.id"
              :node="node"
              :index="paginatedNodes.indexOf(node) + 1" 
              class="list-item-animation"
              :style="{ '--delay-index': index }"
              :is-selection-mode="isSelectionMode"
              :is-selected="selectedNodeIds.has(node.id)"
              @toggle-select="toggleNodeSelection(node.id)"
              @edit="handleEdit(node.id)"
              @delete="handleDelete(node.id)"
          />
        </div>
      </div>
      
      <!-- 分页 - 搜索时使用本地分页，否则使用props -->
      <div v-if="localSearchTerm && totalPages > 1" class="flex justify-center items-center space-x-4 mt-8 text-sm font-medium">
        <button 
          @click="handleChangePage(currentPage - 1)" 
          :disabled="currentPage === 1" 
          class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
        >&laquo; 上一页</button>
        <span class="text-gray-500 dark:text-gray-400">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button 
          @click="handleChangePage(currentPage + 1)" 
          :disabled="currentPage === totalPages" 
          class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
        >下一页 &raquo;</button>
      </div>
      
      <!-- 非搜索时的原有分页 -->
      <div v-else-if="!localSearchTerm && props.totalPages > 1" class="flex justify-center items-center space-x-4 mt-8 text-sm font-medium">
        <button 
          @click="handleChangePage(props.currentPage - 1)" 
          :disabled="props.currentPage === 1" 
          class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
        >&laquo; 上一页</button>
        <span class="text-gray-500 dark:text-gray-400">第 {{ props.currentPage }} / {{ props.totalPages }} 页</span>
        <button 
          @click="handleChangePage(props.currentPage + 1)" 
          :disabled="props.currentPage === props.totalPages" 
          class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
        >下一页 &raquo;</button>
      </div>
    </div>
    <div v-else class="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" /></svg><h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">没有手动节点</h3><p class="mt-1 text-sm text-gray-500">添加分享链接或单个节点。</p></div>
  </div>
</template>

<style scoped>
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
