<script setup>
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import ManualNodeCard from '../ManualNodeCard.vue';
import ManualNodeList from '../ManualNodeList.vue';

const props = defineProps({
  manualNodes: { type: Array, default: () => [] },
  paginatedNodes: { type: Array, default: () => [] },
  filteredNodes: { type: Array, default: () => [] },
  localSearchTerm: { type: String, default: '' },
  isSorting: { type: Boolean, default: false },
  viewMode: { type: String, default: 'card' },
  isSelectionMode: { type: Boolean, default: false },
  selectedNodeIds: { type: Object, required: true },
  searchPage: { type: Number, default: 1 },
  searchTotalPages: { type: Number, default: 1 },
  basePage: { type: Number, default: 1 },
  baseTotalPages: { type: Number, default: 1 },
  draggableManualNodes: { type: Array, default: () => [] },
  itemsPerPage: { type: Number, default: 24 } // Added
});

const emit = defineEmits([
  'update:draggableManualNodes',
  'toggle-select',
  'edit',
  'delete',
  'sort-end',
  'change-page',
  'update:itemsPerPage', // Added
  'set-group-filter' // Added
]);

const draggableModel = computed({
  get: () => props.draggableManualNodes,
  set: (val) => emit('update:draggableManualNodes', val)
});

const displayPage = computed(() => (props.localSearchTerm ? props.searchPage : props.basePage));
const displayTotalPages = computed(() => (props.localSearchTerm ? props.searchTotalPages : props.baseTotalPages));

const pageInput = ref('');
// When page changes externally, update input
watch(displayPage, (newVal) => {
  pageInput.value = newVal;
}, { immediate: true });

const handleChangePage = (page) => {
  let p = parseInt(page);
  if (isNaN(p)) return;
  // Let parent handle boundaries if needed, but safe to clamp here for UI feedback
  if (p < 1) p = 1;
  if (p > displayTotalPages.value) p = displayTotalPages.value;
  pageInput.value = p; // Sync input
  emit('change-page', p);
};

const jumpToPage = () => {
  handleChangePage(pageInput.value);
};

// Handle items per page change
const handleItemsPerPageChange = (event) => {
  emit('update:itemsPerPage', parseInt(event.target.value));
};
</script>

<template>
  <div v-if="manualNodes.length > 0" :class="{ 'pb-48': isSelectionMode }">
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
          v-model="draggableModel" 
          item-key="id" 
          animation="300" 
          @end="emit('sort-end')"
        >
          <template #item="{ element: node }">
            <div class="cursor-move">
              <ManualNodeCard 
                :node="node" 
                :is-selection-mode="isSelectionMode"
                :is-selected="selectedNodeIds.has(node.id)"
                @toggle-select="emit('toggle-select', node.id)"
                @edit="emit('edit', node.id)" 
                @delete="emit('delete', node.id)"
                @filter-group="emit('set-group-filter', $event)" />
            </div>
          </template>
        </draggable>
      </div>
      <div v-else class="space-y-2">
        <draggable 
          tag="div" 
          class="space-y-2" 
          v-model="draggableModel" 
          item-key="id" 
          animation="300" 
          @end="emit('sort-end')"
        >
          <template #item="{ element: node, index }">
            <div class="cursor-move">
              <ManualNodeList
                :node="node"
                :index="index + 1"
                class="list-item-animation"
                :style="{ '--delay-index': Math.min(index, 20) }"
                @edit="emit('edit', node.id)"
                @delete="emit('delete', node.id)"
                @filter-group="emit('set-group-filter', $event)"
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
          :style="{ '--delay-index': Math.min(index, 20) }"
        >
          <ManualNodeCard 
            :node="node" 
            :is-selection-mode="isSelectionMode"
            :is-selected="selectedNodeIds.has(node.id)"
            @toggle-select="emit('toggle-select', node.id)"
            @edit="emit('edit', node.id)" 
            @delete="emit('delete', node.id)" 
            @filter-group="emit('set-group-filter', $event)" 
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
          :style="{ '--delay-index': Math.min(index, 20) }"
          :is-selection-mode="isSelectionMode"
          :is-selected="selectedNodeIds.has(node.id)"
          @toggle-select="emit('toggle-select', node.id)"
          @edit="emit('edit', node.id)"
          @delete="emit('delete', node.id)"
          @filter-group="emit('set-group-filter', $event)"
        />
      </div>
    </div>
    
    <!-- 统一分页栏 (Static Flow) -->
    <!-- 统一分页栏 (Panel Style) -->
    <div v-if="displayTotalPages > 1 || itemsPerPage !== 24" class="mt-4 px-4 py-3 bg-white/90 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
      
      <!-- Left: Item Count & Page Size -->
      <div class="flex items-center space-x-4 text-xs text-gray-500 whitespace-nowrap">
        <span>共 {{ filteredNodes.length }} 个节点</span>
        <div class="flex items-center space-x-2">
          <span>每页:</span>
          <select 
            :value="itemsPerPage" 
            @change="handleItemsPerPageChange" 
            class="form-select text-xs py-1 pl-2 pr-6 border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
          >
            <option :value="24">24</option>
            <option :value="48">48</option>
            <option :value="96">96</option>
            <option :value="-1">全部</option>
          </select>
        </div>
      </div>

      <!-- Center: Pagination Controls -->
      <div class="flex items-center space-x-2" v-if="displayTotalPages > 1">
        <button 
          @click="handleChangePage(1)" 
          :disabled="displayPage === 1"
          class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="第一页"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
        <button 
          @click="handleChangePage(displayPage - 1)" 
          :disabled="displayPage === 1"
          class="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="上一页"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div class="flex items-center space-x-1">
          <input 
            type="number" 
            v-model="pageInput" 
            @keydown.enter="jumpToPage"
            @blur="jumpToPage"
            class="w-12 text-center text-sm py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none remove-arrow"
          />
          <span class="text-sm text-gray-500">/ {{ displayTotalPages }}</span>
        </div>

        <button 
          @click="handleChangePage(displayPage + 1)" 
          :disabled="displayPage === displayTotalPages"
          class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="下一页"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button 
          @click="handleChangePage(displayTotalPages)" 
          :disabled="displayPage === displayTotalPages"
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="最后一页"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div v-else class="w-[100px]"></div>

    </div>
  </div>
  <div v-else class="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
    <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" /></svg>
    <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">没有手动节点</h3>
    <p class="mt-1 text-sm text-gray-500">添加分享链接或单个节点。</p>
  </div>
</template>

<style scoped>
.cursor-move {
  cursor: move;
}
/* Hide number input arrows */
.remove-arrow::-webkit-inner-spin-button,
.remove-arrow::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.remove-arrow {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
