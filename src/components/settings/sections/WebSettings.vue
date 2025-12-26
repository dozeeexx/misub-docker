<script setup>
defineProps({
  disguiseConfig: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div>
    <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700 mb-3">伪装页面</h3>
    <div class="space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">启用伪装功能</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">浏览器访问订阅链接时显示伪装页面</p>
        </div>
        <label class="toggle-switch"><input type="checkbox" v-model="disguiseConfig.enabled"><span class="slider"></span></label>
      </div>
      
      <div v-if="disguiseConfig.enabled" class="space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">伪装类型</label>
          <div class="space-y-2">
            <div class="flex items-center">
              <input type="radio" value="default" v-model="disguiseConfig.pageType" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800">
              <span class="ml-3 text-sm dark:text-gray-300">显示默认404页面</span>
            </div>
            <div class="flex items-center">
              <input type="radio" value="redirect" v-model="disguiseConfig.pageType" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800">
              <span class="ml-3 text-sm dark:text-gray-300">跳转到自定义链接</span>
            </div>
          </div>
        </div>
        
        <div v-if="disguiseConfig.pageType === 'redirect'">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">跳转链接</label>
          <input 
            type="url" 
            v-model="disguiseConfig.redirectUrl" 
            placeholder="https://example.com"
            class="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
          >
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">浏览器访问订阅链接时将自动跳转到此地址</p>
        </div>
        
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p class="text-xs text-blue-800 dark:text-blue-300">
            <strong>提示:</strong> 伪装功能仅对浏览器访问生效,不影响 Clash/V2rayN 等客户端的正常使用。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Toggle Switch CSS */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}
.dark .slider { background-color: #4b5563; }
.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .slider { background-color: #4f46e5; }
.dark input:checked + .slider { background-color: #16a34a; }
input:checked + .slider:before { transform: translateX(20px); }
</style>
