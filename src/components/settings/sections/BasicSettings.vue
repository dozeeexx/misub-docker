<script setup>
defineProps({
  settings: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义订阅文件名</label>
        <input type="text" v-model="settings.FileName" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义订阅Token</label>
        <input type="text" v-model="settings.mytoken" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅组分享Token</label>
        <input type="text" v-model="settings.profileToken" placeholder="用于生成订阅组链接专用Token" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
      </div>
    </div>
  </div>
</template>
