<script setup>
const props = defineProps({
  editingSubscription: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <!-- 订阅名称 -->
  <div>
    <label for="sub-edit-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅名称</label>
    <input type="text" id="sub-edit-name" v-model="editingSubscription.name" placeholder="（可选）不填将自动获取"
      class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
  </div>

  <!-- 订阅链接 -->
  <div>
    <label for="sub-edit-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅链接</label>
    <input type="text" id="sub-edit-url" v-model="editingSubscription.url" placeholder="https://..."
      class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white">
  </div>
</template>
