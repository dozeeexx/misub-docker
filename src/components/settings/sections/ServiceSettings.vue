<script setup>
import SubConverterSelector from '@/components/forms/SubConverterSelector.vue';

defineProps({
  settings: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">外部服务</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SubConverter后端地址</label>
        <SubConverterSelector 
            v-model="settings.subConverter" 
            type="backend" 
            placeholder="选择后端地址" 
            :allowEmpty="false"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SubConverter配置文件</label>
        <SubConverterSelector 
            v-model="settings.subConfig" 
            type="config" 
            placeholder="选择配置" 
            :allowEmpty="false"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telegram Bot Token</label>
        <input type="text" v-model="settings.BotToken" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telegram Chat ID</label>
        <input type="text" v-model="settings.ChatID" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
      </div>
    </div>
  </div>
</template>
