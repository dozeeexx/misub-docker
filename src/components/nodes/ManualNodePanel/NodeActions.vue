<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  manualNodesCount: {
    type: Number,
    default: 0
  },
  filteredNodesCount: {
    type: Number,
    default: 0
  },
  searchTerm: {
    type: String,
    default: ''
  },
  activeColorFilter: {
    type: String,
    default: null
  },
  viewMode: {
    type: String,
    default: 'card'
  },
  isSorting: {
    type: Boolean,
    default: false
  },
  isSelectionMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:searchTerm',
  'update:viewMode',
  'set-color-filter',
  'add',
  'import',
  'auto-sort',
  'deduplicate',
  'toggle-sort',
  'delete-all',
  'toggle-selection-mode'
]);

const searchModel = computed({
  get: () => props.searchTerm,
  set: (val) => emit('update:searchTerm', val)
});

const nodesMoreMenuRef = ref(null);
const showNodesMoreMenu = ref(false);

const handleClickOutside = (event) => {
  if (nodesMoreMenuRef.value && !nodesMoreMenuRef.value.contains(event.target)) {
    showNodesMoreMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">手动节点</h2>
      <span class="px-2.5 py-0.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-full">{{ manualNodesCount }}</span>
      
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

      <span v-if="searchTerm" class="px-2.5 py-0.5 text-sm font-semibold text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/20 rounded-full w-full sm:w-auto mt-2 sm:mt-0">
        搜索: "{{ searchTerm }}" ({{ filteredNodesCount }}/{{ manualNodesCount }})
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
          v-model="searchModel"
          placeholder="搜索节点..."
          class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <div class="p-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center shrink-0">
        <button @click="emit('update:viewMode', 'card')" class="view-mode-toggle p-1.5 rounded-md transition-colors flex items-center justify-center" :class="viewMode === 'card' ? 'bg-white dark:bg-gray-900 text-indigo-600' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        </button>
        <button @click="emit('update:viewMode', 'list')" class="view-mode-toggle p-1.5 rounded-md transition-colors flex items-center justify-center" :class="viewMode === 'list' ? 'bg-white dark:bg-gray-900 text-indigo-600' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
        </button>
      </div>
      <button @click="emit('add')" class="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs shrink-0">新增</button>
      <div class="relative shrink-0" ref="nodesMoreMenuRef">
        <button @click="showNodesMoreMenu = !showNodesMoreMenu" class="p-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
        </button>
        <Transition name="slide-fade-sm">
          <div v-if="showNodesMoreMenu" class="absolute right-0 mt-2 w-36 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-2xl z-50 ring-1 ring-black/5">
            <button 
              @click="emit('toggle-selection-mode'); showNodesMoreMenu = false"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
              :class="isSelectionMode ? 'text-indigo-600 dark:text-indigo-400' : ''"
            >
              {{ isSelectionMode ? '退出批量' : '批量操作' }}
            </button>
            <div class="border-t border-gray-100 dark:border-gray-700/50 my-1"></div>
            <button @click="emit('import'); showNodesMoreMenu = false" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">导入订阅</button>
            <button @click="emit('auto-sort'); showNodesMoreMenu = false" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">一键排序</button>
            <button @click="emit('deduplicate'); showNodesMoreMenu = false" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">一键去重</button>
            <button 
              @click="emit('toggle-sort'); showNodesMoreMenu = false"
              class="w-full text-left px-4 py-2 text-sm transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {{ isSorting ? '完成排序' : '手动排序' }}
            </button>
            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button @click="emit('delete-all'); showNodesMoreMenu = false" class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10">清空所有</button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
