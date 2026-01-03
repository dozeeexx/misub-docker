<script setup>
import { computed } from 'vue';

const props = defineProps({
  subscriptions: {
    type: Array,
    default: () => []
  },
  filteredSubscriptions: {
    type: Array,
    default: () => []
  },
  searchTerm: {
    type: String,
    default: ''
  },
  selectedIds: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'update:searchTerm',
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
  <div v-if="subscriptions.length > 0" class="space-y-2">
    <div class="flex justify-between items-center mb-2">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">选择机场订阅</h4>
      <div class="space-x-2">
        <button @click="emit('select-all')" class="text-xs text-indigo-600 hover:underline">全选</button>
        <button @click="emit('deselect-all')" class="text-xs text-indigo-600 hover:underline">全不选</button>
      </div>
    </div>
    <div class="relative mb-2">
      <input
        type="text"
        v-model="searchModel"
        placeholder="搜索订阅..."
        class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    </div>
    <div class="overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 h-48">
      <div v-for="sub in filteredSubscriptions" :key="sub.id">
        <label class="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            :checked="selectedIds.includes(sub.id)"
            @change="emit('toggle-selection', sub.id)"
            class="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span class="text-sm text-gray-800 dark:text-gray-200 truncate" :title="sub.name">{{ sub.name || '未命名订阅' }}</span>
        </label>
      </div>
      <div v-if="filteredSubscriptions.length === 0" class="text-center text-gray-500 text-sm py-4">
        没有找到匹配的订阅。
      </div>
    </div>
  </div>
  <div v-else class="text-center text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex items-center justify-center h-full">
    没有可用的机场订阅
  </div>
</template>
