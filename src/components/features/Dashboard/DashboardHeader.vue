<script setup>
defineProps({
  formattedTotalRemainingTraffic: {
    type: String,
    default: '0 B'
  }
});

defineEmits(['openLog', 'openBulkImport']);
</script>

<template>
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 md:gap-0">
    <div class="flex flex-wrap items-center gap-3 md:gap-4">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">仪表盘</h1>
      <span v-if="formattedTotalRemainingTraffic !== '0 B'"
        class="px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-500/20 rounded-full">
        剩余总流量: {{ formattedTotalRemainingTraffic }}
      </span>
    </div>
    <div class="flex items-center gap-2 w-full md:w-auto">
      <button @click="$emit('openLog')"
        class="flex-1 md:flex-none text-center text-sm font-semibold px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">订阅日志</button>
      <button @click="$emit('openBulkImport')"
        class="flex-1 md:flex-none text-center text-sm font-semibold px-4 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 border-2 border-indigo-500/50 hover:bg-indigo-500/10 transition-colors">批量导入</button>
    </div>
  </div>
</template>
