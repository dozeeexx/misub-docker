<script setup>
import { computed } from 'vue';
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
  draggableManualNodes: { type: Array, default: () => [] }
});

const emit = defineEmits([
  'update:draggableManualNodes',
  'toggle-select',
  'edit',
  'delete',
  'sort-end',
  'change-page'
]);

const draggableModel = computed({
  get: () => props.draggableManualNodes,
  set: (val) => emit('update:draggableManualNodes', val)
});

const displayPage = computed(() => (props.localSearchTerm ? props.searchPage : props.basePage));
const displayTotalPages = computed(() => (props.localSearchTerm ? props.searchTotalPages : props.baseTotalPages));

const handleChangePage = (page) => emit('change-page', page);
</script>

<template>
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
                @delete="emit('delete', node.id)" />
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
                :style="{ '--delay-index': index }"
                @edit="emit('edit', node.id)"
                @delete="emit('delete', node.id)"
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
            @toggle-select="emit('toggle-select', node.id)"
            @edit="emit('edit', node.id)" 
            @delete="emit('delete', node.id)" 
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
          @toggle-select="emit('toggle-select', node.id)"
          @edit="emit('edit', node.id)"
          @delete="emit('delete', node.id)"
        />
      </div>
    </div>
    
    <!-- 分页 - 搜索时使用本地分页，否则使用props -->
    <div v-if="localSearchTerm && displayTotalPages > 1" class="flex justify-center items-center space-x-4 mt-8 text-sm font-medium">
      <button 
        @click="handleChangePage(displayPage - 1)" 
        :disabled="displayPage === 1" 
        class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
      >&laquo; 上一页</button>
      <span class="text-gray-500 dark:text-gray-400">第 {{ displayPage }} / {{ displayTotalPages }} 页</span>
      <button 
        @click="handleChangePage(displayPage + 1)" 
        :disabled="displayPage === displayTotalPages" 
        class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
      >下一页 &raquo;</button>
    </div>
    
    <!-- 非搜索时的原有分页 -->
    <div v-else-if="!localSearchTerm && baseTotalPages > 1" class="flex justify-center items-center space-x-4 mt-8 text-sm font-medium">
      <button 
        @click="handleChangePage(displayPage - 1)" 
        :disabled="displayPage === 1" 
        class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
      >&laquo; 上一页</button>
      <span class="text-gray-500 dark:text-gray-400">第 {{ displayPage }} / {{ displayTotalPages }} 页</span>
      <button 
        @click="handleChangePage(displayPage + 1)" 
        :disabled="displayPage === displayTotalPages" 
        class="px-3 py-1 rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
      >下一页 &raquo;</button>
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
</style>
