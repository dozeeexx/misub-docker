<script setup>
import { computed } from 'vue';

const props = defineProps({
  customNodeInput: {
    type: String,
    default: ''
  },
  activeMockNodes: {
    type: Array,
    default: () => []
  },
  previewResult: {
    type: Array,
    default: () => []
  },
  getHighlightedName: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['update:customNodeInput', 'add-custom-node']);

const customNodeInputModel = computed({
  get: () => props.customNodeInput,
  set: (val) => emit('update:customNodeInput', val)
});

const handleInput = () => emit('add-custom-node');
</script>

<template>
  <div
    class="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl overflow-hidden"
  >
    <div class="px-4 py-2 bg-indigo-100/50 dark:bg-indigo-900/30 flex justify-between items-center">
      <span class="text-xs font-bold text-indigo-800 dark:text-indigo-300 tracking-wider uppercase">
        ✨ 效果实时预览 (Live Preview)
      </span>
    </div>
    <div class="p-3 border-b border-indigo-100 dark:border-indigo-800/50">
      <div class="flex gap-2">
        <input
          v-model="customNodeInputModel"
          @input="handleInput"
          placeholder="👉 粘贴一个你的节点名称在这里进行测试..."
          class="flex-1 text-xs border-0 bg-white dark:bg-gray-800/50 rounded-md ring-1 ring-indigo-200 dark:ring-indigo-800 focus:ring-indigo-500 px-2 py-1.5 dark:text-white"
        >
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 p-4 text-xs sm:text-sm">
      <div class="space-y-2 opacity-60">
        <p class="font-bold text-gray-500 text-xs mb-1">原始名称 (Before)</p>
        <div
          v-for="(node, i) in activeMockNodes"
          :key="i"
          class="truncate font-mono p-1 bg-white dark:bg-gray-800 rounded"
          v-html="getHighlightedName(node.name)"
        >
        </div>
      </div>
      <div class="space-y-2 relative">
        <p class="font-bold text-indigo-600 dark:text-indigo-400 text-xs mb-1">处理结果 (After)</p>
        <div
          v-for="(result, i) in previewResult"
          :key="`r${i}`"
          class="truncate font-mono p-1 bg-white dark:bg-gray-800 rounded shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-900 text-gray-900 dark:text-white transition-all duration-300"
        >
          {{ result }}
        </div>
        <!-- 箭头 -->
        <div class="absolute left-[-16px] top-8 bottom-0 flex flex-col justify-around text-indigo-300">
          <span v-for="i in activeMockNodes.length" :key="i">➝</span>
        </div>
      </div>
    </div>
  </div>
</template>
