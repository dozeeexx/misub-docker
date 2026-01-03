<script setup>
import { computed } from 'vue';

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  filteredNodes: {
    type: Array,
    default: () => []
  },
  searchTerm: {
    type: String,
    default: ''
  },
  activeColorFilter: {
    type: String,
    default: null
  },
  selectedIds: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'update:searchTerm',
  'update:colorFilter',
  'toggle-selection',
  'select-all',
  'deselect-all'
]);

const searchModel = computed({
  get: () => props.searchTerm,
  set: (val) => emit('update:searchTerm', val)
});
</script>

<template>
  <div v-if="nodes.length > 0" class="space-y-2">
    <div class="flex justify-between items-center mb-2">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">选择手动节点</h4>
      <div class="space-x-2">
        <button @click="emit('select-all')" class="text-xs text-indigo-600 hover:underline">全选</button>
        <button @click="emit('deselect-all')" class="text-xs text-indigo-600 hover:underline">全不选</button>
      </div>
    </div>
    <!-- Color Filter -->
    <div class="flex items-center gap-2 mb-2 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
      <button 
        @click="emit('update:colorFilter', null)"
        class="px-3 py-1 text-xs font-medium rounded-md transition-all border !min-w-0 !min-h-0"
        :class="!activeColorFilter ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 shadow-xs text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
      >全部</button>
      <div class="w-px h-3 bg-gray-200 dark:bg-gray-600 mx-1"></div>
      <button 
        v-for="color in ['red', 'orange', 'green', 'blue']" 
        :key="color"
        @click="emit('update:colorFilter', activeColorFilter === color ? null : color)"
        class="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 !min-w-0 !min-h-0"
        :class="[
          `bg-${color}-500`,
          activeColorFilter === color ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-900 scale-110' : 'opacity-70 hover:opacity-100'
        ]"
      ></button>
    </div>

    <div class="relative mb-2">
      <input
        type="text"
        v-model="searchModel"
        placeholder="搜索节点..."
        class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    </div>
    <div class="overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 h-48">
      <div v-for="node in filteredNodes" :key="node.id">
        <label class="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            :checked="selectedIds.includes(node.id)"
            @change="emit('toggle-selection', node.id)"
            class="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span class="text-sm text-gray-800 dark:text-gray-200 truncate" :title="node.name">{{ node.name || '未命名节点' }}</span>
        </label>
      </div>
      <div v-if="filteredNodes.length === 0" class="text-center text-gray-500 text-sm py-4">
        没有找到匹配的节点。
      </div>
    </div>
  </div>
  <div v-else class="text-center text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex items-center justify-center h-full">
    没有可用的手动节点
  </div>
</template>
