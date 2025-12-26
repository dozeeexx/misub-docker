<script setup>
defineProps({
  settings: {
    type: Object,
    required: true
  },
  isMigrating: Boolean,
  exportBackup: Function,
  importBackup: Function
});

const emit = defineEmits(['migrate']);
</script>

<template>
  <div class="space-y-8">
    <!-- Storage -->
    <div>
       <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">数据存储类型</label>
       <div class="space-y-3">
           <div class="flex items-center"><input type="radio" value="kv" v-model="settings.storageType" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"><span class="ml-3 text-sm dark:text-gray-300">KV 存储</span></div>
           <div class="flex items-center"><input type="radio" value="d1" v-model="settings.storageType" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"><span class="ml-3 text-sm dark:text-gray-300">D1 数据库 (推荐)</span></div>
           <div v-if="settings.storageType === 'kv'" class="mt-2">
               <button @click="emit('migrate')" :disabled="isMigrating" class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto bg-blue-600 hover:bg-blue-700">迁移到 D1</button>
           </div>
       </div>
    </div>

    <!-- Backup -->
    <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700 mb-4">备份与恢复</h3>
        <div class="flex gap-4">
            <button @click="exportBackup" class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700">导出备份</button>
            <button @click="importBackup" class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-600">导入备份</button>
        </div>
    </div>
  </div>
</template>
