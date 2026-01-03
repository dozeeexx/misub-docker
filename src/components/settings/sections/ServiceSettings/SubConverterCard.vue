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
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700 shadow-sm">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24"
        stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      外部服务集成
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SubConverter 后端地址</label>
        <SubConverterSelector v-model="settings.subConverter" type="backend" placeholder="选择后端地址"
          :allowEmpty="false" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SubConverter 配置文件</label>
        <SubConverterSelector v-model="settings.subConfig" type="config" placeholder="选择配置" :allowEmpty="false" />
      </div>
    </div>
  </div>
</template>
